import { useEffect, useMemo, useState } from "react"
import { supabase } from "../../lib/supabase"
import Panel from "../../components/ui/Panel"
import StatusPill from "../../components/ui/StatusPill"
import { localOpsDateISO } from "../../utils/date"

function BottomNav({ active, onNav }) {
  const items = [
    { key: "dashboard", label: "Dashboard" },
    { key: "cabin", label: "Cabin Temp" },
    { key: "night", label: "Night Setup" },
    { key: "deice", label: "Deice" },
    { key: "notes", label: "Notes" },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 bg-ramp-bg/85 backdrop-blur ring-1 ring-white/10">
      <div className="mx-auto flex max-w-md items-center justify-between px-3 py-2">
        {items.map((it) => {
          const isActive = active === it.key
          return (
            <button
              key={it.key}
              onClick={() => onNav(it.key)}
              className={[
                "flex flex-1 flex-col items-center justify-center rounded-xl px-2 py-2 text-[11px] font-semibold transition",
                isActive
                  ? "text-ramp-text bg-white/8 ring-1 ring-white/10"
                  : "text-ramp-muted hover:bg-white/5",
              ].join(" ")}
            >
              {it.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function NightAircraftScreen({ station = "OMA", activeTab = "night", onNav = () => {} }) {
  const opsDate = useMemo(() => localOpsDateISO(), [])
  const [tails, setTails] = useState([])
  const [tailInput, setTailInput] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const load = async () => {
    setError("")
    setLoading(true)

    const { data, error: err } = await supabase
      .from("nightly_aircraft")
      .select("id, tail")
      .eq("station", station)
      .eq("ops_date", opsDate)
      .order("tail", { ascending: true })

    if (err) {
      setError(err.message)
      setTails([])
      setLoading(false)
      return
    }

    setTails(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addTail = async () => {
    const tail = tailInput.trim().toUpperCase()
    if (!tail) return

    setSaving(true)
    setError("")

    const { error: err } = await supabase.from("nightly_aircraft").insert([
      { station, ops_date: opsDate, tail },
    ])

    if (err) {
      setError(err.message)
      setSaving(false)
      return
    }

    setTailInput("")
    setSaving(false)
    load()
  }

  const removeTail = async (id) => {
    setSaving(true)
    setError("")
    const { error: err } = await supabase.from("nightly_aircraft").delete().eq("id", id)
    if (err) {
      setError(err.message)
      setSaving(false)
      return
    }
    setSaving(false)
    load()
  }

  return (
    <div className="min-h-screen bg-ramp-bg text-ramp-text">
      <div className="sticky top-0 z-10 bg-ramp-bg/80 backdrop-blur ring-1 ring-white/10">
        <div className="mx-auto max-w-md px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-lg font-extrabold leading-tight">Night Setup</div>
              <div className="mt-1 text-sm text-ramp-muted">
                {station} • Date: {opsDate}
              </div>
            </div>

            <StatusPill label={saving ? "SAVING…" : loading ? "LOADING" : "READY"} tone={saving ? "warn" : "muted"} />
          </div>

          {error ? (
            <div className="mt-3 rounded-2xl bg-[rgb(var(--ramp-red)/0.15)] p-3 ring-1 ring-[rgb(var(--ramp-red)/0.3)]">
              <div className="text-sm font-semibold text-[rgb(var(--ramp-red))]">Error</div>
              <div className="mt-1 text-xs text-ramp-muted">{error}</div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 pb-28 pt-4">
        <Panel title="Tonight’s Aircraft" subtitle="Add/remove tails for tonight’s worklist">
          <div className="space-y-3">
            <div className="rounded-2xl bg-ramp-panel2 p-4 ring-1 ring-white/10">
              <label className="block text-xs font-semibold text-ramp-muted">Add Tail</label>
              <div className="mt-2 flex gap-2">
                <input
                  value={tailInput}
                  onChange={(e) => setTailInput(e.target.value)}
                  placeholder="N123PD"
                  className="w-full rounded-xl bg-ramp-panel px-4 py-3 text-sm text-ramp-text ring-1 ring-white/10 outline-none focus:ring-white/25"
                />
                <button
                  onClick={addTail}
                  disabled={saving || !tailInput.trim()}
                  className={[
                    "shrink-0 rounded-xl px-4 py-3 text-sm font-extrabold ring-1 transition",
                    !saving && tailInput.trim()
                      ? "bg-white/10 text-ramp-text ring-white/20 hover:bg-white/15 active:scale-[0.99]"
                      : "bg-white/5 text-ramp-muted ring-white/10 cursor-not-allowed",
                  ].join(" ")}
                >
                  Add
                </button>
              </div>
            </div>

            {tails.length === 0 ? (
              <div className="rounded-2xl bg-ramp-panel2 p-4 text-sm text-ramp-muted ring-1 ring-white/10">
                No tails added for tonight yet.
              </div>
            ) : (
              <div className="space-y-2">
                {tails.map((t) => (
                  <div key={t.id} className="flex items-center justify-between rounded-2xl bg-ramp-panel2 p-4 ring-1 ring-white/10">
                    <div className="text-sm font-extrabold tracking-wide">{t.tail}</div>
                    <button
                      onClick={() => removeTail(t.id)}
                      className="rounded-xl bg-white/8 px-3 py-2 text-[11px] font-semibold ring-1 ring-white/12 hover:bg-white/10 active:scale-[0.99] transition"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Panel>
      </div>

      <BottomNav active={activeTab} onNav={onNav} />
    </div>
  )
}