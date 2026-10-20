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

// Builds the week's pairings. `agentsPerManager` is how many agents a manager
// rides with over the week: 1 = the same agent both days, 2 = the newest agent
// on their team on Tuesday and the next newest on Thursday.
export function autoAssign(agents, agentsPerManager = 1) {
  const count = agentsPerManager === 2 ? 2 : 1;
  const withRole = agents.map((agent) => ({ agent, role: effectiveRole(agent) }));
  const managers = withRole.filter((x) => x.role === "manager");
  const others = withRole
    .filter((x) => x.role !== "manager")
    .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]);

  const taken = new Set();
  const tuesday = [];
  const thursday = [];

  // 1a. Each manager takes their own team's newest agents first, so a manager
  //     never loses their own agent to another pairing.
  const picked = new Map();
  for (const m of managers) {
    const mates = [];
    const team = others
      .filter((x) => !taken.has(x.agent.id) && onTeamOf(x.agent, m.agent))
      .sort((a, b) => new Date(b.agent.created_date) - new Date(a.agent.created_date));
    for (const c of team) {
      if (mates.length >= count) break;
      taken.add(c.agent.id);
      mates.push(c.agent);
    }
    picked.set(m.agent.id, mates);
  }

  // 1b. Fill any open slots from the least experienced agents still free.
  for (const m of managers) {
    const mates = picked.get(m.agent.id);
    for (const c of others) {
      if (mates.length >= count) break;
      if (taken.has(c.agent.id)) continue;
      taken.add(c.agent.id);
      mates.push(c.agent);
    }
    if (mates.length === 0) continue;
    taken.add(m.agent.id);
    tuesday.push({ agent1: m.agent, agent2: mates[0] });
    thursday.push({ agent1: m.agent, agent2: mates[1] || mates[0] });
  }

  // 2. Remaining agents pair least-experienced with most-experienced
  const remaining = others.filter((x) => !taken.has(x.agent.id));
  let lo = 0;
  let hi = remaining.length - 1;
  while (lo < hi) {
    const a1 = remaining[lo].agent;
    const a2 = remaining[hi].agent;
    tuesday.push({ agent1: a1, agent2: a2 });
    thursday.push({ agent1: a1, agent2: a2 });
    taken.add(a1.id).add(a2.id);
    lo++;
    hi--;
  }

  // 3. Any leftover agent goes solo
  for (const a of agents) {
    if (taken.has(a.id)) continue;
    tuesday.push({ agent1: a, agent2: null });
    thursday.push({ agent1: a, agent2: null });
  }

  return { Tuesday: tuesday, Thursday: thursday };
}