import { useEffect, useState } from "react";
import { addDays, addWeeks, format, startOfWeek } from "date-fns";
import { Sparkles, Save, ChevronLeft, ChevronRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { autoAssign, DAY_OFFSETS, DEFAULT_DAYS, ROLE_ORDER, effectiveRole } from "@/lib/scheduler";
import ScheduleTable from "@/components/schedule/ScheduleTable";
import LocationPicker from "@/components/LocationPicker";

const emptyByDay = (days) => Object.fromEntries(days.map((d) => [d, []]));

function nextId() {
  return `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export default function Schedule() {
  const [agents, setAgents] = useState([]);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [schedule, setSchedule] = useState({});
  const [dirty, setDirty] = useState(false);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exclusions, setExclusions] = useState([]);
  const [preferred, setPreferred] = useState([]);
  const [locations, setLocations] = useState([]);
  const [location, setLocation] = useState("");

  const weekKey = format(weekStart, "yyyy-MM-dd");

  // Ride days come from the location's admin settings, Monday first.
  const locationRecord = locations.find((l) => l.name === location) || null;
  const days = (locationRecord?.days?.length ? [...locationRecord.days] : DEFAULT_DAYS).sort(
    (a, b) => DAY_OFFSETS[a] - DAY_OFFSETS[b]
  );
  const daysKey = days.join("|");

  const loadAgents = async () => {
    setLoadingAgents(true);
    try {
      const res = await base44.entities.Agent.filter({ active: true }, { sort: "name" });
      setAgents(res.items || []);
    } finally {
      setLoadingAgents(false);
    }
  };

  const agentsAtLocation = agents.filter((a) => (a.location || "") === location);
  const locationAgentIds = agentsAtLocation.map((a) => a.id);

  const loadSchedule = async () => {
    if (!location) {
      setSchedule({});
      setDirty(false);
      return;
    }
    setLoadingSchedule(true);
    try {
      const res = await base44.entities.Pairing.filter(
        {
          week_start: weekKey,
          $or: [
            { agent1_id: { $in: locationAgentIds } },
            { agent2_id: { $in: locationAgentIds } },
          ],
        },
        { sort: "sort_order" }
      );
      const items = res.items || [];
      const byDay = emptyByDay(days);
      items.forEach((p) => {
        if (byDay[p.day]) {
          byDay[p.day].push({
            id: p.id,
            agent1Id: p.agent1_id,
            agent2Id: p.agent2_id ?? null,
            saved: true,
          });
        }
      });
      setSchedule(byDay);
      setDirty(false);
    } finally {
      setLoadingSchedule(false);
    }
  };

  useEffect(() => {
    loadAgents();
    base44.entities.Location.filter({}, { sort: "name" }).then((res) => {
      const items = res.items || [];
      setLocations(items);
      setLocation((cur) => cur || items[0]?.name || "");
    });
    base44.entities.Exclusion.list().then((rows) =>
      setExclusions(Array.isArray(rows) ? rows : rows?.items || [])
    );
    base44.entities.PreferredPairing.list().then((rows) =>
      setPreferred(Array.isArray(rows) ? rows : rows?.items || [])
    );
  }, []);

  useEffect(() => {
    if (loadingAgents) return;
    loadSchedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekKey, location, agents, daysKey]);

  const dateFor = (day) => addDays(weekStart, DAY_OFFSETS[day] ?? 0);

  // Auto-assign fills in around anything already placed: existing pairings are
  // kept as-is and only the agents still free that day are auto-paired.
  const runAutoAssign = () => {
    setSchedule((s) => {
      const next = emptyByDay(days);
      days.forEach((day) => {
        const locked = (s[day] || []).filter((p) => p.agent1Id);
        const lockedIds = new Set();
        locked.forEach((p) => {
          lockedIds.add(p.agent1Id);
          if (p.agent2Id) lockedIds.add(p.agent2Id);
        });
        const free = agentsAtLocation.filter((a) => !lockedIds.has(a.id));
        const result = autoAssign(free, exclusions, preferred, days);
        const auto = (result[day] || []).map((p) => ({
          id: nextId(),
          agent1Id: p.agent1?.id ?? null,
          agent2Id: p.agent2?.id ?? null,
          saved: false,
        }));
        next[day] = [...locked, ...auto];
      });
      return next;
    });
    setDirty(true);
  };

  const clearDay = (day) => {
    setSchedule((s) => ({ ...s, [day]: [] }));
    setDirty(true);
  };

  // Set an agent's partner for a day. The partner is taken out of any other
  // pairing that day so nobody is booked twice.
  const setPartner = (day, agentId, partnerId) => {
    setSchedule((s) => {
      const list = s[day] || [];
      const mine = list.find((p) => p.agent1Id === agentId || p.agent2Id === agentId);
      if (!mine && !partnerId) return s;
      const next = list.filter(
        (p) => p !== mine && (!partnerId || (p.agent1Id !== partnerId && p.agent2Id !== partnerId))
      );
      next.push({ id: mine?.id || nextId(), agent1Id: agentId, agent2Id: partnerId || null, saved: false });
      return { ...s, [day]: next };
    });
    setDirty(true);
  };

  const agentById = (id) => agentsAtLocation.find((a) => a.id === id) || null;

  const partnerIdFor = (day, agentId) => {
    const p = (schedule[day] || []).find((x) => x.agent1Id === agentId || x.agent2Id === agentId);
    if (!p) return null;
    return p.agent1Id === agentId ? p.agent2Id : p.agent1Id;
  };

  // Everyone already placed on a given day, so they can be hidden from the picker
  const assignedIdsFor = (day) => {
    const ids = new Set();
    (schedule[day] || []).forEach((p) => {
      if (p.agent1Id) ids.add(p.agent1Id);
      if (p.agent2Id) ids.add(p.agent2Id);
    });
    return ids;
  };

  const sortedAgents = [...agentsAtLocation].sort((a, b) => {
    const rank = ROLE_ORDER[effectiveRole(a)] - ROLE_ORDER[effectiveRole(b)];
    return rank !== 0 ? rank : a.name.localeCompare(b.name);
  });

  const dayColumns = days.map((day) => ({ key: day, date: format(dateFor(day), "MMM d") }));

  const save = async () => {
    setSaving(true);
    try {
      // Replace this location's pairings for the week, leaving other locations alone
      const ids = locationAgentIds;
      const existing = await base44.entities.Pairing.filter({ week_start: weekKey });
      const existingRows = Array.isArray(existing) ? existing : existing?.items || [];
      const mine = existingRows.filter(
        (p) => ids.includes(p.agent1_id) || ids.includes(p.agent2_id)
      );
      if (mine.length > 0) {
        await base44.entities.Pairing.deleteMany({ id: { $in: mine.map((p) => p.id) } });
      }
      const records = [];
      days.forEach((day) => {
        (schedule[day] || []).forEach((p, idx) => {
          if (!p.agent1Id) return;
          records.push({
            week_start: weekKey,
            day,
            agent1_id: p.agent1Id,
            agent2_id: p.agent2Id ?? null,
            sort_order: idx,
          });
        });
      });
      if (records.length > 0) {
        await base44.entities.Pairing.bulkCreate(records);
      }
      await loadSchedule();
    } finally {
      setSaving(false);
    }
  };

  const busy = loadingAgents || loadingSchedule;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-[#111111]">Schedule Creator</h1>
          <p className="mt-1 text-sm text-gray-500">
            Week of {format(weekStart, "MMM d")} · {location || "No location selected"} ·{" "}
            {agentsAtLocation.length} active agents
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-md border border-gray-200 bg-white">
            <button
              onClick={() => setWeekStart((d) => addWeeks(d, -1))}
              className="rounded-l-md p-2 text-gray-500 hover:bg-gray-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 text-sm font-medium text-[#111111]">{format(weekStart, "MMM d, yyyy")}</span>
            <button
              onClick={() => setWeekStart((d) => addWeeks(d, 1))}
              className="rounded-r-md p-2 text-gray-500 hover:bg-gray-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={runAutoAssign}
            disabled={busy || !location || agentsAtLocation.length === 0 || days.length === 0}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#111111] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#333] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            Auto-assign
          </button>
          <button
            onClick={save}
            disabled={!dirty || saving}
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-[#111111] transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <LocationPicker
        locations={locations}
        value={location}
        onChange={setLocation}
        countLabel={`${agentsAtLocation.length} active agent${agentsAtLocation.length === 1 ? "" : "s"} at this location`}
      />

      <ScheduleTable
        agents={sortedAgents}
        days={dayColumns}
        partnerIdFor={partnerIdFor}
        assignedIdsFor={assignedIdsFor}
        agentById={agentById}
        onSetPartner={setPartner}
        onClear={clearDay}
        busy={busy}
        exclusions={exclusions}
      />
    </div>
  );
}