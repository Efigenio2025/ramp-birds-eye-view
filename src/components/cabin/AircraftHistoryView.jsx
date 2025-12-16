import { minutesAgo, formatLocalDateTime } from "../../lib/time"

export default function AircraftHistoryView({ tail, history, onBack, frequencyMinutes }) {
  const latest = history[0]
  const minsSince = latest ? minutesAgo(latest.checkedAt) : null
  const minsRemaining = minsSince != null ? frequencyMinutes - minsSince : null

  let overallTone = "warn"
  let overallStatus = "NO DATA"
  if (latest) {
    overallTone = "good"
    overallStatus = "OK"
    if (minsRemaining <= 0) {
      overallTone = "danger"
      overallStatus = "OVERDUE"
    } else if (minsRemaining <= 10) {
      overallTone = "warn"
      overallStatus = "DUE SOON"
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="rounded-lg border border-ramp-border bg-ramp-bg/40 px-3 py-2 text-sm hover:opacity-90"
        >
          ← Back to aircraft list
        </button>

        <div className="text-right text-xs text-ramp-muted">
          {latest ? (
            <>
              <div>
                Latest:{" "}
                <span className="font-semibold text-ramp-text">{latest.valueF}°F</span> •{" "}
                {minutesAgo(latest.checkedAt)} min ago
              </div>
              <div>
                Next due in:{" "}
                <span className="font-semibold text-ramp-text">{Math.max(0, minsRemaining)}</span>{" "}
                min • Status:{" "}
                <span
                  className={
                    overallTone === "danger"
                      ? "text-ramp-red"
                      : overallTone === "warn"
                      ? "text-ramp-amber"
                      : "text-ramp-green"
                  }
                >
                  {overallStatus}
                </span>
              </div>
            </>
          ) : (
            <div>No checks recorded yet.</div>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-ramp-border bg-ramp-bg/40 p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-semibold text-ramp-text">All Checks</div>
          <div className="text-xs text-ramp-muted">{history.length} records</div>
        </div>

        {history.length === 0 ? (
          <div className="text-sm text-ramp-muted">No history available for {tail}.</div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-ramp-border">
            <table className="w-full text-sm">
              <thead className="bg-ramp-panel">
                <tr className="text-left text-xs text-ramp-muted">
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">Temp</th>
                  <th className="px-3 py-2">Checked By</th>
                  <th className="px-3 py-2">Age</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, idx) => (
                  <tr key={idx} className="border-t border-ramp-border bg-ramp-bg/20">
                    <td className="px-3 py-2 text-ramp-text">
                      {formatLocalDateTime(h.checkedAt)}
                    </td>
                    <td className="px-3 py-2 font-semibold text-ramp-text">{h.valueF}°F</td>
                    <td className="px-3 py-2 text-ramp-muted">{h.checkedBy}</td>
                    <td className="px-3 py-2 text-ramp-muted">{minutesAgo(h.checkedAt)} min ago</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
