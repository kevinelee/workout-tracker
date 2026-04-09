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
    // Verify the caller is authenticated
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // Use anon client to verify the JWT and get the user
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

    const { session_id } = await req.json()
    if (!session_id) {
      return new Response(JSON.stringify({ error: 'session_id required' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // Use service role to bypass RLS
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Fetch the session to verify ownership
    const { data: session, error: fetchErr } = await admin
      .from('sessions')
      .select('id, user_id')
      .eq('id', session_id)
      .single()

    if (fetchErr || !session) {
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // Only allow deletion if user_id matches the caller OR is null (corrupted orphan)
    if (session.user_id !== null && session.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // Delete child rows first (in case cascades aren't set up)
    const { data: logs } = await admin
      .from('session_logs')
      .select('id')
      .eq('session_id', session_id)

    if (logs?.length) {
      const logIds = logs.map((l: { id: string }) => l.id)
      await admin.from('session_sets').delete().in('session_log_id', logIds)
      await admin.from('session_logs').delete().eq('session_id', session_id)
    }

    const { error: delErr } = await admin.from('sessions').delete().eq('id', session_id)
    if (delErr) throw delErr

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[delete-session]', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
