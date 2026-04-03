import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { buildLeaderboard, type PlayerScore } from '@/lib/scoring';

export async function GET() {
  const db = getDb();

  const users = db.prepare('SELECT id, username FROM users ORDER BY username').all() as Array<{
    id: number;
    username: string;
  }>;

  const state = db
    .prepare('SELECT status, picks_locked, current_round FROM tournament_state WHERE id = 1')
    .get() as { status: string; picks_locked: number; current_round: number };

  const entries = users.map((u) => {
    const picks = db
      .prepare(`
        SELECT p.id as player_id, p.name,
               COALESCE(ps.total_score, 0) as total_score,
               ps.status, ps.position, ps.r1, ps.r2, ps.r3, ps.r4,
               pk.group_number
        FROM picks pk
        JOIN players p ON p.id = pk.player_id
        LEFT JOIN player_scores ps ON ps.player_id = p.id
        WHERE pk.user_id = ?
        ORDER BY pk.group_number
      `)
      .all(u.id) as PlayerScore[];

    return { user_id: u.id, username: u.username, picks };
  });

  // Only show users who have all 8 picks OR if tournament active show everyone
  const qualified = entries.filter(
    (e) => e.picks.length === 8 || state.status !== 'pre'
  );

  const leaderboard = buildLeaderboard(qualified);

  return NextResponse.json({ leaderboard, state });
}
