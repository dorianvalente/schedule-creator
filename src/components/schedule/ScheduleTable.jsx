import { ROLE_LABELS, effectiveRole } from "@/lib/scheduler";

const ROLE_CELL = {
  manager: "border-gray-300 bg-[#f1f1f1] text-[#111111]",
  one_month: "border-amber-200 bg-amber-50 text-amber-900",
  sna: "border-sky-200 bg-sky-50 text-sky-900",
  rpa: "border-violet-200 bg-violet-50 text-violet-900",
  tenured: "border-emerald-200 bg-emerald-50 text-emerald-900",
};

const ROLE_ROW = {
  manager: "bg-[#f4f4f5]",
  one_month: "bg-amber-50",
  sna: "bg-sky-50",
  rpa: "bg-violet-50",
  tenured: "bg-emerald-50",
};

export default function ScheduleTable({ agents, days, partnerIdFor, agentById, onSetPartner, onClear, busy }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-[#f6f7f9]">
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Agent
              </th>
              {days.map((d) => (
                <th key={d.key} className="px-4 py-3 text-left">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-heading text-sm font-semibold text-[#111111]">{d.key}</p>
                      <p className="text-[11px] font-normal text-gray-500">{d.date}</p>
                    </div>
                    <button
                      onClick={() => onClear(d.key)}
                      className="text-[11px] font-medium text-gray-400 hover:text-red-500"
                    >
                      Clear
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {busy && agents.length === 0 && (
              <tr>
                <td colSpan={days.length + 1} className="px-4 py-10 text-center text-sm text-gray-400">
                  Loading…
                </td>
              </tr>
            )}
            {!busy && agents.length === 0 && (
              <tr>
                <td colSpan={days.length + 1} className="px-4 py-10 text-center text-sm text-gray-400">
                  No active agents yet. Add them on the Roster page.
                </td>
              </tr>
            )}

            {agents.map((a) => (
              <tr key={a.id} className="border-b border-gray-100 last:border-0 hover:bg-[#fafafa]">
                <td
                  className={`whitespace-nowrap px-4 py-1.5 text-sm font-medium text-[#111111] ${
                    ROLE_ROW[effectiveRole(a)]
                  }`}
                >
                  {a.name}
                </td>
                {days.map((d) => {
                  const partnerId = partnerIdFor(d.key, a.id);
                  return (
                    <td key={d.key} className="px-4 py-1.5">
                      <PartnerSelect
                        value={partnerId}
                        partner={partnerId ? agentById(partnerId) : null}
                        agents={agents}
                        selfId={a.id}
                        onChange={(v) => onSetPartner(d.key, a.id, v)}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PartnerSelect({ value, partner, agents, selfId, onChange }) {
  const role = partner ? effectiveRole(partner) : null;
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      className={`w-full rounded-md border px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-[#111111] ${
        role ? ROLE_CELL[role] : "border-gray-200 bg-white text-gray-400"
      }`}
    >
      <option value="">—</option>
      {agents
        .filter((a) => a.id !== selfId)
        .map((a) => (
          <option key={a.id} value={a.id}>
            {a.name} · {ROLE_LABELS[effectiveRole(a)]}
            {a.fa ? " · FA" : ""}
          </option>
        ))}
    </select>
  );
}