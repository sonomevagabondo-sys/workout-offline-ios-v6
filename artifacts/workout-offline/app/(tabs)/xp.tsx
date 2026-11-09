import React, { useMemo } from 'react';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenHeader, SectionTitle } from '@/components/WorkoutUI';
import { useWorkout } from '@/context/WorkoutContext';
import { formatItalianDate } from '@/domain/workout';
import { getRankProgress, XP_PER_WORKOUT } from '@/domain/progression';
import { useColors } from '@/hooks/useColors';

export default function XpScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const workout = useWorkout();
  const rank = getRankProgress(workout.totalXp);
  const recentLogs = useMemo(
    () => [...workout.logs].sort((a, b) => b.completedOn.localeCompare(a.completedOn)).slice(0, 8),
    [workout.logs],
  );

  if (!workout.hydrated) {
    return (
      <View style={[page.loading, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.mutedForeground }}>Caricamento...</Text>
      </View>
    );
  }

  return (
    <View testID="xp-screen" style={[page.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          page.content,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 110 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader eyebrow="Progressione personale" title="XP & Rank" />

        <View style={[page.hero, { backgroundColor: colors.primary }]}>
          <View style={page.heroTop}>
            <View style={[page.rankIcon, { backgroundColor: `${colors.primaryForeground}24` }]}>
              <Feather name="award" size={21} color={colors.primaryForeground} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[page.heroEyebrow, { color: `${colors.primaryForeground}B8` }]}>RANK ATTUALE</Text>
              <Text style={[page.rankName, { color: colors.primaryForeground }]}>{rank.name}</Text>
            </View>
            <View style={[page.levelPill, { backgroundColor: `${colors.primaryForeground}24` }]}>
              <Text style={[page.levelText, { color: colors.primaryForeground }]}>LIV. {rank.level}</Text>
            </View>
          </View>

          <View style={page.xpValueRow}>
            <Text style={[page.xpValue, { color: colors.primaryForeground }]}>
              {workout.totalXp.toLocaleString('it-IT')}
            </Text>
            <Text style={[page.xpUnit, { color: `${colors.primaryForeground}C9` }]}>XP</Text>
          </View>
          <Text style={[page.xpCaption, { color: `${colors.primaryForeground}C9` }]}>
            Guadagna XP completando i tuoi allenamenti.
          </Text>

          <View style={page.rankProgressHeader}>
            <Text style={[page.progressLabel, { color: `${colors.primaryForeground}D6` }]}>
              {rank.nextRankName ? `Prossimo rank · ${rank.nextRankName}` : 'Rank massimo raggiunto'}
            </Text>
            {rank.nextRankName ? (
              <Text style={[page.progressLabel, { color: colors.primaryForeground }]}>
                {rank.xpToNextRank.toLocaleString('it-IT')} XP
              </Text>
            ) : null}
          </View>
          <View style={[page.progressTrack, { backgroundColor: `${colors.primaryForeground}30` }]}>
            <View
              style={[
                page.progressFill,
                {
                  backgroundColor: colors.primaryForeground,
                  width: `${Math.max(2, rank.progress * 100)}%`,
                },
              ]}
            />
          </View>
        </View>

        <View style={page.statsRow}>
          <View style={[page.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[page.statIcon, { backgroundColor: colors.accent }]}>
              <Feather name="check-circle" size={16} color={colors.primary} />
            </View>
            <Text style={[page.statValue, { color: colors.foreground }]}>{workout.logs.length}</Text>
            <Text style={[page.statLabel, { color: colors.mutedForeground }]}>allenamenti registrati</Text>
          </View>
          <View style={[page.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[page.statIcon, { backgroundColor: `${colors.orange}22` }]}>
              <Feather name="zap" size={16} color={colors.orange} />
            </View>
            <Text style={[page.statValue, { color: colors.foreground }]}>{XP_PER_WORKOUT}</Text>
            <Text style={[page.statLabel, { color: colors.mutedForeground }]}>XP per allenamento</Text>
          </View>
        </View>

        <SectionTitle title="Ultimi allenamenti" />
        {recentLogs.length ? (
          <View style={[page.historyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {recentLogs.map((log, index) => (
              <View
                key={log.id}
                style={[
                  page.historyRow,
                  index > 0 ? { borderTopWidth: 1, borderTopColor: colors.border } : null,
                ]}
              >
                <View style={[page.historyIcon, { backgroundColor: colors.accent }]}>
                  <Feather name="activity" size={16} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[page.historyName, { color: colors.foreground }]} numberOfLines={1}>
                    {log.workoutName || 'Allenamento'}
                  </Text>
                  <Text style={[page.historyDate, { color: colors.mutedForeground }]}>
                    {formatItalianDate(log.completedOn)} · {Math.round(log.volume).toLocaleString('it-IT')} {log.unit ?? workout.unit}
                  </Text>
                </View>
                <Text style={[page.historyXp, { color: colors.success }]}>
                  +{(log.xpEarned ?? XP_PER_WORKOUT).toLocaleString('it-IT')} XP
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={[page.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[page.emptyIcon, { backgroundColor: colors.accent }]}>
              <Feather name="trending-up" size={21} color={colors.primary} />
            </View>
            <Text style={[page.emptyTitle, { color: colors.foreground }]}>Il tuo percorso inizia qui</Text>
            <Text style={[page.emptyBody, { color: colors.mutedForeground }]}>
              Completa il primo allenamento per guadagnare XP e salire di rank.
            </Text>
          </View>
        )}

        <View style={[page.ruleCard, { backgroundColor: colors.surface2 }]}>
          <Feather name="info" size={16} color={colors.primary} />
          <Text style={[page.ruleText, { color: colors.mutedForeground }]}>
            Ogni allenamento completato assegna {XP_PER_WORKOUT} XP. Aggiornare una sessione già registrata non assegna XP una seconda volta.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const page = StyleSheet.create({
  root: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 18 },
  hero: { borderRadius: 26, padding: 20, marginBottom: 13 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  rankIcon: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  heroEyebrow: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  rankName: { fontSize: 20, fontWeight: '900', marginTop: 2 },
  levelPill: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 99 },
  levelText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.3 },
  xpValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 7, marginTop: 22 },
  xpValue: { fontSize: 48, lineHeight: 54, fontWeight: '900', letterSpacing: -2 },
  xpUnit: { fontSize: 16, fontWeight: '800' },
  xpCaption: { fontSize: 12, marginTop: 2 },
  rankProgressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 21, marginBottom: 8 },
  progressLabel: { fontSize: 11, fontWeight: '800' },
  progressTrack: { height: 7, borderRadius: 99, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 99 },
  statsRow: { flexDirection: 'row', gap: 9 },
  statCard: { flex: 1, minHeight: 108, borderWidth: 1, borderRadius: 20, padding: 13 },
  statIcon: { width: 31, height: 31, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 21, fontWeight: '900', marginTop: 8 },
  statLabel: { fontSize: 10, fontWeight: '700', marginTop: 2 },
  historyCard: { borderRadius: 21, borderWidth: 1, paddingHorizontal: 13 },
  historyRow: { minHeight: 67, flexDirection: 'row', alignItems: 'center', gap: 10 },
  historyIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  historyName: { fontSize: 13, fontWeight: '800' },
  historyDate: { fontSize: 10, marginTop: 3 },
  historyXp: { fontSize: 11, fontWeight: '900' },
  emptyCard: { borderWidth: 1, borderRadius: 21, padding: 22, alignItems: 'center' },
  emptyIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginBottom: 11 },
  emptyTitle: { fontSize: 15, fontWeight: '900', textAlign: 'center' },
  emptyBody: { fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 5 },
  ruleCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, padding: 13, borderRadius: 16, marginTop: 18 },
  ruleText: { flex: 1, fontSize: 11, lineHeight: 17 },
});
