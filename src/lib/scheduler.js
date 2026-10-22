// Pure auto-assign logic for ride-along pairings.
// Roles: 'manager' | 'one_month' | 'sna' | 'rpa' | 'tenured'
// Tenure ladder (least to most experienced): 1 Month Agent -> SNA -> RPA -> Tenured Agent -> Veteran.
// Managers pair with the least experienced agents first; the rest are paired
// least-experienced with most-experienced.

export const ROLE_LABELS = {
  manager: "Manager",
  one_month: "1 Month Agent",
  sna: "SNA",
  rpa: "RPA",
  tenured: "Tenured Agent",
  veteran: "Veteran",
};

export const ROLE_ORDER = { manager: 0, one_month: 1, sna: 2, rpa: 3, tenured: 4, veteran: 5 };

// Ride days a location can run, Monday first to match the week start.
export const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export const DAY_OFFSETS = {
  Monday: 0,
  Tuesday: 1,
  Wednesday: 2,
  Thursday: 3,
  Friday: 4,
  Saturday: 5,
  Sunday: 6,
};

export const DEFAULT_DAYS = ["Tuesday", "Thursday"];

// Day choices for a preferred pairing: "Any" leaves the day open.
export const DAY_OPTIONS = [
  { value: "Any", label: "Any day" },
  ...WEEKDAYS.map((d) => ({ value: d, label: d })),
];

// Tenure options for pickers. "auto" means "calculate from the date added".
export const TENURE_OPTIONS = [
  { value: "auto", label: "Auto (by date)" },
  { value: "one_month", label: "1 Month Agent" },
  { value: "sna", label: "SNA" },
  { value: "rpa", label: "RPA" },
  { value: "tenured", label: "Tenured Agent" },
  { value: "veteran", label: "Veteran" },
  { value: "manager", label: "Manager" },
];

// Months in the system needed to reach each tier.
const TENURE_STEPS = [
  { months: 0, role: "one_month" },
  { months: 1, role: "sna" },
  { months: 4, role: "rpa" },
  { months: 6, role: "tenured" },
  { months: 24, role: "veteran" },
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

// Display form of a name: "BETH WILLIS" becomes "Beth Willis". Short all-caps
// tokens like "AJ" are kept as initials.
export function formatName(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w) => {
      const letters = w.replace(/[^A-Za-z]/g, "");
      if (letters && letters.length <= 3 && letters === letters.toUpperCase()) return w;
      const i = w.search(/[A-Za-z]/);
      if (i === -1) return w;
      return w.slice(0, i) + w[i].toUpperCase() + w.slice(i + 1).toLowerCase();
    })
    .join(" ");
}

// A stable key for an unordered pair of agents, so A+B and B+A match.
export function pairKey(a, b) {
  return [a, b].sort().join("|");
}

export function exclusionKeys(exclusions = []) {
  return new Set((exclusions || []).map((e) => pairKey(e.agent1_id, e.agent2_id)));
}

// Preferred pairings as agent id -> set of the agent ids they ride best with.
export function preferredMap(pairings = []) {
  const map = new Map();
  (pairings || []).forEach((p) => {
    if (!p?.agent1_id || !p?.agent2_id) return;
    if (!map.has(p.agent1_id)) map.set(p.agent1_id, new Set());
    if (!map.has(p.agent2_id)) map.set(p.agent2_id, new Set());
    map.get(p.agent1_id).add(p.agent2_id);
    map.get(p.agent2_id).add(p.agent1_id);
  });
  return map;
}

// Pairs that asked for one specific day, so they stay apart on the other days.
export function offDayKeys(pairings = []) {
  const set = new Set();
  (pairings || []).forEach((p) => {
    if (!p?.agent1_id || !p?.agent2_id) return;
    if (p.day && p.day !== "Any") set.add(pairKey(p.agent1_id, p.agent2_id));
  });
  return set;
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

// Contract date when one is on file, as a timestamp, otherwise null.
function contractTime(agent) {
  const date = agent?.contract_date ? new Date(agent.contract_date) : null;
  return date && !Number.isNaN(date.getTime()) ? date.getTime() : null;
}

// Newest first for picking a manager's own team: agents with a contract date
// lead, most recently contracted first. Agents without one keep the date-added
// order, since a contract date is the better record of who is newest.
function newestFirst(a, b) {
  const ca = contractTime(a);
  const cb = contractTime(b);
  if (ca !== null && cb !== null) return cb - ca;
  if (ca !== null || cb !== null) return ca !== null ? -1 : 1;
  return new Date(b.created_date || 0) - new Date(a.created_date || 0);
}

// Builds the week's pairings for the ride days a location runs.
// `agentsPerManager` is how many agents a manager rides with over the week:
// 1 = the same agent every day, 2 = the newest agent on their team on the first
// ride day and the next newest on the second. A preferred pairing with a
// specific day is only honoured on that day; "Any" counts for every ride day.
// Two agents with a specific-day wish never ride together on the other days.
export function autoAssign(
  agents,
  agentsPerManager = 1,
  exclusions = [],
  preferred = [],
  days = DEFAULT_DAYS
) {
  const dayList = days?.length ? days : DEFAULT_DAYS;
  const count = Math.min(agentsPerManager === 2 ? 2 : 1, dayList.length);
  const blocked = exclusionKeys(exclusions);
  const isBlocked = (aId, bId) => blocked.has(pairKey(aId, bId));
  const wishes = preferredMap(preferred);
  const prefers = (aId, bId) => !!wishes.get(aId)?.has(bId);
  const dayLocked = offDayKeys(preferred);
  const isDayLocked = (aId, bId) => dayLocked.has(pairKey(aId, bId));
  const withRole = agents.map((agent) => ({ agent, role: effectiveRole(agent) }));
  const managers = withRole.filter((x) => x.role === "manager");
  const others = withRole
    .filter((x) => x.role !== "manager")
    .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]);
  const byId = new Map(agents.map((a) => [a.id, a]));
  const otherIds = new Set(others.map((x) => x.agent.id));

  const out = {};
  const free = {};
  dayList.forEach((d) => {
    out[d] = [];
    free[d] = new Set(agents.map((a) => a.id));
  });
  const take = (id) => dayList.forEach((d) => free[d].delete(id));
  const freeEveryDay = (id) => dayList.every((d) => free[d].has(id));
  const rideEveryDay = (pair) =>
    dayList.forEach((d) => out[d].push({ agent1: pair.agent1, agent2: pair.agent2 }));

  // 1. Preferred pairings come first: whenever both agents are free on the days
  //    the pairing asked for and are not excluded, they ride together then.
  for (const wish of preferred || []) {
    if (!wish?.agent1_id || !wish?.agent2_id) continue;
    const a1 = byId.get(wish.agent1_id);
    const a2 = byId.get(wish.agent2_id);
    if (!a1 || !a2 || !otherIds.has(a1.id) || !otherIds.has(a2.id)) continue;
    if (isBlocked(a1.id, a2.id)) continue;
    const applyDays = (wish.day && wish.day !== "Any" ? [wish.day] : dayList).filter(
      (d) => out[d]
    );
    if (applyDays.length === 0) continue;
    if (!applyDays.every((d) => free[d].has(a1.id) && free[d].has(a2.id))) continue;
    applyDays.forEach((d) => {
      free[d].delete(a1.id);
      free[d].delete(a2.id);
      out[d].push({ agent1: a1, agent2: a2 });
    });
  }

  // 2a. Each manager takes their own team's newest agents first — by contract
  //     date when one is on file, otherwise the date they were added — so a
  //     manager never loses their own agent to another pairing.
  const picked = new Map();
  for (const m of managers) {
    const mates = [];
    const team = others
      .filter(
        (x) =>
          freeEveryDay(x.agent.id) &&
          onTeamOf(x.agent, m.agent) &&
          !isBlocked(x.agent.id, m.agent.id) &&
          !isDayLocked(x.agent.id, m.agent.id)
      )
      .sort(
        (a, b) =>
          Number(prefers(m.agent.id, b.agent.id)) - Number(prefers(m.agent.id, a.agent.id)) ||
          newestFirst(a.agent, b.agent)
      );
    for (const c of team) {
      if (mates.length >= count) break;
      take(c.agent.id);
      mates.push(c.agent);
    }
    picked.set(m.agent.id, mates);
  }

  // 2b. Fill any open slots from the least experienced agents still free.
  for (const m of managers) {
    const mates = picked.get(m.agent.id);
    // A preferred partner is taken before the usual least-experienced fill.
    const candidates = [...others].sort(
      (a, b) => Number(prefers(m.agent.id, b.agent.id)) - Number(prefers(m.agent.id, a.agent.id))
    );
    for (const c of candidates) {
      if (mates.length >= count) break;
      if (!freeEveryDay(c.agent.id)) continue;
      if (isBlocked(c.agent.id, m.agent.id)) continue;
      if (isDayLocked(c.agent.id, m.agent.id)) continue;
      take(c.agent.id);
      mates.push(c.agent);
    }
    if (mates.length === 0) continue;
    take(m.agent.id);
    dayList.forEach((d, i) => out[d].push({ agent1: m.agent, agent2: mates[i] || mates[0] }));
  }

  // 3. Remaining agents pair least-experienced with most-experienced. An
  //    excluded pair is skipped and the least experienced agent looks further
  //    down the list for a partner instead.
  const rest = others.filter((x) => freeEveryDay(x.agent.id));
  while (rest.length > 1) {
    const first = rest.shift();
    let pick = -1;
    for (let i = rest.length - 1; i >= 0; i--) {
      if (isBlocked(first.agent.id, rest[i].agent.id)) continue;
      if (isDayLocked(first.agent.id, rest[i].agent.id)) continue;
      pick = i;
      break;
    }
    if (pick === -1) {
      rideEveryDay({ agent1: first.agent, agent2: null });
      take(first.agent.id);
      continue;
    }
    const second = rest.splice(pick, 1)[0];
    rideEveryDay({ agent1: first.agent, agent2: second.agent });
    take(first.agent.id);
    take(second.agent.id);
  }

  // 4. Anyone still free on every ride day rides solo. Agents a day-specific
  //    pairing left free on the other days are placed for those days only.
  agents
    .filter((a) => freeEveryDay(a.id))
    .forEach((a) => {
      rideEveryDay({ agent1: a, agent2: null });
      take(a.id);
    });

  for (const day of dayList) {
    const remaining = others.filter((x) => free[day].has(x.agent.id));
    while (remaining.length > 1) {
      const first = remaining.shift();
      let pick = -1;
      for (let i = remaining.length - 1; i >= 0; i--) {
        if (isBlocked(first.agent.id, remaining[i].agent.id)) continue;
        if (isDayLocked(first.agent.id, remaining[i].agent.id)) continue;
        pick = i;
        break;
      }
      if (pick === -1) {
        out[day].push({ agent1: first.agent, agent2: null });
        continue;
      }
      const second = remaining.splice(pick, 1)[0];
      out[day].push({ agent1: first.agent, agent2: second.agent });
    }
    remaining.forEach((x) => out[day].push({ agent1: x.agent, agent2: null }));
  }

  return out;
}