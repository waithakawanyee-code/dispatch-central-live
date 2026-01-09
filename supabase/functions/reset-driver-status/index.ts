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

    console.log('Starting daily driver status reset and shift cleanup...')

    // ============================================
    // PHASE 1: Close stale shifts (2+ days old)
    // ============================================
    const twoDaysAgo = new Date()
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
    twoDaysAgo.setHours(23, 59, 59, 999)
    const twoDaysAgoStr = twoDaysAgo.toISOString()

    // Find open shifts from 2+ days ago
    const { data: staleShifts, error: staleShiftsError } = await supabase
      .from('shifts')
      .select('id, driver_id, driver_name, punch_in_at, workday_date, exception_flags')
      .is('punch_out_at', null)
      .lt('punch_in_at', twoDaysAgoStr)

    if (staleShiftsError) {
      console.error('Error fetching stale shifts:', staleShiftsError)
    } else if (staleShifts && staleShifts.length > 0) {
      console.log(`Found ${staleShifts.length} stale open shift(s) from 2+ days ago`)

      for (const shift of staleShifts) {
        // Calculate midnight of the day after the shift's workday as the close time
        const shiftDate = new Date(shift.workday_date)
        shiftDate.setDate(shiftDate.getDate() + 1)
        shiftDate.setHours(0, 0, 0, 0)
        const closeTime = shiftDate.toISOString()

        // Update the shift with auto-close exception flag
        const { error: updateError } = await supabase
          .from('shifts')
          .update({
            punch_out_at: closeTime,
            exception_flags: {
              ...(shift.exception_flags || {}),
              auto_closed_stale: true,
              auto_closed_by_system: true,
              auto_closed_at: new Date().toISOString(),
              auto_close_reason: 'Shift open for 2+ days - auto-closed by daily reset',
            },
          })
          .eq('id', shift.id)

        if (updateError) {
          console.error(`Error closing stale shift ${shift.id}:`, updateError)
        } else {
          console.log(`Auto-closed stale shift for ${shift.driver_name} (${shift.workday_date})`)

          // Close any open vehicle segments for this shift
          await supabase
            .from('shift_vehicle_segments')
            .update({ segment_out_at: closeTime })
            .eq('shift_id', shift.id)
            .is('segment_out_at', null)

          // Log to status_history
          await supabase.from('status_history').insert({
            entity_type: 'driver',
            entity_id: shift.driver_id,
            entity_name: shift.driver_name,
            field_changed: 'shift_auto_closed_stale',
            old_value: `Open since ${shift.punch_in_at}`,
            new_value: `Auto-closed (stale shift from ${shift.workday_date})`,
          })
        }
      }
    } else {
      console.log('No stale shifts found to close')
    }

    // ============================================
    // PHASE 2: Reset driver statuses (existing logic)
    // ============================================
    
    // Get today's day of week (0 = Sunday, 6 = Saturday)
    const todayDayOfWeek = new Date().getDay()
    console.log(`Today is day of week: ${todayDayOfWeek}`)

    // Get all vehicles to identify take-home drivers
    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('unit, classification')

    const takeHomeVehicles = new Set(
      vehicles?.filter(v => v.classification === 'take_home').map(v => v.unit) || []
    )

    // Get driver schedules for today to check who is working
    const { data: todaySchedules } = await supabase
      .from('driver_schedules')
      .select('driver_id, is_off')
      .eq('day_of_week', todayDayOfWeek)

    // Build a map of driver_id -> is_off for today
    const driverScheduleMap = new Map<string, boolean>()
    todaySchedules?.forEach(s => {
      driverScheduleMap.set(s.driver_id, s.is_off)
    })

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

    // Separate take-home drivers from others, and check if they're scheduled to work today
    const takeHomeDriversWorking: typeof driversWithVehicles = []
    const takeHomeDriversOff: typeof driversWithVehicles = []
    const otherDriversWithVehicles: typeof driversWithVehicles = []

    driversWithVehicles?.forEach(d => {
      if (d.default_vehicle && takeHomeVehicles.has(d.default_vehicle)) {
        // This is a take-home driver - check if they're scheduled to work today
        const isOff = driverScheduleMap.get(d.id)
        if (isOff === true) {
          // Explicitly marked as off today
          takeHomeDriversOff.push(d)
          console.log(`Take-home driver ${d.name} is OFF today`)
        } else {
          // Working today (either has schedule with is_off=false, or no schedule entry means working)
          takeHomeDriversWorking.push(d)
          console.log(`Take-home driver ${d.name} is WORKING today`)
        }
      } else {
        otherDriversWithVehicles.push(d)
      }
    })

    // Reset non-take-home drivers with vehicles to unassigned
    if (otherDriversWithVehicles && otherDriversWithVehicles.length > 0) {
      const otherIds = otherDriversWithVehicles.map(d => d.id)
      await supabase
        .from('drivers')
        .update({ status: 'unassigned' })
        .in('id', otherIds)
    }

    // Reset take-home drivers who are OFF today to unassigned
    if (takeHomeDriversOff && takeHomeDriversOff.length > 0) {
      const offIds = takeHomeDriversOff.map(d => d.id)
      await supabase
        .from('drivers')
        .update({ status: 'unassigned', vehicle: null })
        .in('id', offIds)
    }

    // Set take-home drivers who are WORKING today to 'assigned' with their vehicle
    for (const driver of takeHomeDriversWorking || []) {
      await supabase
        .from('drivers')
        .update({ status: 'assigned', vehicle: driver.default_vehicle })
        .eq('id', driver.id)
    }

    const totalReset = (regularDrivers?.length || 0) + (otherDriversWithVehicles?.length || 0) + (takeHomeDriversOff?.length || 0)
    const totalAssigned = takeHomeDriversWorking?.length || 0
    const totalStaleClosed = staleShifts?.length || 0
    console.log(`Reset ${totalReset} drivers to unassigned, ${totalAssigned} take-home drivers to assigned, ${totalStaleClosed} stale shifts auto-closed`)

    // Log the reset to status_history for auditing
    const allResetDrivers = [...(regularDrivers || []), ...(otherDriversWithVehicles || []), ...(takeHomeDriversOff || [])]
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
    if (takeHomeDriversWorking && takeHomeDriversWorking.length > 0) {
      const takeHomeHistoryEntries = takeHomeDriversWorking.map((driver: { id: string; name: string }) => ({
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
        message: `Reset ${totalReset} drivers to unassigned, ${totalAssigned} take-home drivers to assigned, ${totalStaleClosed} stale shifts auto-closed` 
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