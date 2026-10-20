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

// Tenure options for pickers. "auto" means "calculate from the date added".
export const TENURE_OPTIONS = [
  { value: "auto", label: "Auto (by date)" },
  { value: "one_month", label: "1 Month Agent" },
  { value: "sna", label: "SNA" },
  { value: "rpa", label: "RPA" },
  { value: "tenured", label: "Tenured Agent" },
  { value: "manager", label: "Manager" },
];

// Months in the system needed to reach each tier.
const TENURE_STEPS = [
  { months: 0, role: "one_month" },
  { months: 1, role: "sna" },
  { months: 4, role: "rpa" },
  { months: 6, role: "tenured" },
];

// Whole months elapsed since a date.
function monthsSince(date, now) {
  const start = date ? new Date(date) : null;
  if (!start || Number.isNaN(start.getTime())) return 0;
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) months -= 1;
  return Math.max(0, months);
}

// Tenure tier implied by how long ago the agent was added.
export function tenureFromDate(createdDate, now = new Date()) {
  const months = monthsSince(createdDate, now);
  let role = "one_month";
  for (const step of TENURE_STEPS) {
    if (months >= step.months) role = step.role;
  }
  return role;
}

// The tenure actually used for an agent: managers are fixed, a manual role is
// honoured, everything else follows time in the system.
export function effectiveRole(agent, now = new Date()) {
  if (!agent) return "one_month";
  if (agent.role === "manager") return "manager";
  if (agent.manual_role) return agent.role;
  return tenureFromDate(agent.created_date, now);
}

// An agent is on a manager's team when their Team field names that manager.
export function onTeamOf(agent, manager) {
  const team = String(agent?.team || "").trim().toLowerCase();
  return !!team && team === String(manager?.name || "").trim().toLowerCase();
}

export function pairingTypeFor(agent1, agent2) {
  if (!agent2) return "Solo";
  const roles = [effectiveRole(agent1), effectiveRole(agent2)].sort((a, b) => ROLE_ORDER[a] - ROLE_ORDER[b]);
  return `${ROLE_LABELS[roles[0]]} + ${ROLE_LABELS[roles[1]]}`;
}

export function autoAssign(agents) {
  const withRole = agents.map((agent) => ({ agent, role: effectiveRole(agent) }));
  const managers = withRole.filter((x) => x.role === "manager");
  const others = withRole
    .filter((x) => x.role !== "manager")
    .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]);

  const pairings = [];
  const used = new Set();

  // 1a. Managers who have agents on their own team are matched first, so a
  //     manager never loses their own agent to another pairing.
  const pool = [...others];
  const taken = new Set();
  const unpairedManagers = [];
  for (const m of managers) {
    const idx = pool.findIndex((x) => !taken.has(x.agent.id) && onTeamOf(x.agent, m.agent));
    if (idx === -1) {
      unpairedManagers.push(m);
      continue;
    }
    const mate = pool[idx];
    taken.add(mate.agent.id);
    pairings.push({ agent1: m.agent, agent2: mate.agent });
    used.add(m.agent.id).add(mate.agent.id);
  }

  // 1b. The remaining managers take the least experienced agents still free.
  for (const m of unpairedManagers) {
    const idx = pool.findIndex((x) => !taken.has(x.agent.id));
    if (idx === -1) break;
    const mate = pool[idx];
    taken.add(mate.agent.id);
    pairings.push({ agent1: m.agent, agent2: mate.agent });
    used.add(m.agent.id).add(mate.agent.id);
  }

  // 2. Remaining agents pair least-experienced with most-experienced
  const remaining = pool.filter((x) => !taken.has(x.agent.id));
  let lo = 0;
  let hi = remaining.length - 1;
  while (lo < hi) {
    pairings.push({ agent1: remaining[lo].agent, agent2: remaining[hi].agent });
    used.add(remaining[lo].agent.id).add(remaining[hi].agent.id);
    lo++;
    hi--;
  }

  // 3. Any leftover agent goes solo
  for (const a of agents) {
    if (!used.has(a.id)) pairings.push({ agent1: a, agent2: null });
  }

  return pairings;
}