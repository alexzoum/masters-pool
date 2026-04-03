import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { sql, ensureSchema } from '@/lib/db';
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

  await ensureSchema();
  await seedPlayers();

  const existing = await sql`SELECT id FROM users WHERE LOWER(username) = LOWER(${username})`;
  if (existing.length > 0) {
    return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
  }

  const password_hash = await bcrypt.hash(password, 10);
  const [{ count }] = await sql`SELECT COUNT(*)::int as count FROM users` as unknown as [{ count: number }];
  const is_admin = count === 0 ? 1 : 0;

  const rows = await sql`
    INSERT INTO users (username, password_hash, is_admin)
    VALUES (${username}, ${password_hash}, ${is_admin})
    RETURNING id, username, is_admin
  ` as unknown as { id: number; username: string; is_admin: number }[];
  const newUser = rows[0];

  const user = { id: newUser.id, username: newUser.username, is_admin: Boolean(newUser.is_admin) };
  const token = await createSession(user);
  const cookieOpts = setSessionCookie(token);

  const response = NextResponse.json({ user });
  response.cookies.set(cookieOpts);
  return response;
}
