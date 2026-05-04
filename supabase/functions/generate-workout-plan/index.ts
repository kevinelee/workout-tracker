import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { authorization: authHeader } } }
    )
    const { data: { user }, error: userErr } = await anonClient.auth.getUser()
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const { mode, answers, fitnessProfile, description, exerciseLibrary, unit } = await req.json()

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: 'Missing API key' }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const exerciseList = (exerciseLibrary ?? [])
      .map((e: any) => `${e.id} | ${e.name} | ${e.category} | ${e.muscleGroup}`)
      .join('\n')

    let prompt: string

    if (mode === 'split') {
      const frequency  = answers?.frequency ?? '3 days per week'
      const goal       = answers?.goal ?? ''
      const experience = answers?.experience ?? ''
      const equipment  = (answers?.equipment ?? []).join(', ')
      const focus      = (answers?.focus ?? []).join(', ')
      const days       = answers?.days ?? (frequency.includes('6') ? 5 : frequency.includes('4') ? 4 : 3)

      prompt = `You are a personal trainer. Create a ${days}-workout split for this athlete.

Profile:
- Goal: ${goal}
- Experience: ${experience}
- Frequency: ${frequency}
- Equipment: ${equipment}
- Focus: ${focus}
- Unit: ${unit}

Rules:
- Use ONLY exercise IDs from the list below — never invent IDs
- Each template: 4–6 exercises
- Weight 0 for bodyweight exercises
- Keep weights conservative for the experience level
- Split names should be distinct and descriptive (e.g. Push Day, Pull Day, Leg Day, Full Body)

Available exercises (id | name | category | muscleGroup):
${exerciseList}

Respond with ONLY this JSON, no extra text:
{
  "templates": [
    {
      "name": "...",
      "exercises": [
        { "exerciseId": "...", "sets": 3, "reps": 8, "weight": 0 }
      ]
    }
  ]
}`
    } else {
      // single mode — one workout, optionally shaped by a description
      prompt = `You are a personal trainer. Create one workout template.

${fitnessProfile ? `Athlete profile: ${fitnessProfile}` : ''}
${description ? `Request: "${description}"` : 'Create a balanced, general-purpose workout.'}
Unit: ${unit}

Rules:
- Use ONLY exercise IDs from the list below — never invent IDs
- 4–6 exercises
- Weight 0 for bodyweight exercises
- Keep weights conservative

Available exercises (id | name | category | muscleGroup):
${exerciseList}

Respond with ONLY this JSON, no extra text:
{
  "templates": [
    {
      "name": "...",
      "exercises": [
        { "exerciseId": "...", "sets": 3, "reps": 8, "weight": 0 }
      ]
    }
  ]
}`
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Anthropic error:', response.status, err)
      return new Response(JSON.stringify({ error: err }), {
        status: 502, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const data     = await response.json()
    const rawText  = data.content?.[0]?.text?.trim() ?? ''

    let parsed: any
    try {
      const match = rawText.match(/\{[\s\S]*\}/)
      parsed = JSON.parse(match?.[0] ?? rawText)
    } catch {
      console.error('Failed to parse model JSON:', rawText)
      return new Response(JSON.stringify({ error: 'Invalid JSON from model' }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const validIds  = new Set((exerciseLibrary ?? []).map((e: any) => e.id))
    const templates = (parsed.templates ?? [])
      .map((t: any) => ({
        id:         crypto.randomUUID(),
        name:       t.name ?? 'Workout',
        createdAt:  new Date().toISOString(),
        exercises:  (t.exercises ?? [])
          .filter((e: any) => validIds.has(e.exerciseId))
          .map((e: any) => ({
            exerciseId: e.exerciseId,
            notes:      '',
            sets:       Array.from({ length: Math.max(1, Number(e.sets) || 3) }, () => ({
              reps:      Number(e.reps)   || 8,
              weight:    Number(e.weight) || 0,
              completed: false,
              isPR:      false,
            })),
          })),
      }))
      .filter((t: any) => t.exercises.length > 0)

    return new Response(JSON.stringify({ templates }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('generate-workout-plan error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
