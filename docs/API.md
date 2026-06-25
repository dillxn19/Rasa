# Rasa — API Specification

The app communicates directly with Supabase — there is no custom REST API layer.

---

## Supabase Edge Functions (Custom Logic)

Base URL: `https://your-project.supabase.co/functions/v1/`

### `POST /sync-restaurant-to-algolia`
Triggered by DB webhook on `restaurants` INSERT/UPDATE.

```json
{ "record": { ...restaurant } }
```

### `POST /send-push-notification`
Triggered by DB webhook on `notifications` INSERT.

```json
{ "record": { ...notification, "user": { "push_token": "..." } } }
```

### `GET /recommendations/{userId}`
Force refresh recommendations for a user.

```json
{ "user_id": "uuid" }
```

---

## Database RPC Functions

### `get_home_feed(p_user_id, p_limit, p_offset)`
Returns enriched feed events from followed users.

```typescript
const { data } = await supabase.rpc('get_home_feed', {
  p_user_id: userId,
  p_limit: 20,
  p_offset: 0,
});
```

**Returns:** Array of FeedItem rows.

### `calculate_taste_similarity(p_user_id_1, p_user_id_2)`
Calculate and store cosine similarity between two users.

```typescript
const { data: score } = await supabase.rpc('calculate_taste_similarity', {
  p_user_id_1: userA,
  p_user_id_2: userB,
});
// Returns: 0.0 - 1.0
```

### `generate_recommendations(p_user_id)`
Regenerate restaurant recommendations for a user.

```typescript
await supabase.rpc('generate_recommendations', { p_user_id: userId });
```

### `get_nearby_restaurants(p_lat, p_lng, p_radius_km, p_limit)`
Find restaurants within a radius using PostGIS.

```typescript
const { data } = await supabase.rpc('get_nearby_restaurants', {
  p_lat: 3.139,
  p_lng: 101.621,
  p_radius_km: 5.0,
  p_limit: 20,
});
```

### `determine_taste_profile(p_user_id)`
Compute and store a user's taste profile type.

```typescript
const { data: profile } = await supabase.rpc('determine_taste_profile', {
  p_user_id: userId,
});
// Returns: 'cafe_explorer' | 'hawker_hunter' | ...
```

### `check_and_award_badges(p_user_id)`
Check if user qualifies for any new badges and award them.

```typescript
await supabase.rpc('check_and_award_badges', { p_user_id: userId });
```

---

## Key Database Queries

### Get restaurant with enriched data
```typescript
supabase
  .from('restaurants')
  .select(`
    *,
    photos:restaurant_photos(id, url, caption, dish_name),
    dishes:popular_dishes(name, mention_count),
    my_review:reviews!inner(rating, content, photos)
  `)
  .eq('slug', slug)
  .eq('my_review.user_id', userId)
```

### Get home feed (alternative to RPC)
```typescript
supabase
  .from('activity_events')
  .select(`
    id, type, created_at,
    user:users!user_id(id, username, display_name, avatar_url),
    restaurant:restaurants!restaurant_id(id, name, cover_photo_url, category),
    review:reviews!review_id(id, rating, content, photos, like_count),
    list:lists!list_id(id, title),
    badge:badges!badge_id(id, name, icon_emoji)
  `)
  .in('user_id', followingIds)
  .eq('is_public', true)
  .order('created_at', { ascending: false })
  .limit(20)
```

### Check if user has liked a review
```typescript
supabase
  .from('likes')
  .select('id')
  .eq('user_id', userId)
  .eq('review_id', reviewId)
  .maybeSingle()
// Returns null if not liked
```

### Get taste matches for a user
```typescript
supabase
  .from('taste_similarity')
  .select(`
    similarity_score, common_restaurants,
    matched_user:users!user_id_2(
      id, username, display_name, avatar_url,
      city, total_reviews, taste_profile
    )
  `)
  .eq('user_id_1', userId)
  .gt('similarity_score', 0.5)
  .order('similarity_score', { ascending: false })
  .limit(20)
```

---

## Algolia Search API

### Restaurant search
```typescript
const results = await algoliaClient.searchSingleIndex({
  indexName: 'rasa_restaurants',
  searchParams: {
    query: 'nasi lemak',
    filters: 'city:"Kuala Lumpur" AND dietary_options:"halal_certified"',
    facetFilters: ['category:hawker'],
    aroundLatLng: '3.139, 101.621',
    aroundRadius: 5000,   // 5km in meters
    hitsPerPage: 20,
  },
});
```

### Autocomplete suggestions
```typescript
const suggestions = await algoliaClient.searchSingleIndex({
  indexName: 'rasa_restaurants',
  searchParams: {
    query: 'bur',
    hitsPerPage: 5,
    restrictSearchableAttributes: ['name'],
    attributesToRetrieve: ['name'],
  },
});
```

---

## Storage API

### Upload avatar
```typescript
const { data, error } = await supabase.storage
  .from('avatars')
  .upload(`${userId}/avatar.jpg`, blob, {
    contentType: 'image/jpeg',
    upsert: true,
  });

const url = supabase.storage.from('avatars').getPublicUrl(data.path).data.publicUrl;
```

### Get photo URL with transformation
```typescript
const { data } = supabase.storage
  .from('restaurant-photos')
  .getPublicUrl(path, {
    transform: {
      width: 800,
      height: 600,
      resize: 'cover',
      quality: 85,
    },
  });
```

---

## Realtime Subscriptions

### Subscribe to new notifications
```typescript
const channel = supabase
  .channel(`notifications:${userId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `user_id=eq.${userId}`,
  }, (payload) => {
    handleNewNotification(payload.new);
  })
  .subscribe();

// Cleanup
return () => supabase.removeChannel(channel);
```

### Subscribe to feed updates
```typescript
const channel = supabase
  .channel('feed_updates')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'activity_events',
    filter: `user_id=in.(${followingIds.join(',')})`,
  }, () => {
    // Trigger feed refetch
    queryClient.invalidateQueries({ queryKey: queryKeys.homeFeed() });
  })
  .subscribe();
```
