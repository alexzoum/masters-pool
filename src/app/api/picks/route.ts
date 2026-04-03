import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const picks = await sql`
    SELECT pk.group_number, p.id as player_id, p.name, p.odds, p.group_number
    FROM picks pk
    JOIN players p ON p.id = pk.player_id
    WHERE pk.user_id = ${session.id}
    ORDER BY pk.group_number
  `;

  return NextResponse.json({ picks });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const states = await sql`SELECT picks_locked FROM tournament_state WHERE id = 1`;
  const state = states[0] as { picks_locked: number } | undefined;
  if (state?.picks_locked) {
    return NextResponse.json({ error: 'Picks are locked — tournament has started' }, { status: 403 });
  }

  const { player_id } = await req.json();
  if (!player_id) return NextResponse.json({ error: 'player_id required' }, { status: 400 });

  const players = await sql`SELECT id, group_number FROM players WHERE id = ${player_id}`;
  const player = players[0] as { id: number; group_number: number } | undefined;
  if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 });

  // Replace pick for this group
  await sql`DELETE FROM picks WHERE user_id = ${session.id} AND group_number = ${player.group_number}`;
  await sql`INSERT INTO picks (user_id, player_id, group_number) VALUES (${session.id}, ${player.id}, ${player.group_number})`;

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const states = await sql`SELECT picks_locked FROM tournament_state WHERE id = 1`;
  const state = states[0] as { picks_locked: number } | undefined;
  if (state?.picks_locked) {
    return NextResponse.json({ error: 'Picks are locked' }, { status: 403 });
  }

  const { group_number } = await req.json();
  await sql`DELETE FROM picks WHERE user_id = ${session.id} AND group_number = ${group_number}`;

  return NextResponse.json({ ok: true });
}
