import { sql, ensureSchema } from './db';

const PLAYERS = [
  // Group 1 (odds rank 1-7)
  { name: 'Scottie Scheffler',   odds: '+400',   odds_value: 400,   group_number: 1, world_rank: 1 },
  { name: 'Rory McIlroy',        odds: '+700',   odds_value: 700,   group_number: 1, world_rank: 2 },
  { name: 'Bryson DeChambeau',   odds: '+1000',  odds_value: 1000,  group_number: 1, world_rank: 24 },
  { name: 'Jon Rahm',            odds: '+1200',  odds_value: 1200,  group_number: 1, world_rank: 29 },
  { name: 'Ludvig Åberg',        odds: '+1600',  odds_value: 1600,  group_number: 1, world_rank: 18 },
  { name: 'Tommy Fleetwood',     odds: '+1800',  odds_value: 1800,  group_number: 1, world_rank: 4 },
  { name: 'Xander Schauffele',   odds: '+1800',  odds_value: 1800,  group_number: 1, world_rank: 6 },
  // Group 2 (odds rank 8-14)
  { name: 'Collin Morikawa',     odds: '+2200',  odds_value: 2200,  group_number: 2, world_rank: 8 },
  { name: 'Cameron Young',       odds: '+2700',  odds_value: 2700,  group_number: 2, world_rank: 3 },
  { name: 'Matt Fitzpatrick',    odds: '+3000',  odds_value: 3000,  group_number: 2, world_rank: 5 },
  { name: 'Justin Rose',         odds: '+3000',  odds_value: 3000,  group_number: 2, world_rank: 7 },
  { name: 'Patrick Reed',        odds: '+3000',  odds_value: 3000,  group_number: 2, world_rank: 23 },
  { name: 'Chris Gotterup',      odds: '+3500',  odds_value: 3500,  group_number: 2, world_rank: 9 },
  { name: 'Hideki Matsuyama',    odds: '+3500',  odds_value: 3500,  group_number: 2, world_rank: 14 },
  // Group 3 (odds rank 15-21)
  { name: 'Viktor Hovland',      odds: '+3500',  odds_value: 3500,  group_number: 3, world_rank: 22 },
  { name: 'Brooks Koepka',       odds: '+3800',  odds_value: 3800,  group_number: 3, world_rank: 165 },
  { name: 'Robert MacIntyre',    odds: '+4000',  odds_value: 4000,  group_number: 3, world_rank: 11 },
  { name: 'Justin Thomas',       odds: '+4000',  odds_value: 4000,  group_number: 3, world_rank: 15 },
  { name: 'Tyrrell Hatton',      odds: '+4000',  odds_value: 4000,  group_number: 3, world_rank: 31 },
  { name: 'Jordan Spieth',       odds: '+4000',  odds_value: 4000,  group_number: 3, world_rank: 63 },
  { name: 'Shane Lowry',         odds: '+4500',  odds_value: 4500,  group_number: 3, world_rank: 32 },
  // Group 4 (odds rank 22-28)
  { name: 'Patrick Cantlay',     odds: '+5000',  odds_value: 5000,  group_number: 4, world_rank: 34 },
  { name: 'Ben Griffin',         odds: '+5500',  odds_value: 5500,  group_number: 4, world_rank: 16 },
  { name: 'Akshay Bhatia',       odds: '+6000',  odds_value: 6000,  group_number: 4, world_rank: 20 },
  { name: 'Si Woo Kim',          odds: '+6000',  odds_value: 6000,  group_number: 4, world_rank: 30 },
  { name: 'Jake Knapp',          odds: '+6000',  odds_value: 6000,  group_number: 4, world_rank: 42 },
  { name: 'Corey Conners',       odds: '+6000',  odds_value: 6000,  group_number: 4, world_rank: 43 },
  { name: 'Russell Henley',      odds: '+6600',  odds_value: 6600,  group_number: 4, world_rank: 10 },
  // Group 5 (odds rank 29-35)
  { name: 'Min Woo Lee',         odds: '+6600',  odds_value: 6600,  group_number: 5, world_rank: 25 },
  { name: 'Jason Day',           odds: '+6600',  odds_value: 6600,  group_number: 5, world_rank: 41 },
  { name: 'Adam Scott',          odds: '+6600',  odds_value: 6600,  group_number: 5, world_rank: 53 },
  { name: 'Max Homa',            odds: '+6600',  odds_value: 6600,  group_number: 5, world_rank: 156 },
  { name: 'Cameron Smith',       odds: '+6600',  odds_value: 6600,  group_number: 5, world_rank: 999 },
  { name: 'Sepp Straka',         odds: '+7000',  odds_value: 7000,  group_number: 5, world_rank: 12 },
  { name: 'Sam Burns',           odds: '+7000',  odds_value: 7000,  group_number: 5, world_rank: 33 },
  // Group 6 (odds rank 36-42)
  { name: 'Daniel Berger',       odds: '+7000',  odds_value: 7000,  group_number: 6, world_rank: 38 },
  { name: 'Marco Penge',         odds: '+8000',  odds_value: 8000,  group_number: 6, world_rank: 37 },
  { name: 'Gary Woodland',       odds: '+8000',  odds_value: 8000,  group_number: 6, world_rank: 51 },
  { name: 'Sungjae Im',          odds: '+8000',  odds_value: 8000,  group_number: 6, world_rank: 70 },
  { name: 'Wyndham Clark',       odds: '+8000',  odds_value: 8000,  group_number: 6, world_rank: 75 },
  { name: 'J.J. Spaun',          odds: '+9000',  odds_value: 9000,  group_number: 6, world_rank: 13 },
  { name: 'Jacob Bridgeman',     odds: '+9000',  odds_value: 9000,  group_number: 6, world_rank: 17 },
  // Group 7 (odds rank 43-49)
  { name: 'Harris English',      odds: '+9000',  odds_value: 9000,  group_number: 7, world_rank: 21 },
  { name: 'Dustin Johnson',      odds: '+9000',  odds_value: 9000,  group_number: 7, world_rank: 999 },
  { name: 'Alexander Noren',     odds: '+10000', odds_value: 10000, group_number: 7, world_rank: 19 },
  { name: 'Matthew McCarty',     odds: '+10000', odds_value: 10000, group_number: 7, world_rank: 46 },
  { name: 'Sergio Garcia',       odds: '+10000', odds_value: 10000, group_number: 7, world_rank: 999 },
  { name: 'Maverick McNealy',    odds: '+11000', odds_value: 11000, group_number: 7, world_rank: 27 },
  { name: 'Ryan Gerard',         odds: '+11000', odds_value: 11000, group_number: 7, world_rank: 28 },
  // Group 8 (odds rank 50-56)
  { name: 'Keegan Bradley',      odds: '+12000', odds_value: 12000, group_number: 8, world_rank: 26 },
  { name: 'Kurt Kitayama',       odds: '+12000', odds_value: 12000, group_number: 8, world_rank: 35 },
  { name: 'Nicolai Hojgaard',    odds: '+12000', odds_value: 12000, group_number: 8, world_rank: 36 },
  { name: 'Ryan Fox',            odds: '+12000', odds_value: 12000, group_number: 8, world_rank: 48 },
  { name: 'Aaron Rai',           odds: '+13000', odds_value: 13000, group_number: 8, world_rank: 40 },
  { name: 'Harry Hall',          odds: '+13000', odds_value: 13000, group_number: 8, world_rank: 59 },
  { name: 'John Keefer',         odds: '+13000', odds_value: 13000, group_number: 8, world_rank: 60 },
];

export async function seedPlayers(): Promise<void> {
  await ensureSchema();
  const [{ count }] = await sql`SELECT COUNT(*)::int as count FROM players` as unknown as [{ count: number }];
  if (count > 0) return;

  for (let i = 0; i < PLAYERS.length; i++) {
    const p = PLAYERS[i];
    await sql`
      INSERT INTO players (name, odds, odds_value, odds_rank, group_number, world_rank)
      VALUES (${p.name}, ${p.odds}, ${p.odds_value}, ${i + 1}, ${p.group_number}, ${p.world_rank})
    `;
  }
}
