import { useRef, useState } from "react";
import { Upload, ClipboardList, X } from "lucide-react";
import { base44 } from "@/api/base44Client";

function normalizeRole(value, fallback) {
  const v = String(value || "").toLowerCase();
  if (v.includes("manag")) return "manager";
  if (v.includes("ten")) return "tenured";
  if (v.includes("new")) return "new";
  return fallback;
}

export default function ImportAgentsDialog({ onClose, onImported }) {
  const [tab, setTab] = useState("paste");
  const [text, setText] = useState("");
  const [defaultRole, setDefaultRole] = useState("new");
  const [csvAgents, setCsvAgents] = useState([]);
  const [csvFileName, setCsvFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const fileRef = useRef(null);

  const parseCsv = (raw) => {
    const rows = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (!rows.length) return [];
    const header = rows[0].split(",").map((c) => c.trim().toLowerCase());
    const start = header.includes("name") ? 1 : 0;
    return rows
      .slice(start)
      .map((line) => {
        const [name, role] = line.split(",").map((c) => c.trim());
        if (!name) return null;
        return { name, role: normalizeRole(role, defaultRole) };
      })
      .filter(Boolean);
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setCsvAgents(parseCsv(String(reader.result || "")));
    reader.readAsText(file);
  };

  const pastedAgents = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((name) => ({ name, role: defaultRole }));

  const pending = tab === "paste" ? pastedAgents : csvAgents;

  const runImport = async () => {
    if (!pending.length) return;
    setImporting(true);
    try {
      await base44.entities.Agent.bulkCreate(pending.map((a) => ({ name: a.name, role: a.role, active: true })));
      onImported();
      onClose();
    } finally {
      setImporting(false);
    }
  };

  const tabClass = (active) =>
    `flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
      active ? "border-[#111111] text-[#111111]" : "border-transparent text-gray-400 hover:text-gray-600"
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="font-heading text-lg font-semibold text-[#111111]">Import agents</h2>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-1 border-b border-gray-100 px-4">
          <button onClick={() => setTab("paste")} className={tabClass(tab === "paste")}>
            <ClipboardList className="h-4 w-4" />
            Paste names
          </button>
          <button onClick={() => setTab("csv")} className={tabClass(tab === "csv")}>
            <Upload className="h-4 w-4" />
            Upload CSV
          </button>
        </div>

        <div className="space-y-4 p-5">
          {tab === "paste" ? (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Names (one per line)</label>
                <textarea
                  autoFocus
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={6}
                  placeholder={"Jane Doe\nJohn Smith\nAlex Lee"}
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#111111]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Tenure for all imported agents</label>
                <select
                  value={defaultRole}
                  onChange={(e) => setDefaultRole(e.target.value)}
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#111111]"
                >
                  <option value="new">New Agent</option>
                  <option value="tenured">Tenured Agent</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">CSV file</label>
                <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex w-full flex-col items-center gap-2 rounded-lg border border-dashed border-gray-300 py-6 text-sm text-gray-500 transition-colors hover:border-[#111111] hover:text-[#111111]"
                >
                  <Upload className="h-5 w-5" />
                  {csvFileName || "Choose a CSV file"}
                </button>
                <p className="mt-2 text-xs text-gray-400">
                  Columns: name, role. Role is optional and defaults to the one picked below.
                </p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Default tenure</label>
                <select
                  value={defaultRole}
                  onChange={(e) => setDefaultRole(e.target.value)}
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#111111]"
                >
                  <option value="new">New Agent</option>
                  <option value="tenured">Tenured Agent</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
            </>
          )}

          <div className="rounded-lg bg-[#f6f7f9] px-3 py-2.5 text-sm text-gray-600">
            {pending.length > 0
              ? `${pending.length} agent${pending.length === 1 ? "" : "s"} ready to import`
              : "Nothing to import yet"}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={runImport}
            disabled={pending.length === 0 || importing}
            className="rounded-md bg-[#111111] px-4 py-2 text-sm font-medium text-white hover:bg-[#333] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {importing ? "Importing…" : "Import agents"}
          </button>
        </div>
      </div>
    </div>
  );
}