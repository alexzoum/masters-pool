import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { seedPlayers } from '@/lib/seed-players';

export async function GET() {
  const db = getDb();
  seedPlayers();

  const players = db.prepare(`
    SELECT p.id, p.name, p.odds, p.odds_value, p.odds_rank, p.group_number, p.world_rank,
           ps.total_score, ps.r1, ps.r2, ps.r3, ps.r4, ps.position, ps.status,
           ps.last_updated
    FROM players p
    LEFT JOIN player_scores ps ON ps.player_id = p.id
    ORDER BY p.group_number, p.odds_rank
  `).all();

  const state = db.prepare('SELECT * FROM tournament_state WHERE id = 1').get() as {
    status: string;
    picks_locked: number;
    current_round: number;
  };

  const grouped: Record<number, typeof players> = {};
  for (const p of players) {
    const grp = (p as { group_number: number }).group_number;
    if (!grouped[grp]) grouped[grp] = [];
    grouped[grp].push(p);
  }

  return NextResponse.json({ groups: grouped, state });
}
