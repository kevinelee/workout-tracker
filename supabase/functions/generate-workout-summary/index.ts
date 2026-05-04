import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

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

    const {
      workoutName,
      durationFormatted,
      volume,
      prevVolume,
      volumePct,
      prsHit,
      completedSets,
      totalSets,
      calories,
      exercises,    // [{ name, sets: [{ reps, weight, isPR }], muscleGroup }]
      fitnessProfile,
      isFirstSession,
      unit,
    } = await req.json()

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: 'Missing API key' }), {
        status: 500,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const exerciseLines = exercises.map((ex: any) => {
      const completedSets = ex.sets.filter((s: any) => s.completed)
      if (completedSets.length === 0) return `  - ${ex.name}: skipped`
      const setsStr = completedSets.map((s: any) => {
        const setStr = s.weight > 0
          ? `${s.weight}${unit}×${s.reps}`
          : `${s.reps} reps`
        return s.isPR ? `${setStr} (PR!)` : setStr
      }).join(', ')
      return `  - ${ex.name}: ${setsStr}`
    }).join('\n')

    const volumeLine = prevVolume != null
      ? `${volume} ${unit} total volume (${volumePct > 0 ? '+' : ''}${Math.round(volumePct)}% vs last session)`
      : `${volume} ${unit} total volume (first time doing this workout)`

    const prompt = `You are a personal trainer writing a post-workout summary message for a fitness app. Write exactly 2 sentences — enthusiastic, specific, and encouraging. Reference actual exercises, weights, or numbers from the data. No generic lines like "great job" or "you crushed it" without specifics.

Workout: ${workoutName}
Duration: ${durationFormatted}
${volumeLine}
PRs hit: ${prsHit}
Sets completed: ${completedSets}/${totalSets}
${calories != null ? `Estimated calories: ~${calories} kcal` : ''}
${fitnessProfile ? `Athlete profile: ${fitnessProfile}` : ''}
${isFirstSession ? 'IMPORTANT: This is their very first logged workout ever. Celebrate the milestone of starting, mention the muscle groups they hit, and note that every weight they lifted today is a personal best.' : ''}

Exercises:
${exerciseLines}

Write the 2-sentence summary now:`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 180,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return new Response(JSON.stringify({ error: err }), {
        status: 502,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const data = await response.json()
    const summary = data.content?.[0]?.text?.trim() ?? ''

    return new Response(JSON.stringify({ summary }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
