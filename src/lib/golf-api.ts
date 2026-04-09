import { sql } from './db';

interface ESPNCompetitor {
  id: string;
  athlete?: { displayName?: string };
  status?: {
    type?: { name?: string };
    position?: { displayName?: string };
  };
  statistics?: Array<{ name: string; displayValue: string; value: number }>;
  linescores?: Array<{ value: number | null; displayValue?: string }>;
}

interface ESPNEvent {
  competitions?: Array<{
    competitors?: ESPNCompetitor[];
    status?: { period?: number };
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

  const competition = event.competitions[0];
  const competitors = competition.competitors!;
  const now = new Date().toISOString();

  const detectedRound = competition.status?.period ?? null;
  if (detectedRound) {
    await sql`
      UPDATE tournament_state SET current_round = ${detectedRound}
      WHERE id = 1 AND current_round != ${detectedRound}
    `;
  }

  const normalize = (s: string) =>
    s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const allPlayers = await sql`SELECT id, name FROM players` as unknown as { id: number; name: string }[];
  const playerMap = new Map(allPlayers.map((p) => [normalize(p.name), p.id]));

  for (const c of competitors) {
    const displayName = c.athlete?.displayName;
    if (!displayName) continue;
    const playerId = playerMap.get(normalize(displayName));
    if (!playerId) continue;

    const statusType = c.status?.type?.name?.toUpperCase() || '';
    let status = 'active';
    if (statusType.includes('CUT') || statusType.includes('MC')) status = 'cut';
    else if (statusType.includes('WITHDRAWN') || statusType.includes('WD')) status = 'wd';

    const stats = c.statistics || [];
    const totalStat = stats.find((s) => s.name === 'scoreToPar');
    const totalScore = totalStat ? Math.round(totalStat.value) : null;

    const lines = c.linescores || [];
    const parseRound = (l: { displayValue?: string } | undefined) => {
      if (!l?.displayValue) return null;
      const n = parseInt(l.displayValue, 10);
      return isNaN(n) ? null : n;
    };
    const r1 = parseRound(lines[0]);
    const r2 = parseRound(lines[1]);
    const r3 = parseRound(lines[2]);
    const r4 = parseRound(lines[3]);
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
