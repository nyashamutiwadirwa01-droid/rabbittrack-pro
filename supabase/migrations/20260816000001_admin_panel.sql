/*
# Admin Panel — Server-Side Authorization

1. Purpose
   Adds real admin capability: payment verification, granting/revoking Pro,
   suspending/restoring accounts, and an audit trail. Authorization is
   enforced INSIDE these Postgres functions (SECURITY DEFINER), not just in
   the frontend — so even a user who finds the /admin route or crafts a raw
   API call cannot use any of this unless their own profiles.role = 'admin'.
   Hiding the "Admin" link in the UI is a convenience, not the security
   boundary; the functions below are the actual boundary.

2. New profiles columns
   - suspended (bool, default false)
   - suspended_reason (text, nullable)
   - suspended_until (timestamptz, nullable — null = indefinite)
   - pro_activated_at (timestamptz, nullable — set when premium is granted)

3. New table: admin_audit_log
   Append-only record of every admin action. Regular users cannot read or
   write this table at all (no RLS policy grants them access).

4. New functions (all SECURITY DEFINER, all check the caller is an admin
   before doing anything, all write an audit log entry):
   - admin_stats()
   - admin_search_users(query text)
   - admin_list_payment_submissions()
   - admin_verify_payment(submission_id uuid, approve boolean, notes text)
   - admin_grant_pro(target_user_id uuid, reason text)
   - admin_revoke_pro(target_user_id uuid, reason text)
   - admin_suspend_user(target_user_id uuid, reason text, until_ts timestamptz)
   - admin_restore_user(target_user_id uuid, reason text)
   - admin_list_audit_log()

5. Making a user an admin
   Run this once, replacing the email with the real account email for Nyasha:

   UPDATE profiles SET role = 'admin' WHERE email = 'REPLACE_WITH_REAL_EMAIL';

   There is no "admin password" separate from the normal login — the admin
   IS a normal RabbitTrack Pro account, just with role = 'admin' on its
   profile row. Whoever logs into that account can use the admin panel.
   Keep that account's login credentials as secure as any other account —
   nothing admin-related is ever stored in frontend code or localStorage.
*/

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspended boolean NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspended_reason text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspended_until timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pro_activated_at timestamptz;

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES auth.users(id),
  admin_email text NOT NULL,
  action text NOT NULL,
  target_user_id uuid REFERENCES auth.users(id),
  target_email text,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
-- Intentionally no policies at all here: nobody can SELECT/INSERT this table
-- directly through the client, even admins. It's only ever written to and
-- read from inside the SECURITY DEFINER functions below.

-- Internal helper: raises if the calling user is not an admin.
CREATE OR REPLACE FUNCTION assert_is_admin() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION admin_log(p_action text, p_target uuid, p_target_email text, p_reason text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_admin_email text;
BEGIN
  SELECT email INTO v_admin_email FROM profiles WHERE id = auth.uid();
  INSERT INTO admin_audit_log (admin_user_id, admin_email, action, target_user_id, target_email, reason)
  VALUES (auth.uid(), v_admin_email, p_action, p_target, p_target_email, p_reason);
END;
$$;

CREATE OR REPLACE FUNCTION admin_stats() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result jsonb;
BEGIN
  PERFORM assert_is_admin();
  SELECT jsonb_build_object(
    'total_users', (SELECT count(*) FROM profiles),
    'pro_users', (SELECT count(*) FROM profiles WHERE premium = true),
    'free_users', (SELECT count(*) FROM profiles WHERE premium = false AND suspended = false),
    'pending_payments', (SELECT count(*) FROM payment_submissions WHERE status = 'pending'),
    'suspended_users', (SELECT count(*) FROM profiles WHERE suspended = true)
  ) INTO result;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION admin_search_users(q text) RETURNS SETOF profiles
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM assert_is_admin();
  RETURN QUERY SELECT * FROM profiles
    WHERE q IS NULL OR q = '' OR email ILIKE '%' || q || '%' OR full_name ILIKE '%' || q || '%'
    ORDER BY created_at DESC LIMIT 100;
END;
$$;

CREATE OR REPLACE FUNCTION admin_list_payment_submissions() RETURNS TABLE (
  id uuid, user_id uuid, user_email text, full_name text, phone text, email text,
  ecocash_reference text, amount_usd numeric, status text, admin_notes text,
  created_at timestamptz, verified_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM assert_is_admin();
  RETURN QUERY
    SELECT ps.id, ps.user_id, p.email, ps.full_name, ps.phone, ps.email,
           ps.ecocash_reference, ps.amount_usd, ps.status, ps.admin_notes,
           ps.created_at, ps.verified_at
    FROM payment_submissions ps
    JOIN profiles p ON p.id = ps.user_id
    ORDER BY ps.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION admin_verify_payment(submission_id uuid, approve boolean, notes text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_user_id uuid; v_email text;
BEGIN
  PERFORM assert_is_admin();
  SELECT user_id INTO v_user_id FROM payment_submissions WHERE id = submission_id;
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Submission not found'; END IF;
  SELECT email INTO v_email FROM profiles WHERE id = v_user_id;

  IF approve THEN
    UPDATE payment_submissions SET status = 'verified', admin_notes = notes, verified_at = now() WHERE id = submission_id;
    UPDATE profiles SET premium = true, premium_until = null, pro_activated_at = now() WHERE id = v_user_id;
    PERFORM admin_log('verify_payment', v_user_id, v_email, notes);
  ELSE
    UPDATE payment_submissions SET status = 'rejected', admin_notes = notes WHERE id = submission_id;
    PERFORM admin_log('reject_payment', v_user_id, v_email, notes);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION admin_grant_pro(target_user_id uuid, reason text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_email text;
BEGIN
  PERFORM assert_is_admin();
  SELECT email INTO v_email FROM profiles WHERE id = target_user_id;
  UPDATE profiles SET premium = true, premium_until = null, pro_activated_at = now() WHERE id = target_user_id;
  PERFORM admin_log('grant_pro', target_user_id, v_email, reason);
END;
$$;

CREATE OR REPLACE FUNCTION admin_revoke_pro(target_user_id uuid, reason text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_email text;
BEGIN
  PERFORM assert_is_admin();
  IF reason IS NULL OR trim(reason) = '' THEN RAISE EXCEPTION 'A reason is required to revoke Pro'; END IF;
  SELECT email INTO v_email FROM profiles WHERE id = target_user_id;
  UPDATE profiles SET premium = false, pro_activated_at = null WHERE id = target_user_id;
  PERFORM admin_log('revoke_pro', target_user_id, v_email, reason);
END;
$$;

CREATE OR REPLACE FUNCTION admin_suspend_user(target_user_id uuid, reason text, until_ts timestamptz DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_email text;
BEGIN
  PERFORM assert_is_admin();
  IF reason IS NULL OR trim(reason) = '' THEN RAISE EXCEPTION 'A reason is required to suspend an account'; END IF;
  SELECT email INTO v_email FROM profiles WHERE id = target_user_id;
  UPDATE profiles SET suspended = true, suspended_reason = reason, suspended_until = until_ts WHERE id = target_user_id;
  PERFORM admin_log('suspend', target_user_id, v_email, reason);
END;
$$;

CREATE OR REPLACE FUNCTION admin_restore_user(target_user_id uuid, reason text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_email text;
BEGIN
  PERFORM assert_is_admin();
  SELECT email INTO v_email FROM profiles WHERE id = target_user_id;
  UPDATE profiles SET suspended = false, suspended_reason = null, suspended_until = null WHERE id = target_user_id;
  PERFORM admin_log('restore', target_user_id, v_email, reason);
END;
$$;

CREATE OR REPLACE FUNCTION admin_list_audit_log() RETURNS SETOF admin_audit_log
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM assert_is_admin();
  RETURN QUERY SELECT * FROM admin_audit_log ORDER BY created_at DESC LIMIT 500;
END;
$$;
