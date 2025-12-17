import { useEffect, useMemo, useState } from "react"

import Panel from "./components/ui/Panel"
import Modal from "./components/ui/Modal"
import StatCard from "./components/ui/StatCard"
import ListItem from "./components/ui/ListItem"
import ReadinessRow from "./components/ui/ReadinessRow"
import ActivityLine from "./components/ui/ActivityLine"

import CabinTempCard from "./components/cabin/CabinTempCard"
import AircraftHistoryView from "./components/cabin/AircraftHistoryView"

import { supabase } from "./lib/supabase"
import { DUE_SOON_MINUTES, getCabinCheckFrequencyMinutes } from "./data/rules/schedules"

export default function Dashboard() {
  // If you have station selection later, wire it here.
  const station = "OMA"

  const [isCabinModalOpen, setIsCabinModalOpen] = useState(false)
  const [selectedTail, setSelectedTail] = useState(null)

  const [tails, setTails] = useState([])
  const [cabinChecks, setCabinChecks] = useState([]) // recent checks across tails
  const [historyForTail, setHistoryForTail] = useState([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // -----------------------------
  // LIVE: outside temp from Mobile Entry (latest cabin_temp_checks.outside_temp_f)
  // -----------------------------
  const [outsideTempF, setOutsideTempF] = useState(null)
  const [weatherMeta, setWeatherMeta] = useState({ checked_at: null, source: "mobile" })

  // Tick so "mins ago" / "due in" updates on screen
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  const cabinFrequencyMinutes = getCabinCheckFrequencyMinutes(outsideTempF)

  const closeCabinModal = () => {
    setIsCabinModalOpen(false)
    setSelectedTail(null)
    setHistoryForTail([])
  }

  // --------------------------------------
  // Load outside temp (station-wide latest snapshot)
  // --------------------------------------
  const loadOutsideTemp = async () => {
    try {
      // Try with station filter first
      let query = supabase
        .from("cabin_temp_checks")
        .select("outside_temp_f, checked_at")
        .not("outside_temp_f", "is", null)
        .order("checked_at", { ascending: false })
        .limit(1)

      query = query.eq("station", station)

      let { data, error: err } = await query

      // If station column doesn't exist, retry without it
      if (err?.message?.toLowerCase().includes("station")) {
        const retry = await supabase
          .from("cabin_temp_checks")
          .select("outside_temp_f, checked_at")
          .not("outside_temp_f", "is", null)
          .order("checked_at", { ascending: false })
          .limit(1)

        data = retry.data
        err = retry.error
      }

      if (err) return

      const row = data?.[0]
      setOutsideTempF(row?.outside_temp_f ?? null)
      setWeatherMeta({ checked_at: row?.checked_at ?? null, source: "mobile" })
    } catch {
      // swallow so we don't white-screen
    }
  }

  useEffect(() => {
    loadOutsideTemp()
    const id = setInterval(loadOutsideTemp, 60_000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [station])

  // --------------------------------------
  // Load aircraft list + recent checks
  // --------------------------------------
  const loadCabinSummary = async () => {
    setError("")
    setLoading(true)

    // 1) Active aircraft
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

    // 2) Recent cabin temp checks across those tails
    if (tailList.length === 0) {
      setCabinChecks([])
      setLoading(false)
      return
    }

    const { data: checksRows, error: checksErr } = await supabase
      .from("cabin_temp_checks")
      .select("id, tail, temp_f, checked_by, checked_at, notes, outside_temp_f")
      .in("tail", tailList)
      .order("checked_at", { ascending: false })
      .limit(300)

    if (checksErr) {
      setError(`Cabin checks load failed: ${checksErr.message}`)
      setCabinChecks([])
      setLoading(false)
      return
    }

    setCabinChecks(checksRows ?? [])
    setLoading(false)

    // Also refresh outside temp snapshot opportunistically
    // (helps when mobile just wrote a new check)
    loadOutsideTemp()
  }

  // Initial load + refresh every 30 seconds
  useEffect(() => {
    loadCabinSummary()
    const id = setInterval(loadCabinSummary, 30 * 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load full history when a tail is selected (modal drill-down)
  useEffect(() => {
    const loadHistory = async () => {
      if (!selectedTail) return

      const { data, error: err } = await supabase
        .from("cabin_temp_checks")
        .select("id, tail, temp_f, checked_by, checked_at, notes, outside_temp_f")
        .eq("tail", selectedTail)
        .order("checked_at", { ascending: false })
        .limit(80)

      if (err) {
        setError(`History load failed: ${err.message}`)
        setHistoryForTail([])
        return
      }

      const mapped = (data ?? []).map((r) => ({
        valueF: r.temp_f,
        checkedBy: r.checked_by,
        checkedAt: r.checked_at,
        notes: r.notes ?? null,
        outsideTempF: r.outside_temp_f ?? null,
      }))

      setHistoryForTail(mapped)
    }

    loadHistory()
  }, [selectedTail])

  // --------------------------------------
  // Compute cabin cards (latest per tail)
  // --------------------------------------
  const cabinCards = useMemo(() => {
    const byTail = new Map()
    const counts = new Map()

    for (const row of cabinChecks) {
      counts.set(row.tail, (counts.get(row.tail) ?? 0) + 1)
      if (!byTail.has(row.tail)) byTail.set(row.tail, row) // newest due to desc ordering
    }

    const cards = tails.map((tail) => {
      const latest = byTail.get(tail)

      const minsSince = latest
        ? Math.floor((now - new Date(latest.checked_at).getTime()) / 60000)
        : null

      const minsRemaining =
        latest && minsSince != null ? cabinFrequencyMinutes - minsSince : null

      let status = "NO DATA"
      let tone = "warn"

      if (latest) {
        status = "OK"
        tone = "good"

        if (minsRemaining <= 0) {
          status = "OVERDUE"
          tone = "danger"
        } else if (minsRemaining <= DUE_SOON_MINUTES) {
          status = "DUE SOON"
          tone = "warn"
        }
      }

      return {
        tail,
        latestValueF: latest?.temp_f ?? null,
        latestBy: latest?.checked_by ?? "—",
        minsSince,
        minsRemaining,
        status,
        tone,
        historyCount: counts.get(tail) ?? 0,
      }
    })

    const rank = (t) => (t === "danger" ? 0 : t === "warn" ? 1 : t === "good" ? 2 : 3)
    cards.sort((a, b) => {
      const r = rank(a.tone) - rank(b.tone)
      if (r !== 0) return r
      const ar = a.minsRemaining ?? 9999
      const br = b.minsRemaining ?? 9999
      return ar - br
    })

    return cards
  }, [cabinChecks, tails, now, cabinFrequencyMinutes])

  const overdueCount = cabinCards.filter((x) => x.tone === "danger").length
  const dueSoonCount = cabinCards.filter((x) => x.tone === "warn").length

  const topCard = cabinCards[0]
  const topValue = topCard?.latestValueF ?? null
  const topTail = topCard?.tail ?? "—"
  const topNextDue = topCard?.minsRemaining != null ? Math.max(0, topCard.minsRemaining) : null

  const outsideLabel =
    outsideTempF == null ? "—" : `${outsideTempF}°F`

  return (
    <div className="min-h-screen bg-ramp-bg text-ramp-text">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Ramp Birds Eye View</h1>
            <p className="text-sm text-ramp-muted">Display mode • live cabin temp feed</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadCabinSummary}
              className="rounded-lg border border-ramp-border bg-ramp-panel px-3 py-2 text-sm hover:opacity-90"
            >
              Refresh
            </button>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-ramp-border bg-ramp-panel p-4 text-sm">
            <div className="font-semibold text-ramp-red">Error</div>
            <div className="mt-1 text-ramp-muted">{error}</div>
          </div>
        ) : null}

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard title="Checks Due" value="—" note="(coming next)" />
          <StatCard
            title="Overdue"
            value={loading ? "…" : String(overdueCount)}
            note="Cabin temp module"
            tone={!loading && overdueCount > 0 ? "danger" : "good"}
          />
          <StatCard
            title="Cabin Temp"
            value={topValue == null ? "—" : `${topValue}°F`}
            note={`${topTail} • next due ${topNextDue == null ? "—" : `${topNextDue}m`}`}
            clickable
            onClick={() => setIsCabinModalOpen(true)}
          />
          <StatCard title="Deice Trucks" value="—" note="(next module)" />
          <StatCard title="Handoff Ready" value="—" note="(next module)" />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Panel title="Overdue & At-Risk">
            <ul className="space-y-3 text-sm">
              <ListItem
                label="Cabin Temperature Checks"
                meta={
                  loading
                    ? "Loading…"
                    : `${overdueCount} overdue • ${dueSoonCount} due soon • outside ${outsideLabel}`
                }
                badge={
                  loading
                    ? "LOADING"
                    : overdueCount > 0
                      ? "ATTENTION"
                      : dueSoonCount > 0
                        ? "DUE SOON"
                        : "OK"
                }
                badgeTone={
                  loading ? "warn" : overdueCount > 0 ? "danger" : dueSoonCount > 0 ? "warn" : "good"
                }
                onClick={() => setIsCabinModalOpen(true)}
              />
              <ListItem label="RON Walkaround" meta="(next module)" badge="SOON" badgeTone="warn" />
              <ListItem label="GSE Fuel Log" meta="(next module)" badge="SOON" badgeTone="warn" />
            </ul>
          </Panel>

          <Panel title="Cabin Temperature" clickable onClick={() => setIsCabinModalOpen(true)}>
            <div className="rounded-xl border border-ramp-border bg-ramp-bg/40 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold">
                    {topValue == null ? "—" : `${topValue}°F`}
                  </div>
                  <div className="text-xs text-ramp-muted">
                    Outside {outsideLabel} • Checks every {cabinFrequencyMinutes} minutes
                  </div>
                  {weatherMeta.checked_at ? (
                    <div className="mt-1 text-[11px] text-ramp-muted">
                      Last outside snapshot: {new Date(weatherMeta.checked_at).toLocaleString()}
                    </div>
                  ) : null}
                </div>
                <div className="text-right text-xs text-ramp-muted">
                  <div>
                    {loading ? "…" : `${overdueCount} overdue • ${dueSoonCount} due soon`}
                  </div>
                  <div>Click to view all aircraft</div>
                </div>
              </div>

              <div className="mt-4 flex h-24 items-center justify-center rounded-lg border border-dashed border-ramp-border text-ramp-muted text-sm">
                Live feed from Supabase
              </div>
            </div>
          </Panel>

          <Panel title="Deice & Equipment Readiness">
            <div className="space-y-3 text-sm">
              <ReadinessRow label="Deice Trucks Operational" value="—" tone="warn" />
              <ReadinessRow label="Critical GSE OOS" value="—" tone="warn" />
              <ReadinessRow label="Spill Kits Stocked" value="—" tone="good" />
            </div>
            <div className="mt-4 text-xs text-ramp-muted">Next module</div>
          </Panel>
        </div>

        <div className="mt-6">
          <Panel title="Recent Actions">
            <div className="space-y-3 text-sm">
              {cabinChecks.slice(0, 3).map((r) => (
                <ActivityLine
                  key={r.id}
                  who={r.checked_by}
                  what={`Recorded cabin temp: ${r.temp_f}°F (${r.tail})`}
                  when={new Date(r.checked_at).toLocaleString()}
                />
              ))}
              {cabinChecks.length === 0 ? (
                <div className="text-sm text-ramp-muted">No cabin temp checks found yet.</div>
              ) : null}
            </div>
          </Panel>
        </div>
      </div>

      <Modal
        open={isCabinModalOpen}
        onClose={closeCabinModal}
        title={selectedTail ? `Cabin Temp History — ${selectedTail}` : "Cabin Temperature Detail"}
        subtitle={
          selectedTail
            ? `Outside ${outsideLabel} • Required every ${cabinFrequencyMinutes} minutes`
            : `Outside ${outsideLabel} • Check every ${cabinFrequencyMinutes} minutes • ${tails.length} aircraft`
        }
      >
        {!selectedTail ? (
          <>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {cabinCards.map((ac) => (
                <CabinTempCard
                  key={ac.tail}
                  tail={ac.tail}
                  temp={ac.latestValueF}
                  checkedBy={ac.latestBy}
                  minsSince={ac.minsSince}
                  minsRemaining={ac.minsRemaining}
                  status={ac.status}
                  tone={ac.tone}
                  historyCount={ac.historyCount}
                  onClick={() => setSelectedTail(ac.tail)}
                />
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-ramp-border bg-ramp-bg/40 p-3 text-xs text-ramp-muted">
              <div className="font-semibold text-ramp-text">Rule</div>
              <div>• Outside temp &lt; 10°F → check every 30 minutes</div>
              <div>• Outside temp ≥ 10°F → check every 60 minutes</div>
              <div className="mt-2">“Due Soon” is defined as ≤ {DUE_SOON_MINUTES} minutes to the next required check.</div>
              <div className="mt-2">Click an aircraft to view its full history.</div>
            </div>
          </>
        ) : (
          <AircraftHistoryView
            tail={selectedTail}
            history={historyForTail}
            onBack={() => setSelectedTail(null)}
            frequencyMinutes={cabinFrequencyMinutes}
          />
        )}
      </Modal>
    </div>
  )
}