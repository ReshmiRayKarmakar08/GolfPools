-- =============================================
-- GOLF CHARITY SUBSCRIPTION PLATFORM - SCHEMA
-- =============================================

-- Clean up existing tables and functions if re-running
DROP TABLE IF EXISTS email_logs CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS winners CASCADE;
DROP TABLE IF EXISTS draw_entries CASCADE;
DROP TABLE IF EXISTS monthly_draws CASCADE;
DROP TABLE IF EXISTS golf_scores CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS charities CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- USERS TABLE
-- =============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  avatar_url TEXT,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  email_verification_token VARCHAR(255),
  password_reset_token VARCHAR(255),
  password_reset_expires TIMESTAMPTZ,
  handicap DECIMAL(4,1),
  golf_club VARCHAR(200),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- CHARITIES TABLE
-- =============================================
CREATE TABLE charities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(200) UNIQUE NOT NULL,
  description TEXT,
  short_description VARCHAR(500),
  logo_url TEXT,
  banner_url TEXT,
  website_url TEXT,
  registration_number VARCHAR(100),
  category VARCHAR(100),
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  total_raised DECIMAL(12,2) DEFAULT 0,
  supporter_count INTEGER DEFAULT 0,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),
  address TEXT,
  bank_account_name VARCHAR(200),
  bank_account_number VARCHAR(50),
  bank_ifsc VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add default_charity_id to users (must be done after charities table is created)
ALTER TABLE users ADD COLUMN default_charity_id UUID REFERENCES charities(id);

-- =============================================
-- SUBSCRIPTIONS TABLE
-- =============================================
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_type VARCHAR(20) NOT NULL CHECK (plan_type IN ('monthly', 'yearly')),
  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'cancelled', 'expired', 'paused')),
  charity_id UUID REFERENCES charities(id),
  charity_percentage DECIMAL(5,2) DEFAULT 10.00,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  razorpay_subscription_id VARCHAR(255),
  razorpay_plan_id VARCHAR(255),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  cancelled_at TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PAYMENTS TABLE
-- =============================================
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  subscription_id UUID REFERENCES subscriptions(id),
  razorpay_payment_id VARCHAR(255) UNIQUE,
  razorpay_order_id VARCHAR(255),
  razorpay_signature VARCHAR(500),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  status VARCHAR(30) DEFAULT 'created' CHECK (status IN ('created', 'authorized', 'captured', 'refunded', 'failed')),
  payment_method VARCHAR(50),
  charity_id UUID REFERENCES charities(id),
  charity_amount DECIMAL(10,2),
  platform_amount DECIMAL(10,2),
  prize_pool_amount DECIMAL(10,2),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- GOLF SCORES TABLE
-- =============================================
CREATE TABLE golf_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 45),
  score_date DATE NOT NULL,
  course_name VARCHAR(200),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- MONTHLY DRAWS TABLE
-- =============================================
CREATE TABLE monthly_draws (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  draw_month INTEGER NOT NULL CHECK (draw_month >= 1 AND draw_month <= 12),
  draw_year INTEGER NOT NULL,
  draw_date TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'completed', 'cancelled')),
  winning_numbers INTEGER[] NOT NULL,
  draw_type VARCHAR(20) DEFAULT 'random' CHECK (draw_type IN ('random', 'algorithm')),
  total_pool DECIMAL(12,2) DEFAULT 0,
  five_match_pool DECIMAL(12,2) DEFAULT 0,
  four_match_pool DECIMAL(12,2) DEFAULT 0,
  three_match_pool DECIMAL(12,2) DEFAULT 0,
  jackpot_amount DECIMAL(12,2) DEFAULT 0,
  five_match_winner_count INTEGER DEFAULT 0,
  four_match_winner_count INTEGER DEFAULT 0,
  three_match_winner_count INTEGER DEFAULT 0,
  rollover_amount DECIMAL(12,2) DEFAULT 0,
  participant_count INTEGER DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(draw_month, draw_year)
);

-- =============================================
-- DRAW ENTRIES TABLE
-- =============================================
CREATE TABLE draw_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  draw_id UUID NOT NULL REFERENCES monthly_draws(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  subscription_id UUID REFERENCES subscriptions(id),
  numbers_entered INTEGER[] NOT NULL,
  match_count INTEGER DEFAULT 0,
  is_winner BOOLEAN DEFAULT false,
  prize_category VARCHAR(20) CHECK (prize_category IN ('5-match', '4-match', '3-match')),
  prize_amount DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(draw_id, user_id)
);

-- =============================================
-- WINNERS TABLE
-- =============================================
CREATE TABLE winners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  draw_id UUID NOT NULL REFERENCES monthly_draws(id),
  user_id UUID NOT NULL REFERENCES users(id),
  draw_entry_id UUID REFERENCES draw_entries(id),
  prize_category VARCHAR(20) NOT NULL CHECK (prize_category IN ('5-match', '4-match', '3-match')),
  prize_amount DECIMAL(10,2) NOT NULL,
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'verified', 'approved', 'paid', 'rejected')),
  proof_url TEXT,
  proof_uploaded_at TIMESTAMPTZ,
  admin_notes TEXT,
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  payment_reference VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- NOTIFICATIONS TABLE
-- =============================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- EMAIL LOGS TABLE
-- =============================================
CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  email_to VARCHAR(255) NOT NULL,
  email_type VARCHAR(50) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'bounced')),
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_golf_scores_user_id ON golf_scores(user_id);
CREATE INDEX idx_golf_scores_date ON golf_scores(score_date DESC);
CREATE INDEX idx_draw_entries_draw_id ON draw_entries(draw_id);
CREATE INDEX idx_draw_entries_user_id ON draw_entries(user_id);
CREATE INDEX idx_winners_draw_id ON winners(draw_id);
CREATE INDEX idx_winners_payment_status ON winners(payment_status);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- =============================================
-- UPDATED_AT TRIGGER FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_charities_updated_at BEFORE UPDATE ON charities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_golf_scores_updated_at BEFORE UPDATE ON golf_scores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_monthly_draws_updated_at BEFORE UPDATE ON monthly_draws FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_winners_updated_at BEFORE UPDATE ON winners FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- SEED DATA - CHARITIES
-- =============================================
INSERT INTO charities (name, slug, description, short_description, category, is_featured, is_active, contact_email) VALUES
('CRY - Child Rights and You', 'cry-india', 'CRY works to ensure lasting change in the lives of underprivileged children across India by addressing root causes of child rights violations.', 'Empowering underprivileged children across India', 'Children', true, true, 'info@cry.org'),
('Teach For India', 'teach-for-india', 'Teach For India works towards providing excellent education to all children by placing talented graduates as teachers in under-resourced schools.', 'Quality education for every child', 'Education', true, true, 'info@teachforindia.org'),
('HelpAge India', 'helpage-india', 'HelpAge India is a leading charity working for underprivileged elderly people in India, providing healthcare, shelter and rehabilitation.', 'Supporting India''s elderly in need', 'Elderly Care', true, true, 'contact@helpageindia.org'),
('WWF India', 'wwf-india', 'WWF India works towards conserving wildlife and natural habitats while reducing human impact on the environment.', 'Protecting wildlife and our planet', 'Environment', false, true, 'info@wwfindia.org'),
('Akshaya Patra Foundation', 'akshaya-patra', 'Akshaya Patra runs the world''s largest NGO-run mid-day meal programme, providing nutritious meals to school children across India.', 'No child goes hungry to school', 'Food & Nutrition', true, true, 'contact@akshayapatra.org'),
('iCall - Mental Health', 'icall-mental-health', 'iCall provides accessible and affordable mental health services through individual counselling, community programmes and workshops.', 'Mental health support for all', 'Mental Health', false, true, 'icall@tiss.edu');
