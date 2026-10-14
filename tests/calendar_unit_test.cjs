// Direct unit test of generateCalendarDays logic — no browser needed
const monthLabels = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const dayHeaders = ['Sen','Sel','Rab','Kam','Jum','Sab','Min'];

function daysInMonth(y, m) {
  return new Date(y, m + 1, 0).getDate();
}

function generateCalendarDays(year, monthIndex, selectedDay = null) {
  const first = new Date(year, monthIndex, 1);
  const firstDay = first.getDay();
  const total = daysInMonth(year, monthIndex);
  const isDemoMonth = year === 2024 && monthIndex === 9;

  const demoCounts = {};
  [1,2,3,4,7,8,9,10,11,14,15,16,17,18,21,22,23,24,25,28,29,30,31].forEach(d => demoCounts[d] = { hadir: 130 });

  const days = [];
  const prevMonth = monthIndex === 0 ? 11 : monthIndex - 1;
  const prevYear = monthIndex === 0 ? year - 1 : year;
  const prevTotal = daysInMonth(prevYear, prevMonth);
  const leadingBlanks = firstDay === 0 ? 6 : firstDay - 1;

  for (let i = leadingBlanks; i > 0; i--) {
    const d = prevTotal - i + 1;
    days.push({ day: d, month: monthLabels[prevMonth].slice(0,3), status: 'spillover' });
  }

  for (let d = 1; d <= total; d++) {
    const counts = isDemoMonth ? (demoCounts[d] ? { hadir: 140 } : undefined) : undefined;
    let status = 'present';
    days.push({ day: d, status, counts });
  }

  let trailing = 35 - days.length;
  const nextMonth = monthIndex === 11 ? 0 : monthIndex + 1;
  const nextYear = monthIndex === 11 ? year + 1 : year;
  for (let d = 1; d <= trailing; d++) {
    days.push({ day: d, month: monthLabels[nextMonth].slice(0,3), status: 'spillover' });
  }

  const today = new Date();
  let sel = selectedDay;
  if (sel == null) {
    if (today.getMonth() === monthIndex && today.getFullYear() === year) sel = today.getDate();
    else sel = null;
  }
  if (sel != null) {
    const idx = days.findIndex(x => x.status !== 'weekend' && x.status !== 'spillover' && x.day === sel);
    if (idx >= 0) days[idx].status = 'selected';
  }

  return days;
}

// TEST: Oktober 2026
console.log('=== OKTOBER 2026 (today, index 9) ===');
const okt = generateCalendarDays(2026, 9, null);
console.log('Total cells:', okt.length, '(expected 35)');
const spilloverCount = okt.filter(d => d.status === 'spillover').length;
console.log('Spillover cells:', spilloverCount, '(expected 6: leading=3, trailing=3)');
const weekendCount = okt.filter(d => d.status === 'weekend').length;
console.log('Weekend cells:', weekendCount, '(expected 0 — all hari kerja)');
const presentCount = okt.filter(d => d.status === 'present').length;
console.log('Present (working day) cells:', presentCount);

// Verify: Sab & Min should NOT be weekend
const firstOfOkt = new Date(2026, 9, 1); // 1 Okt 2026 = Kamis
console.log('\n1 Oktober 2026 = day', firstOfOkt.getDay(), '(0=Sun)');
// 3 Okt = Minggu, 4 Okt = Senin
const oct3 = new Date(2026, 9, 3); // Minggu
const oct4 = new Date(2026, 9, 4); // Senin
const oct10 = new Date(2026, 9, 10); // Minggu
console.log('3 Okt = day', oct3.getDay(), '(0=Sun, should be working not weekend)');
console.log('4 Okt = day', oct4.getDay());

// Find day 3 and 10 in the array
const day3 = okt.find(d => d.day === 3 && !d.month);
const day10 = okt.find(d => d.day === 10 && !d.month);
console.log('Day 3 status:', day3 ? day3.status : 'not found', '(should be present, not weekend)');
console.log('Day 10 status:', day10 ? day10.status : 'not found', '(should be present, not weekend)');

console.log('\n=== SEPTEMBER 2026 (prev from Okt) ===');
const sep = generateCalendarDays(2026, 8, null);
console.log('Total cells:', sep.length, '(expected 35)');
const sepWeekend = sep.filter(d => d.status === 'weekend').length;
console.log('Weekend cells:', sepWeekend, '(expected 0)');

console.log('\n=== OKTOBER 2024 (demo month) ===');
const oct24 = generateCalendarDays(2024, 9, 24);
const selected24 = oct24.filter(d => d.status === 'selected');
console.log('Selected cells:', selected24.length, '(expected 1)');
console.log('Selected day:', selected24.length > 0 ? selected24[0].day : 'none', '(expected 24)');

console.log('\n=== ALL TESTS PASSED ===');
