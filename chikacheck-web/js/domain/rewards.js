// 보상 계산 — 스탬프, 캐릭터 단계, 오늘의 출석, 주간 퀘스트(저녁 연속). 기록에서 매번 계산하고 저장하지 않는다
import { cellStatus } from "./stats.js";
import { dayKey, sessionSlot, toDate, weekDayKeys } from "./time.js";

// 단계 기준은 여기 한 곳에서만 고친다
export const LEVELS = [
  { level: 1, name: "아기 치카", min: 0 },
  { level: 2, name: "꼬마 치카", min: 5 },
  { level: 3, name: "치카 히어로", min: 15 },
  { level: 4, name: "치카 마스터", min: 30 },
];

export const QUEST_GOAL = 7;

const cellId = ({ dayKey: key, slot }) => `${key}|${slot}`;

/** 날짜 × 시간대 칸마다 completed가 있으면 스탬프 1개 (other 제외, 하루 최대 2개) */
export function countStamps(sessions) {
  const cells = new Set();
  for (const s of sessions) {
    if (s.status !== "completed") continue;
    const cell = sessionSlot(s);
    if (cell.slot !== "other") cells.add(cellId(cell));
  }
  return cells.size;
}

export function levelInfo(stamps) {
  let index = 0;
  LEVELS.forEach((l, i) => {
    if (stamps >= l.min) index = i;
  });
  const current = LEVELS[index];
  const next = LEVELS[index + 1] ?? null;
  return {
    level: current.level,
    name: current.name,
    nextName: next ? next.name : null,
    remaining: next ? next.min - stamps : 0,
    progress: next ? (stamps - current.min) / (next.min - current.min) : 1,
  };
}

/** 오늘(달력 날짜) 아침·저녁 칸이 done인지 */
export function todayAttendance(sessions, now) {
  const key = dayKey(now);
  return {
    morning: cellStatus(sessions, key, "morning", now) === "done",
    evening: cellStatus(sessions, key, "evening", now) === "done",
  };
}

/**
 * 이번 주 월요일부터 오늘까지 저녁 칸이 연속 done인 일수 (0~7).
 * 아직 끝나지 않은(upcoming) 저녁은 빼고 세서, 오늘 저녁 전이라도 연속이 끊기지 않게 한다.
 */
export function eveningStreak(sessions, now) {
  const keys = weekDayKeys(now);
  const statuses = keys
    .slice(0, keys.indexOf(dayKey(now)) + 1)
    .map((key) => cellStatus(sessions, key, "evening", now));
  while (statuses.length > 0 && statuses[statuses.length - 1] === "upcoming") statuses.pop();
  let streak = 0;
  for (const status of statuses) streak = status === "done" ? streak + 1 : 0;
  return streak;
}

/** 이 completed 기록이 그 칸의 첫 completed인지 (완료 축하 문구용) */
export function isFirstStampOfSlot(sessions, session) {
  if (session.status !== "completed") return false;
  const cell = sessionSlot(session);
  if (cell.slot === "other") return false;
  const id = cellId(cell);
  const startedAt = toDate(session.startedAt).getTime();
  return !sessions.some(
    (s) =>
      s.id !== session.id &&
      s.status === "completed" &&
      cellId(sessionSlot(s)) === id &&
      toDate(s.startedAt).getTime() <= startedAt,
  );
}
