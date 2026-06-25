import React from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, spacing, radius } from '@/theme';
import { RText } from './Text';
import type { FoodTagType, FoodTagCount } from '@/types';
import { FOOD_TAG_LABELS, FOOD_TAG_EMOJIS } from '@/types';

// ─── Tag color mapping ────────────────────────────────────────

const TAG_COLORS: Record<FoodTagType, { bg: string; text: string; border: string }> = {
  must_try:         { bg: '#FEF0EE', text: colors.primary, border: colors.primary },
  hidden_gem:       { bg: '#EDE9FF', text: '#7C6BAE', border: '#7C6BAE' },
  worth_the_queue:  { bg: '#FEF3C7', text: '#D97706', border: '#F59E0B' },
  great_value:      { bg: '#E4F2E7', text: colors.success, border: colors.success },
  late_night:       { bg: '#EDE9FF', text: '#6D28D9', border: '#6D28D9' },
  date_spot:        { bg: '#FCE7F3', text: '#BE185D', border: '#EC4899' },
  family_friendly:  { bg: '#E4F2E7', text: '#2D6A40', border: '#4F8A5B' },
  tourist_friendly: { bg: '#DBEAFE', text: '#1D4ED8', border: '#3B82F6' },
  overrated:        { bg: colors.gray100, text: colors.textSecondary, border: colors.border },
  study_spot:       { bg: '#FEF9EC', text: '#92400E', border: '#F4B942' },
  instagrammable:   { bg: '#FCE7F3', text: '#9D174D', border: '#EC4899' },
  cheap_and_good:   { bg: '#E4F2E7', text: '#065F46', border: '#4F8A5B' },
  breakfast_spot:   { bg: '#FEF9EC', text: '#D97706', border: '#F4B942' },
  supper_spot:      { bg: '#1F2937', text: '#E5E7EB', border: '#374151' },
  outdoor_seating:  { bg: '#D1FAE5', text: '#065F46', border: '#34D399' },
  no_queue:         { bg: '#D1FAE5', text: '#065F46', border: '#10B981' },
};

// ─── Single tag chip ─────────────────────────────────────────

interface FoodTagChipProps {
  tag: FoodTagType;
  count?: number;
  isSelected?: boolean;
  onPress?: () => void;
  size?: 'sm' | 'md';
}

export function FoodTagChip({ tag, count, isSelected, onPress, size = 'md' }: FoodTagChipProps) {
  const tc = TAG_COLORS[tag];
  const label = FOOD_TAG_LABELS[tag];
  const emoji = FOOD_TAG_EMOJIS[tag];

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  const chipStyle = [
    styles.chip,
    size === 'sm' && styles.chipSm,
    { backgroundColor: isSelected ? tc.bg : colors.surface, borderColor: isSelected ? tc.border : colors.border },
  ];

  const content = (
    <>
      <RText style={size === 'sm' ? styles.emojiSm : styles.emoji}>{emoji}</RText>
      <RText
        variant={size === 'sm' ? 'caption' : 'labelMedium'}
        color={isSelected ? tc.text : colors.textSecondary}
        style={size === 'sm' ? styles.labelSm : styles.label}
      >
        {label}
      </RText>
      {count !== undefined && count > 0 && (
        <View style={[styles.countBadge, { backgroundColor: isSelected ? tc.border : colors.gray200 }]}>
          <RText style={{ fontSize: 9, fontWeight: '700', color: isSelected ? '#fff' : colors.textSecondary }}>
            {count}
          </RText>
        </View>
      )}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity style={chipStyle} onPress={handlePress} activeOpacity={0.75}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={chipStyle}>{content}</View>;
}

// ─── Tag list with add functionality ─────────────────────────

interface FoodTagListProps {
  tags: FoodTagCount[];
  onToggle?: (tag: FoodTagType) => void;
  showAll?: boolean;
  maxVisible?: number;
  editable?: boolean;
}

export function FoodTagList({
  tags, onToggle, showAll = false, maxVisible = 5, editable = false,
}: FoodTagListProps) {
  const visible = showAll ? tags : tags.slice(0, maxVisible);
  const hidden = tags.length - visible.length;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tagRow}
    >
      {visible.map(({ tag, count, user_has_tagged }) => (
        <FoodTagChip
          key={tag}
          tag={tag}
          count={count}
          isSelected={user_has_tagged}
          onPress={editable ? () => onToggle?.(tag) : undefined}
        />
      ))}
      {hidden > 0 && (
        <View style={[styles.chip, styles.moreChip]}>
          <RText variant="caption" color={colors.textTertiary}>+{hidden} more</RText>
        </View>
      )}
    </ScrollView>
  );
}

// ─── Tag selector (for adding tags) ──────────────────────────

const TAG_ORDER: FoodTagType[] = [
  'must_try', 'hidden_gem', 'great_value', 'worth_the_queue',
  'cheap_and_good', 'late_night', 'supper_spot', 'breakfast_spot',
  'date_spot', 'family_friendly', 'study_spot', 'instagrammable',
  'outdoor_seating', 'tourist_friendly', 'no_queue', 'overrated',
];

interface TagSelectorProps {
  selected: FoodTagType[];
  onToggle: (tag: FoodTagType) => void;
}

export function TagSelector({ selected, onToggle }: TagSelectorProps) {
  return (
    <View style={styles.selectorGrid}>
      {TAG_ORDER.map(tag => (
        <FoodTagChip
          key={tag}
          tag={tag}
          isSelected={selected.includes(tag)}
          onPress={() => onToggle(tag)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSm: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  moreChip: {
    borderStyle: 'dashed',
  },
  emoji: {
    fontSize: 13,
    marginRight: 5,
  },
  emojiSm: {
    fontSize: 11,
    marginRight: 4,
  },
  label: {},
  labelSm: {},
  countBadge: {
    marginLeft: 5,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  tagRow: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingRight: spacing[4],
  },
  selectorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
});
