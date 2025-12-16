import { useEffect, useMemo, useState } from "react"

import Panel from "./components/ui/Panel"
import Modal from "./components/ui/Modal"
import StatCard from "./components/ui/StatCard"
import ListItem from "./components/ui/ListItem"
import ReadinessRow from "./components/ui/ReadinessRow"
import ActivityLine from "./components/ui/ActivityLine"

import { minutesAgo } from "./lib/time"

import CabinTempCard from "./components/cabin/CabinTempCard"
import AircraftHistoryView from "./components/cabin/AircraftHistoryView"

import { aircraftList, cabinTempHistoryDemo } from "./data/demo/cabinTempDemo"
import { DUE_SOON_MINUTES, getCabinCheckFrequencyMinutes } from "./data/rules/schedules"

// --------------------------------------
// DEMO WEATHER (later: real weather feed)
// --------------------------------------
const weatherDemo = {
  outsideTempF: 6, // change to test: 6 => 30-min checks, 15 => 60-min checks
}

// --------------------------------------
// APP
// --------------------------------------
export default function App() {
  const [isCabinModalOpen, setIsCabinModalOpen] = useState(false)
  const [selectedTail, setSelectedTail] = useState(null)
  const [nowTick, setNowTick] = useState(Date.now())

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 30 * 1000)
    return () => clearInterval(id)
  }, [])

  const closeCabinModal = () => {
    setIsCabinModalOpen(false)
    setSelectedTail(null)
  }

  const cabinFrequencyMinutes = getCabinCheckFrequencyMinutes(weatherDemo.outsideTempF)

  const cabinCards = useMemo(() => {
    void nowTick

    return aircraftList
      .map((tail) => {
        const history = cabinTempHistoryDemo[tail] ?? []
        const latest = history[0]

        const minsSince = latest ? minutesAgo(latest.checkedAt) : 9999
        const minsRemaining = cabinFrequencyMinutes - minsSince

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
          latestValueF: latest?.valueF ?? null,
          latestBy: latest?.checkedBy ?? "—",
          minsSince: latest ? minsSince : null,
          minsRemaining: latest ? minsRemaining : null,
          status,
          tone,
          historyCount: history.length,
        }
      })
      .sort((a, b) => {
        const rank = (t) =>
          t === "danger" ? 0 : t === "warn" ? 1 : t === "good" ? 2 : 3
        const r = rank(a.tone) - rank(b.tone)
        if (r !== 0) return r
        const ar = a.minsRemaining ?? 9999
        const br = b.minsRemaining ?? 9999
        return ar - br
      })
  }, [cabinFrequencyMinutes, nowTick])

  const overdueCount = cabinCards.filter((x) => x.tone === "danger").length
  const dueSoonCount = cabinCards.filter((x) => x.tone === "warn").length

  const topCard = cabinCards[0]
  const topValue = topCard?.latestValueF ?? null
  const topTail = topCard?.tail ?? "—"
  const topNextDue =
    topCard?.minsRemaining != null ? Math.max(0, topCard.minsRemaining) : null

  return (
    <div className="min-h-screen bg-ramp-bg text-ramp-text">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Ramp Birds Eye View
            </h1>
            <p className="text-sm text-ramp-muted">
              Checks & balances dashboard
            </p>
          </div>
          <div className="flex gap-2">
            <button className="rounded-lg border border-ramp-border bg-ramp-panel px-3 py-2 text-sm hover:opacity-90">
              Refresh
            </button>
            <button className="rounded-lg bg-ramp-blue px-3 py-2 text-sm font-semibold text-white hover:opacity-90">
              Add Check
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard title="Checks Due" value="12" note="Next 60 minutes" />
          <StatCard
            title="Overdue"
            value={String(overdueCount)}
            note="Cabin temp module"
            tone={overdueCount > 0 ? "danger" : "good"}
          />
          <StatCard
            title="Cabin Temp"
            value={topValue == null ? "—" : `${topValue}°F`}
            note={`${topTail} • next due ${topNextDue == null ? "—" : `${topNextDue}m`}`}
            clickable
            onClick={() => setIsCabinModalOpen(true)}
          />
          <StatCard title="Deice Trucks" value="3 / 4" note="Operational" />
          <StatCard title="Handoff Ready" value="86%" note="Shift completion" />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Panel title="Overdue & At-Risk">
            <ul className="space-y-3 text-sm">
              <ListItem
                label="Cabin Temperature Checks"
                meta={`${overdueCount} overdue • ${dueSoonCount} due soon • outside ${weatherDemo.outsideTempF}°F`}
                badge={
                  overdueCount > 0 ? "ATTENTION" : dueSoonCount > 0 ? "DUE SOON" : "OK"
                }
                badgeTone={
                  overdueCount > 0 ? "danger" : dueSoonCount > 0 ? "warn" : "good"
                }
                onClick={() => setIsCabinModalOpen(true)}
              />
              <ListItem label="RON Walkaround" meta="Due in 12 min" badge="DUE SOON" badgeTone="warn" />
              <ListItem label="GSE Fuel Log" meta="Due in 45 min" badge="DUE SOON" badgeTone="warn" />
            </ul>
          </Panel>

          <Panel
            title="Cabin Temperature"
            clickable
            onClick={() => setIsCabinModalOpen(true)}
          >
            <div className="rounded-xl border border-ramp-border bg-ramp-bg/40 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold">
                    {topValue == null ? "—" : `${topValue}°F`}
                  </div>
                  <div className="text-xs text-ramp-muted">
                    Outside {weatherDemo.outsideTempF}°F • Checks every {cabinFrequencyMinutes} minutes
                  </div>
                </div>
                <div className="text-right text-xs text-ramp-muted">
                  <div>
                    {overdueCount} overdue • {dueSoonCount} due soon
                  </div>
                  <div>Click to view all aircraft</div>
                </div>
              </div>

              <div className="mt-4 flex h-24 items-center justify-center rounded-lg border border-dashed border-ramp-border text-ramp-muted text-sm">
                Detail view opens on click
              </div>
            </div>
          </Panel>

          <Panel title="Deice & Equipment Readiness">
            <div className="space-y-3 text-sm">
              <ReadinessRow label="Deice Trucks Operational" value="3 / 4" tone="warn" />
              <ReadinessRow label="Critical GSE OOS" value="2" tone="warn" />
              <ReadinessRow label="Spill Kits Stocked" value="OK" tone="good" />
            </div>
            <div className="mt-4 text-xs text-ramp-muted">
              Last verified: 22 min ago
            </div>
          </Panel>
        </div>

        <div className="mt-6">
          <Panel title="Recent Actions">
            <div className="space-y-3 text-sm">
              <ActivityLine who="T. Begum" what="Recorded cabin temp: 73°F" when="12 min ago" />
              <ActivityLine who="A. Larson" what="Marked Deice Truck #2 OOS" when="35 min ago" />
              <ActivityLine who="J. Palmore" what="Completed RON check" when="58 min ago" />
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
            ? `Outside ${weatherDemo.outsideTempF}°F • Required every ${cabinFrequencyMinutes} minutes`
            : `Outside ${weatherDemo.outsideTempF}°F • Check every ${cabinFrequencyMinutes} minutes • ${aircraftList.length} aircraft`
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
            history={cabinTempHistoryDemo[selectedTail] ?? []}
            onBack={() => setSelectedTail(null)}
            frequencyMinutes={cabinFrequencyMinutes}
          />
        )}
      </Modal>
    </div>
  )
}
