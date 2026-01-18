
-- Create trigger function to restrict WASHER updates on cleaning_queue_items
-- This ensures washers can ONLY update: status, cleaned_by, cleaned_at
CREATE OR REPLACE FUNCTION public.restrict_washer_queue_item_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If user is a washer (not admin/dispatcher), restrict what they can change
  IF is_washer() AND NOT is_admin() AND NOT has_profile_role(auth.uid(), 'DISPATCHER') THEN
    -- Prevent changes to protected columns
    IF OLD.queue_id IS DISTINCT FROM NEW.queue_id THEN
      RAISE EXCEPTION 'Washers cannot change queue_id';
    END IF;
    IF OLD.vehicle_id IS DISTINCT FROM NEW.vehicle_id THEN
      RAISE EXCEPTION 'Washers cannot change vehicle_id';
    END IF;
    IF OLD.position IS DISTINCT FROM NEW.position THEN
      RAISE EXCEPTION 'Washers cannot change position';
    END IF;
    IF OLD.out_at IS DISTINCT FROM NEW.out_at THEN
      RAISE EXCEPTION 'Washers cannot change out_at';
    END IF;
    IF OLD.dispatcher_notes IS DISTINCT FROM NEW.dispatcher_notes THEN
      RAISE EXCEPTION 'Washers cannot change dispatcher_notes';
    END IF;
    IF OLD.urgency IS DISTINCT FROM NEW.urgency THEN
      RAISE EXCEPTION 'Washers cannot change urgency';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_washer_queue_item_restrictions
  BEFORE UPDATE ON public.cleaning_queue_items
  FOR EACH ROW EXECUTE FUNCTION public.restrict_washer_queue_item_update();

-- Create trigger function to prevent users from changing their own role
CREATE OR REPLACE FUNCTION public.prevent_self_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If user is updating their own profile and trying to change role, and they're not admin
  IF OLD.id = auth.uid() AND OLD.role IS DISTINCT FROM NEW.role AND NOT is_admin() THEN
    RAISE EXCEPTION 'You cannot change your own role';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_role_change_restriction
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_self_role_change();
