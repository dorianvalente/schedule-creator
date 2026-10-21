import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { base44 } from "@/api/base44Client";

const asArray = (res) => (Array.isArray(res) ? res : res?.items || []);

export default function AdminLocationsDialog({ locations, onClose }) {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [me, users] = await Promise.all([
          base44.auth.me(),
          base44.entities.User.list(),
        ]);
        setAdmins(
          asArray(users).filter((u) => u.role === "admin" && u.id !== me?.id)
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const setLocation = async (id, value) => {
    setAdmins((prev) => prev.map((u) => (u.id === id ? { ...u, location: value } : u)));
    await base44.entities.User.update(id, { location: value });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold text-[#111111]">Admin access</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-3 text-sm text-gray-500">
          Limit an admin to a single location and they will only see and manage that location's
          roster. Leave an admin on “All locations” for full access.
        </p>

        <div className="max-h-80 divide-y divide-gray-100 overflow-y-auto rounded-md border border-gray-200">
          {loading && <p className="px-3 py-6 text-center text-sm text-gray-400">Loading…</p>}
          {!loading && admins.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-gray-400">
              No other admins yet. Invite one from the App Users page.
            </p>
          )}
          {admins.map((u) => (
            <div key={u.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[#111111]">{u.full_name || u.email}</p>
                <p className="truncate text-xs text-gray-500">{u.email}</p>
              </div>
              <select
                value={u.location || ""}
                onChange={(e) => setLocation(u.id, e.target.value)}
                className="min-w-[150px] rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-gray-700 outline-none focus:border-[#111111]"
              >
                <option value="">All locations</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.name}>
                    {l.name}
                  </option>
                ))}
                {u.location && !locations.some((l) => l.name === u.location) && (
                  <option value={u.location}>{u.location}</option>
                )}
              </select>
            </div>
          ))}
        </div>

        <p className="mt-3 text-xs text-gray-400">Your own access is not changed here.</p>
      </div>
    </div>
  );
}