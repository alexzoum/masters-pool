import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'masters-pool-secret-change-in-production'
);
const COOKIE = 'masters_session';

export interface SessionUser {
  id: number;
  username: string;
  is_admin: boolean;
}

export async function createSession(user: SessionUser): Promise<string> {
  return await new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET);
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

export function setSessionCookie(token: string): { name: string; value: string; httpOnly: boolean; sameSite: 'lax'; path: string; maxAge: number } {
  return {
    name: COOKIE,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  };
}

export function clearSessionCookie() {
  return {
    name: COOKIE,
    value: '',
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0,
  };
}
