// @ts-nocheck 
/// <reference types="https://deno.land/x/deno/cli/types/snapshot.d.ts" />

import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log("update-user-admin function invoked.");

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // 1. Get the authorization header
    const authHeader = req.headers.get('Authorization')!
    
    // 2. Create a Supabase client with the user's token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // 3. Get the user object
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      console.error("Unauthorized: No user found for the provided token.");
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    console.log(`Caller user ID: ${user.id}`);

    // 4. Create a Supabase admin client to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 5. Verify if the caller is an admin
    const { data: adminProfile, error: adminProfileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (adminProfileError || !adminProfile || adminProfile.role !== 'admin') {
      console.error(`Forbidden: User ${user.id} is not an admin. Their role is ${adminProfile?.role}.`);
      return new Response(JSON.stringify({ error: 'Forbidden: User is not an admin' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    console.log("Admin role verified for the caller.");

    // 6. Get the user data to update from the request body
    const { user_id_to_update, first_name, last_name, role } = await req.json();
    if (!user_id_to_update) {
      return new Response(JSON.stringify({ error: 'user_id_to_update is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    console.log(`Attempting to update user ID: ${user_id_to_update} with data:`, { first_name, last_name, role });

    // 7. Perform the update on the profiles table
    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        first_name,
        last_name,
        role,
      })
      .eq('id', user_id_to_update)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating profile:", updateError);
      throw updateError;
    }

    console.log("Successfully updated profile:", updatedProfile);
    return new Response(JSON.stringify({ message: 'User updated successfully', data: updatedProfile }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error("An unexpected error occurred:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})