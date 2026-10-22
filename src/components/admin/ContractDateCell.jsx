import { useEffect, useRef } from "react";
import { X } from "lucide-react";

/**
 * Contract date field.
 *
 * The browser's own reset ("x") on a date input reports nothing to React, so the
 * input is kept uncontrolled: React never writes the stored date back over what the
 * user just cleared. The field also carries its own reset button, which saves the
 * empty value directly instead of relying on the browser.
 */
export default function ContractDateCell({ value, onSave }) {
  const ref = useRef(null);
  const stored = (value || "").slice(0, 10);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Refresh a stale date, but never resurrect one the user has cleared.
    if (document.activeElement !== el && el.value && el.value !== stored) el.value = stored;
  }, [stored]);

  const save = (next) => {
    if (next !== stored) onSave(next);
  };

  const clear = () => {
    if (ref.current) ref.current.value = "";
    save("");
  };

  return (
    <div className="flex items-center gap-1">
      <input
        ref={ref}
        type="date"
        defaultValue={stored}
        onChange={(e) => save(e.target.value)}
        onBlur={(e) => save(e.target.value)}
        className="w-full max-w-[150px] rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-gray-700 outline-none focus:border-[#111111]"
      />
      {stored && (
        <button
          type="button"
          onClick={clear}
          title="Clear contract date"
          aria-label="Clear contract date"
          className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-[#111111]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}