import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { fetchAndUpdateScores, getCurrentMastersEventId } from '@/lib/golf-api';

export async function GET() {
  const session = await getSession();
  if (!session?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = getDb();
  const state = db.prepare('SELECT * FROM tournament_state WHERE id = 1').get();
  const users = db
    .prepare(`
      SELECT u.id, u.username, u.is_admin, u.created_at,
             COUNT(pk.id) as pick_count
      FROM users u
      LEFT JOIN picks pk ON pk.user_id = u.id
      GROUP BY u.id
      ORDER BY u.username
    `)
    .all();

  return NextResponse.json({ state, users });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const db = getDb();

  if (body.action === 'update_state') {
    const { status, picks_locked, espn_event_id, current_round } = body;
    db.prepare(`
      UPDATE tournament_state SET
        status = COALESCE(?, status),
        picks_locked = COALESCE(?, picks_locked),
        espn_event_id = COALESCE(?, espn_event_id),
        current_round = COALESCE(?, current_round)
      WHERE id = 1
    `).run(
      status ?? null,
      picks_locked ?? null,
      espn_event_id ?? null,
      current_round ?? null
    );
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'refresh_scores') {
    const state = db.prepare('SELECT espn_event_id FROM tournament_state WHERE id = 1').get() as {
      espn_event_id: string;
    };
    if (!state.espn_event_id) {
      return NextResponse.json({ error: 'No ESPN event ID set' }, { status: 400 });
    }
    await fetchAndUpdateScores(state.espn_event_id);
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'detect_event_id') {
    const eventId = await getCurrentMastersEventId();
    if (eventId) {
      db.prepare('UPDATE tournament_state SET espn_event_id = ? WHERE id = 1').run(eventId);
    }
    return NextResponse.json({ ok: true, eventId });
  }

  if (body.action === 'set_player_score') {
    const { player_id, total_score, status: pStatus, r1, r2, r3, r4 } = body;
    db.prepare(`
      INSERT INTO player_scores (player_id, total_score, status, r1, r2, r3, r4, last_updated)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(player_id) DO UPDATE SET
        total_score = excluded.total_score,
        status = excluded.status,
        r1 = excluded.r1,
        r2 = excluded.r2,
        r3 = excluded.r3,
        r4 = excluded.r4,
        last_updated = excluded.last_updated
    `).run(player_id, total_score, pStatus || 'active', r1 ?? null, r2 ?? null, r3 ?? null, r4 ?? null);
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'delete_user') {
    db.prepare('DELETE FROM picks WHERE user_id = ?').run(body.user_id);
    db.prepare('DELETE FROM users WHERE id = ?').run(body.user_id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
