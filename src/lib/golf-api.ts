import { sql } from './db';

interface ESPNCompetitor {
  id: string;
  displayName: string;
  status?: {
    type?: { name?: string };
    position?: { displayName?: string };
  };
  statistics?: Array<{ name: string; displayValue: string; value: number }>;
  linescores?: Array<{ value: number | null }>;
}

interface ESPNEvent {
  competitions?: Array<{
    competitors?: ESPNCompetitor[];
  }>;
}

export async function fetchAndUpdateScores(eventId: string): Promise<void> {
  if (!eventId) return;

  const url = `https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard?league=pga&event=${eventId}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`ESPN API error: ${res.status}`);

  const data = await res.json();
  const events: ESPNEvent[] = data.events || [];
  const event = events[0];
  if (!event?.competitions?.[0]?.competitors) return;

  const competitors = event.competitions[0].competitors;
  const now = new Date().toISOString();

  const allPlayers = await sql`SELECT id, name FROM players` as unknown as { id: number; name: string }[];
  const playerMap = new Map(allPlayers.map((p) => [p.name.toLowerCase(), p.id]));

  for (const c of competitors) {
    const playerId = playerMap.get(c.displayName.toLowerCase());
    if (!playerId) continue;

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

    await sql`
      INSERT INTO player_scores (player_id, total_score, r1, r2, r3, r4, position, status, last_updated)
      VALUES (${playerId}, ${totalScore}, ${r1}, ${r2}, ${r3}, ${r4}, ${position}, ${status}, ${now})
      ON CONFLICT (player_id) DO UPDATE SET
        total_score = EXCLUDED.total_score,
        r1 = EXCLUDED.r1,
        r2 = EXCLUDED.r2,
        r3 = EXCLUDED.r3,
        r4 = EXCLUDED.r4,
        position = EXCLUDED.position,
        status = EXCLUDED.status,
        last_updated = EXCLUDED.last_updated
    `;
  }
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
