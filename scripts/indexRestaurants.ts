/**
 * Script to index all approved restaurants to Algolia.
 * Run: npx ts-node scripts/indexRestaurants.ts
 */

import { createClient } from '@supabase/supabase-js';
import { algoliasearch } from 'algoliasearch';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const algolia = algoliasearch(
  process.env.EXPO_PUBLIC_ALGOLIA_APP_ID!,
  process.env.ALGOLIA_ADMIN_KEY!
);

const RESTAURANTS_INDEX = 'rasa_restaurants';
const BATCH_SIZE = 1000;

async function indexRestaurants() {
  console.log('🍜 Starting Rasa restaurant indexing...\n');

  let page = 0;
  let totalIndexed = 0;

  while (true) {
    const { data: restaurants, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('is_approved', true)
      .eq('is_active', true)
      .range(page * BATCH_SIZE, (page + 1) * BATCH_SIZE - 1);

    if (error) throw error;
    if (!restaurants || restaurants.length === 0) break;

    const objects = restaurants.map(r => ({
      objectID: r.id,
      name: r.name,
      slug: r.slug,
      category: r.category,
      cuisines: r.cuisines,
      city: r.city,
      area: r.area,
      address: r.address,
      overall_rating: r.overall_rating,
      total_reviews: r.total_reviews,
      cover_photo_url: r.cover_photo_url,
      price_range: r.price_range,
      dietary_options: r.dietary_options,
      tags: r.tags,
      popularity_score: r.popularity_score,
      _geoloc: r.latitude && r.longitude ? {
        lat: Number(r.latitude),
        lng: Number(r.longitude),
      } : undefined,
    }));

    await algolia.saveObjects({
      indexName: RESTAURANTS_INDEX,
      objects,
    });

    totalIndexed += objects.length;
    console.log(`✅ Indexed batch ${page + 1}: ${objects.length} restaurants (total: ${totalIndexed})`);

    if (restaurants.length < BATCH_SIZE) break;
    page++;
  }

  // Configure index settings
  await algolia.setSettings({
    indexName: RESTAURANTS_INDEX,
    indexSettings: {
      searchableAttributes: [
        'name',
        'area,city',
        'cuisines',
        'tags',
        'address',
        'category',
      ],
      attributesForFaceting: [
        'filterOnly(city)',
        'filterOnly(category)',
        'filterOnly(cuisines)',
        'filterOnly(dietary_options)',
        'filterOnly(price_range)',
        'overall_rating',
      ],
      ranking: [
        'geo',
        'typo',
        'attribute',
        'words',
        'filters',
        'proximity',
        'exact',
        'custom',
      ],
      customRanking: [
        'desc(overall_rating)',
        'desc(total_reviews)',
        'desc(popularity_score)',
      ],
      typoTolerance: true,
      minWordSizefor1Typo: 3,
      minWordSizefor2Typos: 7,
      synonyms: [
        { objectID: 'mee-noodle', type: 'synonym', synonyms: ['mee', 'mi', 'noodle', 'noodles'] },
        { objectID: 'nasi-rice', type: 'synonym', synonyms: ['nasi', 'rice'] },
        { objectID: 'ayam-chicken', type: 'synonym', synonyms: ['ayam', 'chicken'] },
        { objectID: 'ikan-fish', type: 'synonym', synonyms: ['ikan', 'fish'] },
        { objectID: 'kopi-coffee', type: 'synonym', synonyms: ['kopi', 'coffee', 'cafe', 'kopitiam'] },
        { objectID: 'roti-bread', type: 'synonym', synonyms: ['roti', 'bread', 'toast'] },
        { objectID: 'kl-kuala', type: 'oneWaySynonym', input: 'KL', synonyms: ['Kuala Lumpur'] },
        { objectID: 'pj-petaling', type: 'oneWaySynonym', input: 'PJ', synonyms: ['Petaling Jaya'] },
        { objectID: 'jb-johor', type: 'oneWaySynonym', input: 'JB', synonyms: ['Johor Bahru'] },
      ],
    },
  });

  console.log(`\n🎉 Done! Indexed ${totalIndexed} restaurants to Algolia.`);
  console.log('⚙️  Updated index settings and synonyms.');
}

indexRestaurants().catch(console.error);
