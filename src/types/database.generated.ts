export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activity_events: {
        Row: {
          badge_id: string | null
          created_at: string | null
          data: Json | null
          id: string
          is_public: boolean | null
          list_id: string | null
          restaurant_id: string | null
          review_id: string | null
          type: Database["public"]["Enums"]["feed_item_type"]
          user_id: string
        }
        Insert: {
          badge_id?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          is_public?: boolean | null
          list_id?: string | null
          restaurant_id?: string | null
          review_id?: string | null
          type: Database["public"]["Enums"]["feed_item_type"]
          user_id: string
        }
        Update: {
          badge_id?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          is_public?: boolean | null
          list_id?: string | null
          restaurant_id?: string | null
          review_id?: string | null
          type?: Database["public"]["Enums"]["feed_item_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_events_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_events_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_events_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_events_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      app_config: {
        Row: {
          bool_value: boolean | null
          key: string
          updated_at: string
        }
        Insert: {
          bool_value?: boolean | null
          key: string
          updated_at?: string
        }
        Update: {
          bool_value?: boolean | null
          key?: string
          updated_at?: string
        }
        Relationships: []
      }
      badges: {
        Row: {
          category: Database["public"]["Enums"]["badge_category"]
          created_at: string | null
          description: string
          icon_emoji: string | null
          icon_url: string | null
          id: string
          is_active: boolean | null
          name: string
          points: number | null
          requirement_count: number | null
          requirement_data: Json | null
          requirement_type: string | null
          slug: string
        }
        Insert: {
          category: Database["public"]["Enums"]["badge_category"]
          created_at?: string | null
          description: string
          icon_emoji?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          points?: number | null
          requirement_count?: number | null
          requirement_data?: Json | null
          requirement_type?: string | null
          slug: string
        }
        Update: {
          category?: Database["public"]["Enums"]["badge_category"]
          created_at?: string | null
          description?: string
          icon_emoji?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          points?: number | null
          requirement_count?: number | null
          requirement_data?: Json | null
          requirement_type?: string | null
          slug?: string
        }
        Relationships: []
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string | null
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string | null
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      coin_transactions: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          id: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coin_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_deleted: boolean | null
          like_count: number | null
          parent_id: string | null
          review_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          like_count?: number | null
          parent_id?: string | null
          review_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          like_count?: number | null
          parent_id?: string | null
          review_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      dish_ratings: {
        Row: {
          created_at: string | null
          dish_id: string
          id: string
          is_public: boolean | null
          note: string | null
          photo_url: string | null
          rating: number
          restaurant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          dish_id: string
          id?: string
          is_public?: boolean | null
          note?: string | null
          photo_url?: string | null
          rating: number
          restaurant_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          dish_id?: string
          id?: string
          is_public?: boolean | null
          note?: string | null
          photo_url?: string | null
          rating?: number
          restaurant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dish_ratings_dish_id_fkey"
            columns: ["dish_id"]
            isOneToOne: false
            referencedRelation: "dishes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dish_ratings_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dish_ratings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      dish_saves: {
        Row: {
          created_at: string | null
          dish_id: string
          id: string
          note: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          dish_id: string
          id?: string
          note?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          dish_id?: string
          id?: string
          note?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dish_saves_dish_id_fkey"
            columns: ["dish_id"]
            isOneToOne: false
            referencedRelation: "dishes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dish_saves_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      dishes: {
        Row: {
          average_rating: number | null
          best_meal_times: Database["public"]["Enums"]["meal_time"][] | null
          category: Database["public"]["Enums"]["dish_category"]
          cover_photo_url: string | null
          created_at: string | null
          cuisine_type: Database["public"]["Enums"]["cuisine_type"] | null
          description: string | null
          fun_fact: string | null
          id: string
          is_featured: boolean | null
          is_halal_by_default: boolean | null
          is_vegetarian_by_default: boolean | null
          name: string
          name_bm: string | null
          name_zh: string | null
          search_count: number | null
          slug: string
          total_ratings: number | null
          total_restaurant_count: number | null
          updated_at: string | null
          wikipedia_url: string | null
        }
        Insert: {
          average_rating?: number | null
          best_meal_times?: Database["public"]["Enums"]["meal_time"][] | null
          category?: Database["public"]["Enums"]["dish_category"]
          cover_photo_url?: string | null
          created_at?: string | null
          cuisine_type?: Database["public"]["Enums"]["cuisine_type"] | null
          description?: string | null
          fun_fact?: string | null
          id?: string
          is_featured?: boolean | null
          is_halal_by_default?: boolean | null
          is_vegetarian_by_default?: boolean | null
          name: string
          name_bm?: string | null
          name_zh?: string | null
          search_count?: number | null
          slug: string
          total_ratings?: number | null
          total_restaurant_count?: number | null
          updated_at?: string | null
          wikipedia_url?: string | null
        }
        Update: {
          average_rating?: number | null
          best_meal_times?: Database["public"]["Enums"]["meal_time"][] | null
          category?: Database["public"]["Enums"]["dish_category"]
          cover_photo_url?: string | null
          created_at?: string | null
          cuisine_type?: Database["public"]["Enums"]["cuisine_type"] | null
          description?: string | null
          fun_fact?: string | null
          id?: string
          is_featured?: boolean | null
          is_halal_by_default?: boolean | null
          is_vegetarian_by_default?: boolean | null
          name?: string
          name_bm?: string | null
          name_zh?: string | null
          search_count?: number | null
          slug?: string
          total_ratings?: number | null
          total_restaurant_count?: number | null
          updated_at?: string | null
          wikipedia_url?: string | null
        }
        Relationships: []
      }
      feature_unlocks: {
        Row: {
          created_at: string | null
          feature: string
          id: string
          source: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          feature: string
          id?: string
          source: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          feature?: string
          id?: string
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_unlocks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string | null
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      food_passports: {
        Row: {
          categories_tried:
            | Database["public"]["Enums"]["restaurant_category"][]
            | null
          cities_visited: string[] | null
          coins: number
          created_at: string | null
          cuisines_tried: Database["public"]["Enums"]["cuisine_type"][] | null
          followers_gained: number | null
          id: string
          last_activity_date: string | null
          lists_created: number | null
          photos_uploaded: number | null
          restaurants_visited: number | null
          reviews_written: number | null
          states_visited: string[] | null
          streak_days: number | null
          streak_week_start: string | null
          total_likes_received: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          categories_tried?:
            | Database["public"]["Enums"]["restaurant_category"][]
            | null
          cities_visited?: string[] | null
          coins?: number
          created_at?: string | null
          cuisines_tried?: Database["public"]["Enums"]["cuisine_type"][] | null
          followers_gained?: number | null
          id?: string
          last_activity_date?: string | null
          lists_created?: number | null
          photos_uploaded?: number | null
          restaurants_visited?: number | null
          reviews_written?: number | null
          states_visited?: string[] | null
          streak_days?: number | null
          streak_week_start?: string | null
          total_likes_received?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          categories_tried?:
            | Database["public"]["Enums"]["restaurant_category"][]
            | null
          cities_visited?: string[] | null
          coins?: number
          created_at?: string | null
          cuisines_tried?: Database["public"]["Enums"]["cuisine_type"][] | null
          followers_gained?: number | null
          id?: string
          last_activity_date?: string | null
          lists_created?: number | null
          photos_uploaded?: number | null
          restaurants_visited?: number | null
          reviews_written?: number | null
          states_visited?: string[] | null
          streak_days?: number | null
          streak_week_start?: string | null
          total_likes_received?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_passports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      food_trail_stops: {
        Row: {
          estimated_spend_myr: number | null
          id: string
          is_optional: boolean | null
          position: number
          recommended_dish_id: string | null
          restaurant_id: string
          tip: string | null
          trail_id: string
        }
        Insert: {
          estimated_spend_myr?: number | null
          id?: string
          is_optional?: boolean | null
          position: number
          recommended_dish_id?: string | null
          restaurant_id: string
          tip?: string | null
          trail_id: string
        }
        Update: {
          estimated_spend_myr?: number | null
          id?: string
          is_optional?: boolean | null
          position?: number
          recommended_dish_id?: string | null
          restaurant_id?: string
          tip?: string | null
          trail_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_trail_stops_recommended_dish_id_fkey"
            columns: ["recommended_dish_id"]
            isOneToOne: false
            referencedRelation: "dishes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_trail_stops_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_trail_stops_trail_id_fkey"
            columns: ["trail_id"]
            isOneToOne: false
            referencedRelation: "food_trails"
            referencedColumns: ["id"]
          },
        ]
      }
      food_trails: {
        Row: {
          best_meal_times: Database["public"]["Enums"]["meal_time"][] | null
          best_time: string | null
          city: string
          completion_count: number | null
          cover_photo_url: string | null
          created_at: string | null
          created_by: string | null
          cuisines: Database["public"]["Enums"]["cuisine_type"][] | null
          description: string
          difficulty: Database["public"]["Enums"]["trail_difficulty"] | null
          estimated_cost_myr: number | null
          estimated_duration_hours: number | null
          follower_count: number | null
          id: string
          is_featured: boolean | null
          is_published: boolean | null
          like_count: number | null
          slug: string
          state: string | null
          tags: string[] | null
          title: string
          title_bm: string | null
          total_stops: number | null
          trail_type: Database["public"]["Enums"]["trail_type"] | null
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          best_meal_times?: Database["public"]["Enums"]["meal_time"][] | null
          best_time?: string | null
          city: string
          completion_count?: number | null
          cover_photo_url?: string | null
          created_at?: string | null
          created_by?: string | null
          cuisines?: Database["public"]["Enums"]["cuisine_type"][] | null
          description: string
          difficulty?: Database["public"]["Enums"]["trail_difficulty"] | null
          estimated_cost_myr?: number | null
          estimated_duration_hours?: number | null
          follower_count?: number | null
          id?: string
          is_featured?: boolean | null
          is_published?: boolean | null
          like_count?: number | null
          slug: string
          state?: string | null
          tags?: string[] | null
          title: string
          title_bm?: string | null
          total_stops?: number | null
          trail_type?: Database["public"]["Enums"]["trail_type"] | null
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          best_meal_times?: Database["public"]["Enums"]["meal_time"][] | null
          best_time?: string | null
          city?: string
          completion_count?: number | null
          cover_photo_url?: string | null
          created_at?: string | null
          created_by?: string | null
          cuisines?: Database["public"]["Enums"]["cuisine_type"][] | null
          description?: string
          difficulty?: Database["public"]["Enums"]["trail_difficulty"] | null
          estimated_cost_myr?: number | null
          estimated_duration_hours?: number | null
          follower_count?: number | null
          id?: string
          is_featured?: boolean | null
          is_published?: boolean | null
          like_count?: number | null
          slug?: string
          state?: string | null
          tags?: string[] | null
          title?: string
          title_bm?: string | null
          total_stops?: number | null
          trail_type?: Database["public"]["Enums"]["trail_type"] | null
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "food_trails_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      job_applications: {
        Row: {
          created_at: string
          email: string
          id: string
          instagram: string | null
          message: string | null
          name: string
          portfolio: string | null
          role: string
          tiktok: string | null
          university: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          instagram?: string | null
          message?: string | null
          name: string
          portfolio?: string | null
          role: string
          tiktok?: string | null
          university?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          instagram?: string | null
          message?: string | null
          name?: string
          portfolio?: string | null
          role?: string
          tiktok?: string | null
          university?: string | null
        }
        Relationships: []
      }
      likes: {
        Row: {
          created_at: string | null
          id: string
          photo_id: string | null
          review_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          photo_id?: string | null
          review_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          photo_id?: string | null
          review_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "restaurant_photos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      list_collaborators: {
        Row: {
          can_edit: boolean | null
          id: string
          invited_by: string | null
          joined_at: string | null
          list_id: string
          user_id: string
        }
        Insert: {
          can_edit?: boolean | null
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          list_id: string
          user_id: string
        }
        Update: {
          can_edit?: boolean | null
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          list_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "list_collaborators_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "list_collaborators_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "list_collaborators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      list_follows: {
        Row: {
          created_at: string | null
          id: string
          list_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          list_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          list_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "list_follows_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "list_follows_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      list_items: {
        Row: {
          added_by: string
          created_at: string | null
          id: string
          list_id: string
          note: string | null
          position: number | null
          restaurant_id: string
        }
        Insert: {
          added_by: string
          created_at?: string | null
          id?: string
          list_id: string
          note?: string | null
          position?: number | null
          restaurant_id: string
        }
        Update: {
          added_by?: string
          created_at?: string | null
          id?: string
          list_id?: string
          note?: string | null
          position?: number | null
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "list_items_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "list_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "list_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      lists: {
        Row: {
          city: string | null
          cover_photo_url: string | null
          created_at: string | null
          description: string | null
          follower_count: number | null
          id: string
          is_collaborative: boolean | null
          like_count: number | null
          restaurant_count: number | null
          tags: string[] | null
          title: string
          updated_at: string | null
          user_id: string
          view_count: number | null
          visibility: Database["public"]["Enums"]["list_visibility"] | null
        }
        Insert: {
          city?: string | null
          cover_photo_url?: string | null
          created_at?: string | null
          description?: string | null
          follower_count?: number | null
          id?: string
          is_collaborative?: boolean | null
          like_count?: number | null
          restaurant_count?: number | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          user_id: string
          view_count?: number | null
          visibility?: Database["public"]["Enums"]["list_visibility"] | null
        }
        Update: {
          city?: string | null
          cover_photo_url?: string | null
          created_at?: string | null
          description?: string | null
          follower_count?: number | null
          id?: string
          is_collaborative?: boolean | null
          like_count?: number | null
          restaurant_count?: number | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          user_id?: string
          view_count?: number | null
          visibility?: Database["public"]["Enums"]["list_visibility"] | null
        }
        Relationships: [
          {
            foreignKeyName: "lists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          body: string | null
          created_at: string | null
          data: Json | null
          id: string
          is_pushed: boolean | null
          is_read: boolean | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          body?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          is_pushed?: boolean | null
          is_read?: boolean | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          actor_id?: string | null
          body?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          is_pushed?: boolean | null
          is_read?: boolean | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      popular_dishes: {
        Row: {
          average_price: number | null
          created_at: string | null
          description: string | null
          id: string
          is_verified: boolean | null
          mention_count: number | null
          name: string
          photo_url: string | null
          restaurant_id: string
        }
        Insert: {
          average_price?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_verified?: boolean | null
          mention_count?: number | null
          name: string
          photo_url?: string | null
          restaurant_id: string
        }
        Update: {
          average_price?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_verified?: boolean | null
          mention_count?: number | null
          name?: string
          photo_url?: string | null
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "popular_dishes_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      push_config: {
        Row: {
          function_url: string
          id: number
          secret: string
        }
        Insert: {
          function_url: string
          id?: number
          secret: string
        }
        Update: {
          function_url?: string
          id?: number
          secret?: string
        }
        Relationships: []
      }
      recommendations: {
        Row: {
          generated_at: string | null
          id: string
          is_dismissed: boolean | null
          is_seen: boolean | null
          reason: string | null
          reason_data: Json | null
          restaurant_id: string
          score: number
          user_id: string
        }
        Insert: {
          generated_at?: string | null
          id?: string
          is_dismissed?: boolean | null
          is_seen?: boolean | null
          reason?: string | null
          reason_data?: Json | null
          restaurant_id: string
          score: number
          user_id: string
        }
        Update: {
          generated_at?: string | null
          id?: string
          is_dismissed?: boolean | null
          is_seen?: boolean | null
          reason?: string | null
          reason_data?: Json | null
          restaurant_id?: string
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          activated_at: string | null
          created_at: string | null
          id: string
          referred_id: string
          referrer_id: string
        }
        Insert: {
          activated_at?: string | null
          created_at?: string | null
          id?: string
          referred_id: string
          referrer_id: string
        }
        Update: {
          activated_at?: string | null
          created_at?: string | null
          id?: string
          referred_id?: string
          referrer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          comment_id: string | null
          created_at: string | null
          description: string | null
          id: string
          reason: string
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          restaurant_id: string | null
          review_id: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          comment_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          reason: string
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          restaurant_id?: string | null
          review_id?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          comment_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          restaurant_id?: string | null
          review_id?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_dish_tags: {
        Row: {
          created_at: string | null
          dish_id: string
          id: string
          restaurant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          dish_id: string
          id?: string
          restaurant_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          dish_id?: string
          id?: string
          restaurant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_dish_tags_dish_id_fkey"
            columns: ["dish_id"]
            isOneToOne: false
            referencedRelation: "dishes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_dish_tags_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_dish_tags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_dishes: {
        Row: {
          added_by: string | null
          average_rating: number | null
          created_at: string | null
          dish_id: string
          id: string
          is_available: boolean | null
          is_signature: boolean | null
          local_name: string | null
          photo_url: string | null
          price: number | null
          rating_count: number | null
          restaurant_id: string
          signal_score: number | null
          tag_count: number
        }
        Insert: {
          added_by?: string | null
          average_rating?: number | null
          created_at?: string | null
          dish_id: string
          id?: string
          is_available?: boolean | null
          is_signature?: boolean | null
          local_name?: string | null
          photo_url?: string | null
          price?: number | null
          rating_count?: number | null
          restaurant_id: string
          signal_score?: number | null
          tag_count?: number
        }
        Update: {
          added_by?: string | null
          average_rating?: number | null
          created_at?: string | null
          dish_id?: string
          id?: string
          is_available?: boolean | null
          is_signature?: boolean | null
          local_name?: string | null
          photo_url?: string | null
          price?: number | null
          rating_count?: number | null
          restaurant_id?: string
          signal_score?: number | null
          tag_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_dishes_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_dishes_dish_id_fkey"
            columns: ["dish_id"]
            isOneToOne: false
            referencedRelation: "dishes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_dishes_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_food_tags: {
        Row: {
          created_at: string | null
          id: string
          restaurant_id: string
          tag: Database["public"]["Enums"]["food_tag_type"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          restaurant_id: string
          tag: Database["public"]["Enums"]["food_tag_type"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          restaurant_id?: string
          tag?: Database["public"]["Enums"]["food_tag_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_food_tags_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_food_tags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_meal_times: {
        Row: {
          closing_time: string | null
          id: string
          is_auto_detected: boolean | null
          meal_time: Database["public"]["Enums"]["meal_time"]
          opening_time: string | null
          restaurant_id: string
        }
        Insert: {
          closing_time?: string | null
          id?: string
          is_auto_detected?: boolean | null
          meal_time: Database["public"]["Enums"]["meal_time"]
          opening_time?: string | null
          restaurant_id: string
        }
        Update: {
          closing_time?: string | null
          id?: string
          is_auto_detected?: boolean | null
          meal_time?: Database["public"]["Enums"]["meal_time"]
          opening_time?: string | null
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_meal_times_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_photos: {
        Row: {
          caption: string | null
          created_at: string | null
          dish_name: string | null
          id: string
          is_approved: boolean | null
          is_cover: boolean | null
          like_count: number | null
          restaurant_id: string
          thumbnail_url: string | null
          uploaded_by: string
          url: string
          view_count: number | null
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          dish_name?: string | null
          id?: string
          is_approved?: boolean | null
          is_cover?: boolean | null
          like_count?: number | null
          restaurant_id: string
          thumbnail_url?: string | null
          uploaded_by: string
          url: string
          view_count?: number | null
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          dish_name?: string | null
          id?: string
          is_approved?: boolean | null
          is_cover?: boolean | null
          like_count?: number | null
          restaurant_id?: string
          thumbnail_url?: string | null
          uploaded_by?: string
          url?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_photos_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_photos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          address: string
          algolia_object_id: string | null
          area: string | null
          category: Database["public"]["Enums"]["restaurant_category"]
          city: string
          claimed_by: string | null
          country: string | null
          cover_photo_url: string | null
          created_at: string | null
          cuisines: Database["public"]["Enums"]["cuisine_type"][]
          description: string | null
          dietary_options:
            | Database["public"]["Enums"]["dietary_option"][]
            | null
          email: string | null
          facebook_url: string | null
          friend_rating: number | null
          google_maps_url: string | null
          google_place_id: string | null
          google_rating: number | null
          google_rating_count: number | null
          google_types: string[] | null
          id: string
          instagram_handle: string | null
          is_active: boolean | null
          is_approved: boolean | null
          is_claimed: boolean | null
          last_synced_at: string | null
          latitude: number | null
          location: unknown
          longitude: number | null
          name: string
          opening_hours: Json | null
          overall_rating: number | null
          phone_number: string | null
          popularity_score: number | null
          postal_code: string | null
          price_level: number | null
          price_range: Database["public"]["Enums"]["price_range"] | null
          slug: string
          source: string | null
          state: string | null
          submitted_by: string | null
          tags: string[] | null
          total_ratings: number | null
          total_reviews: number | null
          total_saves: number | null
          total_visits: number | null
          updated_at: string | null
          waze_url: string | null
          website_url: string | null
          whatsapp_number: string | null
        }
        Insert: {
          address: string
          algolia_object_id?: string | null
          area?: string | null
          category?: Database["public"]["Enums"]["restaurant_category"]
          city?: string
          claimed_by?: string | null
          country?: string | null
          cover_photo_url?: string | null
          created_at?: string | null
          cuisines?: Database["public"]["Enums"]["cuisine_type"][]
          description?: string | null
          dietary_options?:
            | Database["public"]["Enums"]["dietary_option"][]
            | null
          email?: string | null
          facebook_url?: string | null
          friend_rating?: number | null
          google_maps_url?: string | null
          google_place_id?: string | null
          google_rating?: number | null
          google_rating_count?: number | null
          google_types?: string[] | null
          id?: string
          instagram_handle?: string | null
          is_active?: boolean | null
          is_approved?: boolean | null
          is_claimed?: boolean | null
          last_synced_at?: string | null
          latitude?: number | null
          location?: unknown
          longitude?: number | null
          name: string
          opening_hours?: Json | null
          overall_rating?: number | null
          phone_number?: string | null
          popularity_score?: number | null
          postal_code?: string | null
          price_level?: number | null
          price_range?: Database["public"]["Enums"]["price_range"] | null
          slug: string
          source?: string | null
          state?: string | null
          submitted_by?: string | null
          tags?: string[] | null
          total_ratings?: number | null
          total_reviews?: number | null
          total_saves?: number | null
          total_visits?: number | null
          updated_at?: string | null
          waze_url?: string | null
          website_url?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          address?: string
          algolia_object_id?: string | null
          area?: string | null
          category?: Database["public"]["Enums"]["restaurant_category"]
          city?: string
          claimed_by?: string | null
          country?: string | null
          cover_photo_url?: string | null
          created_at?: string | null
          cuisines?: Database["public"]["Enums"]["cuisine_type"][]
          description?: string | null
          dietary_options?:
            | Database["public"]["Enums"]["dietary_option"][]
            | null
          email?: string | null
          facebook_url?: string | null
          friend_rating?: number | null
          google_maps_url?: string | null
          google_place_id?: string | null
          google_rating?: number | null
          google_rating_count?: number | null
          google_types?: string[] | null
          id?: string
          instagram_handle?: string | null
          is_active?: boolean | null
          is_approved?: boolean | null
          is_claimed?: boolean | null
          last_synced_at?: string | null
          latitude?: number | null
          location?: unknown
          longitude?: number | null
          name?: string
          opening_hours?: Json | null
          overall_rating?: number | null
          phone_number?: string | null
          popularity_score?: number | null
          postal_code?: string | null
          price_level?: number | null
          price_range?: Database["public"]["Enums"]["price_range"] | null
          slug?: string
          source?: string | null
          state?: string | null
          submitted_by?: string | null
          tags?: string[] | null
          total_ratings?: number | null
          total_reviews?: number | null
          total_saves?: number | null
          total_visits?: number | null
          updated_at?: string | null
          waze_url?: string | null
          website_url?: string | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurants_claimed_by_fkey"
            columns: ["claimed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurants_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment_count: number | null
          content: string | null
          created_at: string | null
          dishes_mentioned: string[] | null
          id: string
          is_public: boolean | null
          like_count: number | null
          photos: string[] | null
          rank_score: number | null
          rating: number
          restaurant_id: string
          updated_at: string | null
          user_id: string
          visit_date: string | null
        }
        Insert: {
          comment_count?: number | null
          content?: string | null
          created_at?: string | null
          dishes_mentioned?: string[] | null
          id?: string
          is_public?: boolean | null
          like_count?: number | null
          photos?: string[] | null
          rank_score?: number | null
          rating: number
          restaurant_id: string
          updated_at?: string | null
          user_id: string
          visit_date?: string | null
        }
        Update: {
          comment_count?: number | null
          content?: string | null
          created_at?: string | null
          dishes_mentioned?: string[] | null
          id?: string
          is_public?: boolean | null
          like_count?: number | null
          photos?: string[] | null
          rank_score?: number | null
          rating?: number
          restaurant_id?: string
          updated_at?: string | null
          user_id?: string
          visit_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_restaurants: {
        Row: {
          created_at: string | null
          id: string
          note: string | null
          restaurant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          note?: string | null
          restaurant_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          note?: string | null
          restaurant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_restaurants_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_restaurants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      taste_similarity: {
        Row: {
          common_cuisines: string[] | null
          common_restaurants: number | null
          created_at: string | null
          id: string
          is_mutual_follow: boolean | null
          last_calculated: string | null
          similarity_score: number
          user_id_1: string
          user_id_2: string
        }
        Insert: {
          common_cuisines?: string[] | null
          common_restaurants?: number | null
          created_at?: string | null
          id?: string
          is_mutual_follow?: boolean | null
          last_calculated?: string | null
          similarity_score?: number
          user_id_1: string
          user_id_2: string
        }
        Update: {
          common_cuisines?: string[] | null
          common_restaurants?: number | null
          created_at?: string | null
          id?: string
          is_mutual_follow?: boolean | null
          last_calculated?: string | null
          similarity_score?: number
          user_id_1?: string
          user_id_2?: string
        }
        Relationships: [
          {
            foreignKeyName: "taste_similarity_user_id_1_fkey"
            columns: ["user_id_1"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "taste_similarity_user_id_2_fkey"
            columns: ["user_id_2"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      trail_follows: {
        Row: {
          created_at: string | null
          id: string
          trail_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          trail_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          trail_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trail_follows_trail_id_fkey"
            columns: ["trail_id"]
            isOneToOne: false
            referencedRelation: "food_trails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trail_follows_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_trail_progress: {
        Row: {
          completed_at: string | null
          completed_stops: string[] | null
          id: string
          is_completed: boolean | null
          started_at: string | null
          trail_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_stops?: string[] | null
          id?: string
          is_completed?: boolean | null
          started_at?: string | null
          trail_id: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          completed_stops?: string[] | null
          id?: string
          is_completed?: boolean | null
          started_at?: string | null
          trail_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_trail_progress_trail_id_fkey"
            columns: ["trail_id"]
            isOneToOne: false
            referencedRelation: "food_trails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_trail_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          active_theme: string
          auth_id: string
          avatar_url: string | null
          bio: string | null
          city: string | null
          country: string | null
          cover_url: string | null
          created_at: string | null
          dietary_preferences:
            | Database["public"]["Enums"]["dietary_option"][]
            | null
          display_name: string
          favorite_cuisines:
            | Database["public"]["Enums"]["cuisine_type"][]
            | null
          follower_count: number | null
          following_count: number | null
          id: string
          instagram_handle: string | null
          is_active: boolean | null
          is_admin: boolean | null
          is_ambassador: boolean | null
          is_verified: boolean | null
          location_lat: number | null
          location_lng: number | null
          onboarding_completed: boolean | null
          preferred_language: string | null
          push_token: string | null
          referral_code: string | null
          school: string | null
          school_updated_at: string | null
          taste_profile:
            | Database["public"]["Enums"]["taste_profile_type"]
            | null
          taste_score: number | null
          total_lists: number | null
          total_reviews: number | null
          total_visits: number | null
          updated_at: string | null
          username: string
          website_url: string | null
        }
        Insert: {
          active_theme?: string
          auth_id: string
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string | null
          dietary_preferences?:
            | Database["public"]["Enums"]["dietary_option"][]
            | null
          display_name: string
          favorite_cuisines?:
            | Database["public"]["Enums"]["cuisine_type"][]
            | null
          follower_count?: number | null
          following_count?: number | null
          id?: string
          instagram_handle?: string | null
          is_active?: boolean | null
          is_admin?: boolean | null
          is_ambassador?: boolean | null
          is_verified?: boolean | null
          location_lat?: number | null
          location_lng?: number | null
          onboarding_completed?: boolean | null
          preferred_language?: string | null
          push_token?: string | null
          referral_code?: string | null
          school?: string | null
          school_updated_at?: string | null
          taste_profile?:
            | Database["public"]["Enums"]["taste_profile_type"]
            | null
          taste_score?: number | null
          total_lists?: number | null
          total_reviews?: number | null
          total_visits?: number | null
          updated_at?: string | null
          username: string
          website_url?: string | null
        }
        Update: {
          active_theme?: string
          auth_id?: string
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string | null
          dietary_preferences?:
            | Database["public"]["Enums"]["dietary_option"][]
            | null
          display_name?: string
          favorite_cuisines?:
            | Database["public"]["Enums"]["cuisine_type"][]
            | null
          follower_count?: number | null
          following_count?: number | null
          id?: string
          instagram_handle?: string | null
          is_active?: boolean | null
          is_admin?: boolean | null
          is_ambassador?: boolean | null
          is_verified?: boolean | null
          location_lat?: number | null
          location_lng?: number | null
          onboarding_completed?: boolean | null
          preferred_language?: string | null
          push_token?: string | null
          referral_code?: string | null
          school?: string | null
          school_updated_at?: string | null
          taste_profile?:
            | Database["public"]["Enums"]["taste_profile_type"]
            | null
          taste_score?: number | null
          total_lists?: number | null
          total_reviews?: number | null
          total_visits?: number | null
          updated_at?: string | null
          username?: string
          website_url?: string | null
        }
        Relationships: []
      }
      visits: {
        Row: {
          id: string
          note: string | null
          restaurant_id: string
          user_id: string
          visited_at: string | null
        }
        Insert: {
          id?: string
          note?: string | null
          restaurant_id: string
          user_id: string
          visited_at?: string | null
        }
        Update: {
          id?: string
          note?: string | null
          restaurant_id?: string
          user_id?: string
          visited_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visits_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
          referral: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
          phone?: string | null
          referral?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          referral?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
      restaurant_tag_counts: {
        Row: {
          count: number | null
          restaurant_id: string | null
          tag: Database["public"]["Enums"]["food_tag_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_food_tags_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      activate_referral: { Args: { p_referred_id: string }; Returns: undefined }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      admin_ambassador_leaderboard: {
        Args: never
        Returns: {
          activated: number
          avatar_url: string
          display_name: string
          invited: number
          is_ambassador: boolean
          referrer_id: string
          username: string
        }[]
      }
      admin_app_stats: {
        Args: never
        Returns: {
          activated_referrals: number
          activation_rate: number
          new_users_7d: number
          reviews_7d: number
          total_referrals: number
          total_restaurants: number
          total_reviews: number
          total_users: number
        }[]
      }
      admin_reports: {
        Args: never
        Returns: {
          comment_id: string
          created_at: string
          description: string
          id: string
          reason: string
          reported_name: string
          reported_username: string
          reporter_name: string
          reporter_username: string
          restaurant_id: string
          review_id: string
          status: string
        }[]
      }
      admin_resolve_report: {
        Args: { p_id: string; p_status?: string }
        Returns: undefined
      }
      app_flag: {
        Args: { p_default: boolean; p_key: string }
        Returns: boolean
      }
      auth_user_id: { Args: never; Returns: string }
      award_coins: {
        Args: {
          p_amount: number
          p_description?: string
          p_type: string
          p_user_id: string
        }
        Returns: number
      }
      calculate_taste_similarity: {
        Args: { p_user_id_1: string; p_user_id_2: string }
        Returns: number
      }
      check_and_award_badges: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      determine_taste_profile: {
        Args: { p_user_id: string }
        Returns: Database["public"]["Enums"]["taste_profile_type"]
      }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      generate_recommendations: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      generate_referral_code: { Args: never; Returns: string }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_home_feed: {
        Args: { p_limit?: number; p_offset?: number; p_user_id: string }
        Returns: {
          actor_avatar_url: string
          actor_display_name: string
          actor_id: string
          actor_username: string
          badge_name: string
          created_at: string
          data: Json
          event_id: string
          event_type: Database["public"]["Enums"]["feed_item_type"]
          list_id: string
          list_title: string
          restaurant_category: string
          restaurant_cover_url: string
          restaurant_id: string
          restaurant_name: string
          review_comment_count: number
          review_content: string
          review_id: string
          review_like_count: number
          review_photos: string[]
          review_rating: number
        }[]
      }
      get_nearby_restaurants: {
        Args: {
          p_lat: number
          p_limit?: number
          p_lng: number
          p_radius_km?: number
        }
        Returns: {
          address: string
          category: string
          cover_photo_url: string
          distance_km: number
          id: string
          name: string
          overall_rating: number
          total_reviews: number
        }[]
      }
      gettransactionid: { Args: never; Returns: unknown }
      is_admin: { Args: never; Returns: boolean }
      longtransactionsenabled: { Args: never; Returns: boolean }
      notify_recap_ready: { Args: never; Returns: undefined }
      notify_streak_expiring: { Args: never; Returns: undefined }
      notify_weekly_leaderboard: { Args: never; Returns: undefined }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      record_referral: {
        Args: { p_referred_id: string; p_referrer_username: string }
        Returns: undefined
      }
      reorder_reviews: {
        Args: { p_ordered_ids: string[]; p_rating: number; p_user_id: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      signup_gate: { Args: never; Returns: boolean }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      tag_dish: {
        Args: {
          p_dish_id: string
          p_dish_name: string
          p_restaurant_id: string
          p_user_id: string
        }
        Returns: string
      }
      unaccent: { Args: { "": string }; Returns: string }
      unlockrows: { Args: { "": string }; Returns: number }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
      validate_referral_code: { Args: { p_code: string }; Returns: boolean }
    }
    Enums: {
      badge_category: "explorer" | "social" | "foodie" | "milestone" | "special"
      cuisine_type:
        | "malay"
        | "chinese"
        | "indian"
        | "mamak"
        | "nyonya"
        | "japanese"
        | "korean"
        | "western"
        | "italian"
        | "thai"
        | "vietnamese"
        | "middle_eastern"
        | "fusion"
        | "hawker"
        | "seafood"
        | "vegetarian"
        | "dessert"
        | "bakery"
        | "cafe"
        | "other"
      dietary_option:
        | "halal_certified"
        | "muslim_friendly"
        | "pork_free"
        | "vegetarian"
        | "vegan"
        | "gluten_free"
        | "nut_free"
      dish_category:
        | "rice"
        | "noodles"
        | "bread"
        | "grilled"
        | "fried"
        | "soup"
        | "curry"
        | "salad"
        | "seafood"
        | "meat"
        | "dim_sum"
        | "dessert"
        | "drinks"
        | "snacks"
        | "other"
      feed_item_type:
        | "review"
        | "visit"
        | "list_created"
        | "list_updated"
        | "badge_earned"
        | "milestone"
        | "recommendation"
      food_tag_type:
        | "must_try"
        | "hidden_gem"
        | "worth_the_queue"
        | "great_value"
        | "late_night"
        | "date_spot"
        | "family_friendly"
        | "tourist_friendly"
        | "overrated"
        | "study_spot"
        | "instagrammable"
        | "cheap_and_good"
        | "breakfast_spot"
        | "supper_spot"
        | "outdoor_seating"
        | "no_queue"
      list_visibility: "public" | "private" | "friends_only"
      meal_time:
        | "breakfast"
        | "brunch"
        | "lunch"
        | "tea"
        | "dinner"
        | "supper"
        | "anytime"
      notification_type:
        | "follow"
        | "like_review"
        | "comment"
        | "mention"
        | "taste_match"
        | "friend_visit"
        | "friend_review"
        | "friend_list"
        | "milestone"
        | "recommendation"
        | "badge_earned"
        | "list_invite"
        | "weekly_digest"
      price_range: "$" | "$$" | "$$$" | "$$$$"
      restaurant_category:
        | "hawker"
        | "mamak"
        | "cafe"
        | "kopitiam"
        | "restaurant"
        | "fine_dining"
        | "food_court"
        | "night_market"
        | "rooftop"
        | "bar"
        | "fast_food"
        | "buffet"
        | "food_truck"
      taste_profile_type:
        | "hawker_hunter"
        | "cafe_explorer"
        | "fine_dining_enthusiast"
        | "spice_lover"
        | "street_food_king"
        | "dessert_devotee"
        | "hidden_gem_seeker"
        | "social_foodie"
        | "health_conscious"
        | "omnivore"
        | "night_owl_eater"
      trail_difficulty: "easy" | "moderate" | "hardcore"
      trail_type: "curated" | "user_created" | "community"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      badge_category: ["explorer", "social", "foodie", "milestone", "special"],
      cuisine_type: [
        "malay",
        "chinese",
        "indian",
        "mamak",
        "nyonya",
        "japanese",
        "korean",
        "western",
        "italian",
        "thai",
        "vietnamese",
        "middle_eastern",
        "fusion",
        "hawker",
        "seafood",
        "vegetarian",
        "dessert",
        "bakery",
        "cafe",
        "other",
      ],
      dietary_option: [
        "halal_certified",
        "muslim_friendly",
        "pork_free",
        "vegetarian",
        "vegan",
        "gluten_free",
        "nut_free",
      ],
      dish_category: [
        "rice",
        "noodles",
        "bread",
        "grilled",
        "fried",
        "soup",
        "curry",
        "salad",
        "seafood",
        "meat",
        "dim_sum",
        "dessert",
        "drinks",
        "snacks",
        "other",
      ],
      feed_item_type: [
        "review",
        "visit",
        "list_created",
        "list_updated",
        "badge_earned",
        "milestone",
        "recommendation",
      ],
      food_tag_type: [
        "must_try",
        "hidden_gem",
        "worth_the_queue",
        "great_value",
        "late_night",
        "date_spot",
        "family_friendly",
        "tourist_friendly",
        "overrated",
        "study_spot",
        "instagrammable",
        "cheap_and_good",
        "breakfast_spot",
        "supper_spot",
        "outdoor_seating",
        "no_queue",
      ],
      list_visibility: ["public", "private", "friends_only"],
      meal_time: [
        "breakfast",
        "brunch",
        "lunch",
        "tea",
        "dinner",
        "supper",
        "anytime",
      ],
      notification_type: [
        "follow",
        "like_review",
        "comment",
        "mention",
        "taste_match",
        "friend_visit",
        "friend_review",
        "friend_list",
        "milestone",
        "recommendation",
        "badge_earned",
        "list_invite",
        "weekly_digest",
      ],
      price_range: ["$", "$$", "$$$", "$$$$"],
      restaurant_category: [
        "hawker",
        "mamak",
        "cafe",
        "kopitiam",
        "restaurant",
        "fine_dining",
        "food_court",
        "night_market",
        "rooftop",
        "bar",
        "fast_food",
        "buffet",
        "food_truck",
      ],
      taste_profile_type: [
        "hawker_hunter",
        "cafe_explorer",
        "fine_dining_enthusiast",
        "spice_lover",
        "street_food_king",
        "dessert_devotee",
        "hidden_gem_seeker",
        "social_foodie",
        "health_conscious",
        "omnivore",
        "night_owl_eater",
      ],
      trail_difficulty: ["easy", "moderate", "hardcore"],
      trail_type: ["curated", "user_created", "community"],
    },
  },
} as const
