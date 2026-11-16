// 시간 계산 — 날짜 키, 시간대(slot) 판정, 주 시작일. 순수 함수만 두고 현재 시각은 now 인자로 받는다
export const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"];
export const SLOT_LABEL = { morning: "아침", evening: "저녁", other: "그 외" };

const pad = (n) => String(n).padStart(2, "0");

export function toDate(value) {
  return value instanceof Date ? new Date(value.getTime()) : new Date(value);
}

/** 로컬 시각 기준 "YYYY-MM-DD" */
export function dayKey(date) {
  const d = toDate(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "YYYY-MM-DD" + 시·분·초 → 로컬 Date (시가 24를 넘으면 다음날로 넘어간다) */
export function fromDayKey(key, hours = 0, minutes = 0, seconds = 0) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d, hours, minutes, seconds);
}

export function addDays(date, days) {
  const d = toDate(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days, d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
}

/** 월요일 0 ~ 일요일 6 */
export function weekdayIndex(date) {
  return (toDate(date).getDay() + 6) % 7;
}

/**
 * 시간대 판정: 아침 05:00~11:59 / 저녁 17:00~02:59 / 나머지 other.
 * 00:00~02:59는 전날 저녁으로 센다.
 */
export function getSlot(date) {
  const d = toDate(date);
  const h = d.getHours();
  if (h >= 5 && h < 12) return { slot: "morning", dayKey: dayKey(d) };
  if (h >= 17) return { slot: "evening", dayKey: dayKey(d) };
  if (h < 3) return { slot: "evening", dayKey: dayKey(addDays(d, -1)) };
  return { slot: "other", dayKey: dayKey(d) };
}

/** 기록이 들어갈 달력 칸. 발표 모드(slotOverride)면 시작한 날짜의 그 시간대로 본다 */
export function sessionSlot(session) {
  const override = session.slotOverride;
  if (override === "morning" || override === "evening") {
    return { slot: override, dayKey: dayKey(session.startedAt) };
  }
  return getSlot(session.startedAt);
}

/** 그 주 월요일 00:00 */
export function startOfWeek(now) {
  const d = toDate(now);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - weekdayIndex(d));
}

/** 월~일 dayKey 7개 */
export function weekDayKeys(now) {
  const monday = startOfWeek(now);
  return WEEKDAYS.map((_, i) => dayKey(addDays(monday, i)));
}

/** 칸이 끝나는 시각: 아침은 당일 12:00, 저녁은 다음날 03:00 */
export function slotEnd(key, slot) {
  return slot === "morning" ? fromDayKey(key, 12) : fromDayKey(key, 24 + 3);
}

/** "2026-10-24T20:13:05+09:00" 처럼 로컬 시간대 오프셋을 붙인 ISO 문자열 */
export function toLocalISO(date) {
  const d = toDate(date);
  const offset = -d.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const abs = Math.abs(offset);
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  return `${dayKey(d)}T${time}${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/** "2026-10-24" → "10월 24일" */
export function formatMonthDay(key) {
  const [, m, d] = key.split("-").map(Number);
  return `${m}월 ${d}일`;
}
