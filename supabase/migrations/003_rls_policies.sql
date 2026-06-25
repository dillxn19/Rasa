-- ============================================================
-- RASA — Migration 003: Row Level Security Policies
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE popular_dishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE taste_similarity ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_passports ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_events ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER FUNCTION: get current user's id
-- ============================================================

CREATE OR REPLACE FUNCTION auth_user_id()
RETURNS UUID AS $$
  SELECT id FROM users WHERE auth_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(is_admin, false) FROM users WHERE auth_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- USERS POLICIES
-- ============================================================

CREATE POLICY "Users are publicly viewable"
  ON users FOR SELECT USING (is_active = true);

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE USING (auth_id = auth.uid());

CREATE POLICY "Admins can update any user"
  ON users FOR UPDATE USING (is_admin());

-- ============================================================
-- RESTAURANTS POLICIES
-- ============================================================

CREATE POLICY "Approved restaurants are publicly viewable"
  ON restaurants FOR SELECT USING (is_approved = true OR submitted_by = auth_user_id());

CREATE POLICY "Authenticated users can submit restaurants"
  ON restaurants FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their submitted restaurants (pending)"
  ON restaurants FOR UPDATE USING (submitted_by = auth_user_id() OR is_admin());

CREATE POLICY "Admins can manage all restaurants"
  ON restaurants FOR ALL USING (is_admin());

-- ============================================================
-- RESTAURANT PHOTOS POLICIES
-- ============================================================

CREATE POLICY "Approved photos are publicly viewable"
  ON restaurant_photos FOR SELECT USING (is_approved = true OR uploaded_by = auth_user_id());

CREATE POLICY "Authenticated users can upload photos"
  ON restaurant_photos FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND uploaded_by = auth_user_id());

CREATE POLICY "Users can delete their own photos"
  ON restaurant_photos FOR DELETE USING (uploaded_by = auth_user_id() OR is_admin());

-- ============================================================
-- REVIEWS POLICIES
-- ============================================================

CREATE POLICY "Public reviews are viewable by all"
  ON reviews FOR SELECT USING (is_public = true OR user_id = auth_user_id());

CREATE POLICY "Authenticated users can create reviews"
  ON reviews FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth_user_id());

CREATE POLICY "Users can update their own reviews"
  ON reviews FOR UPDATE USING (user_id = auth_user_id());

CREATE POLICY "Users can delete their own reviews"
  ON reviews FOR DELETE USING (user_id = auth_user_id() OR is_admin());

-- ============================================================
-- VISITS POLICIES
-- ============================================================

CREATE POLICY "Users can view their own visits"
  ON visits FOR SELECT USING (user_id = auth_user_id());

CREATE POLICY "Users can view friends visits"
  ON visits FOR SELECT USING (
    EXISTS (SELECT 1 FROM follows WHERE follower_id = auth_user_id() AND following_id = user_id)
  );

CREATE POLICY "Authenticated users can log visits"
  ON visits FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth_user_id());

CREATE POLICY "Users can delete their own visits"
  ON visits FOR DELETE USING (user_id = auth_user_id());

-- ============================================================
-- FOLLOWS POLICIES
-- ============================================================

CREATE POLICY "Follows are publicly viewable"
  ON follows FOR SELECT USING (true);

CREATE POLICY "Authenticated users can follow"
  ON follows FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND follower_id = auth_user_id());

CREATE POLICY "Users can unfollow"
  ON follows FOR DELETE USING (follower_id = auth_user_id());

-- ============================================================
-- LIKES POLICIES
-- ============================================================

CREATE POLICY "Likes are publicly viewable"
  ON likes FOR SELECT USING (true);

CREATE POLICY "Authenticated users can like"
  ON likes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth_user_id());

CREATE POLICY "Users can unlike"
  ON likes FOR DELETE USING (user_id = auth_user_id());

-- ============================================================
-- COMMENTS POLICIES
-- ============================================================

CREATE POLICY "Comments are publicly viewable"
  ON comments FOR SELECT USING (NOT is_deleted OR user_id = auth_user_id());

CREATE POLICY "Authenticated users can comment"
  ON comments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth_user_id());

CREATE POLICY "Users can update their own comments"
  ON comments FOR UPDATE USING (user_id = auth_user_id());

CREATE POLICY "Users can delete their own comments"
  ON comments FOR DELETE USING (user_id = auth_user_id() OR is_admin());

-- ============================================================
-- SAVED RESTAURANTS POLICIES
-- ============================================================

CREATE POLICY "Users can view their own saves"
  ON saved_restaurants FOR SELECT USING (user_id = auth_user_id());

CREATE POLICY "Authenticated users can save restaurants"
  ON saved_restaurants FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth_user_id());

CREATE POLICY "Users can unsave restaurants"
  ON saved_restaurants FOR DELETE USING (user_id = auth_user_id());

-- ============================================================
-- LISTS POLICIES
-- ============================================================

CREATE POLICY "Public lists are viewable by all"
  ON lists FOR SELECT USING (
    visibility = 'public'
    OR user_id = auth_user_id()
    OR (visibility = 'friends_only' AND EXISTS (
      SELECT 1 FROM follows WHERE follower_id = auth_user_id() AND following_id = user_id
    ))
  );

CREATE POLICY "Authenticated users can create lists"
  ON lists FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth_user_id());

CREATE POLICY "List owners can update lists"
  ON lists FOR UPDATE USING (
    user_id = auth_user_id()
    OR EXISTS (SELECT 1 FROM list_collaborators WHERE list_id = id AND user_id = auth_user_id() AND can_edit = true)
  );

CREATE POLICY "List owners can delete lists"
  ON lists FOR DELETE USING (user_id = auth_user_id());

-- ============================================================
-- LIST ITEMS POLICIES
-- ============================================================

CREATE POLICY "List items visible with list"
  ON list_items FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lists l WHERE l.id = list_id
      AND (
        l.visibility = 'public'
        OR l.user_id = auth_user_id()
        OR EXISTS (SELECT 1 FROM follows WHERE follower_id = auth_user_id() AND following_id = l.user_id)
      )
    )
  );

CREATE POLICY "List owners and collaborators can add items"
  ON list_items FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND (
      added_by = auth_user_id() AND (
        EXISTS (SELECT 1 FROM lists WHERE id = list_id AND user_id = auth_user_id())
        OR EXISTS (SELECT 1 FROM list_collaborators WHERE list_id = list_id AND user_id = auth_user_id())
      )
    )
  );

CREATE POLICY "List owners and collaborators can remove items"
  ON list_items FOR DELETE USING (
    EXISTS (SELECT 1 FROM lists WHERE id = list_id AND user_id = auth_user_id())
    OR added_by = auth_user_id()
  );

-- ============================================================
-- BADGES POLICIES
-- ============================================================

CREATE POLICY "Badges are publicly viewable"
  ON badges FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage badges"
  ON badges FOR ALL USING (is_admin());

-- ============================================================
-- USER BADGES POLICIES
-- ============================================================

CREATE POLICY "User badges are publicly viewable"
  ON user_badges FOR SELECT USING (true);

-- ============================================================
-- TASTE SIMILARITY POLICIES
-- ============================================================

CREATE POLICY "Users can view their own taste similarity"
  ON taste_similarity FOR SELECT USING (
    user_id_1 = auth_user_id() OR user_id_2 = auth_user_id()
  );

-- ============================================================
-- RECOMMENDATIONS POLICIES
-- ============================================================

CREATE POLICY "Users can view their own recommendations"
  ON recommendations FOR SELECT USING (user_id = auth_user_id());

CREATE POLICY "Users can update their own recommendations (dismiss)"
  ON recommendations FOR UPDATE USING (user_id = auth_user_id());

-- ============================================================
-- NOTIFICATIONS POLICIES
-- ============================================================

CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT USING (user_id = auth_user_id());

CREATE POLICY "Users can update their own notifications (mark as read)"
  ON notifications FOR UPDATE USING (user_id = auth_user_id());

-- ============================================================
-- FOOD PASSPORTS POLICIES
-- ============================================================

CREATE POLICY "Food passports are publicly viewable"
  ON food_passports FOR SELECT USING (true);

CREATE POLICY "Users can update their own passport"
  ON food_passports FOR UPDATE USING (user_id = auth_user_id());

-- ============================================================
-- ACTIVITY EVENTS POLICIES
-- ============================================================

CREATE POLICY "Public activity is viewable by all"
  ON activity_events FOR SELECT USING (
    is_public = true
    OR user_id = auth_user_id()
    OR EXISTS (SELECT 1 FROM follows WHERE follower_id = auth_user_id() AND following_id = user_id)
  );

-- ============================================================
-- REPORTS POLICIES
-- ============================================================

CREATE POLICY "Users can view their own reports"
  ON reports FOR SELECT USING (reporter_id = auth_user_id() OR is_admin());

CREATE POLICY "Authenticated users can create reports"
  ON reports FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND reporter_id = auth_user_id());

CREATE POLICY "Admins can manage reports"
  ON reports FOR ALL USING (is_admin());
