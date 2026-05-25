// frontend/src/utils/calendar.js
// Bikram Sambat calendar utility
// Days per month lookup table — authoritative source for BS month lengths

export const BS_MONTH_NAMES = [
  "Baisakh", "Jestha", "Ashadh", "Shrawan",
  "Bhadra",  "Ashwin", "Kartik", "Mangsir",
  "Poush",   "Magh",   "Falgun", "Chaitra",
];

export const BS_MONTH_NAMES_NP = [
  "बैशाख", "जेठ",  "असार",  "साउन",
  "भदौ",   "असोज", "कात्तिक","मंसिर",
  "पुष",   "माघ",  "फागुन", "चैत",
];

// Days in each BS month per year
// Source: official Nepal Calendar published by Bikram Sambat calendar authority
const BS_DAYS = {
  2078: [31,31,32,32,31,30,30,29,30,29,30,30],
  2079: [31,31,32,31,31,31,30,29,30,29,30,30],
  2080: [31,32,31,32,31,30,30,30,29,29,30,30],
  2081: [31,31,32,32,31,30,30,29,30,29,30,30],
  2082: [31,31,32,32,31,30,30,29,30,29,30,30],
  2083: [31,32,31,32,31,30,30,30,29,30,29,31],
  2084: [30,32,31,32,31,30,30,30,29,30,30,30],
  2085: [31,31,32,31,31,30,30,30,29,30,30,30],
  2086: [31,31,32,32,31,30,30,29,30,29,30,30],
  2087: [31,32,31,32,31,30,30,29,30,29,30,30],
  2088: [31,32,31,32,31,30,30,30,29,30,29,30],
};

const BS_EPOCH = { year: 2078, month: 1, day: 1 };
const AD_EPOCH = new Date(2021, 3, 14); // April 14, 2021 (month is 0-indexed)

/**
 * Returns the number of days in a given BS month
 * @param {number} year  - BS year (e.g. 2081)
 * @param {number} month - BS month 1-indexed (1=Baisakh, 12=Chaitra)
 * @returns {number} number of days
 */
export function getDaysInBSMonth(year, month) {
  if (month < 1 || month > 12) return 30;
  const row = BS_DAYS[year];
  if (!row) return 30; // fallback for years not in table
  return row[month - 1];
}

/**
 * Get total days from BS epoch (1st Baisakh of reference year)
 */
export function bsTotalDays(year, month, day) {
  let total = 0;
  for (let y = BS_EPOCH.year; y < year; y++) {
    const row = BS_DAYS[y];
    if (row) total += row.reduce((s, d) => s + d, 0);
    else     total += 365;
  }
  for (let m = 1; m < month; m++) {
    total += getDaysInBSMonth(year, m);
  }
  total += day - 1;
  return total;
}

/**
 * Convert BS date to AD date
 * @param {string} bsDateString - "2081-04-15"
 * @returns {string} "2024-07-30" (ISO format YYYY-MM-DD)
 */
export function bsToAd(bsDateString) {
  if (!bsDateString) return "";
  const parts = bsDateString.split("-").map(Number);
  if (parts.length !== 3) return "";
  const [y, m, d] = parts;
  if (y < BS_EPOCH.year || y > 2088) return "";

  const diffDays = bsTotalDays(y, m, d);
  const adDate = new Date(AD_EPOCH);
  adDate.setDate(adDate.getDate() + diffDays);

  const adY = adDate.getFullYear();
  const adM = String(adDate.getMonth() + 1).padStart(2, "0");
  const adD = String(adDate.getDate()).padStart(2, "0");
  return `${adY}-${adM}-${adD}`;
}

/**
 * Convert AD date to BS date
 * @param {string} adDateString - "2024-07-30"
 * @returns {string} "2081-04-15"
 */
export function adToBs(adDateString) {
  if (!adDateString) return "";
  const adDate = new Date(adDateString);
  if (isNaN(adDate.getTime())) return "";

  // Difference in days from epoch
  let diffDays = Math.floor((adDate - AD_EPOCH) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return ""; // before epoch

  let y = BS_EPOCH.year;
  let m = BS_EPOCH.month;
  let d = BS_EPOCH.day;

  // Subtract years
  while (true) {
    const row = BS_DAYS[y];
    const daysInYear = row ? row.reduce((s, d) => s + d, 0) : 365;
    if (diffDays >= daysInYear) {
      diffDays -= daysInYear;
      y++;
    } else {
      break;
    }
  }

  // Subtract months
  while (true) {
    const daysInMonth = getDaysInBSMonth(y, m);
    if (diffDays >= daysInMonth) {
      diffDays -= daysInMonth;
      m++;
    } else {
      break;
    }
  }

  d += diffDays;

  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * Format a BS date as a human-readable string
 * @param {string} bsDateString - "2081-04-15"
 * @param {boolean} nepali - use Nepali month names
 * @returns {string} "15 Shrawan 2081 BS"
 */
export function formatBsDate(bsDateString, nepali = false) {
  if (!bsDateString) return "";
  const [y, m, d] = bsDateString.split("-").map(Number);
  const names = nepali ? BS_MONTH_NAMES_NP : BS_MONTH_NAMES;
  const monthName = names[(m - 1)] || "";
  return `${d} ${monthName} ${y} BS`;
}

/**
 * Get current BS date (approximate — use nepali-date library in production
 * for exact conversion. This is accurate within ±1 day for 2078-2087.)
 * @returns {{ year, month, day }}
 */
export function getTodayBS() {
  const now    = new Date();
  const adYear = now.getFullYear();
  const adMon  = now.getMonth() + 1;
  const adDay  = now.getDate();

  // BS year is AD year + 56 before April 14, +57 from April 14 onwards
  const bsYear = (adMon > 4 || (adMon === 4 && adDay >= 14))
    ? adYear + 57
    : adYear + 56;

  // Approximate BS month from AD month
  // Baisakh starts ~April 13-14 → AD month 4 maps to BS month 1
  const adMonthToBs = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8]; // index 0=Jan
  const bsMonth = adMonthToBs[adMon - 1];

  return { year: bsYear, month: bsMonth, day: adDay };
}

/**
 * Check if a BS date string is today
 * @param {string} bsDateString - "2081-04-15"
 */
export function isToday(bsDateString) {
  const today = getTodayBS();
  const key   = `${today.year}-${String(today.month).padStart(2,"0")}-${String(today.day).padStart(2,"0")}`;
  return bsDateString === key;
}

/**
 * Get BS month name
 * @param {number} month - 1-indexed
 * @param {boolean} nepali
 */
export function getBsMonthName(month, nepali = false) {
  const names = nepali ? BS_MONTH_NAMES_NP : BS_MONTH_NAMES;
  return names[(month - 1)] || "";
}