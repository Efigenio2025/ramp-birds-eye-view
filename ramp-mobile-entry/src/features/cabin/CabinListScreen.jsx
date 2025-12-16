import { useEffect, useMemo, useState } from "react"
import { supabase } from "../../lib/supabase"

import Panel from "../../components/ui/Panel"
import StatusPill from "../../components/ui/StatusPill"
import CabinHistoryModal from "./CabinHistoryModal"
import RecordTempModal from "./RecordTempModal"

const DUE_SOON_MINUTES = 10

function minutesAgo(iso) {
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return null
  const diff = Date.now() - t
  return Math.floor(diff / 60000)
}

function frequencyMinutes(outsideTempF) {
  if (outsideTempF == null) return 60
  return outsideTempF < 10 ? 30 : 60
}

function statusFromRemaining(minsRemaining) {
  if (minsRemaining == null) return "NO DATA"
  if (minsRemaining <= 0) return "OVERDUE"
  if (minsRemaining <= DUE_SOON_MINUTES) return "DUE SOON"
  return "OK"
}

function toneFromStatus(status) {
  if (status === "OVERDUE") return "danger"
  if (status === "DUE SOON") return "warn"
  if (status === "OK") return "good"
  return "muted"
}

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  } catch {
    return "—"
  }
}

function BottomNav({ active, onNav }) {
  const items = [
    { key: "dashboard", label: "Dashboard" },
    { key: "cabin", label: "Cabin Temp" },
    { key: "deice", label: "Deice" },
    { key: "gse", label: "GSE" },
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

export default function CabinListScreen({
  station = "OMA",
  activeTab = "cabin",
  onNav = () => {},
  outsideTempF,
  setOutsideTempF,
}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [tails, setTails] = useState([])
  const [checks, setChecks] = useState([])

  const [selectedTail, setSelectedTail] = useState(null)
  const [recordTail, setRecordTail] = useState(null)

  const freq = frequencyMinutes(outsideTempF)

  const load = async () => {
    setError("")
    setLoading(true)

    const { data: aircraftRows, error: aircraftErr } = await supabase
      .from("aircraft")
      .select("tail")
      .eq("active", true)
      .order("tail", { ascending: true })

    if (aircraftErr) {
      setError(`Aircraft load failed: ${aircraftErr.message}`)
      setLoading(false)
      return
    }

    const tailList = (aircraftRows ?? []).map((r) => r.tail)
    setTails(tailList)

    if (tailList.length === 0) {
      setChecks([])
      setLoading(false)
      return
    }

    const { data: checkRows, error: checkErr } = await supabase
      .from("cabin_temp_checks")
      .select("id, tail, temp_f, checked_by, checked_at, notes")
      .in("tail", tailList)
      .order("checked_at", { ascending: false })
      .limit(500)

    if (checkErr) {
      setError(`Cabin checks load failed: ${checkErr.message}`)
      setChecks([])
      setLoading(false)
      return
    }

    setChecks(checkRows ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 30 * 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const rows = useMemo(() => {
    const latestByTail = new Map()

    for (const r of checks) {
      if (!latestByTail.has(r.tail)) latestByTail.set(r.tail, r)
    }

    const list = tails.map((tail) => {
      const latest = latestByTail.get(tail)
      const minsSince = latest ? minutesAgo(latest.checked_at) : null
      const minsRemaining = latest && minsSince != null ? freq - minsSince : null

      const status = latest ? statusFromRemaining(minsRemaining) : "NO DATA"
      const tone = toneFromStatus(status)

      return {
        tail,
        latest,
        minsSince,
        minsRemaining,
        status,
        tone,
      }
    })

    const rank = (tone) => (tone === "danger" ? 0 : tone === "warn" ? 1 : tone === "good" ? 2 : 3)
    list.sort((a, b) => {
      const r = rank(a.tone) - rank(b.tone)
      if (r !== 0) return r
      return (a.minsRemaining ?? 9999) - (b.minsRemaining ?? 9999)
    })

    return list
  }, [checks, tails, freq])

  const overdueCount = rows.filter((r) => r.tone === "danger").length
  const dueSoonCount = rows.filter((r) => r.tone === "warn").length

  const headerTone =
    loading ? "warn" : overdueCount > 0 ? "danger" : dueSoonCount > 0 ? "warn" : "good"
  const headerLabel =
    loading ? "LOADING" : overdueCount > 0 ? "ATTENTION" : dueSoonCount > 0 ? "DUE SOON" : "OK"

  return (
    <div className="min-h-screen bg-ramp-bg text-ramp-text">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-ramp-bg/80 backdrop-blur ring-1 ring-white/10">
        <div className="mx-auto max-w-md px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-lg font-extrabold leading-tight">Cabin Temp</div>
              <div className="mt-1 text-sm text-ramp-muted">
                {station} • checks every {freq} min • {tails.length} aircraft
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={load}
                className="rounded-xl bg-white/6 px-3 py-2 text-xs font-semibold ring-1 ring-white/12 hover:bg-white/8 active:scale-[0.99] transition"
              >
                Refresh
              </button>
              <StatusPill label={headerLabel} tone={headerTone} />
            </div>
          </div>

          {/* Outside temp (manual for now) */}
          <div className="mt-3 rounded-2xl bg-white/4 p-3 ring-1 ring-white/10">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-ramp-muted">
                Outside Temp (manual for now)
                <div className="mt-1 text-sm font-semibold text-ramp-text">
                  {outsideTempF}°F • Rule: &lt; 10°F → 30 min • ≥ 10°F → 60 min
                </div>
              </div>

              <div className="w-40">
                <input
                  type="range"
                  min={-10}
                  max={40}
                  value={outsideTempF}
                  onChange={(e) => setOutsideTempF(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {error ? (
            <div className="mt-3 rounded-2xl bg-[rgb(var(--ramp-red)/0.15)] p-3 ring-1 ring-[rgb(var(--ramp-red)/0.3)]">
              <div className="text-sm font-semibold text-[rgb(var(--ramp-red))]">Error</div>
              <div className="mt-1 text-xs text-ramp-muted">{error}</div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-md px-4 pb-28 pt-4">
        <Panel
          title="Aircraft List"
          subtitle={
            loading
              ? "Loading…"
              : `${overdueCount} overdue • ${dueSoonCount} due soon • record a check or tap for history`
          }
          right={
            <button
              onClick={() => onNav("dashboard")}
              className="rounded-xl bg-white/6 px-3 py-2 text-xs font-semibold ring-1 ring-white/12 hover:bg-white/8 active:scale-[0.99] transition"
            >
              Back
            </button>
          }
        >
          <div className="space-y-3">
            {rows.length === 0 ? (
              <div className="rounded-2xl bg-ramp-panel2 p-4 text-sm text-ramp-muted ring-1 ring-white/10">
                No aircraft found.
              </div>
            ) : (
              rows.map((r) => {
                const lastTemp = r.latest?.temp_f
                const lastTime = r.latest?.checked_at
                const remaining = r.minsRemaining

                return (
                  <div
                    key={r.tail}
                    className="rounded-2xl bg-ramp-panel2 p-4 ring-1 ring-white/10"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-extrabold tracking-wide">{r.tail}</div>
                        <div className="mt-1 text-xs text-ramp-muted">
                          Last:{" "}
                          <span className="text-ramp-text font-semibold">
                            {lastTemp == null ? "—" : `${lastTemp}°F`}
                          </span>
                          {lastTime ? (
                            <>
                              {" "}
                              • {formatTime(lastTime)} • {r.minsSince ?? "—"}m ago
                            </>
                          ) : (
                            " • no data"
                          )}
                        </div>
                        <div className="mt-2 text-xs text-ramp-muted">
                          Next due:{" "}
                          <span className="text-ramp-text font-semibold">
                            {remaining == null ? "—" : `${Math.max(0, remaining)}m`}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 flex flex-col items-end gap-2">
                        <StatusPill label={r.status} tone={r.tone} />
                        <button
                          onClick={() => setSelectedTail(r.tail)}
                          className="rounded-xl bg-white/8 px-3 py-2 text-[11px] font-semibold ring-1 ring-white/12 hover:bg-white/10 active:scale-[0.99] transition"
                        >
                          History
                        </button>
                        <button
                          onClick={() => setRecordTail(r.tail)}
                          className="rounded-xl bg-[rgb(var(--ramp-green)/0.18)] px-3 py-2 text-[11px] font-extrabold text-[rgb(var(--ramp-green))] ring-1 ring-[rgb(var(--ramp-green)/0.35)] hover:bg-[rgb(var(--ramp-green)/0.24)] active:scale-[0.99] transition"
                        >
                          Record
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </Panel>
      </div>

      <CabinHistoryModal
        open={!!selectedTail}
        tail={selectedTail}
        onClose={() => setSelectedTail(null)}
        checks={checks}
      />

      <RecordTempModal
        open={!!recordTail}
        tail={recordTail}
        station={station}
        onClose={() => setRecordTail(null)}
        onSaved={load}
      />

      <BottomNav active={activeTab} onNav={onNav} />
    </div>
  )
}