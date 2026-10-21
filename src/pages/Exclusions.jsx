import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { DAY_OPTIONS, pairKey } from "@/lib/scheduler";
import PairForm from "@/components/admin/PairForm";
import PairList from "@/components/admin/PairList";

const hasPair = (rows, a, b) => rows.some((r) => pairKey(r.agent1_id, r.agent2_id) === pairKey(a, b));
const keysOf = (rows) => new Set(rows.map((r) => pairKey(r.agent1_id, r.agent2_id)));
const asArray = (res) => (Array.isArray(res) ? res : res?.items || []);

export default function Exclusions() {
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [agents, setAgents] = useState([]);
  const [exclusions, setExclusions] = useState([]);
  const [preferred, setPreferred] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth
      .me()
      .then((u) => setIsAdmin(u?.role === "admin"))
      .catch(() => setIsAdmin(false))
      .finally(() => setChecking(false));
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [agentRes, excluded, wishes] = await Promise.all([
        base44.entities.Agent.filter({}, { sort: "name" }),
        base44.entities.Exclusion.list(),
        base44.entities.PreferredPairing.list(),
      ]);
      setAgents(agentRes.items || []);
      setExclusions(asArray(excluded));
      setPreferred(asArray(wishes));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const addExclusion = async (a, b) => {
    if (hasPair(exclusions, a, b)) return;
    await base44.entities.Exclusion.create({ agent1_id: a, agent2_id: b });
    load();
  };

  const removeExclusion = async (id) => {
    await base44.entities.Exclusion.delete(id);
    load();
  };

  const addPreferred = async (a, b, day) => {
    if (hasPair(preferred, a, b)) return;
    await base44.entities.PreferredPairing.create({ agent1_id: a, agent2_id: b, day: day || "Any" });
    load();
  };

  const removePreferred = async (id) => {
    await base44.entities.PreferredPairing.delete(id);
    load();
  };

  if (checking) {
    return <div className="py-20 text-center text-sm text-gray-400">Checking access…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
        <h1 className="font-heading text-lg font-semibold text-[#111111]">Admins only</h1>
        <p className="mt-2 text-sm text-gray-500">
          This page is limited to admins. Ask an admin to make changes to these lists.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-[#111111]">Admin</h1>
        <p className="mt-1 text-sm text-gray-500">
          Choose who should never ride together, and the ideal pairings to aim for.
        </p>
      </div>

      <section className="mb-9">
        <h2 className="font-heading text-lg font-semibold text-[#111111]">Exclusions</h2>
        <p className="mb-3 mt-1 text-sm text-gray-500">
          Agents who should not work together. Auto-assign skips these pairs, and they cannot be picked
          manually on the schedule.
        </p>
        <PairForm
          agents={agents}
          existingKeys={keysOf(exclusions)}
          onAdd={addExclusion}
          firstLabel="Agent"
          secondLabel="Should not work with"
        />
        <PairList
          rows={exclusions}
          agents={agents}
          loading={loading}
          onRemove={removeExclusion}
          firstLabel="Agent"
          secondLabel="Should not work with"
          emptyText="No exclusions yet."
        />
      </section>

      <section>
        <h2 className="font-heading text-lg font-semibold text-[#111111]">Preferred pairings</h2>
        <p className="mb-3 mt-1 text-sm text-gray-500">
          Ideal pairings. Auto-assign puts these two together on their preferred day. Choose “Any
          day” to leave the day open.
        </p>
        <PairForm
          agents={agents}
          existingKeys={keysOf(preferred)}
          onAdd={addPreferred}
          firstLabel="Agent"
          secondLabel="Ideal partner"
          dayOptions={DAY_OPTIONS}
        />
        <PairList
          rows={preferred}
          agents={agents}
          loading={loading}
          onRemove={removePreferred}
          firstLabel="Agent"
          secondLabel="Ideal partner"
          dayLabel="Preferred day"
          emptyText="No preferred pairings yet."
        />
      </section>
    </div>
  );
}