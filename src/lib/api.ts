import { supabase } from './supabase';
import type { Rabbit, BreedingRecord, RabbitCategory, PaymentSubmission, AdminStats, AdminRevenueStats, AdminPaymentSubmission, AuditLogEntry, Profile, FamilyCode, PlanType } from '../types';

export async function fetchRabbits(): Promise<Rabbit[]> {
  const { data, error } = await supabase
    .from('rabbits')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as Rabbit[];
}

export async function fetchBreedingRecords(): Promise<BreedingRecord[]> {
  const { data, error } = await supabase
    .from('breeding_records')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as BreedingRecord[];
}

export async function createRabbit(input: Partial<Rabbit>): Promise<Rabbit> {
  const { data, error } = await supabase
    .from('rabbits')
    .insert({
      rabbit_id: input.rabbit_id || `R-${Date.now().toString().slice(-6)}`,
      name: input.name || null,
      category: (input.category as RabbitCategory) || 'doe',
      breed: input.breed || null,
      color: input.color || null,
      date_of_birth: input.date_of_birth || null,
      status: input.status || 'active',
      weight: input.weight ?? null,
      notes: input.notes || null,
      archived: false,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Rabbit;
}

export async function updateRabbit(id: string, patch: Partial<Rabbit>): Promise<Rabbit> {
  const { data, error } = await supabase.from('rabbits').update(patch).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data as Rabbit;
}

export async function deleteRabbit(id: string): Promise<void> {
  const { error } = await supabase.from('rabbits').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function duplicateRabbit(r: Rabbit): Promise<Rabbit> {
  return createRabbit({
    rabbit_id: `${r.rabbit_id}-copy`,
    name: r.name ? `${r.name} (Copy)` : null,
    category: r.category,
    breed: r.breed,
    color: r.color,
    date_of_birth: r.date_of_birth,
    status: r.status,
    weight: r.weight,
    notes: r.notes,
  });
}

export async function archiveRabbit(id: string, archived: boolean): Promise<void> {
  await updateRabbit(id, { archived });
}

export async function createBreedingRecord(input: Partial<BreedingRecord>): Promise<BreedingRecord> {
  const { data, error } = await supabase
    .from('breeding_records')
    .insert({
      doe_id: input.doe_id!,
      mating_date: input.mating_date || null,
      nesting_box_date: input.nesting_box_date || null,
      kindling_date: input.kindling_date || null,
      kits_born: input.kits_born ?? 0,
      kits_alive: input.kits_alive ?? 0,
      deaths: input.deaths ?? 0,
      remating_date: input.remating_date || null,
      weaning_date: input.weaning_date || null,
      weaners_count: input.weaners_count ?? 0,
      weaners_transferred_to: input.weaners_transferred_to || null,
      notes: input.notes || null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as BreedingRecord;
}

export async function updateBreedingRecord(id: string, patch: Partial<BreedingRecord>): Promise<BreedingRecord> {
  const { data, error } = await supabase.from('breeding_records').update(patch).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data as BreedingRecord;
}

export async function deleteBreedingRecord(id: string): Promise<void> {
  const { error } = await supabase.from('breeding_records').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// --- Lifetime Pro / EcoCash manual payment ---
// Submitting a payment request only ever creates a 'pending' row. It never
// sets premium=true on its own — only you, verifying manually in Supabase
// and flipping profiles.premium, actually grants Pro. See the migration
// file supabase/migrations/20260816000000_payment_submissions.sql for the
// exact verification steps.
export async function submitPaymentRequest(input: {
  full_name: string;
  phone: string;
  email?: string | null;
  ecocash_reference: string;
  plan: PlanType;
  desired_family_code?: string | null;
}): Promise<PaymentSubmission> {
  const AMOUNTS: Record<PlanType, number> = { pro_monthly: 12, lifetime: 49.99, family: 30 };
  const { data, error } = await supabase
    .from('payment_submissions')
    .insert({
      full_name: input.full_name.trim(),
      phone: input.phone.trim(),
      email: input.email?.trim() || null,
      ecocash_reference: input.ecocash_reference.trim(),
      plan: input.plan,
      amount_usd: AMOUNTS[input.plan],
      desired_family_code: input.desired_family_code?.trim() || null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as PaymentSubmission;
}

// Real, server-verified redemption — the code is checked inside the database,
// not in the browser, so it can't be bypassed via dev tools.
export async function redeemFamilyCode(code: string): Promise<{ success: boolean; message: string }> {
  const { data, error } = await supabase.rpc('redeem_family_code', { p_code: code.trim() });
  if (error) throw new Error(error.message);
  return data as { success: boolean; message: string };
}

export async function fetchMyPaymentSubmissions(): Promise<PaymentSubmission[]> {
  const { data, error } = await supabase
    .from('payment_submissions')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as PaymentSubmission[];
}

// --- Admin (all of these call Postgres functions that check the caller is
// an admin INSIDE the database — see supabase/migrations/..._admin_panel.sql.
// The frontend gating (hiding the Admin link, redirecting non-admins away
// from /app/admin) is just UX; the real authorization boundary is server-side. ---

export async function adminStats(): Promise<AdminStats> {
  const { data, error } = await supabase.rpc('admin_stats');
  if (error) throw new Error(error.message);
  return data as AdminStats;
}

export async function adminSearchUsers(query: string): Promise<Profile[]> {
  const { data, error } = await supabase.rpc('admin_search_users', { q: query });
  if (error) throw new Error(error.message);
  return (data || []) as Profile[];
}

export async function adminListPaymentSubmissions(): Promise<AdminPaymentSubmission[]> {
  const { data, error } = await supabase.rpc('admin_list_payment_submissions');
  if (error) throw new Error(error.message);
  return (data || []) as AdminPaymentSubmission[];
}

export async function adminVerifyPayment(submissionId: string, approve: boolean, notes?: string): Promise<void> {
  const { error } = await supabase.rpc('admin_verify_payment', { submission_id: submissionId, approve, notes: notes || null });
  if (error) throw new Error(error.message);
}

export async function adminGrantPro(targetUserId: string, reason?: string): Promise<void> {
  const { error } = await supabase.rpc('admin_grant_pro', { target_user_id: targetUserId, reason: reason || null });
  if (error) throw new Error(error.message);
}

export async function adminGrantProMonthly(targetUserId: string, reason?: string): Promise<void> {
  const { error } = await supabase.rpc('admin_grant_pro_monthly', { target_user_id: targetUserId, reason: reason || null });
  if (error) throw new Error(error.message);
}

export async function adminRevokePro(targetUserId: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc('admin_revoke_pro', { target_user_id: targetUserId, reason });
  if (error) throw new Error(error.message);
}

export async function adminSuspendUser(targetUserId: string, reason: string, untilTs?: string | null): Promise<void> {
  const { error } = await supabase.rpc('admin_suspend_user', { target_user_id: targetUserId, reason, until_ts: untilTs || null });
  if (error) throw new Error(error.message);
}

export async function adminRestoreUser(targetUserId: string, reason?: string): Promise<void> {
  const { error } = await supabase.rpc('admin_restore_user', { target_user_id: targetUserId, reason: reason || null });
  if (error) throw new Error(error.message);
}

export async function adminListAuditLog(): Promise<AuditLogEntry[]> {
  const { data, error } = await supabase.rpc('admin_list_audit_log');
  if (error) throw new Error(error.message);
  return (data || []) as AuditLogEntry[];
}

// --- Admin: Family Access codes ---
export async function adminCreateFamilyCode(code: string, ownerUserId?: string | null, expiresAt?: string | null): Promise<void> {
  const { error } = await supabase.rpc('admin_create_family_code', { p_code: code, p_owner_user_id: ownerUserId || null, p_expires_at: expiresAt || null });
  if (error) throw new Error(error.message);
}

export async function adminListFamilyCodes(): Promise<FamilyCode[]> {
  const { data, error } = await supabase.rpc('admin_list_family_codes');
  if (error) throw new Error(error.message);
  return (data || []) as FamilyCode[];
}

export async function adminSetFamilyCodeActive(codeId: string, active: boolean): Promise<void> {
  const { error } = await supabase.rpc('admin_set_family_code_active', { p_code_id: codeId, p_active: active });
  if (error) throw new Error(error.message);
}

export async function adminRevenueStats(): Promise<AdminRevenueStats> {
  const { data, error } = await supabase.rpc('admin_revenue_stats');
  if (error) throw new Error(error.message);
  return data as AdminRevenueStats;
}
