import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useWorkout } from '@/context/WorkoutContext';
import {
  dayVolume,
  daysBetween,
  formatItalianDate,
  formatItalianDateLong,
  HistorySet,
} from '@/domain/workout';
import { EmptyState, Pill, ScreenHeader, SectionTitle } from '@/components/WorkoutUI';
import { buildPersonalRecords, PersonalRecord } from '@/domain/personal-records';

type Metric = 'Volume' | 'Peso massimo' | '1RM stimato';

type CurrentCycle = {
  cycleNumber: number;
  volume: number;
  completedDays: number;
  totalTrainingDays: number;
  completedOn: string;
  sets: HistorySet[];
};

export default function AnalyticsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const workout = useWorkout();
  const [metric, setMetric] = useState<Metric>('Volume');
  const [expandedCycle, setExpandedCycle] = useState<number | null>(workout.program.cycleNumber);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const currentVolume = workout.program.days.reduce((total, day) => total + dayVolume(day), 0);
  const currentCycle: CurrentCycle = {
    cycleNumber: workout.program.cycleNumber,
    volume: currentVolume,
    completedDays: workout.program.days.filter((day) => day.completed).length,
    totalTrainingDays: workout.program.days.filter((day) => day.type !== 'Rest').length,
    completedOn: workout.today,
    sets: [],
  };
  const cycles = [
    ...workout.history.map((cycle) => ({ ...cycle, sets: cycle.sets ?? [] })),
    currentCycle,
  ];
  const personalRecords = useMemo(
    () =>
      buildPersonalRecords({
        logs: workout.logs,
        cycles: workout.allHistory,
        programs: workout.programs,
        activeProgram: workout.program,
        unit: workout.unit,
      }),
    [workout.logs, workout.allHistory, workout.programs, workout.program, workout.unit],
  );
  const prSummary = useMemo(() => {
    const groups = new Map<string, PersonalRecord['balanceStatus']>();
    personalRecords.forEach((record) => groups.set(record.group, record.balanceStatus));
    return {
      aboveAverage: personalRecords.filter((record) => record.performanceStatus === 'above').length,
      balancedGroups: [...groups.values()].filter((status) => status === 'balanced').length,
      totalGroups: groups.size,
    };
  }, [personalRecords]);
  const trendRecord = personalRecords[0] ?? null;
  const trendPoints = trendRecord?.progression.slice(-6) ?? [];
  const trendValues = trendPoints.map((point) =>
    metric === 'Volume'
      ? point.volume
      : metric === 'Peso massimo'
        ? point.maxWeight
        : point.estimatedOneRepMax ?? 0,
  );
  const trendMaxValue = Math.max(...trendValues, 1);
  const currentTrendValue = trendValues[trendValues.length - 1] ?? 0;
  const previousTrendValue = trendValues[trendValues.length - 2] ?? 0;
  const trendChangePercent =
    previousTrendValue > 0
      ? ((currentTrendValue - previousTrendValue) / previousTrendValue) * 100
      : null;
  const trendHasValues = trendValues.some((value) => value > 0);
  const muscleStats = useMemo(() => {
    const stats = new Map<string, { volume: number; exercises: number }>();
    workout.program.days.forEach((day) => {
      day.exercises.forEach((exercise) => {
        const current = stats.get(exercise.group) ?? { volume: 0, exercises: 0 };
        current.exercises += 1;
        current.volume += exercise.sets.reduce((total, set) => total + Number(set.weight || 0) * Number(set.reps || 0), 0);
        stats.set(exercise.group, current);
      });
    });
    return Array.from(stats.entries())
      .map(([group, values]) => ({ group, ...values }))
      .sort((a, b) => b.volume - a.volume || b.exercises - a.exercises);
  }, [workout.program.days]);

  return (
    <View style={[page.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          page.content,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 110 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader eyebrow="Il tuo percorso" title="Statistiche" />
        <View style={page.summaryGrid}>
          <SummaryCard icon="activity" label="Streak" value={`${workout.streak}`} suffix="giorni" color={colors.orange} />
          <SummaryCard icon="award" label="Streak record" value={`${workout.record}`} suffix="giorni" color={colors.primary} />
          <SummaryCard icon="bar-chart-2" label="Volume ciclo" value={`${Math.round(currentVolume)}`} suffix="kg" color={colors.success} />
        </View>

        <SectionTitle title="Volume per ciclo" action={<Pill tone="purple">IN CORSO</Pill>} />
        <View style={[page.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={page.barChart}>
            {cycles.slice(-6).map((cycle) => {
              const max = Math.max(...cycles.map((item) => item.volume), 1);
              const height = Math.max(8, (cycle.volume / max) * 132);
              return (
                <View key={cycle.cycleNumber} style={page.barItem}>
                  <View style={page.barValueWrap}>
                    <Text style={[page.barValue, { color: colors.mutedForeground }]}>
                      {cycle.volume > 999 ? `${(cycle.volume / 1000).toFixed(1)}k` : Math.round(cycle.volume)}
                    </Text>
                    <View style={[page.bar, { height, backgroundColor: cycle.cycleNumber === workout.program.cycleNumber ? colors.primary : colors.muted }]} />
                  </View>
                  <Text style={[page.barLabel, { color: colors.mutedForeground }]}>
                    {cycle.cycleNumber === workout.program.cycleNumber ? 'Ora' : `C${cycle.cycleNumber}`}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <SectionTitle title="Progressione esercizi" action={trendRecord ? <Text style={[page.sectionHint, { color: colors.primary }]}>{trendRecord.exerciseName}</Text> : undefined} />
        {trendRecord ? (
          <>
            <View style={[page.segmented, { backgroundColor: colors.muted }]}>
              {(['Volume', 'Peso massimo', '1RM stimato'] as const).map((item) => (
                <Text
                  key={item}
                  accessibilityRole="button"
                  testID={`analytics-metric-${item}`}
                  onPress={() => setMetric(item)}
                  style={[
                    page.segment,
                    {
                      color: metric === item ? colors.foreground : colors.mutedForeground,
                      backgroundColor: metric === item ? colors.card : 'transparent',
                    },
                  ]}
                >
                  {item}
                </Text>
              ))}
            </View>
            {trendHasValues ? (
              <View style={[page.progressCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={page.progressHeader}>
                  <View style={[page.exerciseDot, { backgroundColor: colors.accent }]}>
                    <Feather name="trending-up" size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[page.progressTitle, { color: colors.foreground }]}>{trendRecord.exerciseName}</Text>
                    <Text style={[page.progressSubtitle, { color: colors.mutedForeground }]}>
                      {metric} · ultime {trendPoints.length} sessioni
                    </Text>
                  </View>
                  <Text style={[page.progressMetric, { color: trendChangePercent === null ? colors.mutedForeground : trendChangePercent >= 0 ? colors.success : colors.orange }]}>
                    {trendChangePercent === null
                      ? 'Nuovo'
                      : `${trendChangePercent > 0 ? '+' : ''}${Math.round(trendChangePercent)}%`}
                  </Text>
                </View>
                <View style={page.trendBars}>
                  {trendPoints.map((point, index) => {
                    const value = trendValues[index] ?? 0;
                    const height = value > 0 ? Math.max(8, (value / trendMaxValue) * 100) : 4;
                    return (
                      <View key={`${point.completedOn}-${index}`} style={page.trendColumn}>
                        <Text style={[page.trendValue, { color: colors.mutedForeground }]}>
                          {value > 0 ? Math.round(value).toLocaleString('it-IT') : '—'}
                        </Text>
                        <View style={page.trendBarTrack}>
                          <View
                            style={[
                              page.trendBar,
                              {
                                height,
                                backgroundColor: index === trendPoints.length - 1 ? colors.primary : colors.muted,
                              },
                            ]}
                          />
                        </View>
                        <Text style={[page.trendDate, { color: colors.mutedForeground }]}>
                          {formatItalianDate(point.completedOn)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : (
              <EmptyState
                title="Dato non disponibile"
                description="Per stimare l’1RM servono set con 12 ripetizioni o meno. Prova Volume o Peso massimo per questo esercizio."
              />
            )}
          </>
        ) : (
          <EmptyState
            title="La progressione apparirà qui"
            description="Registra almeno un allenamento completato per vedere un andamento reale, senza valori dimostrativi."
          />
        )}

        <SectionTitle title="Dettaglio allenamenti" action={<Text style={[page.sectionHint, { color: colors.mutedForeground }]}>peso · rip.</Text>} />
        <View style={[page.detailCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {cycles.slice().reverse().map((cycle) => {
            const isCurrent = cycle.cycleNumber === workout.program.cycleNumber;
            const cycleOpen = expandedCycle === cycle.cycleNumber;
            const cycleDays = isCurrent
              ? workout.program.days.map((day) => ({
                  order: day.order,
                  name: day.name,
                  type: day.type,
                  sets: day.exercises.flatMap((exercise) =>
                    exercise.sets.map((set, setIndex) => ({
                      dayOrder: day.order,
                      dayName: day.name,
                      dayType: day.type,
                      exerciseName: exercise.name,
                      group: exercise.group,
                      setIndex,
                      weight: Number(set.weight || 0),
                      reps: Number(set.reps || 0),
                      completedOn: day.completedOn ?? workout.today,
                    })),
                  ),
                }))
              : Array.from(new Set(cycle.sets.map((set) => set.dayOrder))).sort((a, b) => a - b).map((order) => ({
                  order,
                  name: cycle.sets.find((set) => set.dayOrder === order)?.dayName ?? `Giorno ${order}`,
                  type: cycle.sets.find((set) => set.dayOrder === order)?.dayType ?? 'Rest',
                  sets: cycle.sets.filter((set) => set.dayOrder === order),
                }));

            return (
              <View key={cycle.cycleNumber} style={[page.cycleBlock, { borderBottomColor: colors.border }]}>
                <Pressable onPress={() => setExpandedCycle(cycleOpen ? null : cycle.cycleNumber)} style={page.cycleHeader}>
                  <View style={[page.cycleDot, { backgroundColor: isCurrent ? colors.primary : colors.muted }]}>
                    <Text style={[page.cycleDotText, { color: isCurrent ? colors.primaryForeground : colors.mutedForeground }]}>{cycle.cycleNumber}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[page.cycleName, { color: colors.foreground }]}>Ciclo {cycle.cycleNumber} {isCurrent ? '· in corso' : ''}</Text>
                    <Text style={[page.cycleMeta, { color: colors.mutedForeground }]}>{Math.round(cycle.volume).toLocaleString('it-IT')} kg · {cycle.completedDays}/{cycle.totalTrainingDays} giorni</Text>
                  </View>
                  <Feather name={cycleOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.mutedForeground} />
                </Pressable>
                {cycleOpen ? (
                  <View style={page.cycleContent}>
                    {cycleDays.map((day) => {
                      const dayKey = `${cycle.cycleNumber}-${day.order}`;
                      const dayOpen = expandedDay === dayKey;
                      const exerciseNames = Array.from(new Set(day.sets.map((set) => set.exerciseName)));
                      return (
                        <View key={dayKey} style={[page.detailDay, { borderTopColor: colors.border }]}>
                          <Pressable onPress={() => setExpandedDay(dayOpen ? null : dayKey)} style={page.detailDayHeader}>
                            <View style={{ flex: 1 }}>
                              <Text style={[page.detailDayTitle, { color: colors.foreground }]}>Giorno {day.order} · {day.type === 'Rest' ? 'Riposo' : day.name}</Text>
                              <Text style={[page.detailDayMeta, { color: colors.mutedForeground }]}>
                                {day.type === 'Rest' ? 'Nessuna serie' : `${exerciseNames.length} esercizi · ${day.sets.length} serie`}
                              </Text>
                            </View>
                            <Feather name={dayOpen ? 'minus-circle' : 'plus-circle'} size={18} color={colors.primary} />
                          </Pressable>
                          {dayOpen && day.type !== 'Rest' ? (
                            <View style={page.exerciseDetails}>
                              {exerciseNames.map((exerciseName) => {
                                const exerciseSets = day.sets.filter((set) => set.exerciseName === exerciseName);
                                return (
                                  <View key={exerciseName} style={page.exerciseDetail}>
                                    <View style={page.exerciseDetailHeader}>
                                      <Text style={[page.exerciseDetailName, { color: colors.foreground }]}>{exerciseName}</Text>
                                      <Text style={[page.exerciseDetailGroup, { color: colors.mutedForeground }]}>{exerciseSets[0]?.group}</Text>
                                    </View>
                                    {exerciseSets.map((set) => (
                                      <View key={`${exerciseName}-${set.setIndex}`} style={[page.historySetRow, { backgroundColor: colors.surface2 }]}>
                                        <Text style={[page.historySetNumber, { color: colors.mutedForeground }]}>{set.setIndex + 1}</Text>
                                        <Text style={[page.historySetValue, { color: colors.foreground }]}>{set.weight > 0 ? `${set.weight} kg` : '—'}</Text>
                                        <Text style={[page.historySetSeparator, { color: colors.mutedForeground }]}>×</Text>
                                        <Text style={[page.historySetValue, { color: colors.foreground }]}>{set.reps > 0 ? `${set.reps} rip.` : '—'}</Text>
                                      </View>
                                    ))}
                                  </View>
                                );
                              })}
                            </View>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>

        <SectionTitle
          title="PR · Record personali"
          action={<Pill tone="purple">{personalRecords.length} ESERCIZI</Pill>}
        />
        {personalRecords.length ? (
          <>
            <View style={page.prSummaryGrid}>
              <PrSummaryMetric label="PR tracciati" value={`${personalRecords.length}`} color={colors.primary} />
              <PrSummaryMetric label="Sopra media" value={`${prSummary.aboveAverage}`} color={colors.success} />
              <PrSummaryMetric
                label="Gruppi in linea"
                value={prSummary.totalGroups ? `${prSummary.balancedGroups}/${prSummary.totalGroups}` : '—'}
                color={colors.orange}
              />
            </View>
            <Text style={[page.prIntro, { color: colors.mutedForeground }]}>
              Dati ricavati dagli allenamenti completati e dal programma attivo.
            </Text>
            {personalRecords.map((record) => (
              <PersonalRecordCard
                key={`${record.group}-${record.exerciseName}`}
                record={record}
                unit={workout.unit}
                today={workout.today}
                colors={colors}
              />
            ))}
            <View style={[page.prInfo, { backgroundColor: colors.surface2 }]}>
              <Feather name="info" size={15} color={colors.primary} />
              <Text style={[page.prInfoText, { color: colors.mutedForeground }]}>
                “Sopra/sotto media” indica uno scarto di oltre 5% rispetto alle ultime cinque sessioni personali. “In equilibrio” confronta le serie settimanali dei gruppi attivi nel programma, con una tolleranza del 25%; non è uno standard universale.
              </Text>
            </View>
          </>
        ) : (
          <EmptyState
            title="Nessun PR registrato"
            description="Completa un allenamento con i carichi inseriti per vedere record, ripetizioni, date e andamento personale."
          />
        )}

        <SectionTitle title="Gruppi muscolari" />
        <View style={[page.muscleCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {muscleStats.length === 0 ? <Text style={[page.muscleEmpty, { color: colors.mutedForeground }]}>Aggiungi esercizi al programma per vedere i gruppi muscolari.</Text> : muscleStats.map((item, index) => {
            const totalVolume = muscleStats.reduce((total, stat) => total + stat.volume, 0);
            const totalExercises = muscleStats.reduce((total, stat) => total + stat.exercises, 0);
            const percentage = totalVolume > 0 ? Math.round((item.volume / totalVolume) * 100) : Math.round((item.exercises / totalExercises) * 100);
            return <View key={item.group} style={page.muscleRow}>
              <View style={{ flex: 1 }}><Text style={[page.muscleName, { color: colors.foreground }]}>{item.group}</Text><View style={[page.muscleTrack, { backgroundColor: colors.muted }]}><View style={[page.muscleFill, { backgroundColor: [colors.primary, colors.orange, colors.success, colors.accentForeground][index % 4], width: `${Math.max(percentage, 4)}%` }]} /></View></View>
              <Text style={[page.muscleValue, { color: colors.mutedForeground }]}>{percentage}%</Text>
            </View>;
          })}
        </View>
      </ScrollView>
    </View>
  );
}

function SummaryCard({ icon, label, value, suffix, color }: { icon: keyof typeof Feather.glyphMap; label: string; value: string; suffix: string; color: string }) {
  const colors = useColors();
  return <View style={[page.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={[page.summaryIcon, { backgroundColor: `${color}22` }]}><Feather name={icon} size={16} color={color} /></View><Text style={[page.summaryLabel, { color: colors.mutedForeground }]}>{label}</Text><Text style={[page.summaryValue, { color: colors.foreground }]}>{value}<Text style={[page.summarySuffix, { color: colors.mutedForeground }]}> {suffix}</Text></Text></View>;
}

function PrSummaryMetric({ label, value, color }: { label: string; value: string; color: string }) {
  const colors = useColors();
  return (
    <View style={[page.prSummaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[page.prSummaryDot, { backgroundColor: color }]} />
      <Text style={[page.prSummaryValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[page.prSummaryLabel, { color: colors.mutedForeground }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function PersonalRecordCard({
  record,
  unit,
  today,
  colors,
}: {
  record: PersonalRecord;
  unit: 'kg' | 'lb';
  today: string;
  colors: ReturnType<typeof useColors>;
}) {
  const performance = {
    above: { label: 'SOPRA MEDIA', color: colors.success },
    balanced: { label: 'IN LINEA', color: colors.primary },
    below: { label: 'SOTTO MEDIA', color: colors.orange },
    insufficient: { label: 'DATI INSUFFICIENTI', color: colors.mutedForeground },
  }[record.performanceStatus];
  const balance = {
    above: { label: 'SOPRA MEDIA', color: colors.orange },
    balanced: { label: 'IN EQUILIBRIO', color: colors.success },
    below: { label: 'SOTTO MEDIA', color: colors.orange },
    unavailable: { label: 'NON CONFRONTABILE', color: colors.mutedForeground },
  }[record.balanceStatus];
  const daysAgo = Math.max(0, daysBetween(record.bestDate, today));
  const timeAgo = daysAgo === 0
    ? 'oggi'
    : daysAgo === 1
      ? 'ieri'
      : daysAgo < 7
        ? `${daysAgo} giorni fa`
        : daysAgo < 30
          ? `${Math.floor(daysAgo / 7)} sett. fa`
          : daysAgo < 365
            ? `${Math.floor(daysAgo / 30)} mesi fa`
            : `${Math.floor(daysAgo / 365)} anni fa`;
  const formatValue = (value: number) =>
    Number.isInteger(value)
      ? value.toLocaleString('it-IT')
      : Number(value.toFixed(1)).toLocaleString('it-IT');
  const previousSessionCount = Math.min(5, Math.max(0, record.sessionCount - 1));
  const balanceWidth = record.balanceRatio === null
    ? 0
    : Math.max(4, Math.min(100, (record.balanceRatio / 1.5) * 100));

  return (
    <View style={[page.prCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={page.prHeader}>
        <View style={[page.prIcon, { backgroundColor: colors.accent }]}>
          <Feather name="award" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[page.prExerciseName, { color: colors.foreground }]}>{record.exerciseName}</Text>
          <Text style={[page.prExerciseGroup, { color: colors.mutedForeground }]}>
            {record.group} · {record.sessionCount} {record.sessionCount === 1 ? 'sessione' : 'sessioni'}
          </Text>
        </View>
        <Pill tone="green">PR</Pill>
      </View>

      <View style={[page.prBestSet, { backgroundColor: colors.surface2 }]}>
        <View style={{ flex: 1 }}>
          <Text style={[page.prEyebrow, { color: colors.mutedForeground }]}>CARICO MASSIMO</Text>
          <View style={page.prLoadRow}>
            <Text style={[page.prLoad, { color: colors.foreground }]}>{formatValue(record.bestWeight)}</Text>
            <Text style={[page.prLoadUnit, { color: colors.mutedForeground }]}>{unit}</Text>
            <View style={[page.prRepDivider, { backgroundColor: colors.border }]} />
            <Text style={[page.prReps, { color: colors.foreground }]}>{record.bestReps} rip.</Text>
          </View>
        </View>
        <View style={page.prDate}>
          <Feather name="calendar" size={13} color={colors.primary} />
          <Text style={[page.prDateText, { color: colors.foreground }]}>{timeAgo}</Text>
        </View>
      </View>
      <Text style={[page.prFullDate, { color: colors.mutedForeground }]}>
        Record ottenuto il {formatItalianDateLong(record.bestDate)}
      </Text>

      <View style={page.prStats}>
        <PrDetailStat
          label="1RM stimato"
          value={record.estimatedOneRepMax === null ? '—' : `~${formatValue(record.estimatedOneRepMax)} ${unit}`}
          colors={colors}
        />
        <PrDetailStat
          label="Volume nella sessione PR"
          value={`${Math.round(record.bestSessionVolume).toLocaleString('it-IT')} ${unit}`}
          colors={colors}
        />
      </View>

      <View style={[page.prInsight, { backgroundColor: colors.surface2 }]}>
        <View style={page.prInsightHeader}>
          <Text style={[page.prInsightTitle, { color: colors.foreground }]}>ANDAMENTO PERSONALE</Text>
          <View style={[page.prBadge, { backgroundColor: `${performance.color}20` }]}>
            <Text style={[page.prBadgeText, { color: performance.color }]}>{performance.label}</Text>
          </View>
        </View>
        {record.averagePreviousVolume === null || record.performanceChangePercent === null ? (
          <Text style={[page.prInsightCopy, { color: colors.mutedForeground }]}>
            Servono almeno due sessioni registrate per confrontare il volume con la tua media.
          </Text>
        ) : (
          <>
            <View style={page.prTrendRow}>
              <Text style={[page.prTrendValue, { color: record.performanceChangePercent >= 0 ? colors.success : colors.orange }]}>
                {record.performanceChangePercent > 0 ? '+' : ''}{Math.round(record.performanceChangePercent)}%
              </Text>
              <Text style={[page.prTrendDescription, { color: colors.mutedForeground }]}>
                ultima sessione rispetto alla media delle {previousSessionCount} precedenti
              </Text>
            </View>
            <Text style={[page.prInsightCopy, { color: colors.mutedForeground }]}>
              {Math.round(record.latestVolume).toLocaleString('it-IT')} {unit} ora · media {Math.round(record.averagePreviousVolume).toLocaleString('it-IT')} {unit}
              {' · '}{formatItalianDate(record.latestDate)}
            </Text>
          </>
        )}
      </View>

      <View style={[page.prBalance, { backgroundColor: colors.surface2 }]}>
        <View style={page.prInsightHeader}>
          <Text style={[page.prInsightTitle, { color: colors.foreground }]}>EQUILIBRIO NEL PROGRAMMA</Text>
          <View style={[page.prBadge, { backgroundColor: `${balance.color}20` }]}>
            <Text style={[page.prBadgeText, { color: balance.color }]}>{balance.label}</Text>
          </View>
        </View>
        {record.balanceRatio === null || record.averageGroupWeeklySets === null ? (
          <Text style={[page.prInsightCopy, { color: colors.mutedForeground }]}>
            Aggiungi più gruppi muscolari al programma per confrontare la distribuzione delle serie.
          </Text>
        ) : (
          <>
            <View style={page.prBalanceLabels}>
              <Text style={[page.prInsightCopy, { color: colors.mutedForeground }]}>
                {record.group}: {record.plannedWeeklySets} serie/settimana
              </Text>
              <Text style={[page.prBalanceRatio, { color: balance.color }]}>
                {Math.round(record.balanceRatio * 100)}% della media
              </Text>
            </View>
            <View style={[page.prBalanceTrack, { backgroundColor: colors.border }]}>
              <View
                style={[
                  page.prBalanceFill,
                  { width: `${balanceWidth}%`, backgroundColor: balance.color },
                ]}
              />
            </View>
            <Text style={[page.prInsightCopy, { color: colors.mutedForeground }]}>
              Media degli altri gruppi: {formatValue(record.averageGroupWeeklySets)} serie/settimana.
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

function PrDetailStat({ label, value, colors }: { label: string; value: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[page.prDetailStat, { backgroundColor: colors.surface2 }]}>
      <Text style={[page.prDetailLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[page.prDetailValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

const page = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 18 },
  summaryGrid: { flexDirection: 'row', gap: 8 },
  summaryCard: { flex: 1, minHeight: 124, borderWidth: 1, borderRadius: 20, padding: 13 },
  summaryIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  summaryLabel: { fontSize: 11, fontWeight: '700' },
  summaryValue: { fontSize: 20, fontWeight: '900', marginTop: 4 },
  summarySuffix: { fontSize: 10, fontWeight: '700' },
  chartCard: { borderRadius: 22, borderWidth: 1, padding: 16, minHeight: 205 },
  barChart: { height: 165, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', paddingTop: 10 },
  barItem: { alignItems: 'center', justifyContent: 'flex-end', height: '100%', gap: 8 },
  barValueWrap: { height: 145, justifyContent: 'flex-end', alignItems: 'center', gap: 5 },
  barValue: { fontSize: 9, fontWeight: '700' },
  bar: { width: 30, borderRadius: 10 },
  barLabel: { fontSize: 10, fontWeight: '700' },
  segmented: { borderRadius: 14, padding: 4, flexDirection: 'row', marginBottom: 11 },
  segment: { flex: 1, paddingVertical: 9, textAlign: 'center', borderRadius: 10, fontSize: 11, fontWeight: '800' },
  progressCard: { borderRadius: 22, borderWidth: 1, padding: 17 },
  progressHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  exerciseDot: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  progressTitle: { fontSize: 15, fontWeight: '800' },
  progressSubtitle: { fontSize: 11, marginTop: 3 },
  progressMetric: { fontSize: 13, fontWeight: '900' },
  trendBars: { height: 148, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', gap: 4, marginTop: 16 },
  trendColumn: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end', gap: 5 },
  trendValue: { height: 12, fontSize: 8, fontWeight: '800', textAlign: 'center' },
  trendBarTrack: { height: 105, width: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  trendBar: { width: 19, maxWidth: '75%', borderRadius: 7 },
  trendDate: { fontSize: 8, fontWeight: '700', textAlign: 'center' },
  sectionHint: { fontSize: 11, fontWeight: '700' },
  detailCard: { borderRadius: 22, borderWidth: 1, overflow: 'hidden' },
  cycleBlock: { borderBottomWidth: 1 },
  cycleHeader: { minHeight: 68, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  cycleDot: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cycleDotText: { fontSize: 12, fontWeight: '900' },
  cycleName: { fontSize: 14, fontWeight: '900' },
  cycleMeta: { fontSize: 11, marginTop: 3 },
  cycleContent: { paddingHorizontal: 13 },
  detailDay: { borderTopWidth: 1 },
  detailDayHeader: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailDayTitle: { fontSize: 13, fontWeight: '800' },
  detailDayMeta: { fontSize: 11, marginTop: 3 },
  exerciseDetails: { paddingBottom: 12 },
  exerciseDetail: { marginBottom: 12 },
  exerciseDetailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  exerciseDetailName: { fontSize: 12, fontWeight: '800' },
  exerciseDetailGroup: { fontSize: 10 },
  historySetRow: { minHeight: 32, borderRadius: 8, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9, marginBottom: 4 },
  historySetNumber: { width: 22, fontSize: 11, fontWeight: '800' },
  historySetValue: { flex: 1, fontSize: 12, fontWeight: '700' },
  historySetSeparator: { fontSize: 12, paddingHorizontal: 8 },
  prSummaryGrid: { flexDirection: 'row', gap: 7, marginBottom: 5 },
  prSummaryCard: { flex: 1, minHeight: 78, borderWidth: 1, borderRadius: 16, padding: 11 },
  prSummaryDot: { width: 6, height: 6, borderRadius: 3, marginBottom: 7 },
  prSummaryValue: { fontSize: 19, fontWeight: '900' },
  prSummaryLabel: { fontSize: 9, fontWeight: '700', marginTop: 3 },
  prIntro: { fontSize: 11, lineHeight: 16, marginTop: 5, marginBottom: 10 },
  prCard: { borderWidth: 1, borderRadius: 22, padding: 13, marginBottom: 10 },
  prHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  prIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  prExerciseName: { fontSize: 15, fontWeight: '900' },
  prExerciseGroup: { fontSize: 10, fontWeight: '600', marginTop: 3 },
  prBestSet: { borderRadius: 16, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  prEyebrow: { fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  prLoadRow: { flexDirection: 'row', alignItems: 'baseline', gap: 5, marginTop: 3 },
  prLoad: { fontSize: 30, lineHeight: 34, fontWeight: '900', letterSpacing: -0.8 },
  prLoadUnit: { fontSize: 12, fontWeight: '800' },
  prRepDivider: { width: 1, height: 17, marginHorizontal: 4 },
  prReps: { fontSize: 14, fontWeight: '800' },
  prDate: { alignItems: 'center', gap: 4, minWidth: 50 },
  prDateText: { fontSize: 10, fontWeight: '800' },
  prFullDate: { fontSize: 10, marginTop: 6, marginBottom: 2 },
  prStats: { flexDirection: 'row', gap: 8, marginTop: 10, marginBottom: 11 },
  prDetailStat: { flex: 1, minHeight: 56, borderRadius: 13, padding: 10, backgroundColor: 'transparent' },
  prDetailLabel: { fontSize: 9, fontWeight: '700', lineHeight: 13 },
  prDetailValue: { fontSize: 12, fontWeight: '900', marginTop: 4 },
  prInsight: { borderRadius: 15, padding: 12 },
  prInsightHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  prInsightTitle: { fontSize: 9, fontWeight: '900', letterSpacing: 0.6 },
  prBadge: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: 99 },
  prBadgeText: { fontSize: 8, fontWeight: '900', letterSpacing: 0.2 },
  prTrendRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 8 },
  prTrendValue: { fontSize: 20, fontWeight: '900' },
  prTrendDescription: { flex: 1, fontSize: 10, lineHeight: 14 },
  prInsightCopy: { fontSize: 10, lineHeight: 15, marginTop: 6 },
  prBalance: { borderRadius: 15, padding: 12, marginTop: 9 },
  prBalanceLabels: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 5 },
  prBalanceRatio: { fontSize: 9, fontWeight: '900' },
  prBalanceTrack: { height: 6, borderRadius: 99, overflow: 'hidden', marginTop: 8 },
  prBalanceFill: { height: '100%', borderRadius: 99 },
  prInfo: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 15, marginTop: 9, marginBottom: 6 },
  prInfoText: { flex: 1, fontSize: 10, lineHeight: 15 },
  muscleCard: { borderRadius: 22, borderWidth: 1, padding: 16, gap: 16 },
  muscleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  muscleName: { fontSize: 13, fontWeight: '800', marginBottom: 7 },
  muscleTrack: { height: 7, borderRadius: 7, overflow: 'hidden' },
  muscleFill: { height: 7, borderRadius: 7 },
  muscleValue: { fontSize: 12, fontWeight: '800', width: 35, textAlign: 'right' },
  muscleEmpty: { fontSize: 12, lineHeight: 18 },
});