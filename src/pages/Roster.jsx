import { useEffect, useState } from "react";
import { UserPlus, Trash2, Pencil, X, Check, Upload, MapPin, CalendarDays } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { ROLE_LABELS, ROLE_ORDER, TENURE_OPTIONS, effectiveRole, formatName } from "@/lib/scheduler";
import ImportAgentsDialog from "@/components/ImportAgentsDialog";
import LocationManager from "@/components/LocationManager";
import LocationPicker from "@/components/LocationPicker";

const ROLE_STYLES = {
  manager: "bg-[#111111] text-white",
  one_month: "bg-amber-100 text-amber-800 border border-amber-200",
  sna: "bg-sky-100 text-sky-800 border border-sky-200",
  rpa: "bg-violet-100 text-violet-800 border border-violet-200",
  tenured: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  veteran: "bg-indigo-100 text-indigo-800 border border-indigo-200",
};

export default function Roster() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showLocations, setShowLocations] = useState(false);
  const [locations, setLocations] = useState([]);
  const [location, setLocation] = useState("");
  const [showContractDate, setShowContractDate] = useState(true);
  const [draft, setDraft] = useState({ name: "", role: "auto", team: "", location: "", contract_date: "", fa: false });
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({ name: "", role: "auto", team: "" });

  const loadAgents = async () => {
    setLoading(true);
    try {
      const res = await base44.entities.Agent.filter({}, { sort: "name" });
      setAgents(res.items || []);
    } finally {
      setLoading(false);
    }
  };

  const loadLocations = async () => {
    const res = await base44.entities.Location.filter({}, { sort: "name" });
    setLocations(res.items || []);
  };

  useEffect(() => {
    loadAgents();
    loadLocations();
  }, []);

  const addAgent = async () => {
    if (!draft.name.trim()) return;
    const isAuto = draft.role === "auto";
    await base44.entities.Agent.create({
      name: formatName(draft.name),
      role: isAuto ? "one_month" : draft.role,
      manual_role: !isAuto,
      team: draft.team.trim(),
      location: draft.location,
      contract_date: draft.contract_date,
      fa: !!draft.fa,
      active: true,
    });
    setDraft({ name: "", role: "auto", team: "", location, contract_date: "", fa: false });
    setShowForm(false);
    loadAgents();
  };

  const startEdit = (agent) => {
    setEditingId(agent.id);
    setEditDraft({
      name: agent.name,
      role: agent.role === "manager" || agent.manual_role ? agent.role : "auto",
      team: agent.team || "",
    });
  };

  const saveEdit = async (id) => {
    if (!editDraft.name.trim()) return;
    const isAuto = editDraft.role === "auto";
    await base44.entities.Agent.update(id, {
      name: formatName(editDraft.name),
      role: isAuto ? "one_month" : editDraft.role,
      manual_role: !isAuto,
      team: editDraft.team.trim(),
    });
    setEditingId(null);
    loadAgents();
  };

  const toggleActive = async (agent) => {
    await base44.entities.Agent.update(agent.id, { active: !agent.active });
    loadAgents();
  };

  const toggleFa = async (agent) => {
    await base44.entities.Agent.update(agent.id, { fa: !agent.fa });
    loadAgents();
  };

  const setAgentLocation = async (agent, location) => {
    await base44.entities.Agent.update(agent.id, { location });
    loadAgents();
  };

  const setContractDate = async (agent, contract_date) => {
    await base44.entities.Agent.update(agent.id, { contract_date });
    loadAgents();
  };

  const removeAgent = async (id) => {
    await base44.entities.Agent.delete(id);
    loadAgents();
  };

  const locationAgents = agents.filter((a) => (a.location || "") === location);

  const sorted = [...locationAgents].sort((a, b) => {
    const ra = effectiveRole(a);
    const rb = effectiveRole(b);
    if (ROLE_ORDER[ra] !== ROLE_ORDER[rb]) return ROLE_ORDER[ra] - ROLE_ORDER[rb];
    return a.name.localeCompare(b.name);
  });

  const managerNames = locationAgents
    .filter((a) => effectiveRole(a) === "manager")
    .map((a) => a.name)
    .sort((a, b) => a.localeCompare(b));

  const counts = {
    manager: locationAgents.filter((a) => effectiveRole(a) === "manager").length,
    one_month: locationAgents.filter((a) => effectiveRole(a) === "one_month").length,
    sna: locationAgents.filter((a) => effectiveRole(a) === "sna").length,
    rpa: locationAgents.filter((a) => effectiveRole(a) === "rpa").length,
    tenured: locationAgents.filter((a) => effectiveRole(a) === "tenured").length,
    veteran: locationAgents.filter((a) => effectiveRole(a) === "veteran").length,
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-[#111111]">Roster</h1>
          {location && (
            <p className="mt-1 text-sm text-gray-500">
              {counts.manager} managers · {counts.one_month} 1 Month · {counts.sna} SNA · {counts.rpa} RPA · {counts.tenured} tenured · {counts.veteran} veteran
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowContractDate((s) => !s)}
            className={`inline-flex items-center gap-1.5 rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
              showContractDate
                ? "border-[#111111] bg-gray-50 text-[#111111]"
                : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
            }`}
            title={showContractDate ? "Hide contract date column" : "Show contract date column"}
          >
            <CalendarDays className="h-4 w-4" />
            Contract date
          </button>
          <button
            onClick={() => setShowLocations(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-[#111111] transition-colors hover:bg-gray-50"
          >
            <MapPin className="h-4 w-4" />
            Locations
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-[#111111] transition-colors hover:bg-gray-50"
          >
            <Upload className="h-4 w-4" />
            Import
          </button>
          <button
            onClick={() => {
              setDraft((d) => ({ ...d, location }));
              setShowForm((s) => !s);
            }}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#111111] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#333]"
          >
            <UserPlus className="h-4 w-4" />
            Add Agent
          </button>
        </div>
      </div>

      <LocationPicker
        locations={locations}
        value={location}
        onChange={setLocation}
        id="roster-location"
        countLabel={
          location
            ? `${locationAgents.length} agent${locationAgents.length === 1 ? "" : "s"} at this location`
            : "Select a location to see its roster"
        }
      />

      {showForm && (
        <div className="mb-5 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-gray-500">Name</label>
              <input
                autoFocus
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && addAgent()}
                placeholder="Agent name"
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#111111]"
              />
            </div>
            <div className="sm:w-48">
              <label className="mb-1 block text-xs font-medium text-gray-500">Tenure</label>
              <select
                value={draft.role}
                onChange={(e) => setDraft({ ...draft, role: e.target.value })}
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#111111]"
              >
                {TENURE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:w-48">
              <label className="mb-1 block text-xs font-medium text-gray-500">Team</label>
              <select
                value={draft.team}
                onChange={(e) => setDraft({ ...draft, team: e.target.value })}
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#111111]"
              >
                <option value="">No team</option>
                {managerNames.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:w-44">
              <label className="mb-1 block text-xs font-medium text-gray-500">Location</label>
              <select
                value={draft.location}
                onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#111111]"
              >
                <option value="">No location</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.name}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:w-44">
              <label className="mb-1 block text-xs font-medium text-gray-500">Contract date</label>
              <input
                type="date"
                value={draft.contract_date}
                onChange={(e) => setDraft({ ...draft, contract_date: e.target.value })}
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-[#111111]"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 pb-2.5">
              <input
                type="checkbox"
                checked={draft.fa}
                onChange={(e) => setDraft({ ...draft, fa: e.target.checked })}
                className="h-4 w-4 cursor-pointer accent-[#111111]"
              />
              <span className="text-sm font-medium text-gray-600">FA</span>
            </label>
            <div className="flex gap-2">
              <button
                onClick={addAgent}
                className="rounded-md bg-[#111111] px-4 py-2 text-sm font-medium text-white hover:bg-[#333]"
              >
                Add
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Tenure</th>
              <th className="px-4 py-3 font-medium">Team</th>
              <th className="px-4 py-3 font-medium">Location</th>
              {showContractDate && <th className="px-4 py-3 font-medium">Contract date</th>}
              <th className="px-4 py-3 font-medium">FA</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td colSpan={showContractDate ? 8 : 7} className="px-4 py-10 text-center text-sm text-gray-400">Loading…</td>
              </tr>
            )}
            {!loading && sorted.map((agent) => (
              <tr key={agent.id} className="hover:bg-gray-50/60">
                <td className="px-4 py-3 font-medium text-[#111111]">
                  {editingId === agent.id ? (
                    <input
                      value={editDraft.name}
                      onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                      onKeyDown={(e) => e.key === "Enter" && saveEdit(agent.id)}
                      className="w-full rounded-md border border-gray-200 px-2 py-1 text-sm outline-none focus:border-[#111111]"
                    />
                  ) : (
                    agent.name
                  )}
                </td>
                <td className="px-4 py-3">
                  {editingId === agent.id ? (
                    <select
                      value={editDraft.role}
                      onChange={(e) => setEditDraft({ ...editDraft, role: e.target.value })}
                      className="rounded-md border border-gray-200 bg-white px-2 py-1 text-sm outline-none focus:border-[#111111]"
                    >
                      {TENURE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_STYLES[effectiveRole(agent)]}`}>
                      {ROLE_LABELS[effectiveRole(agent)]}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {editingId === agent.id ? (
                    <select
                      value={editDraft.team}
                      onChange={(e) => setEditDraft({ ...editDraft, team: e.target.value })}
                      className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-sm outline-none focus:border-[#111111]"
                    >
                      <option value="">No team</option>
                      {managerNames.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                      {editDraft.team && !managerNames.includes(editDraft.team) && (
                        <option value={editDraft.team}>{editDraft.team}</option>
                      )}
                    </select>
                  ) : agent.team ? (
                    <span className="text-gray-600">{agent.team}</span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={agent.location || ""}
                    onChange={(e) => setAgentLocation(agent, e.target.value)}
                    className="w-full max-w-[160px] rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-gray-700 outline-none focus:border-[#111111]"
                  >
                    <option value="">—</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.name}>
                        {l.name}
                      </option>
                    ))}
                    {agent.location && !locations.some((l) => l.name === agent.location) && (
                      <option value={agent.location}>{agent.location}</option>
                    )}
                  </select>
                </td>
                {showContractDate && (
                  <td className="px-4 py-3">
                    <input
                      type="date"
                      value={(agent.contract_date || "").slice(0, 10)}
                      onChange={(e) => setContractDate(agent, e.target.value)}
                      className="w-full max-w-[150px] rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-gray-700 outline-none focus:border-[#111111]"
                    />
                  </td>
                )}
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={!!agent.fa}
                    onChange={() => toggleFa(agent)}
                    className="h-4 w-4 cursor-pointer accent-[#111111]"
                    aria-label="FA"
                  />
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActive(agent)}
                    className={`relative h-5 w-9 rounded-full transition-colors ${agent.active ? "bg-emerald-500" : "bg-gray-300"}`}
                  >
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${agent.active ? "left-4" : "left-0.5"}`} />
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    {editingId === agent.id ? (
                      <>
                        <button onClick={() => saveEdit(agent.id)} className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50" title="Save">
                          <Check className="h-4 w-4" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100" title="Cancel">
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEdit(agent)} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100" title="Edit">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => removeAgent(agent.id)} className="rounded-md p-1.5 text-red-500 hover:bg-red-50" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && sorted.length === 0 && (
              <tr>
                <td colSpan={showContractDate ? 8 : 7} className="px-4 py-10 text-center text-sm text-gray-400">
                  {location
                    ? "No agents at this location yet. Add one above to get started."
                    : "Select a location above to see its roster."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showImport && (
        <ImportAgentsDialog onClose={() => setShowImport(false)} onImported={loadAgents} location={location} />
      )}

      {showLocations && (
        <LocationManager
          locations={locations}
          onClose={() => setShowLocations(false)}
          onChanged={loadLocations}
        />
      )}
    </div>
  );
}