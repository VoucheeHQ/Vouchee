-- =====================================================
-- CLEANING PLATFORM DATABASE SCHEMA
-- =====================================================
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- Then click "RUN" to execute
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── ENUMS ───────────────────────────────────────────

CREATE TYPE user_role AS ENUM ('customer', 'cleaner', 'admin');
CREATE TYPE frequency_type AS ENUM ('weekly', 'fortnightly', 'monthly');
CREATE TYPE application_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');
CREATE TYPE subscription_status AS ENUM ('active', 'paused', 'cancelled', 'pending');
CREATE TYPE request_status AS ENUM ('pending', 'assigned', 'active', 'completed', 'cancelled');
CREATE TYPE session_status AS ENUM ('scheduled', 'completed', 'cancelled', 'no_show');
CREATE TYPE issue_status AS ENUM ('open', 'investigating', 'resolved', 'closed');

-- ─── PROFILES TABLE ──────────────────────────────────

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role user_role NOT NULL DEFAULT 'customer',
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'customer');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── CUSTOMERS TABLE ─────────────────────────────────

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  postcode TEXT NOT NULL,
  frequency frequency_type NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status subscription_status NOT NULL DEFAULT 'pending',
  paused_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_customers_profile_id ON customers(profile_id);
CREATE INDEX idx_customers_stripe_customer_id ON customers(stripe_customer_id);

-- ─── CLEANERS TABLE ──────────────────────────────────

CREATE TABLE cleaners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  application_status application_status NOT NULL DEFAULT 'pending',
  application_notes TEXT,
  bio TEXT,
  years_experience INTEGER,
  own_supplies BOOLEAN NOT NULL DEFAULT false,
  dbs_checked BOOLEAN NOT NULL DEFAULT false,
  availability_days TEXT[] NOT NULL DEFAULT '{}',
  max_radius_miles INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_cleaners_updated_at BEFORE UPDATE ON cleaners
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_cleaners_profile_id ON cleaners(profile_id);
CREATE INDEX idx_cleaners_application_status ON cleaners(application_status);

-- ─── CLEAN REQUESTS TABLE ────────────────────────────

CREATE TABLE clean_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  assigned_cleaner_id UUID REFERENCES cleaners(id) ON DELETE SET NULL,
  property_type TEXT NOT NULL,
  bedrooms INTEGER NOT NULL,
  bathrooms INTEGER NOT NULL,
  has_pets BOOLEAN NOT NULL DEFAULT false,
  special_instructions TEXT,
  preferred_day TEXT,
  preferred_time TEXT,
  start_date DATE,
  status request_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_clean_requests_updated_at BEFORE UPDATE ON clean_requests
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_clean_requests_customer_id ON clean_requests(customer_id);
CREATE INDEX idx_clean_requests_assigned_cleaner_id ON clean_requests(assigned_cleaner_id);
CREATE INDEX idx_clean_requests_status ON clean_requests(status);

-- ─── CLEAN SESSIONS TABLE ────────────────────────────

CREATE TABLE clean_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clean_request_id UUID NOT NULL REFERENCES clean_requests(id) ON DELETE CASCADE,
  cleaner_id UUID NOT NULL REFERENCES cleaners(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  scheduled_time TEXT NOT NULL,
  completed_at TIMESTAMPTZ,
  status session_status NOT NULL DEFAULT 'scheduled',
  customer_notes TEXT,
  cleaner_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_clean_sessions_updated_at BEFORE UPDATE ON clean_sessions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_clean_sessions_clean_request_id ON clean_sessions(clean_request_id);
CREATE INDEX idx_clean_sessions_cleaner_id ON clean_sessions(cleaner_id);
CREATE INDEX idx_clean_sessions_scheduled_date ON clean_sessions(scheduled_date);
CREATE INDEX idx_clean_sessions_status ON clean_sessions(status);

-- ─── ISSUES TABLE ────────────────────────────────────

CREATE TABLE issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  clean_session_id UUID REFERENCES clean_sessions(id) ON DELETE SET NULL,
  issue_type TEXT NOT NULL CHECK (issue_type IN ('quality', 'damage', 'no_show', 'late', 'other')),
  description TEXT NOT NULL,
  status issue_status NOT NULL DEFAULT 'open',
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_issues_updated_at BEFORE UPDATE ON issues
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_issues_customer_id ON issues(customer_id);
CREATE INDEX idx_issues_clean_session_id ON issues(clean_session_id);
CREATE INDEX idx_issues_status ON issues(status);

-- ─── TIER PRICING TABLE ──────────────────────────────

CREATE TABLE tier_pricing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  frequency frequency_type NOT NULL UNIQUE,
  price_per_session DECIMAL(10,2) NOT NULL,
  sessions_per_month DECIMAL(10,4) NOT NULL,
  monthly_charge DECIMAL(10,2) NOT NULL,
  stripe_price_id TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_tier_pricing_updated_at BEFORE UPDATE ON tier_pricing
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default pricing tiers
INSERT INTO tier_pricing (frequency, price_per_session, sessions_per_month, monthly_charge) VALUES
  ('weekly', 9.99, 4.3333, 43.33),
  ('fortnightly', 14.99, 2.1667, 32.48),
  ('monthly', 19.99, 1.0000, 19.99);

-- ─── ROW LEVEL SECURITY (RLS) ────────────────────────

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleaners ENABLE ROW LEVEL SECURITY;
ALTER TABLE clean_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE clean_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE tier_pricing ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Customers policies
CREATE POLICY "Customers can view their own data"
  ON customers FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Customers can update their own data"
  ON customers FOR UPDATE
  USING (profile_id = auth.uid());

CREATE POLICY "Customers can insert their own data"
  ON customers FOR INSERT
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Admins can view all customers"
  ON customers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Cleaners policies
CREATE POLICY "Cleaners can view their own data"
  ON cleaners FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Cleaners can update their own data"
  ON cleaners FOR UPDATE
  USING (profile_id = auth.uid());

CREATE POLICY "Cleaners can insert their own data"
  ON cleaners FOR INSERT
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Admins can manage all cleaners"
  ON cleaners FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Clean requests policies
CREATE POLICY "Customers can view their own requests"
  ON clean_requests FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM customers WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Cleaners can view assigned requests"
  ON clean_requests FOR SELECT
  USING (
    assigned_cleaner_id IN (
      SELECT id FROM cleaners WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Customers can create requests"
  ON clean_requests FOR INSERT
  WITH CHECK (
    customer_id IN (
      SELECT id FROM customers WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all requests"
  ON clean_requests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Clean sessions policies
CREATE POLICY "Customers can view their sessions"
  ON clean_sessions FOR SELECT
  USING (
    clean_request_id IN (
      SELECT id FROM clean_requests
      WHERE customer_id IN (
        SELECT id FROM customers WHERE profile_id = auth.uid()
      )
    )
  );

CREATE POLICY "Cleaners can view their sessions"
  ON clean_sessions FOR SELECT
  USING (
    cleaner_id IN (
      SELECT id FROM cleaners WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Cleaners can update their sessions"
  ON clean_sessions FOR UPDATE
  USING (
    cleaner_id IN (
      SELECT id FROM cleaners WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all sessions"
  ON clean_sessions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Issues policies
CREATE POLICY "Customers can view their issues"
  ON issues FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM customers WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Customers can create issues"
  ON issues FOR INSERT
  WITH CHECK (
    customer_id IN (
      SELECT id FROM customers WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all issues"
  ON issues FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Tier pricing policies (public read, admin write)
CREATE POLICY "Anyone can view pricing"
  ON tier_pricing FOR SELECT
  USING (active = true);

CREATE POLICY "Admins can manage pricing"
  ON tier_pricing FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- DONE! Your database is ready.
-- =====================================================
