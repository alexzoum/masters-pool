import { getDb } from './db';

interface ESPNCompetitor {
  id: string;
  displayName: string;
  status?: {
    type?: { name?: string };
    position?: { displayName?: string };
    displayValue?: string;
  };
  statistics?: Array<{ name: string; displayValue: string; value: number }>;
  linescores?: Array<{ value: number | null; displayValue?: string }>;
}

interface ESPNEvent {
  competitions?: Array<{
    competitors?: ESPNCompetitor[];
  }>;
}

export async function fetchAndUpdateScores(eventId: string): Promise<void> {
  if (!eventId) return;

  const url = `https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard?league=pga&event=${eventId}`;
  const res = await fetch(url, {
    next: { revalidate: 0 },
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });

  if (!res.ok) throw new Error(`ESPN API error: ${res.status}`);
  const data = await res.json();

  const events: ESPNEvent[] = data.events || [];
  const event = events[0];
  if (!event?.competitions?.[0]?.competitors) return;

  const competitors = event.competitions[0].competitors;
  const db = getDb();
  const now = new Date().toISOString();

  const upsert = db.prepare(`
    INSERT INTO player_scores (player_id, total_score, r1, r2, r3, r4, position, status, last_updated)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(player_id) DO UPDATE SET
      total_score = excluded.total_score,
      r1 = excluded.r1,
      r2 = excluded.r2,
      r3 = excluded.r3,
      r4 = excluded.r4,
      position = excluded.position,
      status = excluded.status,
      last_updated = excluded.last_updated
  `);

  const findPlayer = db.prepare(
    `SELECT id FROM players WHERE LOWER(name) = LOWER(?) LIMIT 1`
  );

  const updateMany = db.transaction(() => {
    for (const c of competitors) {
      const player = findPlayer.get(c.displayName) as { id: number } | undefined;
      if (!player) continue;

      const statusType = c.status?.type?.name?.toLowerCase() || 'active';
      let status = 'active';
      if (statusType.includes('cut') || statusType.includes('mc')) status = 'cut';
      else if (statusType.includes('wd') || statusType.includes('withdraw')) status = 'wd';

      const stats = c.statistics || [];
      const totalStat = stats.find((s) => s.name === 'toPar' || s.name === 'score');
      const totalScore = totalStat ? Math.round(totalStat.value) : null;

      const lines = c.linescores || [];
      const r1 = lines[0]?.value ?? null;
      const r2 = lines[1]?.value ?? null;
      const r3 = lines[2]?.value ?? null;
      const r4 = lines[3]?.value ?? null;

      const position = c.status?.position?.displayName || null;

      upsert.run(player.id, totalScore, r1, r2, r3, r4, position, status, now);
    }
  });

  updateMany();
}

export async function getCurrentMastersEventId(): Promise<string | null> {
  try {
    const res = await fetch(
      'https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard?league=pga',
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const events = data.events || [];
    const masters = events.find((e: { name?: string; id?: string }) =>
      e.name?.toLowerCase().includes('masters')
    );
    return masters?.id || null;
  } catch {
    return null;
  }
}
