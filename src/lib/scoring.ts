export interface PlayerScore {
  player_id: number;
  name: string;
  total_score: number | null;
  status: string;
  position: string | null;
  r1: number | null;
  r2: number | null;
  r3: number | null;
  r4: number | null;
}

export interface UserEntry {
  user_id: number;
  username: string;
  picks: PlayerScore[];
  score: number;
  tiebreaker6: number;
  tiebreaker7: number;
  tiebreaker8: number;
  rank: number;
  scoringScores: number[];
}

const CUT_PENALTY = 8;

function effectiveScore(p: PlayerScore): number {
  if (p.status === 'cut' || p.status === 'mc' || p.status === 'wd') {
    return CUT_PENALTY;
  }
  return p.total_score ?? 0;
}

export function calculateUserScore(picks: PlayerScore[]): {
  score: number;
  tiebreaker6: number;
  tiebreaker7: number;
  tiebreaker8: number;
  scoringScores: number[];
} {
  const scores = picks.map(effectiveScore).sort((a, b) => a - b);
  const best5 = scores.slice(0, 5);
  const score = best5.reduce((s, v) => s + v, 0);
  return {
    score,
    tiebreaker6: scores[5] ?? 0,
    tiebreaker7: scores[6] ?? 0,
    tiebreaker8: scores[7] ?? 0,
    scoringScores: scores,
  };
}

export function buildLeaderboard(
  entries: Array<{ user_id: number; username: string; picks: PlayerScore[] }>
): UserEntry[] {
  const scored = entries.map((e) => {
    const { score, tiebreaker6, tiebreaker7, tiebreaker8, scoringScores } =
      calculateUserScore(e.picks);
    return {
      ...e,
      score,
      tiebreaker6,
      tiebreaker7,
      tiebreaker8,
      scoringScores,
      rank: 0,
    };
  });

  scored.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    if (a.tiebreaker6 !== b.tiebreaker6) return a.tiebreaker6 - b.tiebreaker6;
    if (a.tiebreaker7 !== b.tiebreaker7) return a.tiebreaker7 - b.tiebreaker7;
    return a.tiebreaker8 - b.tiebreaker8;
  });

  let rank = 1;
  scored.forEach((entry, i) => {
    if (i > 0) {
      const prev = scored[i - 1];
      if (
        entry.score === prev.score &&
        entry.tiebreaker6 === prev.tiebreaker6 &&
        entry.tiebreaker7 === prev.tiebreaker7 &&
        entry.tiebreaker8 === prev.tiebreaker8
      ) {
        entry.rank = prev.rank;
      } else {
        rank = i + 1;
        entry.rank = rank;
      }
    } else {
      entry.rank = 1;
    }
  });

  return scored;
}

export function formatScore(score: number | null, status?: string): string {
  if (status === 'cut' || status === 'mc') return '+8';
  if (status === 'wd') return '+8';
  if (score === null || score === undefined) return '-';
  if (score === 0) return 'E';
  return score > 0 ? `+${score}` : `${score}`;
}
