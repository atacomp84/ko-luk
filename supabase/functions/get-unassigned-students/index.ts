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
    // Use service role key to bypass RLS for this internal operation
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Get all student IDs that are already assigned to a coach.
    const { data: assignedPairs, error: pairsError } = await supabaseAdmin
      .from('coach_student_pairs')
      .select('student_id');

    if (pairsError) throw pairsError;

    const assignedStudentIds = assignedPairs.map(pair => pair.student_id);

    // 2. Get all profiles with the 'student' role that are NOT in the assigned list.
    let query = supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('role', 'student');

    if (assignedStudentIds.length > 0) {
      query = query.not('id', 'in', `(${assignedStudentIds.join(',')})`);
    }

    const { data: unassignedStudentsData, error: studentsError } = await query;

    if (studentsError) throw studentsError;

    return new Response(JSON.stringify(unassignedStudentsData), {
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