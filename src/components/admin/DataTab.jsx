import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { agentsToCsv, buildBackup, downloadFile, restoreBackup } from "@/lib/backup";

function Card({ title, description, children }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="font-heading text-sm font-semibold text-[#111111]">{title}</h2>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

const buttonBase =
  "inline-flex items-center gap-1.5 rounded-md border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";

export default function DataTab({ onRestored }) {
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const fileRef = useRef(null);

  const exportBackup = async () => {
    setWorking(true);
    try {
      const data = await buildBackup();
      const stamp = data.exported_at.slice(0, 10);
      downloadFile(`schedule-creator-backup-${stamp}.json`, JSON.stringify(data, null, 2));
      setMessage(
        `Backup downloaded: ${data.agents.length} agents, ${data.pairings.length} pairings, ${data.preferred.length} preferred pairings, ${data.exclusions.length} exclusions.`
      );
    } finally {
      setWorking(false);
    }
  };

  const exportAgents = async () => {
    setWorking(true);
    try {
      const data = await buildBackup();
      downloadFile(`schedule-creator-agents.csv`, agentsToCsv(data.agents), "text/csv");
      setMessage(`Agents CSV downloaded: ${data.agents.length} agents.`);
    } finally {
      setWorking(false);
    }
  };

  const importFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setWorking(true);
    setMessage("");
    try {
      const data = JSON.parse(await file.text());
      const summary = await restoreBackup(data);
      setMessage(
        `Imported ${summary.agents} agents, ${summary.locations} locations, ${summary.pairings} pairings, ${summary.preferred} preferred pairings and ${summary.exclusions} exclusions. Anything already here was left alone.`
      );
      onRestored?.();
    } catch {
      setMessage("That file could not be read. Choose a backup .json file downloaded from this page.");
    } finally {
      setWorking(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <Card
        title="Export everything"
        description="Downloads the whole schedule — agents, locations, every week of pairings, preferred pairings and exclusions — as one file you can bring into another copy of this app."
      >
        <button
          onClick={exportBackup}
          disabled={working}
          className={`${buttonBase} border-[#111111] bg-[#111111] text-white hover:bg-[#333]`}
        >
          <Download className="h-4 w-4" />
          {working ? "Working…" : "Download backup"}
        </button>
        <span className="text-xs text-gray-500">Restore it from the Import card on the other app.</span>
      </Card>

      <Card
        title="Agents only (CSV)"
        description="Just the roster, as a spreadsheet. This also opens in Excel, and it can be imported straight into the Agents data table."
      >
        <button
          onClick={exportAgents}
          disabled={working}
          className={`${buttonBase} border-gray-200 bg-white text-[#111111] hover:bg-gray-50`}
        >
          <Download className="h-4 w-4" />
          Download agents CSV
        </button>
      </Card>

      <Card
        title="Import a backup"
        description="Choose a backup file from another copy of this app. Agents are matched by name, so nobody is added twice, and the pairings are relinked to the agents here."
      >
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          onChange={importFile}
          className="hidden"
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={working}
          className={`${buttonBase} border-gray-200 bg-white text-[#111111] hover:bg-gray-50`}
        >
          <Upload className="h-4 w-4" />
          {working ? "Working…" : "Choose backup file"}
        </button>
      </Card>

      {message && (
        <p className="rounded-md border border-gray-200 bg-[#f6f7f9] px-4 py-3 text-sm text-gray-600">
          {message}
        </p>
      )}
    </div>
  );
}