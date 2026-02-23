-- ######################################################################
-- # SUPABASE SECURITY PATCH FOR WONDER WRAPS LB
-- # This script enables Row Level Security (RLS) and sets up 
-- # strictly controlled access policies for all tables.
-- ######################################################################

-- 1. CLEANUP: Drop existing policies to ensure a fresh state
DROP POLICY IF EXISTS "Users can view own role" ON user_roles;
DROP POLICY IF EXISTS "Only admins can manage roles" ON user_roles;
DROP POLICY IF EXISTS "Users can manage own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own generations" ON book_generations;
DROP POLICY IF EXISTS "Admins can view all generations" ON book_generations;

-- 2. ENABLE RLS: Lock down the tables
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_generations ENABLE ROW LEVEL SECURITY;

-- 3. HELPER FUNCTION: Secure role check
-- SECURITY DEFINER allows the function to bypass RLS to check roles 
-- but it is restricted to only return a boolean.
CREATE OR REPLACE FUNCTION public.has_role(required_role app_role)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = required_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. USER ROLES POLICIES
-- Normal users can only see their own role
CREATE POLICY "Users can view own role" ON user_roles
FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Only Admins can create or change roles
CREATE POLICY "Only admins can manage roles" ON user_roles
FOR ALL TO authenticated USING (public.has_role('admin'));

-- 5. PROFILES POLICIES (Sync with user data)
-- Users can see and update their own profile data
CREATE POLICY "Users can manage own profile" ON profiles
FOR ALL TO authenticated USING (auth.uid() = id);

-- Admins can browse the entire user list for management
CREATE POLICY "Admins can manage all profiles" ON profiles
FOR ALL TO authenticated USING (public.has_role('admin'));

-- 6. BOOK GENERATIONS POLICIES
-- Users can only see the logs of books THEY generated
CREATE POLICY "Users can view own generations" ON book_generations
FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Admins can see the cluster logs to monitor activity
CREATE POLICY "Admins can view all generations" ON book_generations
FOR SELECT TO authenticated USING (public.has_role('admin'));

-- 7. NOTIFICATION
-- This script is complete. Run this in your Supabase SQL Editor.
