import { useEffect, useState } from "react";
import { Trash2, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { DEFAULT_DAYS, WEEKDAYS, formatName } from "@/lib/scheduler";

// Ride days stored on a location; older locations fall back to Tue/Thu.
export const daysOf = (location) =>
  location?.days?.length ? location.days : DEFAULT_DAYS;

export default function LocationManager({ locations, onClose, onChanged }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    base44.auth
      .me()
      .then((u) => setIsAdmin(u?.role === "admin"))
      .catch(() => setIsAdmin(false));
  }, []);

  const add = async () => {
    const clean = formatName(name);
    if (!clean || locations.some((l) => l.name === clean)) return;
    setBusy(true);
    try {
      await base44.entities.Location.create({ name: clean, days: DEFAULT_DAYS });
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

  const toggleDay = async (loc, day) => {
    const current = daysOf(loc);
    if (current.includes(day) && current.length === 1) return;
    const next = current.includes(day)
      ? current.filter((d) => d !== day)
      : WEEKDAYS.filter((d) => current.includes(d) || d === day);
    await base44.entities.Location.update(loc.id, { days: next });
    await onChanged();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl">
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
          Admins choose which days each location rides.
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

        {!isAdmin && (
          <p className="mt-3 text-xs text-gray-500">Only admins can change a location's ride days.</p>
        )}

        <div className="mt-3 max-h-80 divide-y divide-gray-100 overflow-y-auto rounded-md border border-gray-200">
          {locations.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-gray-400">No locations yet.</p>
          )}
          {locations.map((l) => {
            const selected = daysOf(l);
            return (
              <div key={l.id} className="px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#111111]">{l.name}</span>
                  <button
                    onClick={() => remove(l)}
                    className="rounded-md p-1.5 text-red-500 hover:bg-red-50"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {WEEKDAYS.map((d) => {
                    const on = selected.includes(d);
                    const locked = on && selected.length === 1;
                    return (
                      <button
                        key={d}
                        onClick={() => toggleDay(l, d)}
                        disabled={!isAdmin || locked}
                        title={
                          !isAdmin
                            ? "Only admins can change ride days"
                            : locked
                            ? "A location needs at least one ride day"
                            : `${on ? "Remove" : "Add"} ${d}`
                        }
                        className={`rounded-md border px-2 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                          on
                            ? "border-[#111111] bg-[#111111] text-white"
                            : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                        }`}
                      >
                        {d.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}