
-- Create profile_role enum
CREATE TYPE public.profile_role AS ENUM ('ADMIN', 'DISPATCHER', 'WASHER', 'USER');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role profile_role NOT NULL DEFAULT 'USER',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index on role for faster lookups
CREATE INDEX idx_profiles_role ON public.profiles(role);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create function to get current user's profile role (security definer to bypass RLS)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS profile_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

-- Create function to check if user has a specific profile role
CREATE OR REPLACE FUNCTION public.has_profile_role(_user_id uuid, _role profile_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND role = _role AND active = true
  )
$$;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'ADMIN' AND active = true
  )
$$;

-- Create function to check if user is dispatcher or admin
CREATE OR REPLACE FUNCTION public.is_dispatcher_or_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('ADMIN', 'DISPATCHER') AND active = true
  )
$$;

-- Create function to check if user is washer
CREATE OR REPLACE FUNCTION public.is_washer()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'WASHER' AND active = true
  )
$$;

-- Trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 'USER');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- =============================================
-- RLS POLICIES FOR PROFILES
-- =============================================

-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Admins can read all profiles
CREATE POLICY "Admins can read all profiles" ON public.profiles
  FOR SELECT USING (is_admin());

-- Admins can update all profiles (including role)
CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (is_admin());

-- Users can update their own profile EXCEPT role (handled by separate columns)
CREATE POLICY "Users can update own profile except role" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can insert profiles
CREATE POLICY "Admins can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (is_admin());

-- =============================================
-- UPDATE RLS POLICIES FOR CAR WASHER TABLES
-- =============================================

-- Drop existing policies on cleaning_queues
DROP POLICY IF EXISTS "Admins and dispatchers can manage queues" ON public.cleaning_queues;
DROP POLICY IF EXISTS "Washers can read queues" ON public.cleaning_queues;

-- cleaning_queues: ADMIN/DISPATCHER full CRUD, WASHER/USER read-only
CREATE POLICY "Admin full access to queues" ON public.cleaning_queues
  FOR ALL USING (is_admin());

CREATE POLICY "Dispatcher full access to queues" ON public.cleaning_queues
  FOR ALL USING (has_profile_role(auth.uid(), 'DISPATCHER'));

CREATE POLICY "Washer can read queues" ON public.cleaning_queues
  FOR SELECT USING (is_washer());

CREATE POLICY "User can read queues" ON public.cleaning_queues
  FOR SELECT USING (has_profile_role(auth.uid(), 'USER'));

-- Drop existing policies on cleaning_queue_items
DROP POLICY IF EXISTS "Admins and dispatchers can manage queue items" ON public.cleaning_queue_items;
DROP POLICY IF EXISTS "Washers can read queue items" ON public.cleaning_queue_items;
DROP POLICY IF EXISTS "Washers can update queue item status" ON public.cleaning_queue_items;

-- cleaning_queue_items: ADMIN full CRUD
CREATE POLICY "Admin full access to queue items" ON public.cleaning_queue_items
  FOR ALL USING (is_admin());

-- cleaning_queue_items: DISPATCHER full CRUD
CREATE POLICY "Dispatcher full access to queue items" ON public.cleaning_queue_items
  FOR ALL USING (has_profile_role(auth.uid(), 'DISPATCHER'));

-- cleaning_queue_items: WASHER read
CREATE POLICY "Washer can read queue items" ON public.cleaning_queue_items
  FOR SELECT USING (is_washer());

-- cleaning_queue_items: WASHER can update ONLY status, cleaned_by, cleaned_at
CREATE POLICY "Washer can update cleaning status only" ON public.cleaning_queue_items
  FOR UPDATE USING (is_washer())
  WITH CHECK (is_washer());

-- cleaning_queue_items: USER read-only
CREATE POLICY "User can read queue items" ON public.cleaning_queue_items
  FOR SELECT USING (has_profile_role(auth.uid(), 'USER'));

-- Drop existing policies on queue_alerts
DROP POLICY IF EXISTS "Admins and dispatchers can manage alerts" ON public.queue_alerts;
DROP POLICY IF EXISTS "Washers can read alerts" ON public.queue_alerts;

-- queue_alerts: ADMIN full CRUD
CREATE POLICY "Admin full access to alerts" ON public.queue_alerts
  FOR ALL USING (is_admin());

-- queue_alerts: DISPATCHER full CRUD
CREATE POLICY "Dispatcher full access to alerts" ON public.queue_alerts
  FOR ALL USING (has_profile_role(auth.uid(), 'DISPATCHER'));

-- queue_alerts: WASHER read-only
CREATE POLICY "Washer can read alerts" ON public.queue_alerts
  FOR SELECT USING (is_washer());

-- queue_alerts: USER read-only
CREATE POLICY "User can read alerts" ON public.queue_alerts
  FOR SELECT USING (has_profile_role(auth.uid(), 'USER'));

-- Drop existing policies on alert_acknowledgements
DROP POLICY IF EXISTS "Admins and dispatchers can manage acknowledgements" ON public.alert_acknowledgements;
DROP POLICY IF EXISTS "Washers can create acknowledgements" ON public.alert_acknowledgements;
DROP POLICY IF EXISTS "Washers can read acknowledgements" ON public.alert_acknowledgements;

-- alert_acknowledgements: ADMIN full CRUD
CREATE POLICY "Admin full access to acknowledgements" ON public.alert_acknowledgements
  FOR ALL USING (is_admin());

-- alert_acknowledgements: DISPATCHER read-only
CREATE POLICY "Dispatcher can read acknowledgements" ON public.alert_acknowledgements
  FOR SELECT USING (has_profile_role(auth.uid(), 'DISPATCHER'));

-- alert_acknowledgements: WASHER read + create
CREATE POLICY "Washer can read acknowledgements" ON public.alert_acknowledgements
  FOR SELECT USING (is_washer());

CREATE POLICY "Washer can create acknowledgements" ON public.alert_acknowledgements
  FOR INSERT WITH CHECK (is_washer());

-- alert_acknowledgements: USER read-only
CREATE POLICY "User can read acknowledgements" ON public.alert_acknowledgements
  FOR SELECT USING (has_profile_role(auth.uid(), 'USER'));

-- Drop existing policies on damage_reports
DROP POLICY IF EXISTS "Admins and dispatchers can manage damage reports" ON public.damage_reports;
DROP POLICY IF EXISTS "Washers can create damage reports" ON public.damage_reports;
DROP POLICY IF EXISTS "Washers can update own damage reports" ON public.damage_reports;
DROP POLICY IF EXISTS "Washers can read damage reports" ON public.damage_reports;

-- damage_reports: ADMIN full CRUD
CREATE POLICY "Admin full access to damage reports" ON public.damage_reports
  FOR ALL USING (is_admin());

-- damage_reports: DISPATCHER read-only
CREATE POLICY "Dispatcher can read damage reports" ON public.damage_reports
  FOR SELECT USING (has_profile_role(auth.uid(), 'DISPATCHER'));

-- damage_reports: WASHER read + create + update own
CREATE POLICY "Washer can read damage reports" ON public.damage_reports
  FOR SELECT USING (is_washer());

CREATE POLICY "Washer can create damage reports" ON public.damage_reports
  FOR INSERT WITH CHECK (is_washer() AND started_by = auth.uid());

CREATE POLICY "Washer can update own damage reports" ON public.damage_reports
  FOR UPDATE USING (is_washer() AND started_by = auth.uid());

-- Drop existing policies on damage_photos
DROP POLICY IF EXISTS "Admins and dispatchers can manage damage photos" ON public.damage_photos;
DROP POLICY IF EXISTS "Washers can insert damage photos" ON public.damage_photos;
DROP POLICY IF EXISTS "Washers can read damage photos" ON public.damage_photos;

-- damage_photos: ADMIN full CRUD
CREATE POLICY "Admin full access to damage photos" ON public.damage_photos
  FOR ALL USING (is_admin());

-- damage_photos: DISPATCHER read-only
CREATE POLICY "Dispatcher can read damage photos" ON public.damage_photos
  FOR SELECT USING (has_profile_role(auth.uid(), 'DISPATCHER'));

-- damage_photos: WASHER read + create
CREATE POLICY "Washer can read damage photos" ON public.damage_photos
  FOR SELECT USING (is_washer());

CREATE POLICY "Washer can create damage photos" ON public.damage_photos
  FOR INSERT WITH CHECK (is_washer() AND uploaded_by = auth.uid());
