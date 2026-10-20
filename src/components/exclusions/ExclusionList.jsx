import { Trash2 } from "lucide-react";

export default function ExclusionList({ exclusions, agents, loading, onRemove }) {
  const nameOf = (id) => agents.find((a) => a.id === id)?.name || "Removed agent";

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-4 py-3 font-medium">Agent</th>
            <th className="px-4 py-3 font-medium">Should not work with</th>
            <th className="px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {loading && (
            <tr>
              <td colSpan={3} className="px-4 py-10 text-center text-sm text-gray-400">
                Loading…
              </td>
            </tr>
          )}
          {!loading &&
            exclusions.map((e) => (
              <tr key={e.id} className="hover:bg-gray-50/60">
                <td className="px-4 py-3 font-medium text-[#111111]">{nameOf(e.agent1_id)}</td>
                <td className="px-4 py-3 text-[#111111]">{nameOf(e.agent2_id)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    <button
                      onClick={() => onRemove(e.id)}
                      className="rounded-md p-1.5 text-red-500 hover:bg-red-50"
                      title="Remove exclusion"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          {!loading && exclusions.length === 0 && (
            <tr>
              <td colSpan={3} className="px-4 py-10 text-center text-sm text-gray-400">
                No exclusions yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}