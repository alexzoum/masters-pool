import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';
import { seedPlayers } from '@/lib/seed-players';
import { createSession, setSessionCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  if (!username || !password || username.length < 2 || password.length < 4) {
    return NextResponse.json(
      { error: 'Username must be 2+ chars, password 4+ chars' },
      { status: 400 }
    );
  }

  const db = getDb();
  seedPlayers();

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
  }

  const password_hash = await bcrypt.hash(password, 10);
  const allUsers = db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number };
  const is_admin = allUsers.c === 0 ? 1 : 0; // first user is admin

  const result = db
    .prepare('INSERT INTO users (username, password_hash, is_admin) VALUES (?, ?, ?)')
    .run(username, password_hash, is_admin);

  const user = { id: Number(result.lastInsertRowid), username, is_admin: Boolean(is_admin) };
  const token = await createSession(user);
  const cookieOpts = setSessionCookie(token);

  const response = NextResponse.json({ user });
  response.cookies.set(cookieOpts);
  return response;
}
