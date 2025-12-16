import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Starting daily driver status reset...')

    // Reset all drivers to 'unassigned' status
    const { data, error } = await supabase
      .from('drivers')
      .update({ status: 'unassigned' })
      .neq('status', 'off') // Don't reset drivers marked as 'off' (day off)
      .select('id, name')

    if (error) {
      console.error('Error resetting driver statuses:', error)
      throw error
    }

    console.log(`Reset ${data?.length || 0} drivers to unassigned status`)

    // Log the reset to status_history for auditing
    if (data && data.length > 0) {
      const historyEntries = data.map(driver => ({
        entity_type: 'driver',
        entity_id: driver.id,
        entity_name: driver.name,
        field_changed: 'status',
        old_value: 'various',
        new_value: 'unassigned',
      }))

      const { error: historyError } = await supabase
        .from('status_history')
        .insert(historyEntries)

      if (historyError) {
        console.error('Error logging status history:', historyError)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Reset ${data?.length || 0} drivers to unassigned status` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error('Error in reset-driver-status:', errorMessage)
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})