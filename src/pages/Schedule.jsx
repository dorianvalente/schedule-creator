import { useEffect, useState } from "react";
import { addDays, addWeeks, format, startOfWeek } from "date-fns";
import { Sparkles, Save, ChevronLeft, ChevronRight, Plus, X, UserCircle2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { autoAssign, ROLE_LABELS, pairingTypeFor } from "@/lib/scheduler";

const ROLE_DOT = {
  manager: "bg-[#111111]",
  one_month: "bg-amber-400",
  sna: "bg-sky-400",
  rpa: "bg-violet-400",
  tenured: "bg-emerald-400",
};

const DAY_OFFSETS = { Tuesday: 1, Thursday: 3 };
const DAYS = ["Tuesday", "Thursday"];

function nextId() {
  return `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export default function Schedule() {
  const [agents, setAgents] = useState([]);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [schedule, setSchedule] = useState({ Tuesday: [], Thursday: [] });
  const [dirty, setDirty] = useState(false);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [saving, setSaving] = useState(false);

  const weekKey = format(weekStart, "yyyy-MM-dd");

  const loadAgents = async () => {
    setLoadingAgents(true);
    try {
      const res = await base44.entities.Agent.filter({ active: true }, { sort: "name" });
      setAgents(res.items || []);
    } finally {
      setLoadingAgents(false);
    }
  };

  const loadSchedule = async () => {
    setLoadingSchedule(true);
    try {
      const res = await base44.entities.Pairing.filter({ week_start: weekKey }, { sort: "sort_order" });
      const items = res.items || [];
      const byDay = { Tuesday: [], Thursday: [] };
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
  }, []);

  useEffect(() => {
    loadSchedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekKey]);

  const dateFor = (day) => addDays(weekStart, DAY_OFFSETS[day]);

  const runAutoAssign = () => {
    const pairings = autoAssign(agents).map((p) => ({
      id: nextId(),
      agent1Id: p.agent1?.id ?? null,
      agent2Id: p.agent2?.id ?? null,
      saved: false,
    }));
    setSchedule({
      Tuesday: pairings,
      Thursday: pairings.map((p) => ({ ...p, id: nextId(), saved: false })),
    });
    setDirty(true);
  };

  const clearDay = (day) => {
    setSchedule((s) => ({ ...s, [day]: [] }));
    setDirty(true);
  };

  const updatePairing = (day, id, patch) => {
    setSchedule((s) => ({
      ...s,
      [day]: s[day].map((p) => (p.id === id ? { ...p, ...patch, saved: false } : p)),
    }));
    setDirty(true);
  };

  const removePairing = (day, id) => {
    setSchedule((s) => ({ ...s, [day]: s[day].filter((p) => p.id !== id) }));
    setDirty(true);
  };

  const addPairing = (day) => {
    setSchedule((s) => ({
      ...s,
      [day]: [...s[day], { id: nextId(), agent1Id: null, agent2Id: null, saved: false }],
    }));
    setDirty(true);
  };

  const usedIds = (day) => new Set(schedule[day].flatMap((p) => [p.agent1Id, p.agent2Id].filter(Boolean)));

  const agentById = (id) => agents.find((a) => a.id === id) || null;

  const save = async () => {
    setSaving(true);
    try {
      // Replace all pairings for this week
      const existing = await base44.entities.Pairing.filter({ week_start: weekKey });
      const existingItems = existing.items || [];
      if (existingItems.length > 0) {
        await base44.entities.Pairing.deleteMany({ week_start: weekKey });
      }
      const records = [];
      DAYS.forEach((day) => {
        schedule[day].forEach((p, idx) => {
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
          <h1 className="font-heading text-2xl font-bold tracking-tight text-[#111111]">Riding Schedule</h1>
          <p className="mt-1 text-sm text-gray-500">
            Week of {format(weekStart, "MMM d")} · {agents.length} active agents
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
            disabled={busy || agents.length === 0}
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

      <div className="grid gap-5 lg:grid-cols-2">
        {DAYS.map((day) => (
          <DayColumn
            key={day}
            day={day}
            date={dateFor(day)}
            pairings={schedule[day]}
            agents={agents}
            usedIds={usedIds(day)}
            agentById={agentById}
            busy={busy}
            onUpdate={(id, patch) => updatePairing(day, id, patch)}
            onRemove={(id) => removePairing(day, id)}
            onAdd={() => addPairing(day)}
            onClear={() => clearDay(day)}
          />
        ))}
      </div>
    </div>
  );
}

function DayColumn({ day, date, pairings, agents, usedIds, agentById, busy, onUpdate, onRemove, onAdd, onClear }) {
  const unassigned = agents.filter((a) => !usedIds.has(a.id));

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <div>
          <h2 className="font-heading text-lg font-semibold text-[#111111]">{day}</h2>
          <p className="text-xs text-gray-500">{format(date, "EEEE, MMM d")}</p>
        </div>
        {pairings.length > 0 && (
          <button onClick={onClear} className="text-xs font-medium text-gray-400 hover:text-red-500">
            Clear
          </button>
        )}
      </div>

      <div className="space-y-3 p-5">
        {busy && pairings.length === 0 && (
          <p className="py-6 text-center text-sm text-gray-400">Loading…</p>
        )}
        {!busy && pairings.length === 0 && (
          <p className="py-6 text-center text-sm text-gray-400">
            No pairings yet. Use Auto-assign or add one manually.
          </p>
        )}

        {pairings.map((p) => {
          const a1 = agentById(p.agent1Id);
          const a2 = agentById(p.agent2Id);
          const type = a1 ? pairingTypeFor(a1, a2) : "Solo";
          return (
            <div key={p.id} className="rounded-lg border border-gray-100 bg-[#f6f7f9] p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-gray-500 ring-1 ring-gray-200">
                  {type}
                </span>
                <button onClick={() => onRemove(p.id)} className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-red-500">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <AgentSelect value={p.agent1Id} agents={agents} usedIds={usedIds} onChange={(v) => onUpdate(p.id, { agent1Id: v })} />
                <span className="text-xs font-medium text-gray-400">+</span>
                <AgentSelect
                  value={p.agent2Id}
                  agents={agents}
                  usedIds={usedIds}
                  allowSolo
                  onChange={(v) => onUpdate(p.id, { agent2Id: v === "__solo__" ? null : v })}
                />
              </div>
            </div>
          );
        })}

        <button
          onClick={onAdd}
          disabled={busy}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:border-[#111111] hover:text-[#111111] disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Add pairing
        </button>

        {unassigned.length > 0 && (
          <div className="pt-1">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-gray-400">Unassigned</p>
            <div className="flex flex-wrap gap-1.5">
              {unassigned.map((a) => (
                <span key={a.id} className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs text-gray-600 ring-1 ring-gray-200">
                  <span className={`h-1.5 w-1.5 rounded-full ${ROLE_DOT[a.role]}`} />
                  {a.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AgentSelect({ value, agents, usedIds, allowSolo, onChange }) {
  const options = agents.filter((a) => !usedIds.has(a.id) || a.id === value);
  return (
    <div className="relative flex-1">
      <select
        value={value ?? (allowSolo ? "__solo__" : "")}
        onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
        className="w-full appearance-none rounded-md border border-gray-200 bg-white py-2 pl-3 pr-8 text-sm text-[#111111] outline-none focus:border-[#111111]"
      >
        <option value="">{value ? "Remove" : "Select agent"}</option>
        {allowSolo && <option value="__solo__">Solo</option>}
        {options.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name} · {ROLE_LABELS[a.role]}
          </option>
        ))}
      </select>
      <UserCircle2 className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
    </div>
  );
}