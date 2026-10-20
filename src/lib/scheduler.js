// Pure auto-assign logic for ride-along pairings.
// Roles: 'manager' | 'new' | 'tenured'
// Priority: managers pair with new agents first, then remaining new with tenured,
// then leftover managers with tenured, then tenured with tenured, then solo.

export const ROLE_LABELS = {
  manager: "Manager",
  new: "New Agent",
  tenured: "Tenured Agent",
};

export const ROLE_ORDER = { manager: 0, new: 1, tenured: 2 };

export const PAIRING_TYPE_LABELS = {
  "manager-new": "Manager + New",
  "new-tenured": "New + Tenured",
  "manager-tenured": "Manager + Tenured",
  "tenured-tenured": "Tenured + Tenured",
  "new-new": "New + New",
  solo: "Solo",
};

export function pairingTypeFor(agent1, agent2) {
  if (!agent2) return "solo";
  const roles = [agent1.role, agent2.role].sort((a, b) => ROLE_ORDER[a] - ROLE_ORDER[b]);
  const key = roles.join("-");
  return PAIRING_TYPE_LABELS[key] ? key : "custom";
}

export function autoAssign(agents) {
  const managers = agents.filter((a) => a.role === "manager");
  const newAgents = agents.filter((a) => a.role === "new");
  const tenured = agents.filter((a) => a.role === "tenured");

  const pairings = [];
  const used = new Set();

  // 1. Managers pair with new agents (priority)
  const remainingNew = [...newAgents];
  for (const m of managers) {
    if (remainingNew.length > 0) {
      const n = remainingNew.shift();
      pairings.push({ agent1: m, agent2: n });
      used.add(m.id).add(n.id);
    }
  }

  // 2. Remaining new agents pair with tenured
  const remainingTenured = [...tenured];
  while (remainingNew.length > 0 && remainingTenured.length > 0) {
    const n = remainingNew.shift();
    const t = remainingTenured.shift();
    pairings.push({ agent1: n, agent2: t });
    used.add(n.id).add(t.id);
  }

  // 3. Leftover managers pair with remaining tenured
  const leftoverManagers = managers.filter((m) => !used.has(m.id));
  for (const m of leftoverManagers) {
    if (remainingTenured.length > 0) {
      const t = remainingTenured.shift();
      pairings.push({ agent1: m, agent2: t });
      used.add(t.id);
    }
  }

  // 4. Remaining tenured pair with tenured
  while (remainingTenured.length >= 2) {
    const t1 = remainingTenured.shift();
    const t2 = remainingTenured.shift();
    pairings.push({ agent1: t1, agent2: t2 });
  }

  // 5. Any leftover agent goes solo
  const leftover = [
    ...managers.filter((m) => !used.has(m.id)),
    ...remainingNew,
    ...remainingTenured,
  ];
  for (const a of leftover) {
    pairings.push({ agent1: a, agent2: null });
  }

  return pairings;
}