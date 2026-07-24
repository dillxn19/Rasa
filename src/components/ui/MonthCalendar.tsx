import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '@/theme';
import { RText } from '@/components/ui/Text';

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/**
 * Pure-JS month calendar (no native module — works in Expo Go). Picks a single
 * date; future dates past `maximumDate` are disabled.
 */
export function MonthCalendar({
  value,
  onChange,
  maximumDate = new Date(),
}: {
  value: Date;
  onChange: (d: Date) => void;
  maximumDate?: Date;
}) {
  const [view, setView] = useState(new Date(value.getFullYear(), value.getMonth(), 1));

  const year = view.getFullYear();
  const month = view.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  const canPrev = true;
  const canNext = new Date(year, month + 1, 1) <= maximumDate;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setView(new Date(year, month - 1, 1))} hitSlop={10} disabled={!canPrev}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <RText variant="titleMedium">{MONTHS[month]} {year}</RText>
        <TouchableOpacity onPress={() => canNext && setView(new Date(year, month + 1, 1))} hitSlop={10} disabled={!canNext}>
          <Ionicons name="chevron-forward" size={22} color={canNext ? colors.textPrimary : colors.gray300} />
        </TouchableOpacity>
      </View>

      <View style={styles.dowRow}>
        {DOW.map((d, i) => (
          <View key={i} style={styles.cell}>
            <RText variant="labelSmall" color={colors.textTertiary}>{d}</RText>
          </View>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((date, i) => {
          if (!date) return <View key={i} style={styles.cell} />;
          const selected = sameDay(date, value);
          const disabled = date > maximumDate;
          return (
            <TouchableOpacity
              key={i}
              style={styles.cell}
              disabled={disabled}
              onPress={() => onChange(date)}
              activeOpacity={0.7}
            >
              <View style={[styles.day, selected && styles.daySelected]}>
                <RText
                  variant="bodyMedium"
                  color={selected ? colors.white : disabled ? colors.gray300 : colors.textPrimary}
                >
                  {date.getDate()}
                </RText>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: spacing[2] },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing[2], marginBottom: spacing[3],
  },
  dowRow: { flexDirection: 'row' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  day: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  daySelected: { backgroundColor: colors.primary },
});
