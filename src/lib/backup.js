import { base44 } from "@/api/base44Client";

// Export / restore of everything the app stores, so a copy of the app can pick
// up where this one left off. Pairings point at agents by name in the file,
// because record ids do not survive a move to another app.

const AGENT_FIELDS = [
  "name",
  "role",
  "manual_role",
  "team",
  "location",
  "contract_date",
  "fa",
  "active",
];

async function rows(entity) {
  const res = await entity.list();
  return Array.isArray(res) ? res : res?.items || [];
}

function key(name) {
  return String(name || "").trim().toLowerCase();
}

export async function buildBackup() {
  const [agents, locations, pairings, preferred, exclusions] = await Promise.all([
    rows(base44.entities.Agent),
    rows(base44.entities.Location),
    rows(base44.entities.Pairing),
    rows(base44.entities.PreferredPairing),
    rows(base44.entities.Exclusion),
  ]);
  const nameById = new Map(agents.map((a) => [a.id, a.name]));

  return {
    app: "Schedule Creator",
    exported_at: new Date().toISOString(),
    agents: agents.map((a) =>
      Object.fromEntries(AGENT_FIELDS.map((f) => [f, a[f] ?? null]))
    ),
    locations: locations.map((l) => ({ name: l.name, days: l.days || [] })),
    pairings: pairings
      .filter((p) => nameById.has(p.agent1_id))
      .map((p) => ({
        week_start: p.week_start,
        day: p.day,
        agent1: nameById.get(p.agent1_id),
        agent2: nameById.get(p.agent2_id) || null,
        sort_order: p.sort_order ?? 0,
      })),
    preferred: preferred
      .filter((p) => nameById.has(p.agent1_id) && nameById.has(p.agent2_id))
      .map((p) => ({
        agent1: nameById.get(p.agent1_id),
        agent2: nameById.get(p.agent2_id),
        day: p.day || "Any",
      })),
    exclusions: exclusions
      .filter((e) => nameById.has(e.agent1_id) && nameById.has(e.agent2_id))
      .map((e) => ({
        agent1: nameById.get(e.agent1_id),
        agent2: nameById.get(e.agent2_id),
      })),
  };
}

export function agentsToCsv(agents) {
  const head = AGENT_FIELDS.join(",");
  const line = (a) =>
    AGENT_FIELDS.map((f) => {
      const v = a[f];
      if (v === null || v === undefined) return "";
      return String(v).includes(",") ? `"${String(v).replace(/"/g, '""')}"` : String(v);
    }).join(",");
  return [head, ...agents.map(line)].join("\n");
}

export function downloadFile(name, content, type = "application/json") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

// Restores a backup file into this app. Agents are matched by name (and
// location when it is set) so an existing roster is not duplicated, and any
// agent the file has that this app does not is created.
export async function restoreBackup(data) {
  const summary = { agents: 0, locations: 0, pairings: 0, preferred: 0, exclusions: 0 };

  const existingAgents = await rows(base44.entities.Agent);
  const byName = new Map(existingAgents.map((a) => [key(a.name), a.id]));

  const newAgents = (data.agents || []).filter((a) => a?.name && !byName.has(key(a.name)));
  if (newAgents.length > 0) {
    const created = await base44.entities.Agent.bulkCreate(
      newAgents.map((a) => ({
        ...Object.fromEntries(
          AGENT_FIELDS.filter((f) => a[f] !== null && a[f] !== undefined && a[f] !== "").map((f) => [
            f,
            a[f],
          ])
        ),
        active: a.active ?? true,
      }))
    );
    const list = Array.isArray(created) ? created : created?.items || [];
    list.forEach((a) => byName.set(key(a.name), a.id));
    summary.agents = list.length;
  }

  const existingLocations = await rows(base44.entities.Location);
  const locationNames = new Set(existingLocations.map((l) => key(l.name)));
  const newLocations = (data.locations || []).filter((l) => l?.name && !locationNames.has(key(l.name)));
  if (newLocations.length > 0) {
    await base44.entities.Location.bulkCreate(
      newLocations.map((l) => ({ name: l.name, days: l.days?.length ? l.days : undefined }))
    );
    summary.locations = newLocations.length;
  }

  const idFor = (name) => byName.get(key(name)) || null;

  const existingPairings = await rows(base44.entities.Pairing);
  const pairingKeys = new Set(
    existingPairings.map((p) => `${p.week_start}|${p.day}|${p.agent1_id}|${p.agent2_id || ""}`)
  );
  const pairings = [];
  (data.pairings || []).forEach((p) => {
    const a1 = idFor(p.agent1);
    if (!a1 || !p.week_start || !p.day) return;
    const a2 = idFor(p.agent2);
    const k = `${p.week_start}|${p.day}|${a1}|${a2 || ""}`;
    if (pairingKeys.has(k)) return;
    pairingKeys.add(k);
    pairings.push({
      week_start: p.week_start,
      day: p.day,
      agent1_id: a1,
      agent2_id: a2,
      sort_order: p.sort_order ?? 0,
    });
  });
  if (pairings.length > 0) {
    await base44.entities.Pairing.bulkCreate(pairings);
    summary.pairings = pairings.length;
  }

  const existingPreferred = await rows(base44.entities.PreferredPairing);
  const preferredKeys = new Set(
    existingPreferred.map((p) => `${p.agent1_id}|${p.agent2_id}|${p.day || "Any"}`)
  );
  const preferred = [];
  (data.preferred || []).forEach((p) => {
    const a1 = idFor(p.agent1);
    const a2 = idFor(p.agent2);
    if (!a1 || !a2) return;
    const k = `${a1}|${a2}|${p.day || "Any"}`;
    if (preferredKeys.has(k)) return;
    preferredKeys.add(k);
    preferred.push({ agent1_id: a1, agent2_id: a2, day: p.day || "Any" });
  });
  if (preferred.length > 0) {
    await base44.entities.PreferredPairing.bulkCreate(preferred);
    summary.preferred = preferred.length;
  }

  const existingExclusions = await rows(base44.entities.Exclusion);
  const exclusionKeys = new Set(existingExclusions.map((e) => `${e.agent1_id}|${e.agent2_id}`));
  const exclusions = [];
  (data.exclusions || []).forEach((e) => {
    const a1 = idFor(e.agent1);
    const a2 = idFor(e.agent2);
    if (!a1 || !a2) return;
    const k = `${a1}|${a2}`;
    if (exclusionKeys.has(k)) return;
    exclusionKeys.add(k);
    exclusions.push({ agent1_id: a1, agent2_id: a2 });
  });
  if (exclusions.length > 0) {
    await base44.entities.Exclusion.bulkCreate(exclusions);
    summary.exclusions = exclusions.length;
  }

  return summary;
}