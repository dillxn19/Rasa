import { supabase } from '@/lib/supabase';

/**
 * Whether signup is invite-only right now (referral code required). Flippable
 * without a redeploy via app_config. Fails CLOSED (returns true) on error so a
 * transient failure can't accidentally open the gate during a private launch.
 */
export async function getSignupGate(): Promise<boolean> {
  const { data, error } = await supabase.rpc('signup_gate');
  if (error) return true;
  return data === true;
}

/** True if the code matches a real referral code or an existing username. */
export async function validateReferralCode(code: string): Promise<boolean> {
  const c = code.trim();
  if (!c) return false;
  const { data, error } = await supabase.rpc('validate_referral_code', { p_code: c });
  if (error) return false;
  return data === true;
}
