import React, { useState, useRef, useCallback } from 'react';
import {
  View, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { colors, spacing, radius } from '@/theme';
import { RText, Caption } from '@/components/ui/Text';
import {
  searchPlaces, resolvePlace, startPlacesSession, endPlacesSession, type PlacesSearchResult,
} from '@/services/places';
import { addRestaurantToList } from '@/services/lists';
import { useAuthStore } from '@/stores/authStore';
import { queryKeys } from '@/lib/queryClient';
import { toast } from '@/stores/toastStore';
import { CATEGORY_LABELS } from '@/types';

export default function AddToListScreen() {
  const { listId } = useLocalSearchParams<{ listId: string }>();
  const { profile } = useAuthStore();
  const qc = useQueryClient();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlacesSearchResult>({ rasa: [], google: [] });
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionActive = useRef(false);

  const handleSearch = useCallback((text: string) => {
    setQuery(text);
    if (debounce.current) clearTimeout(debounce.current);
    if (text.trim().length < 2) { setResults({ rasa: [], google: [] }); return; }
    if (!sessionActive.current) { startPlacesSession(); sessionActive.current = true; }
    setSearching(true);
    debounce.current = setTimeout(async () => {
      try { setResults(await searchPlaces(text)); }
      catch { setResults({ rasa: [], google: [] }); }
      finally { setSearching(false); }
    }, 300);
  }, []);

  const add = async (restaurantId: string, key: string) => {
    if (!listId || busyId || !profile) return;
    setBusyId(key);
    try {
      await addRestaurantToList(listId, restaurantId, profile.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setAdded(prev => new Set(prev).add(key));
      qc.invalidateQueries({ queryKey: queryKeys.list(listId) });
    } catch {
      toast.error('Already in the list, or could not add.');
    } finally {
      setBusyId(null);
    }
  };

  const addGoogle = async (placeId: string, name: string) => {
    if (busyId) return;
    setBusyId(placeId);
    try {
      const r = await resolvePlace(placeId, name);
      sessionActive.current = false;
      if (r) await add(r.objectID, placeId);
      else toast.error('Could not add that place.');
    } catch {
      toast.error('Could not add that place.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { endPlacesSession(); router.back(); }} style={styles.headerBtn}>
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <RText variant="titleMedium">Add places</RText>
        <TouchableOpacity onPress={() => { endPlacesSession(); router.back(); }} style={styles.headerBtn}>
          <RText variant="labelMedium" color={colors.primary}>Done</RText>
        </TouchableOpacity>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={colors.textTertiary} />
        <TextInput
          style={styles.input}
          placeholder="Search any restaurant…"
          placeholderTextColor={colors.textTertiary}
          value={query}
          onChangeText={handleSearch}
          autoFocus
          returnKeyType="search"
        />
        {searching && <ActivityIndicator size="small" color={colors.primary} />}
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: spacing[4] }}>
          {results.rasa.map(h => (
            <Row
              key={h.id}
              name={h.name}
              meta={`${CATEGORY_LABELS[h.category as keyof typeof CATEGORY_LABELS] ?? h.category} · ${h.area || h.city}`}
              icon="restaurant"
              busy={busyId === h.id}
              done={added.has(h.id)}
              onPress={() => add(h.id, h.id)}
            />
          ))}

          {results.google.length > 0 && (
            <View style={styles.sectionHeader}>
              <Ionicons name="globe-outline" size={12} color={colors.textTertiary} />
              <Caption color={colors.textTertiary} style={{ marginLeft: 5, letterSpacing: 0.4 }}>MORE PLACES ON GOOGLE</Caption>
            </View>
          )}
          {results.google.map(g => (
            <Row
              key={g.placeId}
              name={g.name}
              meta={g.secondary}
              icon="location-outline"
              busy={busyId === g.placeId}
              done={added.has(g.placeId)}
              onPress={() => addGoogle(g.placeId, g.name)}
            />
          ))}

          {query.trim().length >= 2 && !searching && results.rasa.length === 0 && results.google.length === 0 && (
            <Caption color={colors.textTertiary} align="center" style={{ marginTop: spacing[10] }}>No results for "{query}"</Caption>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ name, meta, icon, busy, done, onPress }: {
  name: string; meta: string; icon: any; busy: boolean; done: boolean; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} disabled={busy || done} activeOpacity={0.7}>
      <View style={styles.rowIcon}><Ionicons name={icon} size={18} color={colors.primary} /></View>
      <View style={{ flex: 1 }}>
        <RText variant="titleSmall" numberOfLines={1}>{name}</RText>
        {!!meta && <Caption color={colors.textTertiary} numberOfLines={1}>{meta}</Caption>}
      </View>
      {busy ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : done ? (
        <Ionicons name="checkmark-circle" size={24} color={colors.success} />
      ) : (
        <View style={styles.addBtn}><Ionicons name="add" size={20} color={colors.white} /></View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing[4], paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  headerBtn: { minWidth: 44, height: 40, alignItems: 'center', justifyContent: 'center' },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[2],
    margin: spacing[4], paddingHorizontal: spacing[4], paddingVertical: spacing[3],
    backgroundColor: colors.gray100, borderRadius: radius.xl,
  },
  input: { flex: 1, fontSize: 16, color: colors.textPrimary, padding: 0 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', paddingTop: spacing[4], paddingBottom: spacing[2] },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[3],
    paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  rowIcon: {
    width: 40, height: 40, borderRadius: radius.xl,
    backgroundColor: colors.primarySurface, alignItems: 'center', justifyContent: 'center',
  },
  addBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
});
