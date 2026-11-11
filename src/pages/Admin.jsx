import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import RosterTab from "@/components/admin/RosterTab";
import ExclusionsTab from "@/components/admin/ExclusionsTab";
import PreferredTab from "@/components/admin/PreferredTab";
import DataTab from "@/components/admin/DataTab";

const TABS = [
  { id: "roster", label: "Roster" },
  { id: "exclusions", label: "Exclusions" },
  { id: "preferred", label: "Preferred pairings" },
  { id: "data", label: "Export & import" },
];

const BLURBS = {
  roster: "Add agents, set their tenure and team, and keep each location's roster up to date.",
  exclusions: "Agents who should not work together. Auto-assign skips these pairs, and they cannot be picked manually on the schedule.",
  preferred: "Ideal pairings. Auto-assign puts these two together on their preferred day. Choose “Any day” to leave the day open.",
  data: "Download your roster and schedule, or bring a backup from another copy of this app into this one.",
};

export default function Admin() {
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState("roster");

  useEffect(() => {
    base44.auth
      .me()
      .then((u) => setIsAdmin(u?.role === "admin"))
      .catch(() => setIsAdmin(false))
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return <div className="py-20 text-center text-sm text-gray-400">Checking access…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
        <h1 className="font-heading text-lg font-semibold text-[#111111]">Admins only</h1>
        <p className="mt-2 text-sm text-gray-500">
          This page is limited to admins. Ask an admin to make changes to the roster and these lists.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-[#111111]">Admin</h1>
        <p className="mt-1 text-sm text-gray-500">{BLURBS[tab]}</p>
      </div>

      <div className="mb-6 flex gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? "border-[#111111] text-[#111111]"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "roster" && <RosterTab />}
      {tab === "exclusions" && <ExclusionsTab />}
      {tab === "preferred" && <PreferredTab />}
      {tab === "data" && <DataTab />}
    </div>
  );
}