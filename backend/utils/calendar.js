// backend/utils/calendar.js
// Bikram Sambat (BS) to Gregorian (AD) calendar conversion utility
// Accurate version synchronized with frontend logic

const BS_MONTH_NAMES = [
  "Baisakh", "Jestha", "Ashadh", "Shrawan",
  "Bhadra",  "Ashwin", "Kartik", "Mangsir",
  "Poush",   "Magh",   "Falgun", "Chaitra",
];

// Days in each BS month per year (2078 - 2088)
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
const AD_EPOCH = new Date(Date.UTC(2021, 3, 14)); // April 14, 2021 (UTC to match backend storage)

function getDaysInBsMonth(year, month) {
  if (month < 1 || month > 12) return 30;
  const row = BS_DAYS[year];
  if (!row) return 30;
  return row[month - 1];
}

function bsTotalDays(year, month, day) {
  let total = 0;
  for (let y = BS_EPOCH.year; y < year; y++) {
    const row = BS_DAYS[y];
    if (row) total += row.reduce((s, d) => s + d, 0);
    else     total += 365;
  }
  for (let m = 1; m < month; m++) {
    total += getDaysInBsMonth(year, m);
  }
  total += (day || 1) - 1;
  return total;
}

function bsToAd(bsYear, bsMonth, bsDay) {
  if (bsYear < BS_EPOCH.year || bsYear > 2088) return null;
  if (bsMonth < 1 || bsMonth > 12) return null;

  const diffDays = bsTotalDays(bsYear, bsMonth, bsDay || 1);
  const adDate = new Date(AD_EPOCH);
  adDate.setUTCDate(adDate.getUTCDate() + diffDays);
  adDate.setUTCHours(0, 0, 0, 0);
  return adDate;
}

function adToBs(adDateInput) {
  const adDate = new Date(adDateInput);
  if (isNaN(adDate.getTime())) return null;
  adDate.setUTCHours(0, 0, 0, 0);

  // Difference in days from epoch
  let diffDays = Math.floor((adDate.getTime() - AD_EPOCH.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return null;

  let y = BS_EPOCH.year;
  let m = BS_EPOCH.month;
  let d = BS_EPOCH.day;

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

  while (true) {
    const daysInMonth = getDaysInBsMonth(y, m);
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

function getCurrentAcademicYear() {
  const bsDate = adToBs(new Date());
  if (bsDate) {
    return bsDate.split("-")[0];
  }
  // Fallback calculation in case of invalid date or epoch bounds
  const now = new Date();
  const adYear = now.getFullYear();
  const adMon = now.getMonth() + 1;
  const adDay = now.getDate();
  const bsYear = (adMon > 4 || (adMon === 4 && adDay >= 14))
    ? adYear + 57
    : adYear + 56;
  return String(bsYear);
}

module.exports = {
  bsToAd,
  adToBs,
  getDaysInBsMonth,
  bsTotalDays,
  BS_MONTH_NAMES,
  getCurrentAcademicYear,
};
