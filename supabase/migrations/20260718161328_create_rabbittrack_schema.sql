/*
# RabbitTrack Pro — Core Schema

1. Purpose
   Multi-tenant Rabbit Breeding Management System. Each authenticated user owns their own
   rabbits and breeding records. Family Access code grants lifetime premium on the profile.

2. New Tables
   - `profiles`: extends auth.users with family_access (bool) and premium flags.
   - `rabbits`: individual rabbits (Doe, Buck, Grower, Weaner) owned by a user.
   - `breeding_records`: per-doe breeding cycles (mating -> kindling -> weaning).

3. Columns
   profiles:
     id (uuid, pk, references auth.users), email, full_name, family_access (bool default false),
     premium (bool default false), premium_until (timestamptz nullable), role (text default 'user'),
     created_at.
   rabbits:
     id (uuid pk), user_id (uuid, default auth.uid()), rabbit_id (text), name, category
     (doe|buck|grower|weaner), breed, color, date_of_birth (date), status (text), weight (numeric),
     archived (bool default false), notes (text), parent_doe_id (uuid nullable, for weaners/growers),
     created_at, updated_at.
   breeding_records:
     id (uuid pk), user_id (uuid default auth.uid()), doe_id (uuid references rabbits on delete cascade),
     mating_date, nesting_box_date, kindling_date, kits_born (int), kits_alive (int), deaths (int),
     remating_date, weaning_date, weaners_count (int), weaners_transferred_to (text), notes (text),
     created_at, updated_at.

4. Security
   - RLS enabled on all tables.
   - profiles: owner can select/update own row.
   - rabbits: owner-scoped CRUD (select/insert/update/delete).
   - breeding_records: owner-scoped CRUD via user_id column.

5. Notes
   - user_id columns default to auth.uid() so client inserts omitting user_id succeed.
   - Indexes on user_id and category for dashboard queries.
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  family_access boolean NOT NULL DEFAULT false,
  premium boolean NOT NULL DEFAULT false,
  premium_until timestamptz,
  role text NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE IF NOT EXISTS rabbits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  rabbit_id text NOT NULL,
  name text,
  category text NOT NULL DEFAULT 'doe' CHECK (category IN ('doe','buck','grower','weaner')),
  breed text,
  color text,
  date_of_birth date,
  status text NOT NULL DEFAULT 'active',
  weight numeric(8,2),
  archived boolean NOT NULL DEFAULT false,
  notes text,
  parent_doe_id uuid REFERENCES rabbits(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE rabbits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_rabbits" ON rabbits;
CREATE POLICY "select_own_rabbits" ON rabbits FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_rabbits" ON rabbits;
CREATE POLICY "insert_own_rabbits" ON rabbits FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_rabbits" ON rabbits;
CREATE POLICY "update_own_rabbits" ON rabbits FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_rabbits" ON rabbits;
CREATE POLICY "delete_own_rabbits" ON rabbits FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_rabbits_user_id ON rabbits(user_id);
CREATE INDEX IF NOT EXISTS idx_rabbits_category ON rabbits(category);
CREATE INDEX IF NOT EXISTS idx_rabbits_archived ON rabbits(archived);

CREATE TABLE IF NOT EXISTS breeding_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  doe_id uuid NOT NULL REFERENCES rabbits(id) ON DELETE CASCADE,
  mating_date date,
  nesting_box_date date,
  kindling_date date,
  kits_born integer DEFAULT 0,
  kits_alive integer DEFAULT 0,
  deaths integer DEFAULT 0,
  remating_date date,
  weaning_date date,
  weaners_count integer DEFAULT 0,
  weaners_transferred_to text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE breeding_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_breeding" ON breeding_records;
CREATE POLICY "select_own_breeding" ON breeding_records FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_breeding" ON breeding_records;
CREATE POLICY "insert_own_breeding" ON breeding_records FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_breeding" ON breeding_records;
CREATE POLICY "update_own_breeding" ON breeding_records FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_breeding" ON breeding_records;
CREATE POLICY "delete_own_breeding" ON breeding_records FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_breeding_user_id ON breeding_records(user_id);
CREATE INDEX IF NOT EXISTS idx_breeding_doe_id ON breeding_records(doe_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rabbits_updated_at ON rabbits;
CREATE TRIGGER trg_rabbits_updated_at BEFORE UPDATE ON rabbits
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_breeding_updated_at ON breeding_records;
CREATE TRIGGER trg_breeding_updated_at BEFORE UPDATE ON breeding_records
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
