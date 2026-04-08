'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ClientLayout from '@/components/ClientLayout';

interface Player {
  id: number;
  name: string;
  odds: string;
  odds_rank: number;
  group_number: number;
  world_rank: number;
  total_score: number | null;
  status: string | null;
  position: string | null;
}

interface Pick {
  group_number: number;
  player_id: number;
  name: string;
  odds: string;
}

interface TournamentState {
  status: string;
  picks_locked: number;
  current_round: number;
}

interface NavUser {
  username: string;
  is_admin: boolean;
}

function formatScore(score: number | null, status?: string | null): string {
  if (status === 'cut' || status === 'mc' || status === 'wd') return '+8 (CUT)';
  if (score === null || score === undefined) return '-';
  if (score === 0) return 'E';
  return score > 0 ? `+${score}` : `${score}`;
}


export default function PicksPage() {
  const router = useRouter();
  const [user, setUser] = useState<NavUser | null>(null);
  const [groups, setGroups] = useState<Record<number, Player[]>>({});
  const [myPicks, setMyPicks] = useState<Record<number, Pick>>({});
  const [state, setState] = useState<TournamentState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [msg, setMsg] = useState('');

  const checkAuth = useCallback(async () => {
    const res = await fetch('/api/picks');
    if (res.status === 401) {
      router.push('/auth');
      return false;
    }
    return true;
  }, [router]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [playersRes, picksRes] = await Promise.all([
      fetch('/api/players'),
      fetch('/api/picks'),
    ]);

    if (picksRes.status === 401) {
      router.push('/auth');
      return;
    }

    const playersData = await playersRes.json();
    const picksData = await picksRes.json();

    setGroups(playersData.groups || {});
    setState(playersData.state);

    const pickMap: Record<number, Pick> = {};
    for (const p of picksData.picks || []) {
      pickMap[p.group_number] = p;
    }
    setMyPicks(pickMap);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    checkAuth().then((ok) => {
      if (ok) loadData();
    });
    // Try to get username from a simple whoami-style endpoint
    fetch('/api/picks').then(async (r) => {
      if (r.ok) {
        // We know they're authed; try to get user info from cookie-based session
        // We'll read it from the leaderboard or just trust the picks response
      }
    });
  }, [checkAuth, loadData]);

  useEffect(() => {
    fetch('/api/auth/me').then(async (r) => {
      if (r.ok) {
        const d = await r.json();
        setUser(d.user);
      }
    });
  }, []);

  async function pickPlayer(player: Player) {
    if (state?.picks_locked) return;
    setSaving(player.group_number);
    setMsg('');

    const res = await fetch('/api/picks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_id: player.id }),
    });

    const data = await res.json();
    setSaving(null);

    if (!res.ok) {
      setMsg(data.error || 'Failed to save pick');
      return;
    }

    setMyPicks((prev) => ({
      ...prev,
      [player.group_number]: {
        group_number: player.group_number,
        player_id: player.id,
        name: player.name,
        odds: player.odds,
      },
    }));
  }

  const totalPicks = Object.keys(myPicks).length;
  const locked = state?.picks_locked === 1;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400">Loading field…</div>
      </div>
    );
  }

  return (
    <ClientLayout user={user}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">
            {locked ? 'Your Picks' : 'Make Your Picks'}
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {locked
              ? 'Picks are locked — the tournament has started.'
              : `Select 1 player from each group. ${totalPicks}/8 groups selected.`}
          </p>
        </div>

        {msg && (
          <div className="mb-4 text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-4 py-2">
            {msg}
          </div>
        )}

        {/* Progress bar */}
        {!locked && (
          <div className="mb-6">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{totalPicks} of 8 picks made</span>
              {totalPicks === 8 && <span className="text-green-400">All picks submitted!</span>}
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-600 rounded-full transition-all duration-300"
                style={{ width: `${(totalPicks / 8) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Summary of picks */}
        {totalPicks > 0 && (
          <div className="mb-6 bg-gray-900 rounded-xl border border-gray-800 p-4">
            <h2 className="text-sm font-semibold text-gray-300 mb-3">Your Selections</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Array.from({ length: 8 }, (_, i) => i + 1).map((g) => (
                <div
                  key={g}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    myPicks[g]
                      ? 'bg-green-900/30 border border-green-800'
                      : 'bg-gray-800/50 border border-gray-700'
                  }`}
                >
                  <div className="text-xs text-gray-500 mb-0.5">Group {g}</div>
                  {myPicks[g] ? (
                    <>
                      <div className="text-white font-medium truncate">{myPicks[g].name}</div>
                      <div className="text-green-400 text-xs">{myPicks[g].odds}</div>
                    </>
                  ) : (
                    <div className="text-gray-600 italic">No pick</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Player groups */}
        <div className={`space-y-4 ${locked ? 'pointer-events-none select-none opacity-60' : ''}`}>
          {Object.entries(groups)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([groupNum, players]) => {
              const gNum = Number(groupNum);
              const picked = myPicks[gNum];

              return (
                <div
                  key={gNum}
                  className={`bg-gray-900 rounded-xl border transition-colors ${
                    picked ? 'border-green-800' : 'border-gray-800'
                  }`}
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                    <div>
                      <span className="text-white font-semibold text-sm">
                        {`Group ${gNum}`}
                      </span>
                    </div>
                    {picked && (
                      <span className="text-green-400 text-xs font-medium">
                        ✓ {picked.name}
                      </span>
                    )}
                  </div>

                  <div className="divide-y divide-gray-800/50">
                    {(players as Player[]).map((player) => {
                      const isPicked = picked?.player_id === player.id;
                      const isSaving = saving === gNum;
                      const showScore = state?.status !== 'pre' && state?.status != null;

                      return (
                        <div
                          key={player.id}
                          className={`flex items-center px-4 py-3 transition-colors ${
                            locked
                              ? isPicked
                                ? 'bg-green-900/20'
                                : ''
                              : 'hover:bg-gray-800/50 cursor-pointer'
                          } ${isPicked ? 'bg-green-900/10' : ''}`}
                          onClick={() => !locked && pickPlayer(player)}
                        >
                          {/* Selection indicator */}
                          <div className="mr-3 flex-shrink-0">
                            {isPicked ? (
                              <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            ) : (
                              <div className={`w-5 h-5 rounded-full border-2 ${
                                locked ? 'border-gray-700' : 'border-gray-600 group-hover:border-green-500'
                              }`} />
                            )}
                          </div>

                          {/* Player info */}
                          <div className="flex-1 min-w-0">
                            <div className={`font-medium text-sm ${isPicked ? 'text-green-400' : 'text-white'}`}>
                              {player.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              Odds: {player.odds}
                              {player.world_rank < 500 && (
                                <span className="ml-2">WR: #{player.world_rank}</span>
                              )}
                            </div>
                          </div>

                          {/* Live score */}
                          {showScore && (
                            <div className="ml-4 text-right flex-shrink-0">
                              {player.status === 'cut' || player.status === 'mc' ? (
                                <span className="text-xs font-bold text-red-400 bg-red-900/20 px-2 py-0.5 rounded">
                                  CUT +8
                                </span>
                              ) : (
                                <>
                                  <div className={`font-bold text-sm ${
                                    (player.total_score ?? 0) < 0
                                      ? 'text-red-400'
                                      : (player.total_score ?? 0) > 0
                                      ? 'text-blue-400'
                                      : 'text-gray-300'
                                  }`}>
                                    {formatScore(player.total_score, player.status)}
                                  </div>
                                  {player.position && (
                                    <div className="text-xs text-gray-500">{player.position}</div>
                                  )}
                                </>
                              )}
                            </div>
                          )}

                          {isSaving && (
                            <div className="ml-2 text-gray-400 text-xs">saving…</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </ClientLayout>
  );
}
