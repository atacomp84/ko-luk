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
    console.log("[get-unassigned-students] Function invoked.");

    // Use service role key to bypass RLS for this internal operation
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Get all student IDs that are already assigned to a coach.
    console.log("[get-unassigned-students] Fetching assigned student IDs from coach_student_pairs...");
    const { data: assignedPairs, error: pairsError } = await supabaseAdmin
      .from('coach_student_pairs')
      .select('student_id');

    if (pairsError) {
      console.error("[get-unassigned-students] Error fetching assigned pairs:", pairsError.message);
      throw pairsError;
    }
    const assignedStudentIds = assignedPairs.map(pair => pair.student_id);
    console.log("[get-unassigned-students] Assigned student IDs:", assignedStudentIds);

    // 2. Get all profiles with the 'student' role that are NOT in the assigned list.
    console.log("[get-unassigned-students] Fetching student profiles...");
    let query = supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('role', 'student');

    if (assignedStudentIds.length > 0) {
      console.log("[get-unassigned-students] Filtering out assigned students.");
      query = query.not('id', 'in', `(${assignedStudentIds.join(',')})`);
    } else {
      console.log("[get-unassigned-students] No students currently assigned, fetching all students.");
    }

    const { data: unassignedStudentsData, error: studentsError } = await query;

    if (studentsError) {
      console.error("[get-unassigned-students] Error fetching unassigned students:", studentsError.message);
      throw studentsError;
    }
    console.log("[get-unassigned-students] Unassigned students fetched:", unassignedStudentsData);

    return new Response(JSON.stringify(unassignedStudentsData), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error("[get-unassigned-students] An unexpected error occurred:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})