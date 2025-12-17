import { useEffect, useMemo, useState } from "react"
import { supabase } from "../../lib/supabase"

import Panel from "../../components/ui/Panel"
import StatusPill from "../../components/ui/StatusPill"
import CabinHistoryModal from "./CabinHistoryModal"
import RecordTempModal from "./RecordTempModal"
import { localOpsDateISO } from "../../utils/date"

const DUE_SOON_MINUTES = 10

// OMA (Eppley) fallback coords
const STATION_COORDS = {
  OMA: { lat: 41.3032, lon: -95.8941, tz: "America/Chicago" },
}

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

// --- Real-time weather (Open-Meteo, no API key)
async function fetchOutsideTempF(station = "OMA") {
  const s = STATION_COORDS[station] ?? STATION_COORDS.OMA

  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${encodeURIComponent(s.lat)}` +
    `&longitude=${encodeURIComponent(s.lon)}` +
    `&current=temperature_2m` +
    `&temperature_unit=fahrenheit` +
    `&timezone=${encodeURIComponent(s.tz)}`

  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) throw new Error(`Weather fetch failed: HTTP ${res.status}`)

  const json = await res.json()
  const temp = json?.current?.temperature_2m
  const time = json?.current?.time

  if (typeof temp !== "number" || !Number.isFinite(temp)) {
    throw new Error("Weather fetch failed: missing temperature")
  }

  return {
    tempF: Math.round(temp),
    observedAtISO: time ?? new Date().toISOString(),
    source: "open-meteo",
  }
}

export default function CabinListScreen({
  station = "OMA",
  activeTab = "cabin",
  onNav = () => {},
  outsideTempF,
  setOutsideTempF,
}) {
  const opsDate = useMemo(() => localOpsDateISO(), [])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [tails, setTails] = useState([])
  const [checks, setChecks] = useState([])
  const [source, setSource] = useState("")

  // cabin UI
  const [selectedTail, setSelectedTail] = useState(null)
  const [recordTail, setRecordTail] = useState(null)

  // weather UI
  const [weatherStatus, setWeatherStatus] = useState("idle") // idle | live | stale | error | loading
  const [weatherMeta, setWeatherMeta] = useState({ observedAtISO: null, source: null })
  const [manualMode, setManualMode] = useState(false)
  const [manualTemp, setManualTemp] = useState(
    String(Number.isFinite(Number(outsideTempF)) ? outsideTempF : 6)
  )

  const freq = frequencyMinutes(outsideTempF)

  const loadTailsForTonight = async () => {
    const { data, error: err } = await supabase
      .from("nightly_aircraft")
      .select("tail")
      .eq("station", station)
      .eq("ops_date", opsDate)
      .order("tail", { ascending: true })

    if (err) return { tails: null, err }

    const list = (data ?? []).map((r) => r.tail)
    return { tails: list, err: null }
  }

  const loadTailsFallback = async () => {
    const { data, error: err } = await supabase
      .from("aircraft")
      .select("tail")
      .eq("active", true)
      .order("tail", { ascending: true })

    if (err) return { tails: null, err }

    const list = (data ?? []).map((r) => r.tail)
    return { tails: list, err: null }
  }

  const loadChecks = async (tailList) => {
    if (!tailList?.length) return []

    const { data, error: err } = await supabase
      .from("cabin_temp_checks")
      .select("id, tail, temp_f, checked_by, checked_at, notes")
      .in("tail", tailList)
      .order("checked_at", { ascending: false })
      .limit(500)

    if (err) throw err
    return data ?? []
  }

  const refreshWeather = async () => {
    try {
      setWeatherStatus("loading")
      const w = await fetchOutsideTempF(station)
      setOutsideTempF(w.tempF)
      setWeatherMeta({ observedAtISO: w.observedAtISO, source: w.source })
      setWeatherStatus("live")
      setManualMode(false)
    } catch (e) {
      // If we had live before, mark it stale; otherwise show error
      setWeatherStatus((prev) => (prev === "live" ? "stale" : "error"))
    }
  }

  const applyManual = () => {
    const n = Number(manualTemp)
    if (!Number.isFinite(n)) return
    setOutsideTempF(Math.round(n))
    setManualMode(true)
    setWeatherStatus("stale")
  }

  const load = async () => {
    setError("")
    setLoading(true)

    // 1) Try nightly_aircraft
    const primary = await loadTailsForTonight()
    if (primary.err) {
      setError(`Nightly aircraft load failed: ${primary.err.message}`)
      setLoading(false)
      return
    }

    let tailList = primary.tails ?? []
    if (tailList.length > 0) {
      setSource(`Tonight’s list (${opsDate})`)
    } else {
      // 2) Fallback to aircraft table
      const fallback = await loadTailsFallback()
      if (fallback.err) {
        setError(`Aircraft fallback load failed: ${fallback.err.message}`)
        setLoading(false)
        return
      }
      tailList = fallback.tails ?? []
      setSource("Fallback: aircraft table")
    }

    setTails(tailList)

    try {
      const rows = await loadChecks(tailList)
      setChecks(rows)
    } catch (e) {
      setChecks([])
      setError(`Cabin checks load failed: ${e.message}`)
      setLoading(false)
      return
    }

    setLoading(false)
  }

  // Initial load + interval refresh for data
  useEffect(() => {
    load()
    const id = setInterval(load, 30 * 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Weather: initial fetch + refresh every 5 minutes (unless manual mode)
  useEffect(() => {
    refreshWeather()
    const id = setInterval(() => {
      if (!manualMode) refreshWeather()
    }, 5 * 60 * 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [station, manualMode])

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

      return { tail, latest, minsSince, minsRemaining, status, tone }
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

  const weatherPill = (() => {
    if (manualMode) return { label: "MANUAL", tone: "warn" }
    if (weatherStatus === "live") return { label: "LIVE", tone: "good" }
    if (weatherStatus === "loading") return { label: "UPDATING", tone: "warn" }
    if (weatherStatus === "stale") return { label: "STALE", tone: "warn" }
    return { label: "ERROR", tone: "danger" }
  })()

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
              <div className="mt-1 text-[11px] text-ramp-muted">
                Source: <span className="text-ramp-text">{source || "—"}</span>
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

          {/* Outside temp (LIVE weather + manual fallback) */}
          <div className="mt-3 rounded-2xl bg-white/4 p-3 ring-1 ring-white/10">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="text-xs text-ramp-muted">Outside Temp</div>
                  <StatusPill label={weatherPill.label} tone={weatherPill.tone} />
                </div>

                <div className="mt-1 text-sm font-semibold text-ramp-text">
                  {outsideTempF ?? "—"}°F • Rule: &lt; 10°F → 30 min • ≥ 10°F → 60 min
                </div>

                <div className="mt-1 text-[11px] text-ramp-muted">
                  {weatherMeta?.source ? `Source: ${weatherMeta.source}` : "Source: —"}
                  {weatherMeta?.observedAtISO ? ` • observed ${formatTime(weatherMeta.observedAtISO)}` : ""}
                </div>

                {weatherStatus === "error" ? (
                  <div className="mt-2 text-[11px] text-ramp-muted">
                    Weather fetch failed. Use Manual Override or try Refresh Weather.
                  </div>
                ) : null}
              </div>

              <div className="shrink-0 flex flex-col items-end gap-2">
                <button
                  onClick={refreshWeather}
                  className="rounded-xl bg-white/6 px-3 py-2 text-xs font-semibold ring-1 ring-white/12 hover:bg-white/8 active:scale-[0.99] transition"
                >
                  Refresh Weather
                </button>

                <button
                  onClick={() => setManualMode((v) => !v)}
                  className="rounded-xl bg-white/6 px-3 py-2 text-xs font-semibold ring-1 ring-white/12 hover:bg-white/8 active:scale-[0.99] transition"
                >
                  {manualMode ? "Exit Manual" : "Manual Override"}
                </button>
              </div>
            </div>

            {manualMode ? (
              <div className="mt-3 rounded-2xl bg-ramp-panel2 p-3 ring-1 ring-white/10">
                <div className="text-xs font-semibold text-ramp-muted">Set Outside Temp (°F)</div>
                <div className="mt-2 flex gap-2">
                  <input
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="e.g., 6"
                    value={manualTemp}
                    onChange={(e) => setManualTemp(e.target.value)}
                    className="w-full rounded-xl bg-ramp-panel px-4 py-3 text-sm font-extrabold text-ramp-text ring-1 ring-white/10 outline-none focus:ring-white/25"
                  />
                  <button
                    onClick={applyManual}
                    className="rounded-xl bg-[rgb(var(--ramp-amber)/0.18)] px-3 py-2 text-xs font-extrabold text-[rgb(var(--ramp-amber))] ring-1 ring-[rgb(var(--ramp-amber)/0.35)] hover:bg-[rgb(var(--ramp-amber)/0.24)] active:scale-[0.99] transition"
                  >
                    Apply
                  </button>
                </div>
                <div className="mt-2 text-[11px] text-ramp-muted">
                  Manual mode is a backup. Use “Refresh Weather” to return to live feed.
                </div>
              </div>
            ) : null}
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
                No aircraft found. Add tails in <span className="text-ramp-text font-semibold">Night Setup</span>.
              </div>
            ) : (
              rows.map((r) => {
                const lastTemp = r.latest?.temp_f
                const lastTime = r.latest?.checked_at
                const remaining = r.minsRemaining

                return (
                  <div key={r.tail} className="rounded-2xl bg-ramp-panel2 p-4 ring-1 ring-white/10">
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
        outsideTempF={outsideTempF}
        onClose={() => setRecordTail(null)}
        onSaved={load}
      />

      <BottomNav active={activeTab} onNav={onNav} />
    </div>
  )
}