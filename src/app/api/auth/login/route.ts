import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';
import { seedPlayers } from '@/lib/seed-players';
import { createSession, setSessionCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  const db = getDb();
  seedPlayers();

  const row = db
    .prepare('SELECT id, username, password_hash, is_admin FROM users WHERE username = ?')
    .get(username) as { id: number; username: string; password_hash: string; is_admin: number } | undefined;

  if (!row || !(await bcrypt.compare(password, row.password_hash))) {
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
  }

  const user = { id: row.id, username: row.username, is_admin: Boolean(row.is_admin) };
  const token = await createSession(user);
  const cookieOpts = setSessionCookie(token);

  const response = NextResponse.json({ user });
  response.cookies.set(cookieOpts);
  return response;
}
