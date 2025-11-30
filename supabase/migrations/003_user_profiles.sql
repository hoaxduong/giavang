-- User Profiles Table for RBAC Authentication System
-- Extends Supabase auth.users with profile data and roles

-- Create user_role enum
CREATE TYPE user_role AS ENUM ('user', 'admin');

-- User profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for role-based queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can update their own profile (except role)
-- Note: Role changes are prevented at the application level
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Function to check if current user is admin (bypasses RLS to avoid recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Policy: Admins can read all profiles
CREATE POLICY "Admins can read all profiles"
  ON user_profiles
  FOR SELECT
  USING (public.is_admin());

-- Policy: Admins can update all profiles (including role)
CREATE POLICY "Admins can update all profiles"
  ON user_profiles
  FOR UPDATE
  USING (public.is_admin());

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    'user'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to prevent non-admins from changing roles
CREATE OR REPLACE FUNCTION public.prevent_role_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow role change if running as service role (auth.uid() is null)
  -- This allows direct SQL execution in Supabase dashboard
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Allow role change if the current user is an admin (using helper function)
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;
  
  -- Prevent role change if user is not admin and not service role
  IF OLD.role != NEW.role THEN
    RAISE EXCEPTION 'Only administrators can change user roles';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to prevent role changes by non-admins
DROP TRIGGER IF EXISTS prevent_role_change_trigger ON user_profiles;
CREATE TRIGGER prevent_role_change_trigger
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_change();

-- Trigger to update updated_at on profile updates
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE user_profiles IS 'User profile data extending Supabase auth.users with role-based access control';
COMMENT ON COLUMN user_profiles.id IS 'References auth.users.id';
COMMENT ON COLUMN user_profiles.role IS 'User role: user (default) or admin';
COMMENT ON COLUMN user_profiles.full_name IS 'User full name';
COMMENT ON COLUMN user_profiles.avatar_url IS 'URL to user avatar image';

