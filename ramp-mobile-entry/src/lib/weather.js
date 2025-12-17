// src/lib/weather.js
// Uses Open-Meteo (no API key) for current temperature.
// OMA (Eppley Airfield): 41.3032, -95.8941

const STATIONS = {
  OMA: { name: "OMA", lat: 41.3032, lon: -95.8941 },
}

export async function fetchOutsideTempF(station = "OMA") {
  const s = STATIONS[station] ?? STATIONS.OMA

  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${encodeURIComponent(s.lat)}` +
    `&longitude=${encodeURIComponent(s.lon)}` +
    `&current=temperature_2m` +
    `&temperature_unit=fahrenheit` +
    `&timezone=America%2FChicago`

  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) throw new Error(`Weather fetch failed: HTTP ${res.status}`)

  const json = await res.json()
  const temp = json?.current?.temperature_2m

  if (typeof temp !== "number" || !Number.isFinite(temp)) {
    throw new Error("Weather fetch failed: missing temperature")
  }

  return {
    tempF: Math.round(temp),
    observedAtISO: json?.current?.time ?? new Date().toISOString(),
    source: "open-meteo",
    station: s.name,
  }
}