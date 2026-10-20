import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { pairKey } from "@/lib/scheduler";
import ExclusionForm from "@/components/exclusions/ExclusionForm";
import ExclusionList from "@/components/exclusions/ExclusionList";

export default function Exclusions() {
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [agents, setAgents] = useState([]);
  const [exclusions, setExclusions] = useState([]);
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
      const [agentRes, rows] = await Promise.all([
        base44.entities.Agent.filter({}, { sort: "name" }),
        base44.entities.Exclusion.list(),
      ]);
      setAgents(agentRes.items || []);
      setExclusions(Array.isArray(rows) ? rows : rows?.items || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const addExclusion = async (agent1Id, agent2Id) => {
    const key = pairKey(agent1Id, agent2Id);
    if (exclusions.some((e) => pairKey(e.agent1_id, e.agent2_id) === key)) return;
    await base44.entities.Exclusion.create({ agent1_id: agent1Id, agent2_id: agent2Id });
    load();
  };

  const removeExclusion = async (id) => {
    await base44.entities.Exclusion.delete(id);
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
          This page is limited to admins. Ask an admin to make changes to the exclusion list.
        </p>
      </div>
    );
  }

  const existingKeys = new Set(exclusions.map((e) => pairKey(e.agent1_id, e.agent2_id)));

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-[#111111]">Exclusions</h1>
        <p className="mt-1 text-sm text-gray-500">
          Agents who should not work together. Auto-assign skips these pairs, and they cannot be picked
          manually on the schedule.
        </p>
      </div>

      <ExclusionForm agents={agents} existingKeys={existingKeys} onAdd={addExclusion} />

      <ExclusionList
        exclusions={exclusions}
        agents={agents}
        loading={loading}
        onRemove={removeExclusion}
      />
    </div>
  );
}