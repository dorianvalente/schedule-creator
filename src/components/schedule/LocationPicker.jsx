import { MapPin } from "lucide-react";

export default function LocationPicker({ locations, value, onChange, agentCount }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <MapPin className="h-4 w-4 text-gray-400" />
      <label htmlFor="schedule-location" className="text-sm font-medium text-[#111111]">
        Choose your location
      </label>
      <select
        id="schedule-location"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-[180px] rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-[#111111] outline-none focus:border-[#111111]"
      >
        {locations.length === 0 && <option value="">No locations yet</option>}
        {locations.map((l) => (
          <option key={l.id} value={l.name}>
            {l.name}
          </option>
        ))}
      </select>
      <span className="text-xs text-gray-500">
        {locations.length === 0
          ? "Add locations on the Roster page"
          : `${agentCount} active agent${agentCount === 1 ? "" : "s"} at this location`}
      </span>
    </div>
  );
}