// Central place for scheduling rules + thresholds

export const DUE_SOON_MINUTES = 10

// Weather-based frequency rule:
// Outside temp < 10°F => every 30 minutes
// Outside temp >= 10°F => every 60 minutes
export function getCabinCheckFrequencyMinutes(outsideTempF) {
  return outsideTempF < 10 ? 30 : 60
}
