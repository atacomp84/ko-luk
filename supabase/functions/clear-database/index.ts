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

    // Delete all data from public schema tables (order matters due to foreign key constraints)
    console.log("[ClearDatabase] Deleting all tasks...");
    const { error: tasksDeleteError } = await supabaseAdmin.from('tasks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (tasksDeleteError) throw new Error(`Failed to delete tasks: ${tasksDeleteError.message}`);

    console.log("[ClearDatabase] Deleting all messages...");
    const { error: messagesDeleteError } = await supabaseAdmin.from('messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (messagesDeleteError) throw new Error(`Failed to delete messages: ${messagesDeleteError.message}`);

    console.log("[ClearDatabase] Deleting all coach-student pairs...");
    const { error: pairsDeleteError } = await supabaseAdmin.from('coach_student_pairs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (pairsDeleteError) throw new Error(`Failed to delete coach-student pairs: ${pairsDeleteError.message}`);

    // Get all user IDs from profiles to delete them from auth.users
    console.log("[ClearDatabase] Fetching all profile IDs for user deletion...");
    const { data: profiles, error: profilesFetchError } = await supabaseAdmin.from('profiles').select('id');
    if (profilesFetchError) throw new Error(`Failed to fetch profiles for deletion: ${profilesFetchError.message}`);

    const userIdsToDelete = profiles.map(p => p.id);

    // Delete users from auth.users (this will cascade delete from profiles)
    console.log(`[ClearDatabase] Deleting ${userIdsToDelete.length} users from auth.users...`);
    for (const userId of userIdsToDelete) {
        const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (deleteUserError) {
            console.warn(`[ClearDatabase] Failed to delete user ${userId}: ${deleteUserError.message}`);
            // Don't throw, try to delete other users
        }
    }
    console.log("[ClearDatabase] All users attempted to be deleted.");

    return new Response(JSON.stringify({ message: 'Database cleared successfully' }), {
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