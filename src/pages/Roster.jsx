import { useEffect, useState } from "react";
import { UserPlus, Trash2, Pencil, X, Check, Upload } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { ROLE_LABELS } from "@/lib/scheduler";
import ImportAgentsDialog from "@/components/ImportAgentsDialog";

const ROLE_STYLES = {
  manager: "bg-[#111111] text-white",
  new: "bg-amber-100 text-amber-800 border border-amber-200",
  tenured: "bg-emerald-100 text-emerald-800 border border-emerald-200",
};

const ROLE_ORDER = { manager: 0, new: 1, tenured: 2 };

export default function Roster() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [draft, setDraft] = useState({ name: "", role: "new" });
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({ name: "", role: "new" });

  const loadAgents = async () => {
    setLoading(true);
    try {
      const res = await base44.entities.Agent.filter({}, { sort: "name" });
      setAgents(res.items || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgents();
  }, []);

  const addAgent = async () => {
    if (!draft.name.trim()) return;
    await base44.entities.Agent.create({ name: draft.name.trim(), role: draft.role, active: true });
    setDraft({ name: "", role: "new" });
    setShowForm(false);
    loadAgents();
  };

  const startEdit = (agent) => {
    setEditingId(agent.id);
    setEditDraft({ name: agent.name, role: agent.role });
  };

  const saveEdit = async (id) => {
    if (!editDraft.name.trim()) return;
    await base44.entities.Agent.update(id, { name: editDraft.name.trim(), role: editDraft.role });
    setEditingId(null);
    loadAgents();
  };

  const toggleActive = async (agent) => {
    await base44.entities.Agent.update(agent.id, { active: !agent.active });
    loadAgents();
  };

  const removeAgent = async (id) => {
    await base44.entities.Agent.delete(id);
    loadAgents();
  };

  const sorted = [...agents].sort((a, b) => {
    if (ROLE_ORDER[a.role] !== ROLE_ORDER[b.role]) return ROLE_ORDER[a.role] - ROLE_ORDER[b.role];
    return a.name.localeCompare(b.name);
  });

  const counts = {
    manager: agents.filter((a) => a.role === "manager").length,
    new: agents.filter((a) => a.role === "new").length,
    tenured: agents.filter((a) => a.role === "tenured").length,
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-[#111111]">Roster</h1>
          <p className="mt-1 text-sm text-gray-500">
            {counts.manager} managers · {counts.new} new · {counts.tenured} tenured
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-[#111111] transition-colors hover:bg-gray-50"
          >
            <Upload className="h-4 w-4" />
            Import
          </button>
          <button
            onClick={() => setShowForm((s) => !s)}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#111111] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#333]"
          >
            <UserPlus className="h-4 w-4" />
            Add Agent
          </button>
        </div>
      </div>

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
                <option value="new">New Agent</option>
                <option value="tenured">Tenured Agent</option>
                <option value="manager">Manager</option>
              </select>
            </div>
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

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Tenure</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-gray-400">Loading…</td>
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
                      <option value="new">New Agent</option>
                      <option value="tenured">Tenured Agent</option>
                      <option value="manager">Manager</option>
                    </select>
                  ) : (
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_STYLES[agent.role]}`}>
                      {ROLE_LABELS[agent.role]}
                    </span>
                  )}
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
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-gray-400">
                  No agents yet. Add your first agent to start building schedules.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showImport && (
        <ImportAgentsDialog onClose={() => setShowImport(false)} onImported={loadAgents} />
      )}
    </div>
  );
}