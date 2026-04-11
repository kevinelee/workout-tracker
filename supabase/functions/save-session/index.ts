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

    const { session } = await req.json()
    if (!session?.id) {
      return new Response(JSON.stringify({ error: 'session.id required' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Verify the session exists and caller is the owner (or it's an orphan)
    const { data: existing, error: fetchErr } = await admin
      .from('sessions')
      .select('id, user_id')
      .eq('id', session.id)
      .single()

    if (fetchErr || !existing) {
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    if (existing.user_id !== null && existing.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // Update session row — also claim it (set user_id) if it was orphaned
    const { error: updateErr } = await admin.from('sessions').update({
      user_id:          user.id,
      template_id:      session.templateId ?? null,
      started_at:       session.startedAt,
      finished_at:      session.finishedAt ?? null,
      duration_seconds: session.duration ?? null,
      status:           session.finishedAt ? 'finished' : 'active',
      pr_map:           session.prMap ?? {},
    }).eq('id', session.id)

    if (updateErr) throw updateErr

    // Replace logs if any
    if (session.logs?.length) {
      const { data: existingLogs } = await admin
        .from('session_logs')
        .select('id')
        .eq('session_id', session.id)

      if (existingLogs?.length) {
        const logIds = existingLogs.map((l: { id: string }) => l.id)
        await admin.from('session_sets').delete().in('session_log_id', logIds)
        await admin.from('session_logs').delete().eq('session_id', session.id)
      }

      for (let i = 0; i < session.logs.length; i++) {
        const log = session.logs[i]
        const logId = crypto.randomUUID()

        await admin.from('session_logs').insert({
          id:          logId,
          session_id:  session.id,
          exercise_id: log.exerciseId,
          position:    i,
          notes:       log.notes ?? '',
        })

        for (let j = 0; j < (log.sets?.length ?? 0); j++) {
          const s = log.sets[j]
          await admin.from('session_sets').insert({
            id:             crypto.randomUUID(),
            session_log_id: logId,
            position:       j,
            reps:           s.reps,
            weight:         s.weight,
            completed:      s.completed,
            is_pr:          s.isPR ?? false,
          })
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[save-session]', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
