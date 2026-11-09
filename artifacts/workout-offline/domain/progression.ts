import {
  daysBetween,
  WorkoutDay,
  WorkoutLog,
  WorkoutLogSet,
} from '@/domain/workout';

export const XP_PER_WORKOUT = 100;
const XP_PER_LEVEL = 250;
const POUNDS_PER_KILOGRAM = 2.2046226218;

export const WORKOUT_RANKS = [
  { name: 'Esordiente', minXp: 0 },
  { name: 'Bronzo', minXp: 500 },
  { name: 'Argento', minXp: 1500 },
  { name: 'Oro', minXp: 3000 },
  { name: 'Platino', minXp: 5000 },
  { name: 'Diamante', minXp: 8000 },
  { name: 'Leggenda', minXp: 12000 },
] as const;

export type RankProgress = {
  name: string;
  level: number;
  progress: number;
  xpToNextRank: number;
  nextRankName?: string;
};

export type ExerciseProgress = {
  exerciseName: string;
  volumeChange: number;
  percentChange: number;
};

export type WorkoutComparison = {
  completedOn: string;
  previousVolume: number;
  volumeChange: number;
  percentChange: number;
  exercises: ExerciseProgress[];
};

export type WorkoutComparisons = {
  last: WorkoutComparison | null;
  monthAgo: WorkoutComparison | null;
};

export type WorkoutCompletionSummary = {
  streak: number;
  epic: boolean;
  newRecord: boolean;
  xpEarned: number;
  totalXp: number;
  rank: RankProgress;
  workoutName: string;
  workoutVolume: number;
  unit: 'kg' | 'lb';
  comparisons: WorkoutComparisons;
};

export function getRankProgress(totalXp: number): RankProgress {
  const xp = Math.max(0, Math.floor(totalXp));
  const rankIndex = WORKOUT_RANKS.reduce(
    (currentIndex, rank, index) => (xp >= rank.minXp ? index : currentIndex),
    0,
  );
  const currentRank = WORKOUT_RANKS[rankIndex];
  const nextRank = WORKOUT_RANKS[rankIndex + 1];
  const xpToNextRank = nextRank ? Math.max(0, nextRank.minXp - xp) : 0;
  const progress = nextRank
    ? Math.min(1, (xp - currentRank.minXp) / (nextRank.minXp - currentRank.minXp))
    : 1;

  return {
    name: currentRank.name,
    level: Math.floor(xp / XP_PER_LEVEL) + 1,
    progress,
    xpToNextRank,
    nextRankName: nextRank?.name,
  };
}

function volumeInUnit(
  volume: number,
  sourceUnit: WorkoutLog['unit'],
  targetUnit: 'kg' | 'lb',
) {
  const from = sourceUnit ?? targetUnit;
  if (from === targetUnit) return volume;
  return from === 'kg' ? volume * POUNDS_PER_KILOGRAM : volume / POUNDS_PER_KILOGRAM;
}

function exerciseVolumeMap(sets: WorkoutLogSet[]) {
  const map = new Map<string, { name: string; volume: number }>();
  sets.forEach((set) => {
    const key = set.exerciseName.trim().toLocaleLowerCase();
    const previous = map.get(key) ?? { name: set.exerciseName, volume: 0 };
    previous.volume += set.weight * set.reps;
    map.set(key, previous);
  });
  return map;
}

function getCurrentExerciseVolumes(day: WorkoutDay) {
  const map = new Map<string, { name: string; volume: number }>();
  day.exercises.forEach((exercise) => {
    const key = exercise.name.trim().toLocaleLowerCase();
    const volume = exercise.sets.reduce(
      (total, set) => total + Number(set.weight || 0) * Number(set.reps || 0),
      0,
    );
    map.set(key, { name: exercise.name, volume });
  });
  return map;
}

function compareWithLog(
  day: WorkoutDay,
  currentVolume: number,
  log: WorkoutLog,
  currentUnit: 'kg' | 'lb',
): WorkoutComparison {
  const previousVolume = volumeInUnit(log.volume, log.unit, currentUnit);
  const currentExercises = getCurrentExerciseVolumes(day);
  const previousExercises = exerciseVolumeMap(log.sets ?? []);
  const exercises = [...currentExercises.entries()]
    .flatMap(([key, current]) => {
      const previous = previousExercises.get(key);
      if (!previous || previous.volume <= 0) return [];
      const previousExerciseVolume = volumeInUnit(previous.volume, log.unit, currentUnit);
      const volumeChange = current.volume - previousExerciseVolume;
      return [{
        exerciseName: current.name,
        volumeChange,
        percentChange: (volumeChange / previousExerciseVolume) * 100,
      }];
    })
    .sort((a, b) => b.percentChange - a.percentChange);

  const volumeChange = currentVolume - previousVolume;
  return {
    completedOn: log.completedOn,
    previousVolume,
    volumeChange,
    percentChange: previousVolume > 0 ? (volumeChange / previousVolume) * 100 : 0,
    exercises,
  };
}

export function getWorkoutComparisons(
  day: WorkoutDay,
  logs: WorkoutLog[],
  programId: string,
  date: string,
  currentUnit: 'kg' | 'lb',
  currentVolume: number,
): WorkoutComparisons {
  const normalizedName = day.name.trim().toLocaleLowerCase();
  const matchingLogs = logs
    .filter((log) => {
      if (log.completedOn >= date) return false;
      const sameProgramDay = log.programId === programId && log.dayId === day.id;
      const sameWorkoutName = log.workoutName?.trim().toLocaleLowerCase() === normalizedName;
      return sameProgramDay || sameWorkoutName;
    })
    .sort((a, b) => b.completedOn.localeCompare(a.completedOn));

  const previousLog = matchingLogs[0] ?? null;
  const monthLog = matchingLogs
    .map((log) => ({ log, daysAgo: daysBetween(log.completedOn, date) }))
    .filter(({ daysAgo }) => daysAgo >= 23 && daysAgo <= 37)
    .sort((a, b) => Math.abs(a.daysAgo - 30) - Math.abs(b.daysAgo - 30))[0]?.log ?? null;

  return {
    last: previousLog
      ? compareWithLog(day, currentVolume, previousLog, currentUnit)
      : null,
    monthAgo: monthLog
      ? compareWithLog(day, currentVolume, monthLog, currentUnit)
      : null,
  };
}
