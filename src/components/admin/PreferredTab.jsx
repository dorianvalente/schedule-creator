import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { DAY_OPTIONS, pairKey } from "@/lib/scheduler";
import PairForm from "@/components/admin/PairForm";
import PairList from "@/components/admin/PairList";

const hasPair = (rows, a, b) => rows.some((r) => pairKey(r.agent1_id, r.agent2_id) === pairKey(a, b));
const keysOf = (rows) => new Set(rows.map((r) => pairKey(r.agent1_id, r.agent2_id)));
const asArray = (res) => (Array.isArray(res) ? res : res?.items || []);

export default function PreferredTab() {
  const [agents, setAgents] = useState([]);
  const [preferred, setPreferred] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [agentRes, rows] = await Promise.all([
        base44.entities.Agent.filter({}, { sort: "name" }),
        base44.entities.PreferredPairing.list(),
      ]);
      setAgents(agentRes.items || []);
      setPreferred(asArray(rows));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const add = async (a, b, day) => {
    if (hasPair(preferred, a, b)) return;
    await base44.entities.PreferredPairing.create({ agent1_id: a, agent2_id: b, day: day || "Any" });
    load();
  };

  const remove = async (id) => {
    await base44.entities.PreferredPairing.delete(id);
    load();
  };

  return (
    <section>
      <PairForm
        agents={agents}
        existingKeys={keysOf(preferred)}
        onAdd={add}
        firstLabel="Agent"
        secondLabel="Ideal partner"
        dayOptions={DAY_OPTIONS}
      />
      <PairList
        rows={preferred}
        agents={agents}
        loading={loading}
        onRemove={remove}
        firstLabel="Agent"
        secondLabel="Ideal partner"
        dayLabel="Preferred day"
        emptyText="No preferred pairings yet."
      />
    </section>
  );
}