export function minutesAgo(isoTime) {
  return Math.max(
    0,
    Math.round((Date.now() - new Date(isoTime).getTime()) / 60000)
  )
}

export function formatLocalDateTime(isoTime) {
  try {
    const d = new Date(isoTime)
    return d.toLocaleString([], {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return isoTime
  }
}
