import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useWorkout } from '@/context/WorkoutContext';
import { dayVolume, formatItalianDate, formatItalianDateLong, isDayReadyToFinish, isMilestone } from '@/domain/workout';
import { WorkoutCompletionSummary, WorkoutComparison } from '@/domain/progression';
import { Pill, PrimaryButton, ScreenHeader, SectionTitle, SetRow, styles as ui } from '@/components/WorkoutUI';

export default function WorkoutScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const workout = useWorkout();
  const [expanded, setExpanded] = useState(true);
  const [celebration, setCelebration] = useState<WorkoutCompletionSummary | null>(null);

  useEffect(() => {
    if (workout.streakLostNotice) {
      Alert.alert('Hai perso la streak', 'Un giorno di allenamento è stato saltato. La prossima sessione riparte da 1.', [{ text: 'OK', onPress: workout.dismissStreakLost }], { cancelable: false });
    }
  }, [workout.streakLostNotice]);

  const todayDay = workout.todayDay;
  const ready = todayDay ? isDayReadyToFinish(todayDay) : false;
  const scheduledProgram = workout.programs.find((program) => program.id === workout.scheduledProgramId);
  const trainingDays = workout.program.days.filter((day) => day.type !== 'Rest').length;
  const completedTrainingDays = workout.program.days.filter((day) => day.completed).length;
  const cycleProgress = workout.cycleDay < 0 ? 0 : Math.min(workout.cycleDay + 1, 7);

  const finish = () => {
    if (!todayDay) return;
    if (todayDay.completed) {
      Alert.alert(`Hai già completato Giorno ${todayDay.order}`, 'Vuoi salvare i nuovi pesi?', [{ text: 'Annulla', style: 'cancel' }, { text: 'Conferma', onPress: () => setCelebration(workout.finishToday()) }]);
      return;
    }
    setCelebration(workout.finishToday());
  };

  if (!workout.hydrated) return <View style={[page.loading, { backgroundColor: colors.background }]}><Text style={{ color: colors.mutedForeground }}>Caricamento...</Text></View>;

  return (
    <View style={[page.root, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[page.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 110 }]} showsVerticalScrollIndicator={false}>
        <ScreenHeader eyebrow={`Programma: ${workout.program.name}`} title="Allenamento" right={<View style={page.streakBadge}><Text style={page.streakIcon}>✦</Text><View><Text style={[page.streakValue, { color: colors.orange }]}>{workout.streak} giorni</Text><Text style={[page.streakRecord, { color: colors.mutedForeground }]}>record {workout.record}</Text></View></View>} />
        {scheduledProgram ? <View style={[page.scheduledCard, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={[page.scheduledIcon, { backgroundColor: colors.accent }]}><Feather name="calendar" size={16} color={colors.primary} /></View><View style={{ flex: 1 }}><Text style={[page.scheduledLabel, { color: colors.mutedForeground }]}>PROSSIMO PROGRAMMA</Text><Text style={[page.scheduledName, { color: colors.foreground }]}>{scheduledProgram.name}</Text><Text style={[page.scheduledDate, { color: colors.primary }]}>Inizia il {formatItalianDateLong(scheduledProgram.cycleStart)}</Text></View></View> : null}
         <View style={[page.cycleBanner, { backgroundColor: colors.primary }]}>
            <View style={page.cycleTop}><View><Text style={page.cycleEyebrow}>CICLO {workout.program.cycleNumber}</Text><Text style={page.cycleTitle}>{cycleProgress === 0 ? `Inizia il ${formatItalianDateLong(workout.program.cycleStart)}` : <>Giorno {cycleProgress} <Text style={page.cycleSub}>di 7</Text></>}</Text></View><View style={page.cyclePercent}><Text style={page.cyclePercentValue}>{Math.round((cycleProgress / 7) * 100)}%</Text><Text style={page.cyclePercentLabel}>{cycleProgress === 0 ? 'in attesa' : 'completato'}</Text></View></View>
          <View style={page.progressTrack}><View style={[page.progressFill, { width: `${(cycleProgress / 7) * 100}%` }]} /></View>
        </View>
        <Pressable onPress={() => router.push('/programs')} style={({ pressed }) => [page.programSwitch, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.75 : 1 }]}>
          <View style={[page.programGlyph, { backgroundColor: colors.accent }]}><Feather name="layers" size={18} color={colors.primary} /></View>
          <View style={{ flex: 1 }}><Text style={[page.programLabel, { color: colors.mutedForeground }]}>Programma attivo</Text><Text style={[page.programName, { color: colors.foreground }]}>{workout.program.name}</Text></View>
          <Text style={[page.newProgram, { color: colors.primary }]}>+ Nuovo</Text><Feather name="chevron-right" size={18} color={colors.mutedForeground} />
        </Pressable>
        <SectionTitle title="Questa settimana" action={<Text style={[page.adherence, { color: colors.mutedForeground }]}>{completedTrainingDays}/{trainingDays} giorni</Text>} />
        <View style={page.dayList}>
          {workout.program.days.map((day) => {
            const isToday = cycleProgress > 0 && day.order === cycleProgress;
            const isRest = day.type === 'Rest';
            return (
              <View key={day.id} style={[page.dayCard, { backgroundColor: colors.card, borderColor: isToday ? colors.primary : colors.border, borderWidth: isToday ? 1.5 : 1 }]}>
                <Pressable onPress={() => setExpanded(isToday ? !expanded : expanded)} style={page.dayHeader}>
                  <View style={[page.dayNumber, { backgroundColor: day.completed ? `${colors.success}22` : day.skipped ? `${colors.destructive}22` : isToday ? colors.accent : colors.muted }]}>{day.completed ? <Feather name="check" size={15} color={colors.success} /> : day.skipped ? <Feather name="x" size={15} color={colors.destructive} /> : <Text style={[page.dayNumberText, { color: isToday ? colors.primary : colors.mutedForeground }]}>{day.order}</Text>}</View>
                  <View style={{ flex: 1 }}><Text style={[page.dayTitle, { color: colors.foreground }]}>Giorno {day.order} · {day.type === 'Rest' ? 'Riposo' : day.name}</Text><Text style={[page.dayMeta, { color: colors.mutedForeground }]}>{isToday ? `Oggi · ${formatItalianDate(workout.today)}` : day.completed ? 'Completato' : day.skipped ? 'Saltato' : isRest ? 'Recupero' : 'In programma'}</Text></View>
                  {isToday ? <Pill tone="purple">OGGI</Pill> : day.completed ? <Pill tone="green">FATTO</Pill> : day.skipped ? <Pill tone="orange">SALTATO</Pill> : null}
                </Pressable>
                {isToday && !isRest && expanded ? (
                   <View style={[page.todayBody, { borderTopColor: colors.border, backgroundColor: colors.surface2 }]}>
                    <Text style={[page.todayHint, { color: colors.mutedForeground }]}>Inserisci i tuoi carichi. I dati si salvano mentre scrivi.</Text>
                    {day.exercises.map((exercise) => (
                       <View key={exercise.id} style={[page.exercise, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={page.exerciseHeader}><View><Text style={[page.exerciseName, { color: colors.foreground }]}>{exercise.name}</Text><Text style={[page.exerciseTarget, { color: colors.primary }]}>{exercise.targetSets} × {exercise.targetReps}</Text></View><Text style={[page.exerciseGroup, { color: colors.mutedForeground }]}>{exercise.group}</Text></View>
                        {exercise.sets.map((set, index) => <SetRow key={set.id} index={index} weight={set.weight} reps={set.reps} unit={workout.unit} onWeightChange={(value) => workout.updateSet(day.id, exercise.id, set.id, 'weight', value)} onRepsChange={(value) => workout.updateSet(day.id, exercise.id, set.id, 'reps', value)} />)}
                      </View>
                    ))}
                    <PrimaryButton label={day.completed ? 'Salva nuovi pesi' : 'Completa giornata'} icon="check" onPress={finish} disabled={!ready} />
                    {!ready ? <Text style={[page.finishHint, { color: colors.mutedForeground }]}>Completa tutte le serie per abilitare il pulsante.</Text> : null}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
         <View style={[page.miniStats, { backgroundColor: colors.card, borderColor: colors.border }]}>
           <View style={page.miniStat}><View style={[page.miniIcon, { backgroundColor: colors.accent }]}><Feather name="activity" size={15} color={colors.primary} /></View><Text style={[page.miniLabel, { color: colors.mutedForeground }]}>Volume in corso</Text><Text style={[page.miniValue, { color: colors.foreground }]}>{Math.round(workout.program.days.reduce((total, day) => total + dayVolume(day), 0)).toLocaleString('it-IT')} kg</Text></View>
           <View style={[page.miniDivider, { backgroundColor: colors.border }]} /><View style={page.miniStat}><View style={[page.miniIcon, { backgroundColor: `${colors.orange}22` }]}><Feather name="target" size={15} color={colors.orange} /></View><Text style={[page.miniLabel, { color: colors.mutedForeground }]}>Prossimo obiettivo</Text><Text style={[page.miniValue, { color: colors.orange }]}>{isMilestone(workout.streak + 1) ? `${workout.streak + 1} giorni` : 'Continuità'}</Text></View>
        </View>
      </ScrollView>
      {celebration ? <WorkoutCompletionModal celebration={celebration} onClose={() => setCelebration(null)} /> : null}
    </View>
  );
}

function WorkoutCompletionModal({ celebration, onClose }: { celebration: WorkoutCompletionSummary; onClose: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={[page.modalOverlay, { backgroundColor: `${colors.background}F2`, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}>
        <View style={[page.completionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={page.completionContent}>
            <View style={[page.completionIcon, { backgroundColor: colors.accent }]}>
              <Feather name={celebration.xpEarned > 0 ? 'award' : 'check-circle'} size={25} color={colors.primary} />
            </View>
            <Text style={[page.celebrationEyebrow, { color: colors.orange }]}>
              {celebration.newRecord ? 'NUOVO RECORD' : celebration.xpEarned > 0 ? 'ALLENAMENTO COMPLETATO' : 'SESSIONE AGGIORNATA'}
            </Text>
            <Text style={[page.completionTitle, { color: colors.foreground }]}>{celebration.workoutName}</Text>
            <Text style={[page.completionSubtitle, { color: colors.mutedForeground }]}>
              {Math.round(celebration.workoutVolume).toLocaleString('it-IT')} {celebration.unit} di volume · streak {celebration.streak}
            </Text>

            <View style={[page.xpEarnedCard, { backgroundColor: colors.surface2 }]}>
              <View style={page.xpEarnedTop}>
                <Text style={[page.xpEarnedLabel, { color: colors.mutedForeground }]}>XP GUADAGNATI</Text>
                <Text style={[page.xpEarnedValue, { color: celebration.xpEarned > 0 ? colors.success : colors.mutedForeground }]}>
                  +{celebration.xpEarned} XP
                </Text>
              </View>
              <Text style={[page.xpEarnedMeta, { color: colors.foreground }]}>
                {celebration.xpEarned > 0
                  ? `Livello ${celebration.rank.level} · Rank ${celebration.rank.name} · ${celebration.totalXp.toLocaleString('it-IT')} XP totali`
                  : `Gli XP di questa sessione erano già stati assegnati · ${celebration.totalXp.toLocaleString('it-IT')} XP totali`}
              </Text>
            </View>

            <Text style={[page.comparisonHeading, { color: colors.foreground }]}>La tua progressione</Text>
            <ComparisonCard
              title="Rispetto all’ultima volta"
              comparison={celebration.comparisons.last}
              currentVolume={celebration.workoutVolume}
              unit={celebration.unit}
              colors={colors}
              emptyText="Completa di nuovo questo allenamento per vedere il confronto."
            />
            <ComparisonCard
              title="Rispetto a circa un mese fa"
              comparison={celebration.comparisons.monthAgo}
              currentVolume={celebration.workoutVolume}
              unit={celebration.unit}
              colors={colors}
              emptyText="Non c’è una sessione dello stesso allenamento registrata circa un mese fa."
            />
            <Text style={[page.comparisonFootnote, { color: colors.mutedForeground }]}>
              Il confronto usa il volume totale (carico × ripetizioni). Le variazioni per esercizio compaiono quando è disponibile lo storico dei set.
            </Text>
          </ScrollView>
          <View style={page.modalFooter}>
            <PrimaryButton label="Continua" icon="arrow-right" onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ComparisonCard({
  title,
  comparison,
  currentVolume,
  unit,
  colors,
  emptyText,
}: {
  title: string;
  comparison: WorkoutComparison | null;
  currentVolume: number;
  unit: 'kg' | 'lb';
  colors: ReturnType<typeof useColors>;
  emptyText: string;
}) {
  if (!comparison) {
    return (
      <View style={[page.comparisonCard, { backgroundColor: colors.surface2 }]}>
        <Text style={[page.comparisonTitle, { color: colors.foreground }]}>{title}</Text>
        <Text style={[page.comparisonEmpty, { color: colors.mutedForeground }]}>{emptyText}</Text>
      </View>
    );
  }

  const improved = comparison.volumeChange >= 0;
  const deltaColor = improved ? colors.success : colors.destructive;
  const exerciseChanges = comparison.exercises
    .slice()
    .sort((a, b) => Math.abs(b.percentChange) - Math.abs(a.percentChange))
    .slice(0, 3);

  return (
    <View style={[page.comparisonCard, { backgroundColor: colors.surface2 }]}>
      <View style={page.comparisonHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[page.comparisonTitle, { color: colors.foreground }]}>{title}</Text>
          <Text style={[page.comparisonDate, { color: colors.mutedForeground }]}>{formatItalianDate(comparison.completedOn)}</Text>
        </View>
        <Text style={[page.comparisonPercent, { color: deltaColor }]}>
          {improved ? '+' : ''}{Math.round(comparison.percentChange)}%
        </Text>
      </View>
      <View style={page.comparisonVolumes}>
        <Text style={[page.comparisonVolume, { color: colors.mutedForeground }]}>
          Prima {Math.round(comparison.previousVolume).toLocaleString('it-IT')} {unit}
        </Text>
        <Text style={[page.comparisonVolume, { color: colors.foreground }]}>
          Ora {Math.round(currentVolume).toLocaleString('it-IT')} {unit}
        </Text>
      </View>
      <Text style={[page.comparisonDelta, { color: deltaColor }]}>
        {improved ? '+' : ''}{Math.round(comparison.volumeChange).toLocaleString('it-IT')} {unit} di volume
      </Text>
      {exerciseChanges.length ? (
        <View style={[page.exerciseChanges, { borderTopColor: colors.border }]}>
          {exerciseChanges.map((item) => (
            <View key={item.exerciseName} style={page.exerciseChangeRow}>
              <Text style={[page.exerciseChangeName, { color: colors.mutedForeground }]} numberOfLines={1}>{item.exerciseName}</Text>
              <Text style={[page.exerciseChangeValue, { color: item.volumeChange >= 0 ? colors.success : colors.destructive }]}>
                {item.volumeChange >= 0 ? '+' : ''}{Math.round(item.percentChange)}%
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const page = StyleSheet.create({
  root: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 18 },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingBottom: 4 },
  streakIcon: { fontSize: 25, color: '#FF9800' },
  streakValue: { fontSize: 13, fontWeight: '800' },
  streakRecord: { fontSize: 11, marginTop: 2 },
  scheduledCard: { borderWidth: 1, borderRadius: 18, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 13 },
  scheduledIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  scheduledLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  scheduledName: { fontSize: 13, fontWeight: '800', marginTop: 2 },
  scheduledDate: { fontSize: 11, fontWeight: '700', marginTop: 2 },
   cycleBanner: { borderRadius: 24, padding: 19, marginBottom: 13 },
   cycleTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cycleEyebrow: { color: '#FFFFFFAA', fontSize: 11, letterSpacing: 1.1, fontWeight: '800' },
  cycleTitle: { color: '#FFFFFF', fontSize: 26, fontWeight: '800', marginTop: 4 },
  cycleSub: { fontSize: 16, fontWeight: '600', color: '#FFFFFFAA' },
   cyclePercent: { alignItems: 'flex-end' },
   cyclePercentValue: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
   cyclePercentLabel: { color: '#FFFFFFAA', fontSize: 10, fontWeight: '700', marginTop: 2 },
  progressTrack: { height: 5, borderRadius: 5, backgroundColor: '#FFFFFF33', marginTop: 16, overflow: 'hidden' },
  progressFill: { height: 5, borderRadius: 5, backgroundColor: '#FFFFFF' },
   programSwitch: { borderRadius: 20, borderWidth: 1, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  programGlyph: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  programLabel: { fontSize: 11, fontWeight: '600' },
  programName: { fontSize: 15, fontWeight: '800', marginTop: 2 },
  newProgram: { fontSize: 13, fontWeight: '800' },
  adherence: { fontSize: 13, fontWeight: '700' },
  dayList: { gap: 8 },
   dayCard: { borderRadius: 20, overflow: 'hidden' },
  dayHeader: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  dayNumber: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dayNumberText: { fontSize: 13, fontWeight: '800' },
  dayTitle: { fontSize: 15, fontWeight: '800' },
  dayMeta: { fontSize: 12, marginTop: 3 },
   todayBody: { borderTopWidth: 1, padding: 14 },
  todayHint: { fontSize: 12, lineHeight: 18, marginBottom: 15 },
   exercise: { marginBottom: 12, borderWidth: 1, borderRadius: 17, padding: 12 },
  exerciseHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  exerciseName: { fontSize: 15, fontWeight: '800' },
  exerciseTarget: { fontSize: 12, fontWeight: '800', marginTop: 4 },
  exerciseGroup: { fontSize: 11, marginTop: 2 },
  finishHint: { textAlign: 'center', fontSize: 11, marginTop: 8 },
   miniStats: { borderWidth: 1, borderRadius: 22, padding: 14, flexDirection: 'row', justifyContent: 'space-around', marginTop: 20 },
   miniStat: { flex: 1, alignItems: 'center' },
   miniIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 7 },
  miniDivider: { width: 1 },
  miniLabel: { fontSize: 11, fontWeight: '600' },
  miniValue: { fontSize: 17, fontWeight: '800', marginTop: 4 },
   modalOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 17 },
   completionCard: { width: '100%', maxWidth: 520, maxHeight: '92%', borderRadius: 27, borderWidth: 1, overflow: 'hidden' },
   completionContent: { padding: 20, paddingBottom: 8 },
   completionIcon: { width: 48, height: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 13 },
   completionTitle: { fontSize: 22, fontWeight: '900', textAlign: 'center', marginTop: 7 },
   completionSubtitle: { fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 4 },
   celebrationEyebrow: { letterSpacing: 1.3, fontSize: 10, fontWeight: '900', textAlign: 'center' },
   xpEarnedCard: { borderRadius: 17, padding: 14, marginTop: 18 },
   xpEarnedTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
   xpEarnedLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
   xpEarnedValue: { fontSize: 20, fontWeight: '900' },
   xpEarnedMeta: { fontSize: 11, fontWeight: '700', lineHeight: 16, marginTop: 5 },
   comparisonHeading: { fontSize: 17, fontWeight: '900', marginTop: 19, marginBottom: 9 },
   comparisonCard: { borderRadius: 17, padding: 13, marginBottom: 9 },
   comparisonHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
   comparisonTitle: { fontSize: 12, fontWeight: '900' },
   comparisonDate: { fontSize: 10, marginTop: 3 },
   comparisonPercent: { fontSize: 20, fontWeight: '900' },
   comparisonVolumes: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 12 },
   comparisonVolume: { fontSize: 10, fontWeight: '700' },
   comparisonDelta: { fontSize: 13, fontWeight: '900', marginTop: 7 },
   comparisonEmpty: { fontSize: 11, lineHeight: 16, marginTop: 5 },
   exerciseChanges: { borderTopWidth: 1, marginTop: 11, paddingTop: 6 },
   exerciseChangeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 25, gap: 8 },
   exerciseChangeName: { flex: 1, fontSize: 10, fontWeight: '700' },
   exerciseChangeValue: { fontSize: 10, fontWeight: '900' },
   comparisonFootnote: { fontSize: 10, lineHeight: 15, marginTop: 2, marginBottom: 6 },
   modalFooter: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 16 },
});