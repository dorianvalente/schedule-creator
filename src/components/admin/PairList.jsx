import { Trash2 } from "lucide-react";

export default function PairList({ rows, agents, loading, onRemove, firstLabel, secondLabel, emptyText }) {
  const nameOf = (id) => agents.find((a) => a.id === id)?.name || "Removed agent";

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-4 py-3 font-medium">{firstLabel}</th>
            <th className="px-4 py-3 font-medium">{secondLabel}</th>
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
            rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50/60">
                <td className="px-4 py-3 font-medium text-[#111111]">{nameOf(row.agent1_id)}</td>
                <td className="px-4 py-3 text-[#111111]">{nameOf(row.agent2_id)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    <button
                      onClick={() => onRemove(row.id)}
                      className="rounded-md p-1.5 text-red-500 hover:bg-red-50"
                      title="Remove pair"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          {!loading && rows.length === 0 && (
            <tr>
              <td colSpan={3} className="px-4 py-10 text-center text-sm text-gray-400">
                {emptyText}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}