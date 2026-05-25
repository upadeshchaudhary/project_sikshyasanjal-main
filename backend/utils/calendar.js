// backend/utils/calendar.js
// Bikram Sambat (BS) to Gregorian (AD) calendar conversion utility

const BS_MONTHS_INFO = [
  { name: "Baishakh",   days: 31, adMonth: 4 },
  { name: "Jyeshtha",   days: 31, adMonth: 5 },
  { name: "Ashadh",     days: 32, adMonth: 6 },
  { name: "Shrawan",    days: 32, adMonth: 7 },
  { name: "Bhadra",     days: 31, adMonth: 8 },
  { name: "Ashwin",     days: 30, adMonth: 9 },
  { name: "Kartik",     days: 29, adMonth: 10 },
  { name: "Mangsir",    days: 30, adMonth: 11 },
  { name: "Poush",      days: 30, adMonth: 12 },
  { name: "Magh",       days: 29, adMonth: 1 },
  { name: "Falgun",     days: 30, adMonth: 2 },
  { name: "Chaitra",    days: 32, adMonth: 3 },
];

const BS_START = new Date(1944, 3, 14); // BS 2000 = AD 1944-04-14

function bsToAd(bsYear, bsMonth, bsDay) {
  if (bsYear < 2000 || bsYear > 2100) return null;
  if (bsMonth < 1 || bsMonth > 12) return null;
  if (bsDay < 1 || bsDay > BS_MONTHS_INFO[bsMonth - 1]?.days) return null;

  const daysFromBsZero = (bsYear - 2000) * 365;
  let monthDays        = 0;

  for (let i = 0; i < bsMonth - 1; i++) {
    monthDays += BS_MONTHS_INFO[i].days;
  }

  const totalDays = daysFromBsZero + monthDays + bsDay - 1;
  const adDate    = new Date(BS_START);
  adDate.setDate(adDate.getDate() + totalDays);

  return adDate;
}

function adToBs(adDate) {
  if (!(adDate instanceof Date)) return null;

  const timeDiff = adDate - BS_START;
  const dayDiff  = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

  if (dayDiff < 0) return null;

  let bsYear = 2000;
  let dayCounter = dayDiff;

  while (dayCounter >= 365) {
    dayCounter -= 365;
    bsYear++;
  }

  let bsMonth = 1;
  let daysInCurrentMonth = BS_MONTHS_INFO[0].days;

  while (dayCounter >= daysInCurrentMonth) {
    dayCounter -= daysInCurrentMonth;
    bsMonth++;
    if (bsMonth > 12) { bsYear++; bsMonth = 1; }
    daysInCurrentMonth = BS_MONTHS_INFO[bsMonth - 1].days;
  }

  const bsDay = dayCounter + 1;

  if (bsMonth < 1 || bsMonth > 12 || bsDay < 1 || bsDay > BS_MONTHS_INFO[bsMonth - 1].days) return null;

  return { year: bsYear, month: bsMonth, day: bsDay };
}

function formatBsDate(bsYear, bsMonth, bsDay) {
  const year  = String(bsYear).padStart(4, "0");
  const month = String(bsMonth).padStart(2, "0");
  const day   = String(bsDay).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseBsDate(dateStr) {
  const match = dateStr?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return { year: parseInt(match[1], 10), month: parseInt(match[2], 10), day: parseInt(match[3], 10) };
}

function getBsMonthName(month) {
  return BS_MONTHS_INFO[month - 1]?.name || null;
}

function getDaysInBsMonth(year, month) {
  if (month < 1 || month > 12) return null;
  return BS_MONTHS_INFO[month - 1].days;
}

module.exports = {
  bsToAd,
  adToBs,
  formatBsDate,
  parseBsDate,
  getBsMonthName,
  getDaysInBsMonth,
  BS_MONTHS_INFO,
};
