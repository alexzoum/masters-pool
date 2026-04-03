import { NextResponse } from 'next/server';
import { sql, ensureSchema } from '@/lib/db';
import { seedPlayers } from '@/lib/seed-players';

export async function GET() {
  await ensureSchema();
  await seedPlayers();

  const players = await sql`
    SELECT p.id, p.name, p.odds, p.odds_value, p.odds_rank, p.group_number, p.world_rank,
           ps.total_score, ps.r1, ps.r2, ps.r3, ps.r4, ps.position, ps.status, ps.last_updated
    FROM players p
    LEFT JOIN player_scores ps ON ps.player_id = p.id
    ORDER BY p.group_number, p.odds_rank
  `;

  const states = await sql`SELECT * FROM tournament_state WHERE id = 1`;
  const state = states[0] as { status: string; picks_locked: number; current_round: number } | undefined;

  const grouped: Record<number, typeof players> = {};
  for (const p of players) {
    const grp = (p as { group_number: number }).group_number;
    if (!grouped[grp]) grouped[grp] = [];
    grouped[grp].push(p);
  }

  return NextResponse.json({ groups: grouped, state });
}
