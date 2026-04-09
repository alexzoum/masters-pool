import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { fetchAndUpdateScores, getCurrentMastersEventId } from '@/lib/golf-api';

export async function GET() {
  const session = await getSession();
  if (!session?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const states = await sql`SELECT * FROM tournament_state WHERE id = 1`;
  const state = states[0];

  const users = await sql`
    SELECT u.id, u.username, u.is_admin, u.created_at,
           COUNT(pk.id)::int as pick_count
    FROM users u
    LEFT JOIN picks pk ON pk.user_id = u.id
    GROUP BY u.id, u.username, u.is_admin, u.created_at
    ORDER BY u.username
  `;

  return NextResponse.json({ state, users });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();

  if (body.action === 'update_state') {
    const { status, picks_locked, espn_event_id, current_round } = body;
    if (status !== undefined)
      await sql`UPDATE tournament_state SET status = ${status} WHERE id = 1`;
    if (picks_locked !== undefined)
      await sql`UPDATE tournament_state SET picks_locked = ${picks_locked} WHERE id = 1`;
    if (espn_event_id !== undefined)
      await sql`UPDATE tournament_state SET espn_event_id = ${espn_event_id} WHERE id = 1`;
    if (current_round !== undefined)
      await sql`UPDATE tournament_state SET current_round = ${current_round} WHERE id = 1`;
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'refresh_scores') {
    const states = await sql`SELECT espn_event_id FROM tournament_state WHERE id = 1`;
    const state = states[0] as { espn_event_id: string } | undefined;
    if (!state?.espn_event_id) {
      return NextResponse.json({ error: 'No ESPN event ID set' }, { status: 400 });
    }
    await fetchAndUpdateScores(state.espn_event_id);
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'debug_espn_names') {
    const states = await sql`SELECT espn_event_id FROM tournament_state WHERE id = 1`;
    const state = states[0] as { espn_event_id: string } | undefined;
    if (!state?.espn_event_id) return NextResponse.json({ error: 'No ESPN event ID set' }, { status: 400 });

    const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard?league=pga&event=${state.espn_event_id}`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    const data = await res.json();
    const espnNames: string[] = (data.events?.[0]?.competitions?.[0]?.competitors || [])
      .map((c: { athlete?: { displayName?: string } }) => c.athlete?.displayName)
      .filter(Boolean);

    const dbPlayers = await sql`SELECT name FROM players` as unknown as { name: string }[];
    const dbNormalized = new Map(dbPlayers.map((p) => [normalize(p.name), p.name]));

    const unmatched = espnNames.filter((n) => !dbNormalized.has(normalize(n)));
    const matched = espnNames.filter((n) => dbNormalized.has(normalize(n)));

    return NextResponse.json({ matched: matched.length, unmatched });
  }

  if (body.action === 'detect_event_id') {
    const eventId = await getCurrentMastersEventId();
    if (eventId) {
      await sql`UPDATE tournament_state SET espn_event_id = ${eventId} WHERE id = 1`;
    }
    return NextResponse.json({ ok: true, eventId });
  }

  if (body.action === 'reseed_players') {
    await sql`DELETE FROM picks`;
    await sql`DELETE FROM player_scores`;
    await sql`DELETE FROM players`;
    const { seedPlayers } = await import('@/lib/seed-players');
    await seedPlayers();
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'set_player_score') {
    const { player_id, total_score, status: pStatus, r1, r2, r3, r4 } = body;
    await sql`
      INSERT INTO player_scores (player_id, total_score, status, r1, r2, r3, r4, last_updated)
      VALUES (${player_id}, ${total_score}, ${pStatus || 'active'}, ${r1 ?? null}, ${r2 ?? null}, ${r3 ?? null}, ${r4 ?? null}, ${new Date().toISOString()})
      ON CONFLICT (player_id) DO UPDATE SET
        total_score = EXCLUDED.total_score,
        status = EXCLUDED.status,
        r1 = EXCLUDED.r1,
        r2 = EXCLUDED.r2,
        r3 = EXCLUDED.r3,
        r4 = EXCLUDED.r4,
        last_updated = EXCLUDED.last_updated
    `;
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'delete_user') {
    await sql`DELETE FROM picks WHERE user_id = ${body.user_id}`;
    await sql`DELETE FROM users WHERE id = ${body.user_id}`;
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
