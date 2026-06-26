export function buildAncestorLeaderboard(profiles = [], leaders = []) {
  const leaderIds = new Set(leaders.map((leader) => leader.id).filter(Boolean));
  const counts = new Map();

  leaders.forEach((leader) => {
    counts.set(leader.id, 0);
  });

  profiles.forEach((profile) => {
    if (!profile?.ancestor) return;
    if (!leaderIds.has(profile.ancestor)) return;

    counts.set(profile.ancestor, (counts.get(profile.ancestor) || 0) + 1);
  });

  return leaders
    .map((leader) => ({
      leader,
      count: counts.get(leader.id) || 0,
    }))
    .sort((a, b) => b.count - a.count);
}
