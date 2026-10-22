// Pure auto-assign logic for ride-along pairings.
// Roles: 'fm' | 'fd' | 'ad' | 'am' (managers) | 'one_month' | 'sna' | 'rpa' | 'tenured' | 'veteran'
// Tenure ladder (least to most experienced): 1 Month Agent -> SNA -> RPA -> Tenured Agent -> Veteran.
// Managers ride with the newest agents — their own team's first — before anyone
// else; the rest are paired least-experienced with most-experienced. A 1 Month,
// SNA or RPA agent is never left riding alone while another agent is still free.

export const ROLE_LABELS = {
  manager: "Manager",
  fm: "FM",
  fd: "FD",
  ad: "AD",
  am: "AM",
  one_month: "1 Month Agent",
  sna: "SNA",
  rpa: "RPA",
  tenured: "Tenured Agent",
  veteran: "Veteran",
};

export const ROLE_ORDER = {
  manager: 0,
  fm: 1,
  fd: 2,
  ad: 3,
  am: 4,
  one_month: 5,
  sna: 6,
  rpa: 7,
  tenured: 8,
  veteran: 9,
};

// The manager types. They all ride with the least experienced agents and take
// their own team's agents before anyone else. "manager" stays for rosters set
// up before the four types existed.
export const MANAGER_ROLES = ["manager", "fm", "fd", "ad", "am"];

export function isManagerRole(role) {
  return MANAGER_ROLES.includes(role);
}

// Tiers that must always ride with a partner when one is available: a 1 Month,
// SNA or RPA agent is never left riding alone.
const NEW_TIER_ROLES = ["one_month", "sna", "rpa"];

export function needsPartner(role) {
  return NEW_TIER_ROLES.includes(role);
}

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

// Tenure options for pickers. "auto" means "calculate from the contract date".
export const TENURE_OPTIONS = [
  { value: "auto", label: "Auto (by contract date)" },
  { value: "fm", label: "FM" },
  { value: "fd", label: "FD" },
  { value: "ad", label: "AD" },
  { value: "am", label: "AM" },
  { value: "one_month", label: "1 Month Agent" },
  { value: "sna", label: "SNA" },
  { value: "rpa", label: "RPA" },
  { value: "tenured", label: "Tenured Agent" },
  { value: "veteran", label: "Veteran" },
];

// Whole months since the contract date needed to reach each tier: under a month
// is a 1 Month Agent, then SNA at one month, RPA at four, Tenured Agent at six
// and Veteran at a year.
const TENURE_STEPS = [
  { months: 0, role: "one_month" },
  { months: 1, role: "sna" },
  { months: 4, role: "rpa" },
  { months: 6, role: "tenured" },
  { months: 12, role: "veteran" },
];

// Whole months elapsed since a date.
function monthsSince(date, now) {
  const start = date ? new Date(date) : null;
  if (!start || Number.isNaN(start.getTime())) return 0;
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) months -= 1;
  return Math.max(0, months);
}

// Tenure tier implied by how long ago a date is, counted in whole months.
export function tenureFromDate(date, now = new Date()) {
  const months = monthsSince(date, now);
  let role = "one_month";
  for (const step of TENURE_STEPS) {
    if (months >= step.months) role = step.role;
  }
  return role;
}

// The tenure actually used for an agent. Managers keep their type, a contract
// date sets the tier from how long ago it was, and without one a manually
// chosen tier is honoured, otherwise the date the agent was added counts.
export function effectiveRole(agent, now = new Date()) {
  if (!agent) return "one_month";
  if (isManagerRole(agent.role)) return agent.role;
  if (agent.contract_date) return tenureFromDate(agent.contract_date, now);
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

// Team name of an agent, normalised for comparison ("" when none is set).
function teamOf(agent) {
  return String(agent?.team || "").trim().toLowerCase();
}

// Two agents are team mates when both name the same team.
function sameTeam(a, b) {
  const team = teamOf(a);
  return !!team && team === teamOf(b);
}

// Partner for `first` out of `list`: a team mate wins over anyone on another
// team, then the most experienced agent is chosen, skipping excluded pairs.
// Returns the index in `list`, or -1 when nobody can ride with them.
function pickPartner(first, list, isBlocked, isDayLocked) {
  for (const wantTeam of [true, false]) {
    for (let i = list.length - 1; i >= 0; i--) {
      const other = list[i];
      if (isBlocked(first.agent.id, other.agent.id)) continue;
      if (isDayLocked(first.agent.id, other.agent.id)) continue;
      if (wantTeam !== sameTeam(first.agent, other.agent)) continue;
      return i;
    }
  }
  return -1;
}

// Builds the week's pairings for the ride days a location runs.
// A manager rides with a different new agent on each ride day when their team
// has more than one (1 Month, SNA or RPA); with a single new agent, or none,
// they keep that one partner and the team's more experienced agents ride
// together. A preferred pairing with a specific day is only honoured on that
// day; "Any" counts for every ride day. Two agents with a specific-day wish
// never ride together on the other days.
export function autoAssign(agents, exclusions = [], preferred = [], days = DEFAULT_DAYS) {
  const dayList = days?.length ? days : DEFAULT_DAYS;
  const blocked = exclusionKeys(exclusions);
  const isBlocked = (aId, bId) => blocked.has(pairKey(aId, bId));
  const wishes = preferredMap(preferred);
  const prefers = (aId, bId) => !!wishes.get(aId)?.has(bId);
  const dayLocked = offDayKeys(preferred);
  const isDayLocked = (aId, bId) => dayLocked.has(pairKey(aId, bId));
  const withRole = agents.map((agent) => ({ agent, role: effectiveRole(agent) }));
  const managers = withRole.filter((x) => isManagerRole(x.role));
  const others = withRole
    .filter((x) => !isManagerRole(x.role))
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
  // With an odd number of agents left over, one has to ride alone. That is
  // never a 1 Month, SNA or RPA agent: the most experienced one sits out
  // instead, so the new agents keep their partner. Returns that agent, or null
  // when only new agents are left and one of them has to.
  const sitOut = (list) => {
    if (list.length % 2 === 0) return null;
    for (let i = list.length - 1; i >= 0; i--) {
      if (needsPartner(list[i].role)) continue;
      return list.splice(i, 1)[0];
    }
    return null;
  };

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

  // 2a. Each manager takes their own team's new agents first — 1 Month, SNA and
  //     RPA — so a manager never loses their own new agent to another pairing,
  //     and more than one of them means a different one each ride day. Within a
  //     tier the newest leads: by contract date when one is on file, otherwise
  //     the date they were added, which is the same "newest" the rest of the app
  //     uses. The team's more experienced agents are left to ride together.
  const picked = new Map();
  for (const m of managers) {
    const team = others
      .filter(
        (x) =>
          needsPartner(x.role) &&
          freeEveryDay(x.agent.id) &&
          onTeamOf(x.agent, m.agent) &&
          !isBlocked(x.agent.id, m.agent.id) &&
          !isDayLocked(x.agent.id, m.agent.id)
      )
      .sort(
        (a, b) =>
          Number(prefers(m.agent.id, b.agent.id)) - Number(prefers(m.agent.id, a.agent.id)) ||
          newestFirst(a.agent, b.agent) ||
          ROLE_ORDER[a.role] - ROLE_ORDER[b.role] ||
          a.agent.name.localeCompare(b.agent.name)
      );
    const slots = Math.min(team.length > 1 ? 2 : 1, dayList.length);
    const mates = [];
    for (const c of team) {
      if (mates.length >= slots) break;
      take(c.agent.id);
      mates.push(c.agent);
    }
    picked.set(m.agent.id, { mates, slots });
  }

  // 2b. Fill any open slots with the newest agents still free: a new agent — a
  //     1 Month, SNA or RPA — leads ahead of an experienced one wherever they
  //     are, then the manager's own team, then the most recently contracted, so
  //     the newest agents are the ones who ride with a manager. A preferred
  //     partner is taken before all of that.
  for (const m of managers) {
    const { mates, slots } = picked.get(m.agent.id);
    const candidates = [...others].sort(
      (a, b) =>
        Number(prefers(m.agent.id, b.agent.id)) - Number(prefers(m.agent.id, a.agent.id)) ||
        Number(needsPartner(b.role)) - Number(needsPartner(a.role)) ||
        Number(onTeamOf(b.agent, m.agent)) - Number(onTeamOf(a.agent, m.agent)) ||
        newestFirst(a.agent, b.agent) ||
        ROLE_ORDER[a.role] - ROLE_ORDER[b.role] ||
        a.agent.name.localeCompare(b.agent.name)
    );
    for (const c of candidates) {
      if (mates.length >= slots) break;
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

  // 3. The agents a manager left behind ride with their own team first, the most
  //    experienced of a team together, so an outsider cannot split them. Whoever
  //    is left pairs least-experienced with most-experienced, keeping team mates
  //    together: an agent on the same team is preferred over one on a different
  //    team. An excluded pair is skipped and the least experienced agent looks
  //    further down the list for a partner instead. An odd number left means one
  //    agent sits the week out, and that is never a 1 Month, SNA or RPA agent.
  const rest = others.filter((x) => freeEveryDay(x.agent.id));
  for (let i = rest.length - 1; i >= 0; i--) {
    if (!rest[i]) continue;
    let pick = -1;
    for (let j = i - 1; j >= 0; j--) {
      const o = rest[j];
      if (!o) continue;
      if (!sameTeam(rest[i].agent, o.agent)) continue;
      if (isBlocked(rest[i].agent.id, o.agent.id)) continue;
      if (isDayLocked(rest[i].agent.id, o.agent.id)) continue;
      pick = j;
      break;
    }
    if (pick === -1) continue;
    const first = rest[i];
    const second = rest[pick];
    rest[i] = null;
    rest[pick] = null;
    rideEveryDay({ agent1: first.agent, agent2: second.agent });
    take(first.agent.id);
    take(second.agent.id);
  }
  const leftOver = rest.filter(Boolean);
  const sittingOut = sitOut(leftOver);
  if (sittingOut) {
    rideEveryDay({ agent1: sittingOut.agent, agent2: null });
    take(sittingOut.agent.id);
  }
  while (leftOver.length > 1) {
    const first = leftOver.shift();
    const pick = pickPartner(first, leftOver, isBlocked, isDayLocked);
    if (pick === -1) {
      rideEveryDay({ agent1: first.agent, agent2: null });
      take(first.agent.id);
      continue;
    }
    const second = leftOver.splice(pick, 1)[0];
    rideEveryDay({ agent1: first.agent, agent2: second.agent });
    take(first.agent.id);
    take(second.agent.id);
  }

  // 4. Anyone still free on every ride day rides solo — with the new agents
  //    paired first, only a manager or an experienced agent is left here.
  //    Agents a day-specific pairing left free on the other days are placed for
  //    those days only.
  agents
    .filter((a) => freeEveryDay(a.id))
    .forEach((a) => {
      rideEveryDay({ agent1: a, agent2: null });
      take(a.id);
    });

  for (const day of dayList) {
    const remaining = others.filter((x) => free[day].has(x.agent.id));
    const daySittingOut = sitOut(remaining);
    if (daySittingOut) out[day].push({ agent1: daySittingOut.agent, agent2: null });
    while (remaining.length > 1) {
      const first = remaining.shift();
      const pick = pickPartner(first, remaining, isBlocked, isDayLocked);
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