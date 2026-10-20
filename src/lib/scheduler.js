// Pure auto-assign logic for ride-along pairings.
// Roles: 'manager' | 'one_month' | 'sna' | 'rpa' | 'tenured'
// Tenure ladder (least to most experienced): 1 Month Agent -> SNA -> RPA -> Tenured Agent.
// Managers pair with the least experienced agents first; the rest are paired
// least-experienced with most-experienced.

export const ROLE_LABELS = {
  manager: "Manager",
  one_month: "1 Month Agent",
  sna: "SNA",
  rpa: "RPA",
  tenured: "Tenured Agent",
};

export const ROLE_ORDER = { manager: 0, one_month: 1, sna: 2, rpa: 3, tenured: 4 };

export function pairingTypeFor(agent1, agent2) {
  if (!agent2) return "Solo";
  const roles = [agent1.role, agent2.role].sort((a, b) => ROLE_ORDER[a] - ROLE_ORDER[b]);
  return `${ROLE_LABELS[roles[0]]} + ${ROLE_LABELS[roles[1]]}`;
}

export function autoAssign(agents) {
  const managers = agents.filter((a) => a.role === "manager");
  const others = agents
    .filter((a) => a.role !== "manager")
    .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]);

  const pairings = [];
  const used = new Set();

  // 1. Managers pair with the least experienced available agents
  const pool = [...others];
  for (const m of managers) {
    if (pool.length > 0) {
      const junior = pool.shift();
      pairings.push({ agent1: m, agent2: junior });
      used.add(m.id).add(junior.id);
    }
  }

  // 2. Remaining agents pair least-experienced with most-experienced
  const remaining = pool.filter((a) => !used.has(a.id));
  let lo = 0;
  let hi = remaining.length - 1;
  while (lo < hi) {
    pairings.push({ agent1: remaining[lo], agent2: remaining[hi] });
    used.add(remaining[lo].id).add(remaining[hi].id);
    lo++;
    hi--;
  }

  // 3. Any leftover agent goes solo
  for (const a of agents) {
    if (!used.has(a.id)) pairings.push({ agent1: a, agent2: null });
  }

  return pairings;
}