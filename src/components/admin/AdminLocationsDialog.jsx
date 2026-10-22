import { useEffect, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import LocationChecklist from "@/components/admin/LocationChecklist";

const asArray = (res) => (Array.isArray(res) ? res : res?.items || []);

const summary = (names) =>
  !names.length ? "All locations" : names.length === 1 ? names[0] : `${names[0]} +${names.length - 1}`;

export default function AdminLocationsDialog({ locations, onClose }) {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);

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

  const setLocations = async (id, next) => {
    setAdmins((prev) => prev.map((u) => (u.id === id ? { ...u, locations: next } : u)));
    await base44.entities.User.update(id, { locations: next });
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
          Give an admin one or more locations and they will only see and manage those rosters. Leave
          an admin on “All locations” for full access.
        </p>

        <div className="max-h-80 divide-y divide-gray-100 overflow-y-auto rounded-md border border-gray-200">
          {loading && <p className="px-3 py-6 text-center text-sm text-gray-400">Loading…</p>}
          {!loading && admins.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-gray-400">
              No other admins yet. Invite one from the App Users page.
            </p>
          )}
          {admins.map((u) => {
            const names = u.locations || [];
            const options = [
              ...locations.map((l) => l.name),
              ...names.filter((n) => !locations.some((l) => l.name === n)),
            ];
            return (
              <div key={u.id} className="px-3 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#111111]">
                      {u.full_name || u.email}
                    </p>
                    <p className="truncate text-xs text-gray-500">{u.email}</p>
                  </div>
                  <button
                    onClick={() => setOpenId(openId === u.id ? null : u.id)}
                    className="flex min-w-[160px] items-center justify-between gap-2 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <span className="truncate">{summary(names)}</span>
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                  </button>
                </div>
                {openId === u.id && (
                  <LocationChecklist
                    names={options}
                    selected={names}
                    onChange={(next) => setLocations(u.id, next)}
                    onDone={() => setOpenId(null)}
                  />
                )}
              </div>
            );
          })}
        </div>

        <p className="mt-3 text-xs text-gray-400">Your own access is not changed here.</p>
      </div>
    </div>
  );
}