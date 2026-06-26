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

    const { sessions, goal, unit, mode = 'weekly', daysSince } = await req.json()

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: 'Missing API key' }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const sessionSummary = sessions.map((s: any) => {
      const dur = s.durationMins ? `${s.durationMins} min` : 'duration unknown'
      const exList = s.exercises.length ? s.exercises.join(', ') : 'no exercises logged'
      return `- ${s.date} — ${s.templateName ?? 'Unnamed workout'} (${dur}): ${exList}`
    }).join('\n')

    const prompt = mode === 'returning'
      ? `You are a fitness coach writing a personal message to a client who hasn't worked out in ${daysSince} day${daysSince === 1 ? '' : 's'}.

Goal: ${goal || 'general fitness'}
Their last few workouts before the gap:
${sessionSummary}

Write 2–3 sentences: acknowledge the time away (mention the specific number of days), reference something specific from their history (an exercise, a workout name, or a pattern), and give one concrete nudge to get back on track. Be warm and direct — not preachy or generic. Under 60 words.

Respond with ONLY this JSON:
{"insight": "..."}`
      : `You are a fitness coach reviewing a client's training week.

Goal: ${goal || 'general fitness'}
Sessions this week (${sessions.length} total):
${sessionSummary}

Give 2–3 short, specific observations about this week — what went well, any gaps, one actionable suggestion for next week. Be direct and personal, not generic. Under 60 words total.

Respond with ONLY this JSON:
{"insight": "..."}`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
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

    return new Response(JSON.stringify({ insight: parsed.insight ?? '' }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('generate-weekly-insight error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
