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
    console.log("[delete-coach] Function invoked.");
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      console.error("[delete-coach] Unauthorized: No user found for the provided token.");
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    console.log(`[delete-coach] Caller user ID: ${user.id}`);

    // Verify if the caller is an admin
    const { data: adminProfile, error: adminProfileError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (adminProfileError || !adminProfile || adminProfile.role !== 'admin') {
      console.error(`[delete-coach] Forbidden: User ${user.id} is not an admin. Their role is ${adminProfile?.role}.`);
      return new Response(JSON.stringify({ error: 'Forbidden: User is not an admin' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    console.log("[delete-coach] Admin role verified for the caller.");

    const { coach_id } = await req.json()
    if (!coach_id) {
      console.error("[delete-coach] Bad Request: coach_id is required.");
      return new Response(JSON.stringify({ error: 'coach_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    console.log(`[delete-coach] Attempting to delete coach with ID: ${coach_id}`);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Delete the coach's auth user. This will cascade delete their profile and coach_student_pairs
    // due to ON DELETE CASCADE constraints defined in the database schema.
    console.log(`[delete-coach] Deleting auth user ${coach_id}. This will automatically unassign students due to 'ON DELETE CASCADE' on 'coach_student_pairs' table.`);
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(coach_id)
    if (deleteError) {
      console.error(`[delete-coach] Failed to delete coach auth user ${coach_id}: ${deleteError.message}`);
      throw new Error(`Failed to delete coach: ${deleteError.message}`);
    }

    console.log(`[delete-coach] Coach ${coach_id} deleted successfully.`);
    return new Response(JSON.stringify({ message: 'Coach deleted successfully' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error("[delete-coach] An unexpected error occurred:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})