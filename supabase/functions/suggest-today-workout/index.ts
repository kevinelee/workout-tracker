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

    const { recentSessions, frequentExercises, goal, unit } = await req.json()

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: 'Missing API key' }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const sessionSummary = (recentSessions ?? []).map((s: any) => {
      const exList = (s.exercises ?? []).map((e: any) => `${e.name} (${e.muscleGroup})`).join(', ')
      return `- ${s.date}: ${s.templateName} — ${exList || 'no exercises'}`
    }).join('\n')

    const frequentList = (frequentExercises ?? []).map((e: any) =>
      `${e.exerciseId} | ${e.name} | ${e.muscleGroup} | used ${e.usageCount}x | last: ${e.lastWeight}${unit} x ${e.lastReps} reps`
    ).join('\n')

    const prompt = `You are a personal trainer. Based on this athlete's recent training and exercise history, suggest today's workout.

Goal: ${goal || 'general fitness'}
Unit: ${unit}

Recent sessions (last 14 days):
${sessionSummary || 'No recent sessions'}

Their most-used exercises (prioritize these, id | name | muscle group | frequency | last performance):
${frequentList || 'No exercise history'}

Rules:
- Pick a muscle group focus that is well-rested (not trained in last 48h)
- Select 4–5 exercises almost entirely from their frequent exercise list (same exerciseId values)
- Use their last logged weight as the starting weight — don't change it
- Keep the same reps as their last session for each exercise
- If an exercise has no history (lastWeight 0), use a conservative estimate
- Name the workout naturally (e.g. "Push Session", "Leg Day", "Pull Session", "Upper Body")
- Write a rationale: 1–2 sentences explaining why today is a good day for this focus. Be specific about rest days.

Respond with ONLY this JSON, no extra text:
{
  "rationale": "...",
  "template": {
    "name": "...",
    "exercises": [
      { "exerciseId": "...", "sets": 3, "reps": 8, "weight": 135 }
    ]
  }
}`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
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

    const data    = await response.json()
    const rawText = data.content?.[0]?.text?.trim() ?? ''

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

    const validIds = new Set((frequentExercises ?? []).map((e: any) => e.exerciseId))
    const template = {
      name: parsed.template?.name ?? 'Today\'s Workout',
      exercises: (parsed.template?.exercises ?? [])
        .filter((e: any) => validIds.has(e.exerciseId))
        .map((e: any) => ({
          exerciseId: e.exerciseId,
          notes: '',
          sets: Array.from({ length: Math.max(1, Number(e.sets) || 3) }, () => ({
            reps:      Number(e.reps)   || 8,
            weight:    Number(e.weight) || 0,
            completed: false,
            isPR:      false,
          })),
        })),
    }

    if (!template.exercises.length) {
      return new Response(JSON.stringify({ error: 'No valid exercises' }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ rationale: parsed.rationale ?? '', template }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('suggest-today-workout error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
