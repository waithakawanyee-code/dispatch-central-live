

## Simplify Build: Remove Driver Hours Tracking

The `shifts` table and its punch_in/punch_out fields are **critical to dispatch workflow** (status transitions, vehicle assignment, workday closeout). Those stay untouched. What gets removed is the **legacy `time_punches` table usage** and all hours-reporting UI.

### Dependency Analysis

Before removing, here is what depends on what:

- **`time_punches` table** — used in 3 places: `useDispatchData.ts` (writes on status change), `DriverRow.tsx` (view/edit/delete punch dialog), `DriverDetailsPanel.tsx` (reads for hours display). None of these are needed if hours tracking moves elsewhere.
- **`shifts` table** — used heavily for dispatch status, vehicle segments, workday closeout banner, punch in/out dialogs. **Not touched.**
- **Print/Download Hours PDF** — only in `Drivers.tsx`, using `printHoursPdf.ts`. Self-contained, safe to remove.
- **TimePunchReport** — standalone admin tab component. Safe to remove.

### Changes

**1. Remove `recordTimePunch` from `useDispatchData.ts`**
- Delete the `recordTimePunch` function entirely
- Remove the two calls to it in the status change handler (lines ~204-209)
- The shift-based punch_in/punch_out still records via `useShifts` — dispatch status is unaffected

**2. Remove time_punches UI from `DriverRow.tsx`**
- Remove `fetchPunchTimes`, `handleEditPunch`, `handleSaveEdit`, `handleDeletePunch`, `handleAddPunch` functions
- Remove the punch times dialog and all related state (`punchTimes`, `showPunchTimesDialog`, `editingPunchId`, etc.)
- Keep all other DriverRow functionality (status badges, actions, vehicle info)

**3. Simplify `DriverDetailsPanel.tsx`**
- Remove the `time_punches` query from the parallel fetch
- Remove `todayPunches` state and all hours calculation code (`calculateTotalHours`, `getLatestPunchIn`, `getLatestPunchOut`)
- Remove the Elapsed/Total hours display sections
- Keep: contact info, vehicle info, report time, schedule info, CDL badge — all stay

**4. Remove Print/Download Hours from `Drivers.tsx`**
- Remove the Print and Download buttons from the toolbar
- Remove the `printHoursPdf` and `downloadHoursPdf` imports
- Remove the `Printer` and `Download` icon imports (if unused elsewhere)
- Remove the week hours calculation logic tied to those buttons

**5. Remove TimePunchReport admin tab**
- Remove the `TimePunchReport` import and tab case from `Admin.tsx`
- Remove the "timeclock" tab entry from the admin sidebar/tabs
- Delete `src/components/admin/TimePunchReport.tsx`

**6. Remove `printHoursPdf.ts` utility**
- Delete `src/lib/printHoursPdf.ts` (no longer referenced)

**7. Remove `useDriverShifts.ts` hook** (if unused elsewhere)
- This hook calculates total hours from shifts — check if anything imports it beyond hours display

### What stays safe
- All shift-based dispatch operations (punch in/out dialogs, status transitions, vehicle segments)
- Workday closeout banner (uses `shifts` table, not `time_punches`)
- Shuttle punch automation edge function
- Driver status workflow (confirm, punch in, punch out, done)
- The `time_punches` table itself remains in the database — we just stop reading/writing to it from the app

