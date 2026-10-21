import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { pairKey } from "@/lib/scheduler";
import PairForm from "@/components/admin/PairForm";
import PairList from "@/components/admin/PairList";

const hasPair = (rows, a, b) => rows.some((r) => pairKey(r.agent1_id, r.agent2_id) === pairKey(a, b));
const keysOf = (rows) => new Set(rows.map((r) => pairKey(r.agent1_id, r.agent2_id)));
const asArray = (res) => (Array.isArray(res) ? res : res?.items || []);

export default function ExclusionsTab() {
  const [agents, setAgents] = useState([]);
  const [exclusions, setExclusions] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [agentRes, rows] = await Promise.all([
        base44.entities.Agent.filter({}, { sort: "name" }),
        base44.entities.Exclusion.list(),
      ]);
      setAgents(agentRes.items || []);
      setExclusions(asArray(rows));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const add = async (a, b) => {
    if (hasPair(exclusions, a, b)) return;
    await base44.entities.Exclusion.create({ agent1_id: a, agent2_id: b });
    load();
  };

  const remove = async (id) => {
    await base44.entities.Exclusion.delete(id);
    load();
  };

  return (
    <section>
      <PairForm
        agents={agents}
        existingKeys={keysOf(exclusions)}
        onAdd={add}
        firstLabel="Agent"
        secondLabel="Should not work with"
      />
      <PairList
        rows={exclusions}
        agents={agents}
        loading={loading}
        onRemove={remove}
        firstLabel="Agent"
        secondLabel="Should not work with"
        emptyText="No exclusions yet."
      />
    </section>
  );
}