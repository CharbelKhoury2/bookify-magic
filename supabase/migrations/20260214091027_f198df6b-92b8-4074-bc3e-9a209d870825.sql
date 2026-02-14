
-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- 2. user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. has_role security definer function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 4. RLS policies for user_roles
CREATE POLICY "Admins can read all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can read own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 5. book_generations table
CREATE TABLE public.book_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  child_name TEXT NOT NULL,
  theme_id TEXT NOT NULL,
  theme_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending'
);
ALTER TABLE public.book_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all generations"
  ON public.book_generations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can read own generations"
  ON public.book_generations FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Authenticated users can insert own generations"
  ON public.book_generations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update generations"
  ON public.book_generations FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 6. themes table
CREATE TABLE public.themes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  color_primary TEXT NOT NULL DEFAULT '#000000',
  color_secondary TEXT NOT NULL DEFAULT '#000000',
  color_accent TEXT NOT NULL DEFAULT '#000000',
  color_background TEXT NOT NULL DEFAULT '#ffffff',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.themes ENABLE ROW LEVEL SECURITY;

-- Anyone can read active themes
CREATE POLICY "Anyone can read active themes"
  ON public.themes FOR SELECT
  USING (is_active = true);

-- Admins can read all themes (including inactive)
CREATE POLICY "Admins can read all themes"
  ON public.themes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can insert themes
CREATE POLICY "Admins can insert themes"
  ON public.themes FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can update themes
CREATE POLICY "Admins can update themes"
  ON public.themes FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can delete themes
CREATE POLICY "Admins can delete themes"
  ON public.themes FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 7. Updated_at trigger for themes
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_themes_updated_at
  BEFORE UPDATE ON public.themes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Seed existing themes
INSERT INTO public.themes (id, name, emoji, description, color_primary, color_secondary, color_accent, color_background, sort_order) VALUES
  ('cosmic_journey', 'Cosmic Journey', '🚀', 'Space adventure with robots and planets', '#4a5899', '#00d9ff', '#ff6b9d', '#1a1f3a', 1),
  ('zoo_explorer', 'Zoo Explorer', '🦁', 'Animal adventure in the jungle', '#2d5016', '#8bc34a', '#ff9800', '#f1f8e9', 2),
  ('dragon_quest', 'Dragon Quest', '🐉', 'Fantasy adventure with dragons', '#5d4037', '#ff6f00', '#ffd54f', '#fbe9e7', 3),
  ('princess_story', 'Princess Story', '👑', 'Magical fairy tale adventure', '#f8bbd0', '#e1bee7', '#b39ddb', '#fce4ec', 4),
  ('champion_spirit', 'Champion Spirit', '⚽', 'Sports and teamwork adventure', '#ff5722', '#2196f3', '#ffc107', '#fff3e0', 5),
  ('tooth_fairy', 'Tooth Fairy', '🧚', 'Magical tooth fairy adventure', '#ce93d8', '#fff9c4', '#c5e1a5', '#f3e5f5', 6);
