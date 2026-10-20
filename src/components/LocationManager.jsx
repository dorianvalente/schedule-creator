import { useState } from "react";
import { Trash2, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { formatName } from "@/lib/scheduler";

export default function LocationManager({ locations, onClose, onChanged }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const add = async () => {
    const clean = formatName(name);
    if (!clean || locations.some((l) => l.name === clean)) return;
    setBusy(true);
    try {
      await base44.entities.Location.create({ name: clean });
      setName("");
      await onChanged();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (loc) => {
    await base44.entities.Location.delete(loc.id);
    await onChanged();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold text-[#111111]">Locations</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-3 text-sm text-gray-500">
          Locations added here can be assigned to agents and chosen when building a schedule.
        </p>

        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="New location"
            className="flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#111111]"
          />
          <button
            onClick={add}
            disabled={busy}
            className="rounded-md bg-[#111111] px-4 py-2 text-sm font-medium text-white hover:bg-[#333] disabled:opacity-50"
          >
            Add
          </button>
        </div>

        <div className="mt-4 max-h-64 divide-y divide-gray-100 overflow-y-auto rounded-md border border-gray-200">
          {locations.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-gray-400">No locations yet.</p>
          )}
          {locations.map((l) => (
            <div key={l.id} className="flex items-center justify-between px-3 py-2">
              <span className="text-sm text-[#111111]">{l.name}</span>
              <button
                onClick={() => remove(l)}
                className="rounded-md p-1.5 text-red-500 hover:bg-red-50"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}