export type RabbitCategory = 'doe' | 'buck' | 'grower' | 'weaner';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  family_access: boolean;
  premium: boolean;
  premium_until: string | null;
  role: 'user' | 'admin';
  created_at: string;
  suspended: boolean;
  suspended_reason: string | null;
  suspended_until: string | null;
  pro_activated_at: string | null;
  family_code_id: string | null;
}

export interface Rabbit {
  id: string;
  user_id: string;
  rabbit_id: string;
  name: string | null;
  category: RabbitCategory;
  breed: string | null;
  color: string | null;
  date_of_birth: string | null;
  status: string;
  weight: number | null;
  archived: boolean;
  notes: string | null;
  parent_doe_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface BreedingRecord {
  id: string;
  user_id: string;
  doe_id: string;
  mating_date: string | null;
  nesting_box_date: string | null;
  kindling_date: string | null;
  kits_born: number;
  kits_alive: number;
  deaths: number;
  remating_date: string | null;
  weaning_date: string | null;
  weaners_count: number;
  weaners_transferred_to: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RabbitWithBreeding extends Rabbit {
  breeding_records?: BreedingRecord[];
}

export interface PaymentSubmission {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  email: string | null;
  ecocash_reference: string;
  amount_usd: number;
  desired_family_code: string | null;
  plan: PlanType;
  status: 'pending' | 'verified' | 'rejected';
  admin_notes: string | null;
  created_at: string;
  verified_at: string | null;
}

// The app never sets this directly — it's always derived from
// profile.premium (verified by you in Supabase) and whether a payment
// submission is sitting unverified. A frontend button can only ever move
// a user into PAYMENT_PENDING, never into PRO.
export type Entitlement = 'FREE' | 'PAYMENT_PENDING' | 'PRO';

export const LIFETIME_PRO_PRICE_USD = 49.99;
export const PRO_MONTHLY_PRICE_USD = 12;
export const FAMILY_PRICE_USD = 30;
export const ECOCASH_NUMBER = '0772415981';
export type PlanType = 'pro_monthly' | 'lifetime' | 'family';

export interface AdminStats {
  total_users: number;
  pro_users: number;
  free_users: number;
  pending_payments: number;
  suspended_users: number;
}

export interface AdminRevenueStats {
  total_revenue: number;
  revenue_pro_monthly: number;
  revenue_lifetime: number;
  revenue_family: number;
  verified_count: number;
  pending_count: number;
  mrr_estimate: number;
}

export interface AdminPaymentSubmission {
  id: string;
  user_id: string;
  user_email: string;
  full_name: string;
  phone: string;
  email: string | null;
  ecocash_reference: string;
  amount_usd: number;
  desired_family_code: string | null;
  plan: PlanType;
  status: 'pending' | 'verified' | 'rejected';
  admin_notes: string | null;
  created_at: string;
  verified_at: string | null;
}

export interface FamilyCode {
  id: string;
  code: string;
  owner_user_id: string | null;
  owner_email: string | null;
  active: boolean;
  expires_at: string | null;
  created_at: string;
  member_count: number;
}

export interface AuditLogEntry {
  id: string;
  admin_user_id: string;
  admin_email: string;
  action: string;
  target_user_id: string | null;
  target_email: string | null;
  reason: string | null;
  created_at: string;
}

export const CATEGORY_LABELS: Record<RabbitCategory, string> = {
  doe: 'Does',
  buck: 'Bucks',
  grower: 'Growers',
  weaner: 'Weaners',
};

export const CATEGORY_SINGULAR: Record<RabbitCategory, string> = {
  doe: 'Doe',
  buck: 'Buck',
  grower: 'Grower',
  weaner: 'Weaner',
};

// Breeding timeline defaults (days)
export const KINDLING_DAYS = 31; // gestation
export const NESTING_BOX_DAYS = 26; // place nest box 5 days before kindling
export const WEANING_DAYS = 28; // wean at 4 weeks
export const REMATING_DAYS = 42; // remate 6 weeks after kindling
