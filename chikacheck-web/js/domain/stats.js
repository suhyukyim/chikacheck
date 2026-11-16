// 통계 계산 — 달력 칸 상태, 이번 주 실천율, 평균 양치 시간, 시간 표기. 순수 함수
import { WEEKDAYS, dayKey, sessionSlot, slotEnd, toDate, weekDayKeys } from "./time.js";

export const SLOTS = ["morning", "evening"];

/** 진행 중(running) 기록은 달력·통계에서 뺀다 */
const isFinished = (s) => s.status === "completed" || s.status === "short";

export function sessionsInCell(sessions, key, slot) {
  return sessions.filter((s) => {
    if (!isFinished(s)) return false;
    const cell = sessionSlot(s);
    return cell.slot === slot && cell.dayKey === key;
  });
}

/** 칸 상태: done(완료 1건 이상) / short(짧음만) / upcoming(아직 안 끝남) / missed(지남) */
export function cellStatus(sessions, key, slot, now) {
  const list = sessionsInCell(sessions, key, slot);
  if (list.some((s) => s.status === "completed")) return "done";
  if (list.length > 0) return "short";
  return toDate(now) < slotEnd(key, slot) ? "upcoming" : "missed";
}

export function weekCells(sessions, now) {
  const today = dayKey(now);
  return weekDayKeys(now).map((key, i) => ({
    dayKey: key,
    weekday: WEEKDAYS[i],
    isToday: key === today,
    morning: cellStatus(sessions, key, "morning", now),
    evening: cellStatus(sessions, key, "evening", now),
  }));
}

/** 실천율: 이번 주 14칸 중 upcoming이 아닌 칸이 분모, 그중 done이 분자 */
export function weekRate(sessions, now) {
  let done = 0;
  let total = 0;
  for (const cell of weekCells(sessions, now)) {
    for (const slot of SLOTS) {
      if (cell[slot] === "upcoming") continue;
      total += 1;
      if (cell[slot] === "done") done += 1;
    }
  }
  return { done, total, percent: total ? Math.round((done / total) * 100) : null };
}

/** 이번 주 아침·저녁 기록의 평균 양치 시간(초). 기록이 없으면 null */
export function weekAvgDuration(sessions, now) {
  const keys = new Set(weekDayKeys(now));
  const list = sessions.filter((s) => {
    if (!isFinished(s)) return false;
    const cell = sessionSlot(s);
    return cell.slot !== "other" && keys.has(cell.dayKey);
  });
  if (list.length === 0) return null;
  const sum = list.reduce((acc, s) => acc + (Number(s.durationSec) || 0), 0);
  return Math.round(sum / list.length);
}

/** 168 → "2분 48초" */
export function formatDuration(sec) {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}분 ${String(s % 60).padStart(2, "0")}초`;
}

/** 남은 시간 표기 120 → "2:00" (소수는 올림) */
export function formatClock(sec) {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
