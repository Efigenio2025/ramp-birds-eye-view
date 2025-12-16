import Panel from "../../components/ui/Panel"
import StatusPill from "../../components/ui/StatusPill"

function formatDT(iso) {
  try {
    return new Date(iso).toLocaleString([], {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return "—"
  }
}

export default function CabinHistoryModal({ open, tail, onClose, checks }) {
  if (!open || !tail) return null

  const history = (checks ?? []).filter((c) => c.tail === tail)

  const onBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black p-4"
      onClick={onBackdrop}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md">
        {/* SOLID MODAL — NO TRANSPARENCY */}
        <div className="rounded-2xl bg-ramp-panel ring-1 ring-white/20 shadow-[0_40px_120px_rgba(0,0,0,0.9)]">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-white/10 p-4">
            <div className="min-w-0">
              <div className="text-lg font-extrabold tracking-tight text-ramp-text">
                {tail} History
              </div>
              <div className="mt-1 text-sm text-ramp-muted">
                {history.length} checks • most recent first
              </div>
            </div>

            <button
              onClick={onClose}
              className="shrink-0 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-ramp-text ring-1 ring-white/20 hover:bg-white/15 active:scale-[0.99] transition"
            >
              Close
            </button>
          </div>

          {/* Body */}
          <div className="px-4 py-4">
            <Panel title="Cabin Temp Checks" subtitle="Timestamp • Temp • User • Notes">
              <div className="max-h-[60vh] overflow-y-auto space-y-3">
                {history.length === 0 ? (
                  <div className="rounded-xl bg-ramp-panel2 p-4 text-sm text-ramp-muted ring-1 ring-white/10">
                    No history found for this aircraft yet.
                  </div>
                ) : (
                  history.slice(0, 100).map((h) => (
                    <div
                      key={h.id}
                      className="rounded-xl bg-ramp-panel2 p-4 ring-1 ring-white/10"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-ramp-text">
                            {formatDT(h.checked_at)}
                          </div>
                          <div className="mt-1 text-xs text-ramp-muted">
                            By{" "}
                            <span className="text-ramp-text">
                              {h.checked_by ?? "—"}
                            </span>
                            {h.notes ? (
                              <>
                                {" "}
                                • Notes:{" "}
                                <span className="text-ramp-text">{h.notes}</span>
                              </>
                            ) : null}
                          </div>
                        </div>

                        <div className="shrink-0 flex flex-col items-end gap-2">
                          <div className="text-2xl font-extrabold tracking-tight text-ramp-text">
                            {h.temp_f == null ? "—" : `${h.temp_f}°F`}
                          </div>
                          <StatusPill label="RECORDED" tone="good" />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {history.length > 100 ? (
                <div className="mt-4 text-xs text-ramp-muted">
                  Showing latest 100 entries.
                </div>
              ) : null}
            </Panel>
          </div>

          {/* Footer */}
          <div className="border-t border-white/10 px-4 py-3 text-[11px] text-ramp-muted">
            Tap outside this panel to close.
          </div>
        </div>
      </div>
    </div>
  )
}