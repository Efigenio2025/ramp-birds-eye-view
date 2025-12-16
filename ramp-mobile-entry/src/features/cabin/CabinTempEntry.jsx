import { useEffect, useMemo, useState } from "react"
import { supabase } from "../../lib/supabase"

function formatWhen(dt) {
  try {
    return new Date(dt).toLocaleString()
  } catch {
    return String(dt)
  }
}

function Chip({ label, tone = "muted" }) {
  const styles =
    tone === "good"
      ? "border-ramp-green/30 bg-ramp-green/10 text-ramp-green"
      : tone === "warn"
        ? "border-ramp-amber/30 bg-ramp-amber/10 text-ramp-amber"
        : tone === "danger"
          ? "border-ramp-red/30 bg-ramp-red/10 text-ramp-red"
          : "border-ramp-border bg-ramp-bg/40 text-ramp-muted"

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${styles}`}>
      {label}
    </span>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <div className="text-xs font-semibold text-ramp-muted">{label}</div>
      <div className="mt-2">{children}</div>
    </div>
  )
}

function InputBase(props) {
  return (
    <input
      {...props}
      className={[
        "w-full rounded-xl border border-ramp-border bg-ramp-bg/40 px-3 py-2 text-ramp-text outline-none",
        "focus:ring-2 focus:ring-ramp-blue",
        props.className || "",
      ].join(" ")}
    />
  )
}

function SelectBase(props) {
  return (
    <select
      {...props}
      className={[
        "w-full rounded-xl border border-ramp-border bg-ramp-bg/40 px-3 py-2 text-ramp-text outline-none",
        "focus:ring-2 focus:ring-ramp-blue",
        props.className || "",
      ].join(" ")}
    />
  )
}

export default function CabinTempEntry() {
  const [tails, setTails] = useState([])
  const [loadingTails, setLoadingTails] = useState(true)

  const [tail, setTail] = useState("")
  const [tempF, setTempF] = useState("")
  const [checkedBy, setCheckedBy] = useState("")
  const [notes, setNotes] = useState("")

  const [status, setStatus] = useState("idle") // idle | saving | saved | error
  const [error, setError] = useState("")
  const [recent, setRecent] = useState([])

  // Load aircraft list
  useEffect(() => {
    const load = async () => {
      setLoadingTails(true)
      setError("")

      const { data, error: err } = await supabase
        .from("aircraft")
        .select("tail")
        .eq("active", true)
        .order("tail", { ascending: true })

      if (err) {
        setError(err.message)
        setLoadingTails(false)
        return
      }

      const list = (data ?? []).map((x) => x.tail)
      setTails(list)
      setTail(list[0] ?? "")
      setLoadingTails(false)
    }

    load()
  }, [])

  // Load recent checks for selected tail
  useEffect(() => {
    if (!tail) return
    const loadRecent = async () => {
      const { data } = await supabase
        .from("cabin_temp_checks")
        .select("id, tail, temp_f, checked_by, checked_at, notes")
        .eq("tail", tail)
        .order("checked_at", { ascending: false })
        .limit(10)

      setRecent(data ?? [])
    }
    loadRecent()
  }, [tail, status])

  const canSubmit = useMemo(() => {
    const t = String(tempF).trim()
    const v = Number(t)
    return !!tail && !!checkedBy.trim() && t.length > 0 && Number.isFinite(v) && v > 0
  }, [tail, tempF, checkedBy])

  const submit = async () => {
    setError("")
    setStatus("saving")

    const v = Number(String(tempF).trim())
    if (!Number.isFinite(v)) {
      setStatus("error")
      setError("Temperature must be a number.")
      return
    }

    // Guardrails
    if (v < 40 || v > 95) {
      setStatus("error")
      setError("Temp looks out of range. Enter 40–95°F.")
      return
    }

    const { error: err } = await supabase.from("cabin_temp_checks").insert({
      tail,
      temp_f: v,
      checked_by: checkedBy.trim(),
      notes: notes.trim() ? notes.trim() : null,
      station: "OMA",
    })

    if (err) {
      setStatus("error")
      setError(err.message)
      return
    }

    setStatus("saved")
    setTempF("")
    setNotes("")
    setTimeout(() => setStatus("idle"), 900)
  }

  const headerSubtitle = useMemo(() => {
    if (loadingTails) return "Loading aircraft list…"
    if (!tail) return "No active aircraft found."
    return "Fast entry • feeds display dashboard"
  }, [loadingTails, tail])

  return (
    <div className="min-h-[calc(100vh-80px)]">
      {/* Top header */}
      <div className="sticky top-0 z-10 -mx-4 mb-4 border-b border-ramp-border bg-ramp-bg/80 px-4 py-4 backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-lg font-bold text-ramp-text leading-tight">
              Cabin Temp Entry
            </div>
            <div className="mt-1 text-sm text-ramp-muted">{headerSubtitle}</div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-xs text-ramp-muted">Station</div>
            <div className="text-sm font-semibold text-ramp-text">OMA</div>
          </div>
        </div>

        {/* Status chips */}
        <div className="mt-3 flex flex-wrap gap-2">
          <Chip label={tail ? `Tail: ${tail}` : "Tail: —"} />
          <Chip label={status === "saving" ? "Saving…" : status === "saved" ? "Saved ✅" : "Ready"} tone={status === "saved" ? "good" : status === "saving" ? "warn" : "muted"} />
          <Chip label={recent.length ? `Recent: ${recent.length}` : "Recent: 0"} />
        </div>
      </div>

      {/* Error banner */}
      {error ? (
        <div className="mb-4 rounded-2xl border border-ramp-border bg-ramp-panel p-4 text-sm">
          <div className="font-semibold text-ramp-red">Entry Error</div>
          <div className="mt-1 text-ramp-muted">{error}</div>
        </div>
      ) : null}

      {/* Main layout */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Entry card */}
        <div className="rounded-2xl border border-ramp-border bg-ramp-panel p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-ramp-text">New Temp Check</div>
              <div className="mt-1 text-xs text-ramp-muted">
                Keep it simple: tail, temp, name. Notes optional.
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-ramp-muted">Rule</div>
              <div className="text-xs font-semibold text-ramp-text">40–95°F</div>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            <Field label="Aircraft Tail">
              <SelectBase
                value={tail}
                onChange={(e) => setTail(e.target.value)}
                disabled={loadingTails}
              >
                {loadingTails ? (
                  <option>Loading…</option>
                ) : (
                  tails.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))
                )}
              </SelectBase>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Temperature (°F)">
                <InputBase
                  value={tempF}
                  onChange={(e) => setTempF(e.target.value)}
                  inputMode="numeric"
                  placeholder="73"
                />
              </Field>

              <Field label="Checked By">
                <InputBase
                  value={checkedBy}
                  onChange={(e) => setCheckedBy(e.target.value)}
                  placeholder="Name"
                />
              </Field>
            </div>

            <Field label="Notes (optional)">
              <InputBase
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Heat cart, issues, etc."
              />
            </Field>

            <button
              onClick={submit}
              disabled={!canSubmit || status === "saving"}
              className="w-full rounded-xl bg-ramp-blue px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              {status === "saving" ? "Saving…" : "Submit Temp Check"}
            </button>

            <div className="rounded-xl border border-ramp-border bg-ramp-bg/40 p-3 text-xs text-ramp-muted">
              Tip: leave “Checked By” filled so you can rapid-fire multiple aircraft.
            </div>
          </div>
        </div>

        {/* Recent card */}
        <div className="rounded-2xl border border-ramp-border bg-ramp-panel p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-ramp-text">
                Recent Checks
              </div>
              <div className="mt-1 text-xs text-ramp-muted">
                Showing last 10 for <span className="font-semibold text-ramp-text">{tail || "—"}</span>
              </div>
            </div>
            <Chip
              label={recent.length ? "LIVE" : "EMPTY"}
              tone={recent.length ? "good" : "warn"}
            />
          </div>

          <div className="mt-4 space-y-3">
            {recent.length === 0 ? (
              <div className="rounded-xl border border-ramp-border bg-ramp-bg/40 p-4 text-sm text-ramp-muted">
                No recent checks found yet.
              </div>
            ) : (
              recent.map((r) => (
                <div key={r.id} className="rounded-2xl border border-ramp-border bg-ramp-bg/40 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="text-2xl font-bold text-ramp-text">
                          {r.temp_f}°F
                        </div>
                        <Chip label={r.temp_f >= 80 ? "HOT" : r.temp_f <= 60 ? "COOL" : "OK"} tone={r.temp_f >= 80 ? "warn" : r.temp_f <= 60 ? "warn" : "good"} />
                      </div>
                      <div className="mt-1 text-xs text-ramp-muted">
                        {r.checked_by}{r.notes ? ` • ${r.notes}` : ""}
                      </div>
                    </div>

                    <div className="text-right text-xs text-ramp-muted">
                      {formatWhen(r.checked_at)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 rounded-xl border border-ramp-border bg-ramp-bg/40 p-3 text-xs text-ramp-muted">
            Next upgrade: “Due / Overdue” countdown per tail + quick switch between all tails.
          </div>
        </div>
      </div>
    </div>
  )
}
