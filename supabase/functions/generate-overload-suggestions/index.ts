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
    )
    const jwt = authHeader.replace(/^Bearer /, '')
    const { data: { user }, error: userErr } = await anonClient.auth.getUser(jwt)
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const { template, exercises, recentSessions, unit } = await req.json()

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: 'Missing API key' }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // Build per-exercise history summary
    const exerciseHistory = exercises.map((ex: any) => {
      const history = recentSessions.map((s: any, i: number) => {
        const log = s.logs.find((l: any) => l.exerciseId === ex.exerciseId)
        if (!log) return null
        const completed = log.sets.filter((set: any) => set.completed)
        if (!completed.length) return null
        const label = i === 0 ? 'last session' : `${i + 1} sessions ago`
        const setsStr = completed.map((set: any) => `${set.reps}×${set.weight}${unit}`).join(', ')
        return `${label}: ${setsStr}`
      }).filter(Boolean).join(' | ')

      return `- ${ex.name}: target ${ex.targetSets}×${ex.targetReps} @ ${ex.targetWeight}${unit}${history ? ` | history: ${history}` : ' | no prior history'}`
    }).join('\n')

    const prompt = `You are a personal trainer reviewing a client's workout history for "${template.name}".

Exercise history:
${exerciseHistory}

For each exercise, give a single short suggestion for today — be specific about weight/reps if applicable, or give a form/intensity cue if weight is 0. If performance has stalled, hold weight. If they've consistently hit all reps, bump weight by ~5${unit === 'kg' ? 'kg' : 'lbs'} or suggest a rep increase.

Also write one brief motivating headline for today's session (10 words or less).

Respond with ONLY this JSON:
{
  "headline": "...",
  "suggestions": [
    { "exerciseId": "...", "note": "..." }
  ]
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
        max_tokens: 600,
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

    return new Response(JSON.stringify({
      headline: parsed.headline ?? '',
      suggestions: parsed.suggestions ?? [],
    }), { headers: { ...CORS, 'Content-Type': 'application/json' } })

  } catch (err) {
    console.error('generate-overload-suggestions error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
