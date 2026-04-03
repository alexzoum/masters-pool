import { sql, ensureSchema } from './db';

const PLAYERS = [
  // Group 1
  { name: 'Scottie Scheffler',   odds: '+400',   odds_value: 400,   group_number: 1, world_rank: 1 },
  { name: 'Rory McIlroy',        odds: '+700',   odds_value: 700,   group_number: 1, world_rank: 2 },
  { name: 'Bryson DeChambeau',   odds: '+1000',  odds_value: 1000,  group_number: 1, world_rank: 24 },
  { name: 'Jon Rahm',            odds: '+1200',  odds_value: 1200,  group_number: 1, world_rank: 29 },
  { name: 'Tommy Fleetwood',     odds: '+1800',  odds_value: 1800,  group_number: 1, world_rank: 4 },
  { name: 'Xander Schauffele',   odds: '+1800',  odds_value: 1800,  group_number: 1, world_rank: 6 },
  { name: 'Collin Morikawa',     odds: '+2200',  odds_value: 2200,  group_number: 1, world_rank: 8 },
  // Group 2
  { name: 'Cameron Young',       odds: '+2700',  odds_value: 2700,  group_number: 2, world_rank: 3 },
  { name: 'Justin Rose',         odds: '+3000',  odds_value: 3000,  group_number: 2, world_rank: 7 },
  { name: 'Matt Fitzpatrick',    odds: '+3000',  odds_value: 3000,  group_number: 2, world_rank: 5 },
  { name: 'Chris Gotterup',      odds: '+3500',  odds_value: 3500,  group_number: 2, world_rank: 9 },
  { name: 'Hideki Matsuyama',    odds: '+3500',  odds_value: 3500,  group_number: 2, world_rank: 14 },
  { name: 'Robert MacIntyre',    odds: '+4000',  odds_value: 4000,  group_number: 2, world_rank: 11 },
  { name: 'Justin Thomas',       odds: '+4000',  odds_value: 4000,  group_number: 2, world_rank: 15 },
  // Group 3
  { name: 'Jordan Spieth',       odds: '+4000',  odds_value: 4000,  group_number: 3, world_rank: 63 },
  { name: 'Ludvig Åberg',        odds: '+4500',  odds_value: 4500,  group_number: 3, world_rank: 16 },
  { name: 'Viktor Hovland',      odds: '+5000',  odds_value: 5000,  group_number: 3, world_rank: 20 },
  { name: 'Min Woo Lee',         odds: '+5500',  odds_value: 5500,  group_number: 3, world_rank: 22 },
  { name: 'Shane Lowry',         odds: '+6000',  odds_value: 6000,  group_number: 3, world_rank: 18 },
  { name: 'Brooks Koepka',       odds: '+6500',  odds_value: 6500,  group_number: 3, world_rank: 35 },
  { name: 'Russell Henley',      odds: '+6600',  odds_value: 6600,  group_number: 3, world_rank: 10 },
  // Group 4
  { name: 'Sepp Straka',         odds: '+7000',  odds_value: 7000,  group_number: 4, world_rank: 12 },
  { name: 'Tom Kim',             odds: '+7500',  odds_value: 7500,  group_number: 4, world_rank: 26 },
  { name: 'Sungjae Im',          odds: '+8000',  odds_value: 8000,  group_number: 4, world_rank: 21 },
  { name: 'Tony Finau',          odds: '+8000',  odds_value: 8000,  group_number: 4, world_rank: 33 },
  { name: 'Patrick Cantlay',     odds: '+8000',  odds_value: 8000,  group_number: 4, world_rank: 27 },
  { name: 'Akshay Bhatia',       odds: '+9000',  odds_value: 9000,  group_number: 4, world_rank: 30 },
  { name: 'J.J. Spaun',          odds: '+9000',  odds_value: 9000,  group_number: 4, world_rank: 13 },
  // Group 5
  { name: 'Sahith Theegala',     odds: '+9500',  odds_value: 9500,  group_number: 5, world_rank: 28 },
  { name: 'Nick Dunlap',         odds: '+10000', odds_value: 10000, group_number: 5, world_rank: 39 },
  { name: 'Sam Burns',           odds: '+10000', odds_value: 10000, group_number: 5, world_rank: 36 },
  { name: 'Corey Conners',       odds: '+11000', odds_value: 11000, group_number: 5, world_rank: 40 },
  { name: 'Keegan Bradley',      odds: '+12000', odds_value: 12000, group_number: 5, world_rank: 45 },
  { name: 'Harris English',      odds: '+12000', odds_value: 12000, group_number: 5, world_rank: 41 },
  { name: 'Si Woo Kim',          odds: '+12000', odds_value: 12000, group_number: 5, world_rank: 43 },
  // Group 6
  { name: 'Davis Riley',         odds: '+15000', odds_value: 15000, group_number: 6, world_rank: 48 },
  { name: 'Denny McCarthy',      odds: '+15000', odds_value: 15000, group_number: 6, world_rank: 50 },
  { name: 'Taylor Pendrith',     odds: '+15000', odds_value: 15000, group_number: 6, world_rank: 42 },
  { name: 'Brian Harman',        odds: '+18000', odds_value: 18000, group_number: 6, world_rank: 55 },
  { name: 'Lucas Glover',        odds: '+18000', odds_value: 18000, group_number: 6, world_rank: 52 },
  { name: 'Adam Scott',          odds: '+20000', odds_value: 20000, group_number: 6, world_rank: 60 },
  { name: 'Rickie Fowler',       odds: '+20000', odds_value: 20000, group_number: 6, world_rank: 70 },
  // Group 7
  { name: 'Dustin Johnson',      odds: '+20000', odds_value: 20000, group_number: 7, world_rank: 80 },
  { name: 'Patrick Reed',        odds: '+25000', odds_value: 25000, group_number: 7, world_rank: 75 },
  { name: 'Will Zalatoris',      odds: '+25000', odds_value: 25000, group_number: 7, world_rank: 65 },
  { name: 'Jake Knapp',          odds: '+30000', odds_value: 30000, group_number: 7, world_rank: 58 },
  { name: 'Aaron Rai',           odds: '+30000', odds_value: 30000, group_number: 7, world_rank: 62 },
  { name: 'Byeong Hun An',       odds: '+30000', odds_value: 30000, group_number: 7, world_rank: 56 },
  { name: 'Matthieu Pavon',      odds: '+30000', odds_value: 30000, group_number: 7, world_rank: 68 },
  // Group 8
  { name: 'Tiger Woods',         odds: '+10000', odds_value: 10000, group_number: 8, world_rank: 999 },
  { name: 'Phil Mickelson',      odds: '+50000', odds_value: 50000, group_number: 8, world_rank: 999 },
  { name: 'Fred Couples',        odds: '+100000',odds_value: 100000,group_number: 8, world_rank: 999 },
  { name: 'Mike Weir',           odds: '+100000',odds_value: 100000,group_number: 8, world_rank: 999 },
  { name: 'Vijay Singh',         odds: '+100000',odds_value: 100000,group_number: 8, world_rank: 999 },
  { name: 'Larry Mize',          odds: '+100000',odds_value: 100000,group_number: 8, world_rank: 999 },
  { name: 'José María Olazábal', odds: '+100000',odds_value: 100000,group_number: 8, world_rank: 999 },
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
