export const aircraftList = ["N123PD", "N456PD", "N789PD", "N321PD", "N654PD", "N987PD"]

// Newest first for each tail
export const cabinTempHistoryDemo = {
  N123PD: [
    mkCheck(72, "A. Zimmer", 18),
    mkCheck(73, "A. Zimmer", 78),
    mkCheck(71, "T. Begum", 138),
    mkCheck(74, "J. Palmore", 198),
    mkCheck(72, "A. Larson", 258),
  ],
  N456PD: [
    mkCheck(74, "T. Begum", 42),
    mkCheck(75, "T. Begum", 102),
    mkCheck(73, "A. Larson", 162),
    mkCheck(74, "S. Santos", 222),
    mkCheck(72, "J. Palmore", 282),
  ],
  N789PD: [
    mkCheck(70, "J. Palmore", 61),
    mkCheck(71, "J. Palmore", 121),
    mkCheck(69, "A. Zimmer", 181),
    mkCheck(70, "C. Rogers", 241),
    mkCheck(71, "A. Larson", 301),
  ],
  N321PD: [
    mkCheck(76, "A. Larson", 9),
    mkCheck(75, "A. Larson", 69),
    mkCheck(74, "T. Begum", 129),
    mkCheck(75, "S. Santos", 189),
    mkCheck(76, "J. Palmore", 249),
  ],
  N654PD: [
    mkCheck(73, "S. Santos", 28),
    mkCheck(72, "S. Santos", 88),
    mkCheck(73, "A. Zimmer", 148),
    mkCheck(74, "T. Begum", 208),
    mkCheck(72, "A. Larson", 268),
  ],
  N987PD: [
    mkCheck(71, "C. Rogers", 35),
    mkCheck(70, "C. Rogers", 95),
    mkCheck(71, "J. Palmore", 155),
    mkCheck(72, "A. Larson", 215),
    mkCheck(71, "T. Begum", 275),
  ],
}

function mkCheck(valueF, checkedBy, minutesAgoFromNow) {
  return {
    valueF,
    checkedBy,
    checkedAt: new Date(Date.now() - minutesAgoFromNow * 60 * 1000).toISOString(),
  }
}
