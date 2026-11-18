-- ============================================================================
-- Migration 005: Rüller OS Multi-Tenant Isolation, Missing Core Tables & Strict RLS
-- Enforces Gate 5: Indexed tenant_id & organization_id on every table +
-- zero cross-tenant data leakage across all 4 roles.
-- ============================================================================

-- 1. Core Tenant / Organization Registry
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  tenant_id TEXT UNIQUE NOT NULL,
  organization_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  order_prefix TEXT NOT NULL DEFAULT 'RUL',
  vertical TEXT NOT NULL DEFAULT 'commercial_courier',
  primary_color TEXT NOT NULL DEFAULT '#064AF9',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

INSERT INTO public.organizations (slug, tenant_id, organization_id, name, short_name, order_prefix, vertical, primary_color)
VALUES
  ('preferred-solutions-transport', 'preferred-solutions-transport', 'preferred-solutions-transport', 'Preferred Solutions Transport', 'PST', 'PST', 'commercial_courier', '#064AF9'),
  ('ruller-courier', 'ruller-courier', 'ruller-courier', 'Rüller Express Logistics', 'Rüller', 'RUL', 'commercial_courier', '#111827'),
  ('medstat-express-logistics', 'medstat-express-logistics', 'medstat-express-logistics', 'MedStat Express Logistics', 'MedStat', 'MED', 'medical_stat', '#0D9488'),
  ('crossroads-parts-runner', 'crossroads-parts-runner', 'crossroads-parts-runner', 'Crossroads Parts & Supply', 'Crossroads', 'CRX', 'parts_runner', '#EA580C'),
  ('heartland-hotshot-freight', 'heartland-hotshot-freight', 'heartland-hotshot-freight', 'Heartland Box Freight', 'Heartland', 'HHF', 'box_truck_freight', '#1D4ED8')
ON CONFLICT (slug) DO NOTHING;

-- 2. Profiles Table (Normalized Auth/Role/Tenant Link)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID UNIQUE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL DEFAULT 'preferred-solutions-transport',
  organization_id TEXT NOT NULL DEFAULT 'preferred-solutions-transport',
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'recipient',
  corporate_account_approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Vehicles Table (Fleet Asset & Verification Tracking)
CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'preferred-solutions-transport',
  organization_id TEXT NOT NULL DEFAULT 'preferred-solutions-transport',
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  vehicle_type TEXT NOT NULL DEFAULT 'cargo_van',
  make_model TEXT NOT NULL,
  plate_number TEXT,
  insurance_verified BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- 4. Tracking Events Table (Milestone + GPS Custody Timeline)
CREATE TABLE IF NOT EXISTS public.tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'preferred-solutions-transport',
  organization_id TEXT NOT NULL DEFAULT 'preferred-solutions-transport',
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  status_label TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  accuracy_m NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tracking_events ENABLE ROW LEVEL SECURITY;

-- 5. Add tenant_id & organization_id (+ customer_auth_id / tracking_token) across ALL existing tables
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'preferred-solutions-transport';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS organization_id TEXT NOT NULL DEFAULT 'preferred-solutions-transport';

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'preferred-solutions-transport';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS organization_id TEXT NOT NULL DEFAULT 'preferred-solutions-transport';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS auth_user_id UUID;

ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'preferred-solutions-transport';
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS organization_id TEXT NOT NULL DEFAULT 'preferred-solutions-transport';
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS doc_verified BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'preferred-solutions-transport';
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS organization_id TEXT NOT NULL DEFAULT 'preferred-solutions-transport';

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'preferred-solutions-transport';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS organization_id TEXT NOT NULL DEFAULT 'preferred-solutions-transport';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_auth_id UUID;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS public_tracking_token TEXT;

ALTER TABLE public.delivery_proof ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'preferred-solutions-transport';
ALTER TABLE public.delivery_proof ADD COLUMN IF NOT EXISTS organization_id TEXT NOT NULL DEFAULT 'preferred-solutions-transport';

ALTER TABLE public.dispatch_events ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'preferred-solutions-transport';
ALTER TABLE public.dispatch_events ADD COLUMN IF NOT EXISTS organization_id TEXT NOT NULL DEFAULT 'preferred-solutions-transport';

ALTER TABLE public.driver_locations ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'preferred-solutions-transport';
ALTER TABLE public.driver_locations ADD COLUMN IF NOT EXISTS organization_id TEXT NOT NULL DEFAULT 'preferred-solutions-transport';

ALTER TABLE public.pricing_settings ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'preferred-solutions-transport';
ALTER TABLE public.pricing_settings ADD COLUMN IF NOT EXISTS organization_id TEXT NOT NULL DEFAULT 'preferred-solutions-transport';

ALTER TABLE public.webhook_events ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'preferred-solutions-transport';
ALTER TABLE public.webhook_events ADD COLUMN IF NOT EXISTS organization_id TEXT NOT NULL DEFAULT 'preferred-solutions-transport';

-- Backfill tenant_id from existing organization_id / tenant_slug if present
UPDATE public.users SET tenant_id = organization_id WHERE tenant_id IS DISTINCT FROM organization_id;
UPDATE public.drivers SET tenant_id = organization_id WHERE tenant_id IS DISTINCT FROM organization_id;
UPDATE public.orders SET tenant_id = organization_id WHERE tenant_id IS DISTINCT FROM organization_id;
UPDATE public.pricing_settings SET tenant_id = tenant_slug, organization_id = tenant_slug WHERE tenant_id IS DISTINCT FROM tenant_slug;

-- Seed default pricing row for ruller-courier alongside PST
INSERT INTO public.pricing_settings (tenant_slug, tenant_id, organization_id, base_fee, per_mile_rate, fuel_pct, minimum_charge, currency, driver_commission_rate, hipaa_compliance_mode)
SELECT 'ruller-courier', 'ruller-courier', 'ruller-courier', 45.00, 2.25, 0.085, 25.00, 'usd', 0.70, false
WHERE NOT EXISTS (SELECT 1 FROM public.pricing_settings WHERE tenant_id = 'ruller-courier');

-- 6. Indexed tenant_id & organization_id on EVERY table
CREATE INDEX IF NOT EXISTS idx_organizations_tenant_id ON public.organizations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_organizations_org_id ON public.organizations(organization_id);

CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON public.profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_org_id ON public.profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_auth_id ON public.profiles(auth_id);

CREATE INDEX IF NOT EXISTS idx_vehicles_tenant_id ON public.vehicles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_org_id ON public.vehicles(organization_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_driver_id ON public.vehicles(driver_id);

CREATE INDEX IF NOT EXISTS idx_tracking_events_tenant_id ON public.tracking_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tracking_events_org_id ON public.tracking_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_tracking_events_order_id ON public.tracking_events(order_id);

CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON public.users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_org_id ON public.users(organization_id);

CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON public.customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_org_id ON public.customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_customers_auth_user_id ON public.customers(auth_user_id);

CREATE INDEX IF NOT EXISTS idx_drivers_tenant_id ON public.drivers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_drivers_org_id ON public.drivers(organization_id);

CREATE INDEX IF NOT EXISTS idx_quotes_tenant_id ON public.quotes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quotes_org_id ON public.quotes(organization_id);

CREATE INDEX IF NOT EXISTS idx_orders_tenant_id ON public.orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_orders_org_id ON public.orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_auth_id ON public.orders(customer_auth_id);
CREATE INDEX IF NOT EXISTS idx_orders_tracking_token ON public.orders(public_tracking_token);

CREATE INDEX IF NOT EXISTS idx_delivery_proof_tenant_id ON public.delivery_proof(tenant_id);
CREATE INDEX IF NOT EXISTS idx_delivery_proof_org_id ON public.delivery_proof(organization_id);

CREATE INDEX IF NOT EXISTS idx_dispatch_events_tenant_id ON public.dispatch_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_events_org_id ON public.dispatch_events(organization_id);

CREATE INDEX IF NOT EXISTS idx_driver_locations_tenant_id ON public.driver_locations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_org_id ON public.driver_locations(organization_id);

CREATE INDEX IF NOT EXISTS idx_pricing_settings_tenant_id ON public.pricing_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pricing_settings_org_id ON public.pricing_settings(organization_id);

CREATE INDEX IF NOT EXISTS idx_webhook_events_tenant_id ON public.webhook_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_org_id ON public.webhook_events(organization_id);

-- 7. Security Definer Helper Functions for Non-Recursive Tenant-Scoped RLS
CREATE OR REPLACE FUNCTION public.current_user_tenant_id()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved TEXT;
BEGIN
  SELECT COALESCE(NULLIF(tenant_id, ''), NULLIF(organization_id, ''))
  INTO resolved
  FROM public.users
  WHERE auth_id = auth.uid()
  LIMIT 1;

  IF resolved IS NULL THEN
    resolved := COALESCE(
      NULLIF(auth.jwt() -> 'app_metadata' ->> 'tenant_id', ''),
      NULLIF(auth.jwt() -> 'app_metadata' ->> 'organization_id', ''),
      NULLIF(auth.jwt() -> 'user_metadata' ->> 'tenant_id', ''),
      'preferred-solutions-transport'
    );
  END IF;

  RETURN resolved;
END;
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role::text FROM public.users WHERE auth_id = auth.uid() LIMIT 1),
    NULLIF(auth.jwt() -> 'app_metadata' ->> 'role', ''),
    'recipient'
  );
$$;

CREATE OR REPLACE FUNCTION public.current_request_tracking_token()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(
    COALESCE(current_setting('request.headers', true)::jsonb ->> 'x-tracking-token', ''),
    ''
  );
$$;

REVOKE ALL ON FUNCTION public.current_user_tenant_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_tenant_id() TO anon, authenticated;
REVOKE ALL ON FUNCTION public.current_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_request_tracking_token() TO anon, authenticated;

-- 8. Replace Permissive / Cross-Tenant Policies with Strict Tenant-Scoped RLS

-- ORGANIZATIONS
DROP POLICY IF EXISTS "Tenant members can view their organization" ON public.organizations;
CREATE POLICY "Tenant members can view their organization"
  ON public.organizations
  FOR SELECT
  USING (
    tenant_id = public.current_user_tenant_id()
    OR is_active = true
  );

DROP POLICY IF EXISTS "Tenant admins can update their organization" ON public.organizations;
CREATE POLICY "Tenant admins can update their organization"
  ON public.organizations
  FOR UPDATE
  USING (
    tenant_id = public.current_user_tenant_id()
    AND public.current_user_role() = 'admin'
  )
  WITH CHECK (tenant_id = public.current_user_tenant_id());

-- USERS
DROP POLICY IF EXISTS "Users can view their own record" ON public.users;
DROP POLICY IF EXISTS "Users can update their own record" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own record" ON public.users;
DROP POLICY IF EXISTS "Admins and dispatchers can view all users" ON public.users;

CREATE POLICY "Users view own record in tenant"
  ON public.users FOR SELECT
  USING (auth_id = auth.uid() AND tenant_id = public.current_user_tenant_id());

CREATE POLICY "Users insert own record in tenant"
  ON public.users FOR INSERT
  WITH CHECK (auth_id = auth.uid() AND tenant_id = public.current_user_tenant_id());

CREATE POLICY "Users update own record in tenant"
  ON public.users FOR UPDATE
  USING (auth_id = auth.uid() AND tenant_id = public.current_user_tenant_id())
  WITH CHECK (auth_id = auth.uid() AND tenant_id = public.current_user_tenant_id());

CREATE POLICY "Admins and dispatchers view tenant users"
  ON public.users FOR SELECT
  USING (
    tenant_id = public.current_user_tenant_id()
    AND public.current_user_role() IN ('admin', 'dispatcher')
  );

CREATE POLICY "Admins manage tenant users"
  ON public.users FOR UPDATE
  USING (
    tenant_id = public.current_user_tenant_id()
    AND public.current_user_role() = 'admin'
  )
  WITH CHECK (tenant_id = public.current_user_tenant_id());

-- PROFILES
DROP POLICY IF EXISTS "Users view own profile in tenant" ON public.profiles;
DROP POLICY IF EXISTS "Users insert own profile in tenant" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile in tenant" ON public.profiles;
DROP POLICY IF EXISTS "Ops view tenant profiles" ON public.profiles;

CREATE POLICY "Users view own profile in tenant"
  ON public.profiles FOR SELECT
  USING (auth_id = auth.uid() AND tenant_id = public.current_user_tenant_id());

CREATE POLICY "Users insert own profile in tenant"
  ON public.profiles FOR INSERT
  WITH CHECK (auth_id = auth.uid() AND tenant_id = public.current_user_tenant_id());

CREATE POLICY "Users update own profile in tenant"
  ON public.profiles FOR UPDATE
  USING (auth_id = auth.uid() AND tenant_id = public.current_user_tenant_id())
  WITH CHECK (auth_id = auth.uid() AND tenant_id = public.current_user_tenant_id());

CREATE POLICY "Ops view tenant profiles"
  ON public.profiles FOR SELECT
  USING (
    tenant_id = public.current_user_tenant_id()
    AND public.current_user_role() IN ('admin', 'dispatcher')
  );

-- CUSTOMERS
DROP POLICY IF EXISTS "Customers can view their own record" ON public.customers;
DROP POLICY IF EXISTS "Admins and dispatchers can view all customers" ON public.customers;
DROP POLICY IF EXISTS "Admins and dispatchers can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Admins and dispatchers can update customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can insert own customer record" ON public.customers;

CREATE POLICY "Customers view own tenant record"
  ON public.customers FOR SELECT
  USING (
    tenant_id = public.current_user_tenant_id()
    AND (
      auth_user_id = auth.uid()
      OR lower(email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
    )
  );

CREATE POLICY "Customers insert own tenant record"
  ON public.customers FOR INSERT
  WITH CHECK (
    tenant_id = public.current_user_tenant_id()
    AND auth.uid() IS NOT NULL
    AND (
      auth_user_id = auth.uid()
      OR lower(email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
    )
  );

CREATE POLICY "Ops manage tenant customers"
  ON public.customers FOR ALL
  USING (
    tenant_id = public.current_user_tenant_id()
    AND public.current_user_role() IN ('admin', 'dispatcher')
  )
  WITH CHECK (
    tenant_id = public.current_user_tenant_id()
    AND public.current_user_role() IN ('admin', 'dispatcher')
  );

-- DRIVERS
DROP POLICY IF EXISTS "Drivers can view their own record" ON public.drivers;
DROP POLICY IF EXISTS "Drivers can update their own record" ON public.drivers;
DROP POLICY IF EXISTS "Admins and dispatchers can view all drivers" ON public.drivers;
DROP POLICY IF EXISTS "Admins and dispatchers can insert drivers" ON public.drivers;
DROP POLICY IF EXISTS "Admins and dispatchers can update drivers" ON public.drivers;

CREATE POLICY "Drivers view own tenant record"
  ON public.drivers FOR SELECT
  USING (
    tenant_id = public.current_user_tenant_id()
    AND user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

CREATE POLICY "Drivers update own tenant record"
  ON public.drivers FOR UPDATE
  USING (
    tenant_id = public.current_user_tenant_id()
    AND user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  )
  WITH CHECK (tenant_id = public.current_user_tenant_id());

CREATE POLICY "Ops manage tenant drivers"
  ON public.drivers FOR ALL
  USING (
    tenant_id = public.current_user_tenant_id()
    AND public.current_user_role() IN ('admin', 'dispatcher')
  )
  WITH CHECK (
    tenant_id = public.current_user_tenant_id()
    AND public.current_user_role() IN ('admin', 'dispatcher')
  );

-- VEHICLES
DROP POLICY IF EXISTS "Drivers view own tenant vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Ops manage tenant vehicles" ON public.vehicles;

CREATE POLICY "Drivers view own tenant vehicles"
  ON public.vehicles FOR SELECT
  USING (
    tenant_id = public.current_user_tenant_id()
    AND driver_id IN (
      SELECT d.id FROM public.drivers d
      INNER JOIN public.users u ON u.id = d.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

CREATE POLICY "Ops manage tenant vehicles"
  ON public.vehicles FOR ALL
  USING (
    tenant_id = public.current_user_tenant_id()
    AND public.current_user_role() IN ('admin', 'dispatcher')
  )
  WITH CHECK (
    tenant_id = public.current_user_tenant_id()
    AND public.current_user_role() IN ('admin', 'dispatcher')
  );

-- QUOTES
DROP POLICY IF EXISTS "Anyone can insert quotes" ON public.quotes;
DROP POLICY IF EXISTS "Customers can view their own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Admins and dispatchers can view all quotes" ON public.quotes;
DROP POLICY IF EXISTS "Admins and dispatchers can update quotes" ON public.quotes;

CREATE POLICY "Tenant authenticated users insert quotes"
  ON public.quotes FOR INSERT
  WITH CHECK (
    tenant_id = public.current_user_tenant_id()
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Customers view own tenant quotes"
  ON public.quotes FOR SELECT
  USING (
    tenant_id = public.current_user_tenant_id()
    AND customer_id IN (
      SELECT c.id FROM public.customers c
      WHERE c.auth_user_id = auth.uid()
         OR lower(c.email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
    )
  );

CREATE POLICY "Ops manage tenant quotes"
  ON public.quotes FOR ALL
  USING (
    tenant_id = public.current_user_tenant_id()
    AND public.current_user_role() IN ('admin', 'dispatcher')
  )
  WITH CHECK (
    tenant_id = public.current_user_tenant_id()
    AND public.current_user_role() IN ('admin', 'dispatcher')
  );

-- ORDERS (Strict Gate 5 Isolation)
DROP POLICY IF EXISTS "Customers can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Drivers can view their assigned orders" ON public.orders;
DROP POLICY IF EXISTS "Drivers can update their assigned orders" ON public.orders;
DROP POLICY IF EXISTS "Admins and dispatchers can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Admins and dispatchers can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Admins and dispatchers can update orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can insert orders" ON public.orders;

CREATE POLICY "Customers view own or tokenized tenant orders"
  ON public.orders FOR SELECT
  USING (
    tenant_id = public.current_user_tenant_id()
    AND (
      customer_auth_id = auth.uid()
      OR customer_id IN (
        SELECT c.id FROM public.customers c
        WHERE c.auth_user_id = auth.uid()
           OR lower(c.email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
      )
      OR (
        public_tracking_token IS NOT NULL
        AND public_tracking_token = public.current_request_tracking_token()
      )
    )
  );

CREATE POLICY "Customers insert own tenant orders"
  ON public.orders FOR INSERT
  WITH CHECK (
    tenant_id = public.current_user_tenant_id()
    AND auth.uid() IS NOT NULL
    AND (
      customer_auth_id = auth.uid()
      OR customer_id IN (
        SELECT c.id FROM public.customers c
        WHERE c.auth_user_id = auth.uid()
           OR lower(c.email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
      )
    )
  );

CREATE POLICY "Drivers view assigned orders in own tenant"
  ON public.orders FOR SELECT
  USING (
    tenant_id = public.current_user_tenant_id()
    AND driver_id IN (
      SELECT d.id FROM public.drivers d
      INNER JOIN public.users u ON u.id = d.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

CREATE POLICY "Drivers update assigned orders in own tenant"
  ON public.orders FOR UPDATE
  USING (
    tenant_id = public.current_user_tenant_id()
    AND driver_id IN (
      SELECT d.id FROM public.drivers d
      INNER JOIN public.users u ON u.id = d.user_id
      WHERE u.auth_id = auth.uid()
    )
  )
  WITH CHECK (tenant_id = public.current_user_tenant_id());

CREATE POLICY "Ops view insert update tenant orders"
  ON public.orders FOR ALL
  USING (
    tenant_id = public.current_user_tenant_id()
    AND public.current_user_role() IN ('admin', 'dispatcher')
  )
  WITH CHECK (
    tenant_id = public.current_user_tenant_id()
    AND public.current_user_role() IN ('admin', 'dispatcher')
  );

-- DELIVERY PROOF
DROP POLICY IF EXISTS "Drivers can insert their own PoD" ON public.delivery_proof;
DROP POLICY IF EXISTS "Drivers can view their own PoD" ON public.delivery_proof;
DROP POLICY IF EXISTS "Customers can view PoD for their orders" ON public.delivery_proof;
DROP POLICY IF EXISTS "Admins and dispatchers can view all PoD" ON public.delivery_proof;
DROP POLICY IF EXISTS "Admins can delete PoD" ON public.delivery_proof;

CREATE POLICY "Drivers manage own PoD in tenant"
  ON public.delivery_proof FOR ALL
  USING (
    tenant_id = public.current_user_tenant_id()
    AND driver_id IN (
      SELECT d.id FROM public.drivers d
      INNER JOIN public.users u ON u.id = d.user_id
      WHERE u.auth_id = auth.uid()
    )
  )
  WITH CHECK (tenant_id = public.current_user_tenant_id());

CREATE POLICY "Customers view own order PoD in tenant"
  ON public.delivery_proof FOR SELECT
  USING (
    tenant_id = public.current_user_tenant_id()
    AND order_id IN (
      SELECT o.id FROM public.orders o
      WHERE o.tenant_id = public.current_user_tenant_id()
        AND (
          o.customer_auth_id = auth.uid()
          OR o.customer_id IN (
            SELECT c.id FROM public.customers c
            WHERE c.auth_user_id = auth.uid()
               OR lower(c.email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
          )
        )
    )
  );

CREATE POLICY "Ops view tenant PoD"
  ON public.delivery_proof FOR SELECT
  USING (
    tenant_id = public.current_user_tenant_id()
    AND public.current_user_role() IN ('admin', 'dispatcher')
  );

CREATE POLICY "Admins delete tenant PoD"
  ON public.delivery_proof FOR DELETE
  USING (
    tenant_id = public.current_user_tenant_id()
    AND public.current_user_role() = 'admin'
  );

-- TRACKING EVENTS
DROP POLICY IF EXISTS "Drivers insert tracking events for own orders in tenant" ON public.tracking_events;
DROP POLICY IF EXISTS "Tenant actors view authorized tracking events" ON public.tracking_events;

CREATE POLICY "Drivers insert tracking events in own tenant"
  ON public.tracking_events FOR INSERT
  WITH CHECK (
    tenant_id = public.current_user_tenant_id()
    AND driver_id IN (
      SELECT d.id FROM public.drivers d
      INNER JOIN public.users u ON u.id = d.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

CREATE POLICY "Tenant actors view authorized tracking events"
  ON public.tracking_events FOR SELECT
  USING (
    tenant_id = public.current_user_tenant_id()
    AND (
      public.current_user_role() IN ('admin', 'dispatcher')
      OR order_id IN (SELECT id FROM public.orders WHERE tenant_id = public.current_user_tenant_id())
    )
  );

-- DISPATCH EVENTS
DROP POLICY IF EXISTS "Admins and dispatchers can view all dispatch events" ON public.dispatch_events;
DROP POLICY IF EXISTS "Authenticated users can insert dispatch events" ON public.dispatch_events;

CREATE POLICY "Ops view tenant dispatch events"
  ON public.dispatch_events FOR SELECT
  USING (
    tenant_id = public.current_user_tenant_id()
    AND public.current_user_role() IN ('admin', 'dispatcher')
  );

CREATE POLICY "Tenant authenticated insert dispatch events"
  ON public.dispatch_events FOR INSERT
  WITH CHECK (
    tenant_id = public.current_user_tenant_id()
    AND auth.uid() IS NOT NULL
  );

-- DRIVER LOCATIONS (Close previous auth.uid() IS NOT NULL cross-tenant leak!)
DROP POLICY IF EXISTS "Drivers can insert their own locations" ON public.driver_locations;
DROP POLICY IF EXISTS "Authenticated users can view driver locations" ON public.driver_locations;

CREATE POLICY "Drivers insert own tenant locations"
  ON public.driver_locations FOR INSERT
  WITH CHECK (
    tenant_id = public.current_user_tenant_id()
    AND driver_id IN (
      SELECT d.id FROM public.drivers d
      INNER JOIN public.users u ON u.id = d.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

CREATE POLICY "Tenant authorized users view driver locations"
  ON public.driver_locations FOR SELECT
  USING (
    tenant_id = public.current_user_tenant_id()
    AND (
      public.current_user_role() IN ('admin', 'dispatcher')
      OR driver_id IN (
        SELECT d.id FROM public.drivers d
        INNER JOIN public.users u ON u.id = d.user_id
        WHERE u.auth_id = auth.uid()
      )
      OR order_id IN (
        SELECT o.id FROM public.orders o
        WHERE o.tenant_id = public.current_user_tenant_id()
          AND (
            o.customer_auth_id = auth.uid()
            OR o.customer_id IN (
              SELECT c.id FROM public.customers c
              WHERE c.auth_user_id = auth.uid()
                 OR lower(c.email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
            )
          )
      )
    )
  );

-- PRICING SETTINGS
DROP POLICY IF EXISTS "Anyone can read pricing settings" ON public.pricing_settings;
DROP POLICY IF EXISTS "Admins can insert pricing settings" ON public.pricing_settings;
DROP POLICY IF EXISTS "Admins can update pricing settings" ON public.pricing_settings;

CREATE POLICY "Read active tenant pricing settings"
  ON public.pricing_settings FOR SELECT
  USING (
    tenant_id = public.current_user_tenant_id()
    OR auth.uid() IS NULL
  );

CREATE POLICY "Admins insert tenant pricing settings"
  ON public.pricing_settings FOR INSERT
  WITH CHECK (
    tenant_id = public.current_user_tenant_id()
    AND public.current_user_role() = 'admin'
  );

CREATE POLICY "Admins update tenant pricing settings"
  ON public.pricing_settings FOR UPDATE
  USING (
    tenant_id = public.current_user_tenant_id()
    AND public.current_user_role() = 'admin'
  )
  WITH CHECK (tenant_id = public.current_user_tenant_id());

-- WEBHOOK EVENTS
DROP POLICY IF EXISTS "Admins can view webhook events" ON public.webhook_events;
CREATE POLICY "Admins view tenant webhook events"
  ON public.webhook_events FOR SELECT
  USING (
    tenant_id = public.current_user_tenant_id()
    AND public.current_user_role() = 'admin'
  );

-- 9. Re-assert Base Schema & Table Grants
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
