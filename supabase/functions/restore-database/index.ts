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

    const backupData = await req.json();

    // Clear existing data (order matters due to foreign key constraints)
    await supabaseAdmin.from('tasks').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    await supabaseAdmin.from('messages').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    await supabaseAdmin.from('coach_student_pairs').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    // NOTE: Deleting from profiles will cascade delete auth.users if foreign key is set up correctly.
    // However, direct deletion of auth.users via admin API is safer for full user removal.
    // For this restore, we'll assume profiles are linked to auth.users and handle profiles.
    // We cannot directly insert into auth.users from here.
    await supabaseAdmin.from('profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    // Restore data (order matters)
    if (backupData.profiles && backupData.profiles.length > 0) {
        // For profiles, we need to ensure the auth.users exist first.
        // This is a simplified restore. A full restore would involve re-creating auth.users.
        // For now, we'll insert profiles assuming auth.users are handled separately or will be re-created.
        // Or, if the backup includes auth.users data, we'd use admin.createUser.
        // Given the current setup, we'll just insert into profiles.
        // This might fail if auth.users entries are missing for the profile IDs.
        const { error: insertProfilesError } = await supabaseAdmin.from('profiles').insert(backupData.profiles);
        if (insertProfilesError) throw insertProfilesError;
    }
    if (backupData.coach_student_pairs && backupData.coach_student_pairs.length > 0) {
        const { error: insertPairsError } = await supabaseAdmin.from('coach_student_pairs').insert(backupData.coach_student_pairs);
        if (insertPairsError) throw insertPairsError;
    }
    if (backupData.messages && backupData.messages.length > 0) {
        const { error: insertMessagesError } = await supabaseAdmin.from('messages').insert(backupData.messages);
        if (insertMessagesError) throw insertMessagesError;
    }
    if (backupData.tasks && backupData.tasks.length > 0) {
        const { error: insertTasksError } = await supabaseAdmin.from('tasks').insert(backupData.tasks);
        if (insertTasksError) throw insertTasksError;
    }

    return new Response(JSON.stringify({ message: 'Database restored successfully' }), {
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