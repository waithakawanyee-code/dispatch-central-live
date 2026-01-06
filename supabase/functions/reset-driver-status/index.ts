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

    // Get all vehicles to identify take-home drivers
    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('unit, classification')

    const takeHomeVehicles = new Set(
      vehicles?.filter(v => v.classification === 'take_home').map(v => v.unit) || []
    )

    // Reset regular drivers (no default vehicle or not take-home) to 'unassigned'
    const { data: regularDrivers, error: regularError } = await supabase
      .from('drivers')
      .update({ status: 'unassigned' })
      .neq('status', 'off')
      .or('default_vehicle.is.null,default_vehicle.eq.')
      .select('id, name')

    if (regularError) {
      console.error('Error resetting regular driver statuses:', regularError)
      throw regularError
    }

    // Get drivers with default vehicles
    const { data: driversWithVehicles } = await supabase
      .from('drivers')
      .select('id, name, default_vehicle')
      .neq('status', 'off')
      .not('default_vehicle', 'is', null)
      .neq('default_vehicle', '')

    // Separate take-home drivers from others
    const takeHomeDrivers = driversWithVehicles?.filter(d => 
      d.default_vehicle && takeHomeVehicles.has(d.default_vehicle)
    ) || []
    const otherDriversWithVehicles = driversWithVehicles?.filter(d => 
      !d.default_vehicle || !takeHomeVehicles.has(d.default_vehicle)
    ) || []

    // Reset non-take-home drivers with vehicles to unassigned
    if (otherDriversWithVehicles.length > 0) {
      const otherIds = otherDriversWithVehicles.map(d => d.id)
      await supabase
        .from('drivers')
        .update({ status: 'unassigned' })
        .in('id', otherIds)
    }

    // Set take-home drivers to 'assigned' with their vehicle
    for (const driver of takeHomeDrivers) {
      await supabase
        .from('drivers')
        .update({ status: 'assigned', vehicle: driver.default_vehicle })
        .eq('id', driver.id)
    }

    const totalReset = (regularDrivers?.length || 0) + otherDriversWithVehicles.length
    console.log(`Reset ${totalReset} drivers to unassigned, ${takeHomeDrivers.length} take-home drivers to assigned`)

    // Log the reset to status_history for auditing
    const allResetDrivers = [...(regularDrivers || []), ...otherDriversWithVehicles]
    if (allResetDrivers.length > 0) {
      const historyEntries = allResetDrivers.map((driver: { id: string; name: string }) => ({
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

    // Log take-home drivers being set to assigned
    if (takeHomeDrivers.length > 0) {
      const takeHomeHistoryEntries = takeHomeDrivers.map((driver: { id: string; name: string }) => ({
        entity_type: 'driver',
        entity_id: driver.id,
        entity_name: driver.name,
        field_changed: 'status',
        old_value: 'various',
        new_value: 'assigned',
      }))

      await supabase
        .from('status_history')
        .insert(takeHomeHistoryEntries)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Reset ${totalReset} drivers to unassigned, ${takeHomeDrivers.length} take-home drivers to assigned` 
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