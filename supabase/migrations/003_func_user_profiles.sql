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

-- Admin policies for user_profiles (depend on is_admin)
CREATE POLICY "Admins can read all profiles" ON user_profiles FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can update all profiles" ON user_profiles FOR UPDATE USING (public.is_admin());

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

-- Trigger for new user
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

-- Trigger for role change prevention
DROP TRIGGER IF EXISTS prevent_role_change_trigger ON user_profiles;
CREATE TRIGGER prevent_role_change_trigger
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_change();
