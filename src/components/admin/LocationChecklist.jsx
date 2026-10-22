export default function LocationChecklist({ names, selected, onChange, onDone }) {
  const toggle = (name) =>
    onChange(selected.includes(name) ? selected.filter((n) => n !== name) : [...selected, name]);

  return (
    <div className="mt-2 rounded-md border border-gray-200 bg-gray-50/60 p-1.5">
      <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-white">
        <input
          type="checkbox"
          checked={!selected.length}
          onChange={() => onChange([])}
          className="h-4 w-4 cursor-pointer accent-[#111111]"
        />
        <span className="font-medium text-[#111111]">All locations</span>
      </label>
      {names.map((name) => (
        <label
          key={name}
          className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-white"
        >
          <input
            type="checkbox"
            checked={selected.includes(name)}
            onChange={() => toggle(name)}
            className="h-4 w-4 cursor-pointer accent-[#111111]"
          />
          <span className="text-gray-700">{name}</span>
        </label>
      ))}
      {names.length === 0 && (
        <p className="px-2 py-2 text-xs text-gray-400">No locations yet.</p>
      )}
      <div className="mt-1 flex justify-end border-t border-gray-200 px-1 pt-1.5">
        <button
          onClick={onDone}
          className="rounded-md px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-white"
        >
          Done
        </button>
      </div>
    </div>
  );
}