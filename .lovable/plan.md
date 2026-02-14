

# Admin Panel for Bookify

## Overview
Build a secure admin panel at `/admin` with analytics dashboard and theme/story management. Only users with the `admin` role can access it.

## What You'll Get

### 1. Admin Dashboard (Analytics)
- Total books generated (all time, last 7 days, last 30 days)
- Most popular themes (bar chart)
- Recent generations list (child name, theme, date)
- Total registered users count

### 2. Theme & Story Manager
- View all available themes in a table
- Add new themes (name, emoji, description, colors)
- Edit existing themes
- Delete themes
- Toggle themes active/inactive (hide from customers without deleting)

### 3. Security
- Role-based access using a `user_roles` table
- Only admins can access `/admin` routes
- Server-side role validation via a `has_role` helper function
- Protected with RLS policies

---

## Technical Details

### Database Changes (3 new tables + 1 function + 1 trigger)

**1. `user_roles` table** -- stores admin roles
- `id` (uuid, PK)
- `user_id` (uuid, FK to auth.users, ON DELETE CASCADE)
- `role` (enum: admin, moderator, user)
- Unique constraint on (user_id, role)
- RLS: admins can read all roles; users can read their own

**2. `book_generations` table** -- logs every book generation for analytics
- `id` (uuid, PK)
- `user_id` (uuid, FK to auth.users)
- `child_name` (text)
- `theme_id` (text)
- `theme_name` (text)
- `created_at` (timestamptz)
- `status` (text: pending, completed, failed)
- RLS: admins can read all; users can read their own

**3. `themes` table** -- dynamic theme management (replaces hardcoded themes)
- `id` (text, PK)
- `name` (text)
- `emoji` (text)
- `description` (text)
- `color_primary`, `color_secondary`, `color_accent`, `color_background` (text)
- `is_active` (boolean, default true)
- `sort_order` (integer)
- `created_at` / `updated_at` (timestamptz)
- RLS: anyone can read active themes; admins can insert/update/delete

**4. `has_role` function** -- security definer function to check roles without RLS recursion

**5. Seed data** -- insert the 6 existing themes into the `themes` table

### New Pages & Components

- `/admin` -- Dashboard with stats cards and charts (using Recharts)
- `/admin/themes` -- Theme management table with add/edit/delete
- `AdminLayout` -- Sidebar layout with navigation between admin pages
- `AdminGuard` -- Auth wrapper that checks for admin role, redirects non-admins
- `useAdminCheck` hook -- checks if current user has admin role

### Code Changes

- **Edge function update**: `generate-book/index.ts` will log each generation to `book_generations` table
- **ThemeSelector update**: fetch themes from database instead of hardcoded `THEMES` array
- **App.tsx**: add `/admin/*` routes wrapped in `AdminGuard`
- **New hooks**: `useAdminCheck`, `useThemes`, `useBookGenerations`

### File Structure

```text
src/
  pages/
    admin/
      AdminDashboard.tsx
      AdminThemes.tsx
  components/
    admin/
      AdminLayout.tsx
      AdminGuard.tsx
      StatsCard.tsx
      ThemeForm.tsx
  hooks/
    useAdminCheck.ts
    useThemes.ts
    useBookGenerations.ts
```

### Assigning Admin Role
After the tables are created, your user account will be assigned the admin role manually so you can access the panel immediately.

