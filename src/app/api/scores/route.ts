import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { fetchAndUpdateScores } from '@/lib/golf-api';

export async function POST() {
  const db = getDb();
  const state = db
    .prepare('SELECT espn_event_id, status FROM tournament_state WHERE id = 1')
    .get() as { espn_event_id: string; status: string };

  if (state.status === 'pre') {
    return NextResponse.json({ error: 'Tournament not started' }, { status: 400 });
  }

  if (!state.espn_event_id) {
    return NextResponse.json({ error: 'No ESPN event ID configured' }, { status: 400 });
  }

  try {
    await fetchAndUpdateScores(state.espn_event_id);
    return NextResponse.json({ ok: true, updated: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function GET() {
  const db = getDb();
  const scores = db
    .prepare(`
      SELECT p.id, p.name, p.group_number, p.odds,
             ps.total_score, ps.r1, ps.r2, ps.r3, ps.r4,
             ps.position, ps.status, ps.last_updated
      FROM players p
      LEFT JOIN player_scores ps ON ps.player_id = p.id
      ORDER BY p.group_number, p.odds_rank
    `)
    .all();

  return NextResponse.json({ scores });
}
