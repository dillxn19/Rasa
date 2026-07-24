/**
 * Seeds real Malaysian restaurants (KL, PJ, Penang, JB, Subang, Shah Alam, Kajang)
 * plus their dish-graph links and popular dishes. Idempotent: upserts on `slug`
 * so it can be re-run safely.
 *
 * Uses the Supabase service-role key (bypasses RLS). Run:
 *   npx ts-node scripts/seedRestaurants.ts
 * Then reindex Algolia:
 *   npm run algolia:index
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// ─── Category cover photos (placeholder Unsplash food imagery) ────────────────
const PHOTO: Record<string, string[]> = {
  nasi_lemak: [
    'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=800',
    'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=800',
  ],
  noodles: [
    'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800',
    'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=800',
  ],
  mamak: [
    'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800',
    'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=800',
  ],
  cafe: [
    'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800',
    'https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=800',
  ],
  indian: [
    'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800',
    'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=800',
  ],
  chinese: [
    'https://images.unsplash.com/photo-1552526881-721ce8509abb?w=800',
    'https://images.unsplash.com/photo-1541696490-8744a5dc0228?w=800',
  ],
  fine: [
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800',
    'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800',
  ],
  dessert: [
    'https://images.unsplash.com/photo-1488900128323-21503983a07e?w=800',
  ],
  seafood: [
    'https://images.unsplash.com/photo-1559737558-2f5a35f4523b?w=800',
  ],
  western: [
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800',
  ],
};
function pic(key: keyof typeof PHOTO, i = 0) {
  const arr = PHOTO[key];
  return arr[i % arr.length];
}

// ─── Restaurant seed data ─────────────────────────────────────────────────────
type Dish = { slug?: string; name: string; signature?: boolean; count?: number };
type Seed = {
  name: string;
  slug: string;
  description: string;
  category: string;
  cuisines: string[];
  price_range: string;
  dietary_options: string[];
  address: string;
  area: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  cover_photo_url: string;
  tags: string[];
  overall_rating: number;
  total_reviews: number;
  dishes: Dish[];
};

const RESTAURANTS: Seed[] = [
  // ── Kuala Lumpur ──────────────────────────────────────────────
  {
    name: 'Village Park Restaurant', slug: 'village-park-restaurant-damansara',
    description: 'Iconic nasi lemak spot in Damansara Uptown, famous for arguably the best fried chicken in the Klang Valley.',
    category: 'hawker', cuisines: ['malay'], price_range: '$', dietary_options: ['halal_certified'],
    address: '5, Jalan SS21/37, Damansara Utama, 47400 Petaling Jaya, Selangor', area: 'Damansara Uptown',
    city: 'Petaling Jaya', state: 'Selangor', latitude: 3.1352, longitude: 101.6217,
    cover_photo_url: pic('nasi_lemak', 0), tags: ['nasi lemak', 'fried chicken', 'iconic', 'breakfast', 'must try'],
    overall_rating: 4.7, total_reviews: 1240,
    dishes: [{ slug: 'nasi-lemak', name: 'Nasi Lemak Ayam Goreng', signature: true, count: 1200 }, { name: 'Sambal Sotong', count: 420 }],
  },
  {
    name: 'Nasi Lemak Antarabangsa', slug: 'nasi-lemak-antarabangsa-chow-kit',
    description: 'Legendary 24-hour Chow Kit nasi lemak institution serving a huge spread of sambal and lauk since the 1970s.',
    category: 'hawker', cuisines: ['malay'], price_range: '$', dietary_options: ['halal_certified'],
    address: '6, Jalan Raja Muda Musa, Kampung Baru, 50300 Kuala Lumpur', area: 'Kampung Baru',
    city: 'Kuala Lumpur', state: 'Wilayah Persekutuan', latitude: 3.1665, longitude: 101.7009,
    cover_photo_url: pic('nasi_lemak', 1), tags: ['nasi lemak', 'supper', 'halal', '24 hours', 'classic'],
    overall_rating: 4.4, total_reviews: 890,
    dishes: [{ slug: 'nasi-lemak', name: 'Nasi Lemak Sambal Sotong', signature: true, count: 760 }, { name: 'Ayam Rendang', count: 300 }],
  },
  {
    name: 'Yut Kee Restaurant', slug: 'yut-kee-restaurant-kl',
    description: 'Heritage Hainanese kopitiam running since 1928. Famous for roti babi, Hainanese chicken chop and kaya rolls.',
    category: 'kopitiam', cuisines: ['chinese'], price_range: '$', dietary_options: [],
    address: '1, Jalan Kamunting, Chow Kit, 50300 Kuala Lumpur', area: 'Dang Wangi',
    city: 'Kuala Lumpur', state: 'Wilayah Persekutuan', latitude: 3.1626, longitude: 101.6968,
    cover_photo_url: pic('chinese', 0), tags: ['hainanese', 'heritage', 'chicken chop', 'kaya', 'breakfast'],
    overall_rating: 4.5, total_reviews: 970,
    dishes: [{ name: 'Hainanese Chicken Chop', signature: true, count: 640 }, { name: 'Roti Babi', count: 410 }, { slug: 'teh-tarik', name: 'Kopi O', count: 220 }],
  },
  {
    name: 'Wong Ah Wah', slug: 'wong-ah-wah-jalan-alor',
    description: 'The Jalan Alor institution for charcoal-grilled chicken wings, plus zi char classics late into the night.',
    category: 'restaurant', cuisines: ['chinese', 'seafood'], price_range: '$$', dietary_options: [],
    address: '1, 3, 5 & 7, Jalan Alor, Bukit Bintang, 50200 Kuala Lumpur', area: 'Bukit Bintang',
    city: 'Kuala Lumpur', state: 'Wilayah Persekutuan', latitude: 3.1447, longitude: 101.7086,
    cover_photo_url: pic('seafood', 0), tags: ['chicken wings', 'supper', 'jalan alor', 'zi char', 'late night'],
    overall_rating: 4.3, total_reviews: 1520,
    dishes: [{ name: 'Grilled Chicken Wings', signature: true, count: 1400 }, { name: 'Butter Prawns', count: 520 }],
  },
  {
    name: 'Nam Heong Chicken Rice', slug: 'nam-heong-chicken-rice-petaling-street',
    description: 'Old-school Ipoh-style Hainanese chicken rice in the heart of KL Chinatown since 1938.',
    category: 'restaurant', cuisines: ['chinese'], price_range: '$', dietary_options: [],
    address: '54, Jalan Sultan, City Centre, 50000 Kuala Lumpur', area: 'Chinatown',
    city: 'Kuala Lumpur', state: 'Wilayah Persekutuan', latitude: 3.1435, longitude: 101.6975,
    cover_photo_url: pic('chinese', 1), tags: ['chicken rice', 'hainanese', 'heritage', 'chinatown', 'lunch'],
    overall_rating: 4.4, total_reviews: 830,
    dishes: [{ name: 'Hainanese Chicken Rice', signature: true, count: 780 }, { name: 'Char Siew', count: 340 }],
  },
  {
    name: 'Restoran Win Heng Seng', slug: 'win-heng-seng-pudu',
    description: 'Morning kopitiam in Pudu known for its long-standing roast pork noodle and pork ball noodle stalls.',
    category: 'kopitiam', cuisines: ['chinese'], price_range: '$', dietary_options: [],
    address: '183, Jalan Brunei, Pudu, 55100 Kuala Lumpur', area: 'Pudu',
    city: 'Kuala Lumpur', state: 'Wilayah Persekutuan', latitude: 3.1372, longitude: 101.7098,
    cover_photo_url: pic('noodles', 0), tags: ['pork noodle', 'breakfast', 'kopitiam', 'pudu', 'char siew'],
    overall_rating: 4.3, total_reviews: 560,
    dishes: [{ name: 'Roast Pork Noodle', signature: true, count: 500 }, { slug: 'hokkien-mee', name: 'Hokkien Mee', count: 180 }],
  },
  {
    name: 'Merchant’s Lane', slug: 'merchants-lane-chinatown',
    description: 'Instagrammable heritage-shophouse cafe above Petaling Street serving East-meets-West brunch plates.',
    category: 'cafe', cuisines: ['cafe', 'fusion'], price_range: '$$', dietary_options: ['pork_free'],
    address: '150, Jalan Petaling, City Centre, 50000 Kuala Lumpur', area: 'Chinatown',
    city: 'Kuala Lumpur', state: 'Wilayah Persekutuan', latitude: 3.1428, longitude: 101.6981,
    cover_photo_url: pic('cafe', 0), tags: ['cafe', 'brunch', 'instagrammable', 'chinatown', 'coffee'],
    overall_rating: 4.4, total_reviews: 1080,
    dishes: [{ name: 'Big Breakfast', count: 430 }, { name: 'Salted Egg Pasta', signature: true, count: 380 }],
  },
  {
    name: 'VCR', slug: 'vcr-bukit-bintang',
    description: 'Pioneering specialty-coffee cafe in a restored shophouse, big on brunch, cakes and single-origin brews.',
    category: 'cafe', cuisines: ['cafe'], price_range: '$$', dietary_options: ['vegetarian'],
    address: '2, Jalan Galloway, Bukit Bintang, 50150 Kuala Lumpur', area: 'Bukit Bintang',
    city: 'Kuala Lumpur', state: 'Wilayah Persekutuan', latitude: 3.1421, longitude: 101.7043,
    cover_photo_url: pic('cafe', 1), tags: ['specialty coffee', 'brunch', 'cafe', 'cake', 'work friendly'],
    overall_rating: 4.5, total_reviews: 940,
    dishes: [{ name: 'Flat White', signature: true, count: 610 }, { name: 'Salted Caramel Cake', count: 350 }],
  },
  {
    name: 'Sek Yuen Restaurant', slug: 'sek-yuen-restaurant-pudu',
    description: 'Nearly century-old Cantonese restaurant famous for wood-fired classics like Eight Treasure Duck.',
    category: 'restaurant', cuisines: ['chinese'], price_range: '$$', dietary_options: [],
    address: '315, Jalan Pudu, Pudu, 55100 Kuala Lumpur', area: 'Pudu',
    city: 'Kuala Lumpur', state: 'Wilayah Persekutuan', latitude: 3.1358, longitude: 101.7112,
    cover_photo_url: pic('chinese', 0), tags: ['cantonese', 'heritage', 'roast duck', 'group dining', 'classic'],
    overall_rating: 4.4, total_reviews: 470,
    dishes: [{ name: 'Eight Treasure Duck', signature: true, count: 300 }, { name: 'Kau Yoke', count: 200 }],
  },
  {
    name: 'Restoran Rebung Chef Ismail', slug: 'restoran-rebung-chef-ismail-bangsar',
    description: 'Sprawling Malay buffet by celebrity chef Ismail with 100+ kampung-style dishes and a river view.',
    category: 'buffet', cuisines: ['malay'], price_range: '$$$', dietary_options: ['halal_certified'],
    address: 'No. 5, Jalan Tanjung, Persiaran Sultan Salahuddin, 50480 Kuala Lumpur', area: 'Lake Gardens',
    city: 'Kuala Lumpur', state: 'Wilayah Persekutuan', latitude: 3.1465, longitude: 101.6795,
    cover_photo_url: pic('mamak', 0), tags: ['malay buffet', 'halal', 'kampung', 'family', 'nasi'],
    overall_rating: 4.3, total_reviews: 720,
    dishes: [{ name: 'Nasi Ambeng', signature: true, count: 400 }, { slug: 'satay', name: 'Satay', count: 260 }],
  },
  {
    name: 'Devi’s Corner', slug: 'devis-corner-bangsar',
    description: 'Beloved 24-hour Bangsar mamak famous for banana leaf rice, thosai and endless teh tarik.',
    category: 'mamak', cuisines: ['mamak', 'indian'], price_range: '$', dietary_options: ['halal_certified'],
    address: '14, Jalan Telawi 4, Bangsar Baru, 59100 Kuala Lumpur', area: 'Bangsar',
    city: 'Kuala Lumpur', state: 'Wilayah Persekutuan', latitude: 3.1298, longitude: 101.6715,
    cover_photo_url: pic('mamak', 1), tags: ['mamak', 'banana leaf', 'supper', 'teh tarik', 'halal'],
    overall_rating: 4.1, total_reviews: 1300,
    dishes: [{ slug: 'banana-leaf-rice', name: 'Banana Leaf Rice', signature: true, count: 620 }, { slug: 'roti-canai', name: 'Roti Canai', count: 900 }, { slug: 'teh-tarik', name: 'Teh Tarik', count: 700 }],
  },
  {
    name: 'Betel Leaf', slug: 'betel-leaf-chinatown',
    description: 'Refined South Indian vegetarian restaurant near Sri Mahamariamman temple, known for its thali sets.',
    category: 'restaurant', cuisines: ['indian', 'vegetarian'], price_range: '$', dietary_options: ['vegetarian', 'vegan'],
    address: '77, Jalan Tun H S Lee, City Centre, 50000 Kuala Lumpur', area: 'Chinatown',
    city: 'Kuala Lumpur', state: 'Wilayah Persekutuan', latitude: 3.1440, longitude: 101.6963,
    cover_photo_url: pic('indian', 1), tags: ['south indian', 'vegetarian', 'thali', 'halal friendly', 'lunch'],
    overall_rating: 4.5, total_reviews: 410,
    dishes: [{ slug: 'banana-leaf-rice', name: 'Vegetarian Banana Leaf', signature: true, count: 320 }, { name: 'Masala Thosai', count: 240 }],
  },
  {
    name: 'Limapulo: Baba Can Cook', slug: 'limapulo-baba-can-cook-kl',
    description: 'Homestyle Nyonya restaurant run by "Uncle John", famous for its assam fish head and ayam pongteh.',
    category: 'restaurant', cuisines: ['nyonya', 'malay'], price_range: '$$', dietary_options: ['pork_free'],
    address: '50, Jalan Doraisamy, Chow Kit, 50300 Kuala Lumpur', area: 'Dang Wangi',
    city: 'Kuala Lumpur', state: 'Wilayah Persekutuan', latitude: 3.1607, longitude: 101.6955,
    cover_photo_url: pic('fine', 1), tags: ['nyonya', 'peranakan', 'assam fish', 'homestyle', 'lunch'],
    overall_rating: 4.5, total_reviews: 680,
    dishes: [{ name: 'Assam Fish Head', signature: true, count: 420 }, { name: 'Ayam Pongteh', count: 280 }],
  },
  {
    name: 'Dewakan', slug: 'dewakan-kl',
    description: 'Malaysia’s first two-Michelin-star restaurant, a progressive tasting menu celebrating native ingredients.',
    category: 'fine_dining', cuisines: ['fusion', 'malay'], price_range: '$$$$', dietary_options: [],
    address: 'Level 48, Naza Tower, Platinum Park, 10 Persiaran KLCC, 50088 Kuala Lumpur', area: 'KLCC',
    city: 'Kuala Lumpur', state: 'Wilayah Persekutuan', latitude: 3.1591, longitude: 101.7183,
    cover_photo_url: pic('fine', 0), tags: ['fine dining', 'michelin', 'tasting menu', 'modern malaysian', 'special occasion'],
    overall_rating: 4.8, total_reviews: 260,
    dishes: [{ name: 'Chef’s Tasting Menu', signature: true, count: 240 }],
  },

  // ── Petaling Jaya / Selangor ──────────────────────────────────
  {
    name: 'Kanna Curry House', slug: 'kanna-curry-house-pj',
    description: 'PJ banana leaf legend serving fragrant curries, crab and fried bitter gourd since 1977.',
    category: 'restaurant', cuisines: ['indian'], price_range: '$', dietary_options: [],
    address: '4, Jalan 4/108, Taman Sri Manja, 46000 Petaling Jaya, Selangor', area: 'Old Klang Road',
    city: 'Petaling Jaya', state: 'Selangor', latitude: 3.0913, longitude: 101.6558,
    cover_photo_url: pic('indian', 0), tags: ['banana leaf', 'south indian', 'curry', 'lunch', 'classic'],
    overall_rating: 4.4, total_reviews: 650,
    dishes: [{ slug: 'banana-leaf-rice', name: 'Banana Leaf Rice', signature: true, count: 600 }, { name: 'Fried Chicken', count: 300 }],
  },
  {
    name: 'Raju’s Restaurant', slug: 'rajus-restaurant-section-17-pj',
    description: 'Open-air garden banana leaf spot under a huge tree in Section 17, a PJ weekend brunch ritual.',
    category: 'restaurant', cuisines: ['indian'], price_range: '$', dietary_options: [],
    address: '18, Jalan 17/45, Seksyen 17, 46400 Petaling Jaya, Selangor', area: 'Section 17',
    city: 'Petaling Jaya', state: 'Selangor', latitude: 3.1213, longitude: 101.6360,
    cover_photo_url: pic('indian', 1), tags: ['banana leaf', 'garden', 'brunch', 'south indian', 'crispy chicken'],
    overall_rating: 4.5, total_reviews: 720,
    dishes: [{ slug: 'banana-leaf-rice', name: 'Banana Leaf Rice', signature: true, count: 680 }, { slug: 'teh-tarik', name: 'Teh Tarik', count: 320 }],
  },
  {
    name: 'Kin Kin Chilli Pan Mee', slug: 'kin-kin-chilli-pan-mee',
    description: 'The originator of KL-style dry chilli pan mee: springy noodles, minced pork, poached egg and killer chilli flakes.',
    category: 'restaurant', cuisines: ['chinese'], price_range: '$', dietary_options: [],
    address: '35, Jalan Dewan Sultan Sulaiman 1, Kampung Baru, 50300 Kuala Lumpur', area: 'Chow Kit',
    city: 'Kuala Lumpur', state: 'Wilayah Persekutuan', latitude: 3.1655, longitude: 101.6970,
    cover_photo_url: pic('noodles', 1), tags: ['pan mee', 'chilli', 'noodles', 'original', 'lunch'],
    overall_rating: 4.4, total_reviews: 990,
    dishes: [{ name: 'Dry Chilli Pan Mee', signature: true, count: 950 }],
  },
  {
    name: 'Sup Power', slug: 'sup-power-ss15-subang',
    description: 'Late-night beef and mutton soup institution that started as a roadside stall, now a Subang supper staple.',
    category: 'restaurant', cuisines: ['malay'], price_range: '$', dietary_options: ['halal_certified'],
    address: 'Jalan SS15/4B, Ss 15, 47500 Subang Jaya, Selangor', area: 'SS15',
    city: 'Subang Jaya', state: 'Selangor', latitude: 3.0762, longitude: 101.5872,
    cover_photo_url: pic('mamak', 0), tags: ['beef soup', 'supper', 'halal', 'late night', 'subang'],
    overall_rating: 4.3, total_reviews: 540,
    dishes: [{ name: 'Sup Tulang', signature: true, count: 500 }, { name: 'Sup Daging', count: 260 }],
  },
  {
    name: 'RGB & The Bean Hive', slug: 'rgb-the-bean-hive-subang',
    description: 'Specialty roaster-cafe in a converted bungalow, popular for house-roasted coffee and all-day brunch.',
    category: 'cafe', cuisines: ['cafe'], price_range: '$$', dietary_options: ['vegetarian'],
    address: '17, Jalan USJ 11/1, Usj 11, 47620 Subang Jaya, Selangor', area: 'USJ 11',
    city: 'Subang Jaya', state: 'Selangor', latitude: 3.0447, longitude: 101.5867,
    cover_photo_url: pic('cafe', 0), tags: ['specialty coffee', 'brunch', 'cafe', 'roastery', 'work friendly'],
    overall_rating: 4.4, total_reviews: 480,
    dishes: [{ name: 'Pour Over', signature: true, count: 300 }, { name: 'Eggs Benedict', count: 220 }],
  },
  {
    name: 'Sate Kajang Haji Samuri', slug: 'sate-kajang-haji-samuri',
    description: 'The most famous name in Kajang satay: char-grilled skewers with thick, nutty peanut sauce.',
    category: 'restaurant', cuisines: ['malay'], price_range: '$', dietary_options: ['halal_certified'],
    address: '4, Jalan Kelab, Taman Kajang Utama, 43000 Kajang, Selangor', area: 'Kajang',
    city: 'Kajang', state: 'Selangor', latitude: 2.9933, longitude: 101.7887,
    cover_photo_url: pic('mamak', 1), tags: ['satay', 'halal', 'kajang', 'grill', 'dinner'],
    overall_rating: 4.4, total_reviews: 810,
    dishes: [{ slug: 'satay', name: 'Chicken Satay', signature: true, count: 780 }, { name: 'Beef Satay', count: 400 }],
  },
  {
    name: 'Nasi Lemak Bumbung', slug: 'nasi-lemak-bumbung-shah-alam',
    description: 'Buzzing Shah Alam supper spot known for generous nasi lemak with fried chicken and a huge sambal selection.',
    category: 'hawker', cuisines: ['malay'], price_range: '$', dietary_options: ['halal_certified'],
    address: 'Jalan Bunga Tanjung 6a, Seksyen 2, 40000 Shah Alam, Selangor', area: 'Seksyen 2',
    city: 'Shah Alam', state: 'Selangor', latitude: 3.0745, longitude: 101.5170,
    cover_photo_url: pic('nasi_lemak', 0), tags: ['nasi lemak', 'supper', 'halal', 'shah alam', 'fried chicken'],
    overall_rating: 4.2, total_reviews: 620,
    dishes: [{ slug: 'nasi-lemak', name: 'Nasi Lemak Ayam Goreng', signature: true, count: 560 }],
  },
  {
    name: 'Restoran Sun Fong', slug: 'sun-fong-brickfields',
    description: 'Old-school kopitiam beloved for its claypot curry mee and pork noodle in the heart of Brickfields.',
    category: 'kopitiam', cuisines: ['chinese'], price_range: '$', dietary_options: [],
    address: '18, Jalan Thambipillay, Brickfields, 50470 Kuala Lumpur', area: 'Brickfields',
    city: 'Kuala Lumpur', state: 'Wilayah Persekutuan', latitude: 3.1298, longitude: 101.6862,
    cover_photo_url: pic('noodles', 0), tags: ['curry mee', 'kopitiam', 'pork noodle', 'breakfast', 'brickfields'],
    overall_rating: 4.3, total_reviews: 390,
    dishes: [{ slug: 'curry-laksa', name: 'Claypot Curry Mee', signature: true, count: 360 }],
  },

  // ── Penang ────────────────────────────────────────────────────
  {
    name: 'Line Clear Nasi Kandar', slug: 'line-clear-nasi-kandar-penang',
    description: 'Cult 24-hour nasi kandar down a Penang Road alley, drowning rice in a mix of rich curries ("kuah campur").',
    category: 'mamak', cuisines: ['mamak', 'indian'], price_range: '$', dietary_options: ['halal_certified'],
    address: '177, Jalan Penang, George Town, 10000 Penang', area: 'Georgetown',
    city: 'Penang', state: 'Pulau Pinang', latitude: 5.4189, longitude: 100.3308,
    cover_photo_url: pic('mamak', 0), tags: ['nasi kandar', 'halal', '24 hours', 'penang', 'iconic'],
    overall_rating: 4.4, total_reviews: 1120,
    dishes: [{ name: 'Nasi Kandar Ayam', signature: true, count: 1000 }, { name: 'Fried Chicken', count: 500 }],
  },
  {
    name: 'Deen Maju Nasi Kandar', slug: 'deen-maju-nasi-kandar-penang',
    description: 'Famous for its "kuah banjir" fish-head nasi kandar with a deeply spiced, flooded curry gravy.',
    category: 'mamak', cuisines: ['mamak', 'indian'], price_range: '$', dietary_options: ['halal_certified'],
    address: '179, Lebuh Chulia, George Town, 10200 Penang', area: 'Georgetown',
    city: 'Penang', state: 'Pulau Pinang', latitude: 5.4166, longitude: 100.3350,
    cover_photo_url: pic('mamak', 1), tags: ['nasi kandar', 'fish head', 'halal', 'penang', 'spicy'],
    overall_rating: 4.5, total_reviews: 760,
    dishes: [{ name: 'Fish Head Nasi Kandar', signature: true, count: 700 }],
  },
  {
    name: 'Toh Soon Cafe', slug: 'toh-soon-cafe-penang',
    description: 'Back-alley charcoal-toast kopitiam famous for kaya butter toast, soft-boiled eggs and wok-brewed coffee.',
    category: 'kopitiam', cuisines: ['chinese', 'cafe'], price_range: '$', dietary_options: ['vegetarian'],
    address: '184, Lebuh Campbell, George Town, 10100 Penang', area: 'Georgetown',
    city: 'Penang', state: 'Pulau Pinang', latitude: 5.4173, longitude: 100.3341,
    cover_photo_url: pic('cafe', 1), tags: ['kaya toast', 'kopitiam', 'charcoal', 'breakfast', 'penang'],
    overall_rating: 4.4, total_reviews: 690,
    dishes: [{ name: 'Kaya Butter Toast', signature: true, count: 640 }, { slug: 'teh-tarik', name: 'Kopi', count: 300 }],
  },
  {
    name: 'Penang Road Famous Teochew Chendul', slug: 'penang-road-teochew-chendul',
    description: 'The queue-forming original cendol stall on Lebuh Keng Kwee, cooling bowls of pandan jelly, santan and gula melaka.',
    category: 'hawker', cuisines: ['dessert'], price_range: '$', dietary_options: ['vegetarian'],
    address: '27 & 29, Lebuh Keng Kwee, George Town, 10100 Penang', area: 'Georgetown',
    city: 'Penang', state: 'Pulau Pinang', latitude: 5.4157, longitude: 100.3311,
    cover_photo_url: pic('dessert', 0), tags: ['cendol', 'dessert', 'penang', 'iconic', 'street food'],
    overall_rating: 4.3, total_reviews: 980,
    dishes: [{ slug: 'cendol', name: 'Penang Chendul', signature: true, count: 950 }],
  },
  {
    name: 'Kedai Kopi Sin Hwa', slug: 'sin-hwa-char-koay-teow-penang',
    description: 'Pulau Tikus corner coffee shop revered for smoky, prawn-laden char koay teow cooked over charcoal.',
    category: 'kopitiam', cuisines: ['chinese'], price_range: '$', dietary_options: [],
    address: '329, Jalan Burma, Pulau Tikus, 10350 George Town, Penang', area: 'Pulau Tikus',
    city: 'Penang', state: 'Pulau Pinang', latitude: 5.4324, longitude: 100.3117,
    cover_photo_url: pic('noodles', 1), tags: ['char koay teow', 'penang', 'charcoal', 'breakfast', 'wok hei'],
    overall_rating: 4.5, total_reviews: 720,
    dishes: [{ slug: 'char-kway-teow', name: 'Char Koay Teow', signature: true, count: 700 }],
  },
  {
    name: 'Hameediyah Restaurant', slug: 'hameediyah-restaurant-penang',
    description: 'The oldest nasi kandar restaurant in Malaysia (since 1907), famous for its murtabak and mutton curry.',
    category: 'mamak', cuisines: ['mamak', 'indian'], price_range: '$$', dietary_options: ['halal_certified'],
    address: '164, Lebuh Campbell, George Town, 10100 Penang', area: 'Georgetown',
    city: 'Penang', state: 'Pulau Pinang', latitude: 5.4176, longitude: 100.3345,
    cover_photo_url: pic('mamak', 0), tags: ['nasi kandar', 'murtabak', 'heritage', 'halal', 'penang'],
    overall_rating: 4.3, total_reviews: 880,
    dishes: [{ name: 'Chicken Murtabak', signature: true, count: 620 }, { name: 'Nasi Kandar Kambing', count: 480 }],
  },

  // ── Johor Bahru ───────────────────────────────────────────────
  {
    name: 'Restoran Hua Mui', slug: 'restoran-hua-mui-jb',
    description: 'JB heritage Hainanese coffee shop since 1946, known for chicken chop, Hainan tea and kaya toast.',
    category: 'kopitiam', cuisines: ['chinese'], price_range: '$', dietary_options: [],
    address: '131, Jalan Trus, Bandar Johor Bahru, 80000 Johor Bahru, Johor', area: 'JB City Centre',
    city: 'Johor Bahru', state: 'Johor', latitude: 1.4569, longitude: 103.7614,
    cover_photo_url: pic('cafe', 0), tags: ['hainanese', 'chicken chop', 'kopitiam', 'heritage', 'breakfast'],
    overall_rating: 4.4, total_reviews: 610,
    dishes: [{ name: 'Hainanese Chicken Chop', signature: true, count: 560 }, { name: 'Kaya Toast', count: 300 }],
  },
  {
    name: 'Hiap Joo Bakery', slug: 'hiap-joo-bakery-jb',
    description: 'Century-old JB bakery still using a wood-fired brick oven for its famous banana cake and buns.',
    category: 'cafe', cuisines: ['bakery'], price_range: '$', dietary_options: ['vegetarian'],
    address: '13, Jalan Tan Hiok Nee, Bandar Johor Bahru, 80000 Johor Bahru, Johor', area: 'JB City Centre',
    city: 'Johor Bahru', state: 'Johor', latitude: 1.4562, longitude: 103.7628,
    cover_photo_url: pic('cafe', 1), tags: ['bakery', 'banana cake', 'wood fired', 'heritage', 'takeaway'],
    overall_rating: 4.5, total_reviews: 540,
    dishes: [{ name: 'Wood-Fired Banana Cake', signature: true, count: 520 }, { name: 'Coconut Bun', count: 210 }],
  },
  {
    name: 'Restoran Ah Piau Bak Kut Teh', slug: 'ah-piau-bak-kut-teh-jb',
    description: 'Popular JB spot for herbal, peppery pork rib bak kut teh simmered for hours; a favourite weekend breakfast.',
    category: 'restaurant', cuisines: ['chinese'], price_range: '$$', dietary_options: [],
    address: 'Jalan Sutera Tanjung 8/2, Taman Sutera Utama, 81300 Skudai, Johor', area: 'Sutera Utama',
    city: 'Johor Bahru', state: 'Johor', latitude: 1.5330, longitude: 103.6560,
    cover_photo_url: pic('chinese', 0), tags: ['bak kut teh', 'pork', 'breakfast', 'herbal', 'jb'],
    overall_rating: 4.3, total_reviews: 430,
    dishes: [{ slug: 'bak-kut-teh', name: 'Bak Kut Teh', signature: true, count: 400 }],
  },
];

// ─── Seed runner ──────────────────────────────────────────────────────────────
async function seed() {
  console.log(`🍜 Seeding ${RESTAURANTS.length} restaurants...\n`);

  // 1. Upsert restaurants (idempotent on slug).
  const rows = RESTAURANTS.map(r => ({
    name: r.name, slug: r.slug, description: r.description, category: r.category,
    cuisines: r.cuisines, price_range: r.price_range, dietary_options: r.dietary_options,
    address: r.address, area: r.area, city: r.city, state: r.state, country: 'Malaysia',
    latitude: r.latitude, longitude: r.longitude, cover_photo_url: r.cover_photo_url,
    tags: r.tags, overall_rating: r.overall_rating, total_ratings: r.total_reviews,
    total_reviews: r.total_reviews, total_visits: Math.round(r.total_reviews * 3.5),
    popularity_score: Number((r.overall_rating * Math.log10(r.total_reviews + 10)).toFixed(4)),
    is_approved: true, is_active: true,
  }));

  const { data: upserted, error } = await supabase
    .from('restaurants')
    .upsert(rows, { onConflict: 'slug' })
    .select('id, slug');
  if (error) throw error;
  console.log(`✅ Upserted ${upserted!.length} restaurants.`);

  const idBySlug = new Map(upserted!.map(r => [r.slug, r.id]));

  // 2. PostGIS location column from lat/lng (best-effort; needs the set_location RPC).
  const { error: locErr } = await supabase.rpc('seed_set_locations');
  if (locErr) {
    console.log(`ℹ️  Skipped PostGIS location sync (optional): ${locErr.message}`);
  } else {
    console.log('✅ Synced PostGIS location column.');
  }

  // 3. Canonical dishes (slug -> id).
  const { data: dishRows, error: dishErr } = await supabase.from('dishes').select('id, slug');
  if (dishErr) throw dishErr;
  const dishIdBySlug = new Map((dishRows ?? []).map(d => [d.slug, d.id]));

  // 4. Dish-graph links + popular dishes.
  const rdLinks: any[] = [];
  const popular: any[] = [];
  for (const r of RESTAURANTS) {
    const rid = idBySlug.get(r.slug);
    if (!rid) continue;
    for (const d of r.dishes) {
      const count = d.count ?? 50;
      // popular_dishes drives the restaurant page "Popular Dishes" strip.
      popular.push({ restaurant_id: rid, name: d.name, mention_count: count, is_verified: true });
      // restaurant_dishes drives dish-first discovery; rating_count>=1 surfaces it.
      const dishId = d.slug ? dishIdBySlug.get(d.slug) : undefined;
      if (dishId) {
        rdLinks.push({
          restaurant_id: rid, dish_id: dishId, local_name: d.name,
          is_signature: !!d.signature, is_available: true,
          rating_count: Math.max(1, Math.round(count / 20)),
          average_rating: r.overall_rating,
        });
      }
    }
  }

  const { error: popErr } = await supabase
    .from('popular_dishes')
    .upsert(popular, { onConflict: 'restaurant_id,name' });
  if (popErr) throw popErr;
  console.log(`✅ Upserted ${popular.length} popular dishes.`);

  if (rdLinks.length) {
    const { error: rdErr } = await supabase
      .from('restaurant_dishes')
      .upsert(rdLinks, { onConflict: 'restaurant_id,dish_id' });
    if (rdErr) throw rdErr;
    console.log(`✅ Linked ${rdLinks.length} restaurant↔dish graph entries.`);
  }

  console.log('\n🎉 Seed complete. Next: npm run algolia:index');
}

seed().catch(e => { console.error('❌ Seed failed:', e); process.exit(1); });
