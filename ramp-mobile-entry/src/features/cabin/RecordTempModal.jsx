import { useMemo, useState } from "react"
import { supabase } from "../../lib/supabase"
import StatusPill from "../../components/ui/StatusPill"

export default function RecordTempModal({
  open,
  tail,
  station = "OMA",
  outsideTempF = null,
  onClose,
  onSaved,
}) {
  const [temp, setTemp] = useState("")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const canSave = useMemo(() => {
    const n = Number(temp)
    return Number.isFinite(n) && n > 0 && n < 150 && !saving
  }, [temp, saving])

  if (!open || !tail) return null

  const onBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  const save = async () => {
    setError("")
    setSaving(true)

    const cleanTail = String(tail).trim().toUpperCase()

    // 1) Ensure tail exists in MASTER aircraft table (prevents FK failure)
    const { error: aircraftErr } = await supabase
      .from("aircraft")
      .upsert([{ tail: cleanTail, active: true }], { onConflict: "tail" })

    if (aircraftErr) {
      setError(`Aircraft add failed: ${aircraftErr.message}`)
      setSaving(false)
      return
    }

    // 2) Get signed-in user (email)
    const { data: auth } = await supabase.auth.getUser()
    const email = auth?.user?.email ?? "unknown"

    // 3) Insert cabin temp check
    const payload = {
      tail: cleanTail,
      temp_f: Number(temp),
      outside_temp_f: Number.isFinite(Number(outsideTempF)) ? Number(outsideTempF) : null,
      notes: notes?.trim() || null,
      checked_by: email,
      checked_at: new Date().toISOString(),
      station, // we'll safely retry without station if column doesn't exist
    }

    let insertErr = null

    const { error: firstErr } = await supabase.from("cabin_temp_checks").insert([payload])
    insertErr = firstErr

    // If your table does NOT have station column, retry without it
    if (insertErr?.message?.toLowerCase().includes("station")) {
      const retryPayload = { ...payload }
      delete retryPayload.station
      const { error: retryErr } = await supabase.from("cabin_temp_checks").insert([retryPayload])
      insertErr = retryErr
    }

    if (insertErr) {
      setError(insertErr.message)
      setSaving(false)
      return
    }

    setSaving(false)
    setTemp("")
    setNotes("")
    onSaved?.()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black p-4"
      onClick={onBackdrop}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-ramp-panel ring-1 ring-white/20 shadow-[0_40px_120px_rgba(0,0,0,0.9)]">
          <div className="flex items-start justify-between gap-3 border-b border-white/10 p-4">
            <div className="min-w-0">
              <div className="text-lg font-extrabold tracking-tight text-ramp-text">
                Record Cabin Temp
              </div>
              <div className="mt-1 text-sm text-ramp-muted">
                {String(tail).trim().toUpperCase()} • enter current cabin temperature
              </div>
              <div className="mt-1 text-[11px] text-ramp-muted">
                Outside temp snapshot:{" "}
                <span className="text-ramp-text font-semibold">
                  {Number.isFinite(Number(outsideTempF)) ? `${outsideTempF}°F` : "—"}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="shrink-0 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-ramp-text ring-1 ring-white/20 hover:bg-white/15 active:scale-[0.99] transition"
            >
              Close
            </button>
          </div>

          <div className="p-4 space-y-4">
            {error ? (
              <div className="rounded-xl bg-[rgb(var(--ramp-red)/0.15)] p-3 ring-1 ring-[rgb(var(--ramp-red)/0.3)]">
                <div className="text-sm font-semibold text-[rgb(var(--ramp-red))]">Save failed</div>
                <div className="mt-1 text-xs text-ramp-muted">{error}</div>
              </div>
            ) : null}

            <div className="rounded-xl bg-ramp-panel2 p-4 ring-1 ring-white/10">
              <label className="block text-xs font-semibold text-ramp-muted">Temperature (°F)</label>
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="e.g., 72"
                value={temp}
                onChange={(e) => setTemp(e.target.value)}
                className="mt-2 w-full rounded-xl bg-ramp-panel px-4 py-3 text-lg font-extrabold text-ramp-text ring-1 ring-white/10 outline-none focus:ring-white/25"
              />
              <div className="mt-2 text-[11px] text-ramp-muted">Valid range: 1–149°F</div>
            </div>

            <div className="rounded-xl bg-ramp-panel2 p-4 ring-1 ring-white/10">
              <label className="block text-xs font-semibold text-ramp-muted">Notes (optional)</label>
              <input
                placeholder="e.g., heat cart swapped / AC001234 / etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-2 w-full rounded-xl bg-ramp-panel px-4 py-3 text-sm text-ramp-text ring-1 ring-white/10 outline-none focus:ring-white/25"
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <StatusPill label={saving ? "SAVING…" : "READY"} tone={saving ? "warn" : "good"} />
              <button
                onClick={save}
                disabled={!canSave}
                className={[
                  "rounded-xl px-4 py-3 text-sm font-extrabold ring-1 transition",
                  canSave
                    ? "bg-[rgb(var(--ramp-green)/0.18)] text-[rgb(var(--ramp-green))] ring-[rgb(var(--ramp-green)/0.35)] hover:bg-[rgb(var(--ramp-green)/0.24)]"
                    : "bg-white/5 text-ramp-muted ring-white/10 cursor-not-allowed",
                ].join(" ")}
              >
                Save
              </button>
            </div>
          </div>

          <div className="border-t border-white/10 px-4 py-3 text-[11px] text-ramp-muted">
            Writes to <span className="text-ramp-text">cabin_temp_checks</span> and stores an outside-temp snapshot.
          </div>
        </div>
      </div>
    </div>
  )
}