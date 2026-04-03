import { neon } from '@neondatabase/serverless';

let _client: ReturnType<typeof neon> | null = null;

function getClient() {
  if (!_client) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
    _client = neon(process.env.DATABASE_URL);
  }
  return _client;
}

// Lazy tagged-template wrapper — returns a plain array so TypeScript can index it
export async function sql(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<Record<string, unknown>[]> {
  const result = await getClient()(strings, ...values);
  return result as Record<string, unknown>[];
}

let schemaInitialized = false;

export async function ensureSchema(): Promise<void> {
  if (schemaInitialized) return;
  schemaInitialized = true;

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      is_admin INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS players (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      odds TEXT,
      odds_value INTEGER,
      odds_rank INTEGER,
      group_number INTEGER,
      world_rank INTEGER
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS picks (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      player_id INTEGER NOT NULL REFERENCES players(id),
      group_number INTEGER NOT NULL,
      UNIQUE(user_id, group_number),
      UNIQUE(user_id, player_id)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS player_scores (
      id SERIAL PRIMARY KEY,
      player_id INTEGER NOT NULL UNIQUE REFERENCES players(id),
      total_score INTEGER,
      r1 INTEGER,
      r2 INTEGER,
      r3 INTEGER,
      r4 INTEGER,
      position TEXT,
      status TEXT DEFAULT 'active',
      last_updated TEXT
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS tournament_state (
      id INTEGER PRIMARY KEY DEFAULT 1,
      status TEXT DEFAULT 'pre',
      picks_locked INTEGER DEFAULT 0,
      espn_event_id TEXT DEFAULT '',
      current_round INTEGER DEFAULT 0
    )
  `;

  await sql`
    INSERT INTO tournament_state (id, status, picks_locked, espn_event_id, current_round)
    VALUES (1, 'pre', 0, '', 0)
    ON CONFLICT (id) DO NOTHING
  `;
}
