import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();
const s = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

(async () => {
  const { count: approved } = await s.from('restaurants').select('*', { count: 'exact', head: true }).eq('is_approved', true).eq('is_active', true);
  console.log('approved+active restaurants =', approved);

  // Category coverage
  for (const cat of ['hawker', 'mamak', 'cafe', 'kopitiam', 'fine_dining', 'restaurant']) {
    const { count } = await s.from('restaurants').select('*', { count: 'exact', head: true }).eq('category', cat).eq('is_approved', true);
    console.log(`  ${cat}: ${count}`);
  }

  // City coverage
  const { data: cities } = await s.from('restaurants').select('city').eq('is_approved', true);
  const byCity: Record<string, number> = {};
  (cities ?? []).forEach((r: any) => { byCity[r.city] = (byCity[r.city] ?? 0) + 1; });
  console.log('cities =', byCity);

  // Migration 010 columns present? (dish search depends on signal_score)
  const { error: sigErr } = await s.from('restaurant_dishes').select('signal_score, tag_count').limit(1);
  console.log('migration 010 (signal_score/tag_count) applied =', !sigErr, sigErr ? `(${sigErr.message})` : '');

  // Dish-graph surfacing for nasi-lemak
  const { data: nl } = await s.from('dishes').select('id').eq('slug', 'nasi-lemak').single();
  if (nl) {
    const { data: rds } = await s.from('restaurant_dishes').select('restaurant_id, rating_count, restaurant:restaurants(name)').eq('dish_id', nl.id).gte('rating_count', 1);
    console.log('nasi-lemak restaurants in dish graph =', (rds ?? []).length, (rds ?? []).map((x: any) => x.restaurant?.name).join(' | '));
  }
})();
