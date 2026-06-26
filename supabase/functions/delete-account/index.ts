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

    // Verify JWT and get the caller's user
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

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Delete all session_sets → session_logs → sessions for this user
    const { data: sessions } = await admin
      .from('sessions')
      .select('id')
      .eq('user_id', user.id)

    if (sessions?.length) {
      const sessionIds = sessions.map((s: { id: string }) => s.id)

      const { data: logs } = await admin
        .from('session_logs')
        .select('id')
        .in('session_id', sessionIds)

      if (logs?.length) {
        const logIds = logs.map((l: { id: string }) => l.id)
        await admin.from('session_sets').delete().in('session_log_id', logIds)
        await admin.from('session_logs').delete().in('session_id', sessionIds)
      }

      await admin.from('sessions').delete().eq('user_id', user.id)
    }

    // Delete other user tables (best-effort, RLS or missing tables won't block)
    await admin.from('body_weight_logs').delete().eq('user_id', user.id).throwOnError().catch(() => {})
    await admin.from('workout_templates').delete().eq('user_id', user.id).throwOnError().catch(() => {})
    await admin.from('profiles').delete().eq('id', user.id).throwOnError().catch(() => {})
    await admin.from('settings').delete().eq('user_id', user.id).throwOnError().catch(() => {})
    await admin.from('check_ins').delete().eq('user_id', user.id).throwOnError().catch(() => {})
    await admin.from('feedback').delete().eq('user_id', user.id).throwOnError().catch(() => {})

    // Delete the auth user last
    const { error: deleteErr } = await admin.auth.admin.deleteUser(user.id)
    if (deleteErr) throw deleteErr

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[delete-account]', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
