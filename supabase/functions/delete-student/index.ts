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

    const { student_id } = await req.json()
    if (!student_id) {
      return new Response(JSON.stringify({ error: 'student_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: coachProfile, error: coachError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (coachError || !coachProfile || coachProfile.role !== 'coach') {
      return new Response(JSON.stringify({ error: 'Forbidden: User is not a coach' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: pair, error: pairError } = await supabaseAdmin
      .from('coach_student_pairs')
      .select('*')
      .eq('coach_id', user.id)
      .eq('student_id', student_id)
      .single()

    if (pairError || !pair) {
       return new Response(JSON.stringify({ error: 'Forbidden: Coach is not paired with this student' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Delete all associated records before deleting the user
    const { error: pairDeleteError } = await supabaseAdmin.from('coach_student_pairs').delete().eq('student_id', student_id);
    if (pairDeleteError) throw new Error(`Failed to delete student pair: ${pairDeleteError.message}`);

    const { error: rewardsDeleteError } = await supabaseAdmin.from('rewards').delete().eq('student_id', student_id);
    if (rewardsDeleteError) throw new Error(`Failed to delete rewards: ${rewardsDeleteError.message}`);

    const { error: tasksDeleteError } = await supabaseAdmin.from('tasks').delete().eq('student_id', student_id);
    if (tasksDeleteError) throw new Error(`Failed to delete tasks: ${tasksDeleteError.message}`);

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(student_id)
    if (deleteError) {
      throw new Error(`Failed to delete user: ${deleteError.message}`);
    }

    return new Response(JSON.stringify({ message: 'Student deleted successfully' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Tfype': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})