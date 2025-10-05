// @ts-nocheck 
/// <reference types="https://deno.land/x/deno/cli/types/snapshot.d.ts" />

import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: User is not an admin' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch all data from relevant tables
    const { data: profiles, error: profilesErr } = await supabaseAdmin.from('profiles').select('*');
    if (profilesErr) throw profilesErr;

    const { data: coachStudentPairs, error: pairsErr } = await supabaseAdmin.from('coach_student_pairs').select('*');
    if (pairsErr) throw pairsErr;

    const { data: messages, error: messagesErr } = await supabaseAdmin.from('messages').select('*');
    if (messagesErr) throw messagesErr;

    const { data: tasks, error: tasksErr } = await supabaseAdmin.from('tasks').select('*');
    if (tasksErr) throw tasksErr;

    // NOTE: auth.users table cannot be directly backed up via client-side functions due to RLS.
    // For a full backup, you'd typically use Supabase CLI or database tools.
    // This backup focuses on public schema data.

    const backupData = {
      profiles,
      coach_student_pairs: coachStudentPairs,
      messages,
      tasks,
    };

    return new Response(JSON.stringify(backupData), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})