import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { buildLeaderboard, type PlayerScore } from '@/lib/scoring';

export async function GET() {
  const users = await sql`SELECT id, username FROM users ORDER BY username` as unknown as { id: number; username: string }[];

  const states = await sql`SELECT status, picks_locked, current_round FROM tournament_state WHERE id = 1`;
  const state = (states[0] ?? { status: 'pre', picks_locked: 0, current_round: 0 }) as {
    status: string;
    picks_locked: number;
    current_round: number;
  };

  const entries = await Promise.all(
    users.map(async (u) => {
      const picks = await sql`
        SELECT p.id as player_id, p.name,
               COALESCE(ps.total_score, 0) as total_score,
               ps.status, ps.position, ps.r1, ps.r2, ps.r3, ps.r4,
               pk.group_number
        FROM picks pk
        JOIN players p ON p.id = pk.player_id
        LEFT JOIN player_scores ps ON ps.player_id = p.id
        WHERE pk.user_id = ${u.id}
        ORDER BY pk.group_number
      ` as unknown as PlayerScore[];

      return { user_id: u.id, username: u.username, picks };
    })
  );

  const qualified = entries.filter(
    (e) => e.picks.length === 8 || state.status !== 'pre'
  );

  const leaderboard = buildLeaderboard(qualified);

  return NextResponse.json({ leaderboard, state });
}
