/*
# Payment Submissions — Manual EcoCash Lifetime Pro flow

1. Purpose
   Lets a user submit proof of an EcoCash payment for the $49.99 Lifetime Pro
   upgrade. Submitting does NOT grant Pro access — a human (you) verifies the
   EcoCash transaction manually and then flips `profiles.premium = true` from
   the Supabase dashboard. This table is the paper trail for that process.

2. New Table
   payment_submissions:
     id (uuid pk), user_id (uuid, owner), full_name, phone, email (nullable),
     ecocash_reference (the transaction/confirmation code the customer got
     from EcoCash), amount_usd (numeric, defaults to 49.99),
     status ('pending' | 'verified' | 'rejected'), admin_notes (nullable),
     created_at, verified_at (nullable).

3. Security
   - RLS enabled.
   - A user can INSERT their own submission and SELECT their own submissions.
   - A user can NEVER update or delete a submission, and can never set
     status themselves — only you, editing directly in the Supabase table
     editor (or a future admin/service-role tool), can change status to
     'verified' and flip the matching profiles.premium flag.

4. How you verify a payment
   - Open Supabase → Table Editor → payment_submissions.
   - Check the ecocash_reference against your EcoCash SMS/transaction history
     for 0772415981.
   - If it matches and the amount is correct: set that row's status to
     'verified', then go to the profiles table and set that user's
     premium = true (and premium_until = null, since it's a lifetime plan).
   - If it doesn't match: set status to 'rejected' and optionally add a note.
*/

CREATE TABLE IF NOT EXISTS payment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text NOT NULL,
  email text,
  ecocash_reference text NOT NULL,
  amount_usd numeric(10,2) NOT NULL DEFAULT 49.99,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz
);
ALTER TABLE payment_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_payment_submissions" ON payment_submissions;
CREATE POLICY "select_own_payment_submissions" ON payment_submissions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_payment_submissions" ON payment_submissions;
CREATE POLICY "insert_own_payment_submissions" ON payment_submissions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- Intentionally NO update/delete policy for regular users — status can only
-- be changed by you, directly in the Supabase dashboard (which uses your
-- own authenticated session, not subject to these client-facing policies
-- in the same way, or via the SQL editor / a service-role key).

CREATE INDEX IF NOT EXISTS idx_payment_submissions_user_id ON payment_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_submissions_status ON payment_submissions(status);
