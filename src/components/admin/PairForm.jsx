import { useState } from "react";
import { Plus } from "lucide-react";
import { pairKey } from "@/lib/scheduler";

const SELECT_CLASS =
  "w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#111111]";

export default function PairForm({ agents, existingKeys, onAdd, firstLabel, secondLabel, dayOptions }) {
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const [day, setDay] = useState(dayOptions?.[0]?.value || "Any");

  const sameAgent = !!first && first === second;
  const duplicate = !!first && !!second && existingKeys.has(pairKey(first, second));
  const disabled = !first || !second || sameAgent || duplicate;

  const submit = () => {
    if (disabled) return;
    onAdd(first, second, dayOptions ? day : undefined);
    setFirst("");
    setSecond("");
  };

  const options = agents.map((a) => (
    <option key={a.id} value={a.id}>
      {a.name}
    </option>
  ));

  return (
    <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-gray-500">{firstLabel}</label>
          <select value={first} onChange={(e) => setFirst(e.target.value)} className={SELECT_CLASS}>
            <option value="">Select an agent</option>
            {options}
          </select>
        </div>
        <span className="hidden pb-2.5 text-sm text-gray-400 sm:block">+</span>
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-gray-500">{secondLabel}</label>
          <select value={second} onChange={(e) => setSecond(e.target.value)} className={SELECT_CLASS}>
            <option value="">Select an agent</option>
            {options}
          </select>
        </div>
        {dayOptions && (
          <div className="sm:w-40">
            <label className="mb-1 block text-xs font-medium text-gray-500">Preferred day</label>
            <select value={day} onChange={(e) => setDay(e.target.value)} className={SELECT_CLASS}>
              {dayOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        )}
        <button
          onClick={submit}
          disabled={disabled}
          className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[#111111] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#333] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>
      {sameAgent && <p className="mt-2 text-xs text-red-500">Pick two different agents.</p>}
      {duplicate && <p className="mt-2 text-xs text-amber-600">That pair is already on the list.</p>}
    </div>
  );
}