-- ============================================================================
-- Migration 004: Mobile App Telemetry, Dynamic Pricing Settings, Push Tokens,
-- Apple Guideline 5.1.1(v) Account Deletion, and Explicit Base Grants
-- ============================================================================

-- 1. Driver Locations Table (for live mobile GPS telemetry & customer tracking)
CREATE TABLE IF NOT EXISTS public.driver_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  accuracy NUMERIC,
  heading NUMERIC,
  speed NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_created
  ON public.driver_locations(driver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_driver_locations_order_id
  ON public.driver_locations(order_id);

CREATE POLICY "Drivers can insert their own locations"
  ON public.driver_locations
  FOR INSERT
  WITH CHECK (
    driver_id IN (
      SELECT d.id FROM public.drivers d
      INNER JOIN public.users u ON u.id = d.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can view driver locations"
  ON public.driver_locations
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 2. Dynamic Pricing Settings Table (harvested from preferred-delivery-hub-1)
CREATE TABLE IF NOT EXISTS public.pricing_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug TEXT DEFAULT 'preferred-solutions-transport' NOT NULL,
  base_fee NUMERIC NOT NULL DEFAULT 50.00,
  per_mile_rate NUMERIC NOT NULL DEFAULT 2.00,
  fuel_pct NUMERIC NOT NULL DEFAULT 0.10,
  minimum_charge NUMERIC NOT NULL DEFAULT 25.00,
  currency TEXT NOT NULL DEFAULT 'usd',
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.pricing_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read pricing settings"
  ON public.pricing_settings
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert pricing settings"
  ON public.pricing_settings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update pricing settings"
  ON public.pricing_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid() AND role = 'admin'
    )
  );

-- Seed default PST pricing row if table is empty
INSERT INTO public.pricing_settings (tenant_slug, base_fee, per_mile_rate, fuel_pct, minimum_charge, currency)
SELECT 'preferred-solutions-transport', 50.00, 2.00, 0.10, 25.00, 'usd'
WHERE NOT EXISTS (SELECT 1 FROM public.pricing_settings);

-- 3. Native Mobile Push Token & Commercial B2B Logistics Columns
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS expo_push_token TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS organization_id TEXT DEFAULT 'preferred-solutions-transport';
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS expo_push_token TEXT;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS vehicle_type TEXT DEFAULT 'cargo_van';
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS organization_id TEXT DEFAULT 'preferred-solutions-transport';

-- Commercial B2B Order Matrix, Driver Settlement & Chain-of-Custody Columns
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS organization_id TEXT DEFAULT 'preferred-solutions-transport';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS vehicle_type TEXT DEFAULT 'sedan';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS service_level TEXT DEFAULT 'urgent_3h';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS accessorials TEXT[] DEFAULT '{}';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS billing_mode TEXT DEFAULT 'card';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS po_number TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS driver_payout NUMERIC DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pickup_custody_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pickup_custody_lat NUMERIC;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pickup_custody_lng NUMERIC;

-- Legal-Grade Proof of Delivery (Vector Signature SVG + GPS Audit Stamp)
ALTER TABLE public.delivery_proof ADD COLUMN IF NOT EXISTS signature_svg TEXT;
ALTER TABLE public.delivery_proof ADD COLUMN IF NOT EXISTS gps_lat NUMERIC;
ALTER TABLE public.delivery_proof ADD COLUMN IF NOT EXISTS gps_lng NUMERIC;
ALTER TABLE public.delivery_proof ADD COLUMN IF NOT EXISTS gps_accuracy_m NUMERIC;
ALTER TABLE public.delivery_proof ADD COLUMN IF NOT EXISTS geofence_verified BOOLEAN DEFAULT true;

-- Pricing Settings: Driver Commission Split & HIPAA/Medical Compliance Toggle
ALTER TABLE public.pricing_settings ADD COLUMN IF NOT EXISTS driver_commission_rate NUMERIC DEFAULT 0.70;
ALTER TABLE public.pricing_settings ADD COLUMN IF NOT EXISTS hipaa_compliance_mode BOOLEAN DEFAULT false;

-- Allow users to insert their own profile row on mobile sign-up
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users can insert their own record'
  ) THEN
    CREATE POLICY "Users can insert their own record"
      ON public.users
      FOR INSERT
      WITH CHECK (auth.uid() = auth_id);
  END IF;
END $$;

-- Allow authenticated customers to insert their own customer record and orders on mobile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'Authenticated users can insert own customer record'
  ) THEN
    CREATE POLICY "Authenticated users can insert own customer record"
      ON public.customers
      FOR INSERT
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Authenticated users can insert orders'
  ) THEN
    CREATE POLICY "Authenticated users can insert orders"
      ON public.orders
      FOR INSERT
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- 4. Apple App Store Guideline 5.1.1(v) — In-App Account Deletion RPC
CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_uid UUID := auth.uid();
BEGIN
  IF caller_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM public.users WHERE auth_id = caller_uid;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_own_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;

-- 5. Explicit Base Schema & Table Grants (Supabase CLI 2.107+ compatibility)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
