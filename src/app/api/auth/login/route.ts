import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { sql, ensureSchema } from '@/lib/db';
import { seedPlayers } from '@/lib/seed-players';
import { createSession, setSessionCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
  const { username, password } = await req.json();

  await ensureSchema();
  await seedPlayers();

  const rows = await sql`
    SELECT id, username, password_hash, is_admin FROM users WHERE LOWER(username) = LOWER(${username})
  ` as unknown as { id: number; username: string; password_hash: string; is_admin: number }[];

  const row = rows[0];
  if (!row || !(await bcrypt.compare(password, row.password_hash))) {
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
  }

  const user = { id: row.id, username: row.username, is_admin: Boolean(row.is_admin) };
  const token = await createSession(user);
  const cookieOpts = setSessionCookie(token);

  const response = NextResponse.json({ user });
  response.cookies.set(cookieOpts);
  return response;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[login]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
