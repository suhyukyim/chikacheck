// 데모 데이터 — 발표 화면이 시안처럼 보이게(실천율 80%대·평균 2분 48초·주황 1개·2단계·퀘스트 4/7 근처) 기록을 만든다. 시드 고정 난수, 현재 시각은 now 인자
import { addDays, dayKey, fromDayKey, startOfWeek, toLocalISO, weekdayIndex } from "./domain/time.js";

const SEED = 20261024;
const DONE_RATIO = 0.85; // 이번 주 지난 칸 중 완료 비율
const STREAK_DAYS = 4; // 어제까지 저녁 연속 완료 일수
const TARGET_STAMPS = 9; // 누적 스탬프 → "2단계 · 꼬마 치카, 다음 단계까지 6개"
const TARGET_AVG_SEC = 168; // 이번 주 평균 2분 48초 (짧음 1개의 시간으로 맞춘다)
const MORNING_ORDER = [3, 1, 2, 4, 0, 5]; // 짧음·놓침으로 쓸 아침 요일 순서 (목→화→수→금→월→토)

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 아침 07:10~08:20 / 저녁 19:30~20:40 사이 시작 시각 */
function randomStart(key, slot, random) {
  const minutes = (slot === "morning" ? 7 * 60 + 10 : 19 * 60 + 30) + Math.floor(random() * 71);
  return fromDayKey(key, Math.floor(minutes / 60), minutes % 60, Math.floor(random() * 60));
}

export function generateDemoSessions(now) {
  const nowDate = new Date(now);
  const random = mulberry32(SEED);
  const todayIdx = weekdayIndex(nowDate); // 0=월
  const monday = startOfWeek(nowDate);
  const keyAt = (i) => dayKey(addDays(monday, i));
  const today = dayKey(nowDate);
  const hasTodayMorning = nowDate >= fromDayKey(today, 5, 5); // 오늘 아침 기록을 과거 시각에 둘 수 있을 때만

  // 1) 이번 주: 월요일~어제는 일단 모두 완료, 오늘 아침 완료, 오늘 저녁은 비워 둔다(발표에서 직접 채우는 장면)
  const plan = new Map();
  for (let i = 0; i < todayIdx; i++) {
    plan.set(`${i}|morning`, "done");
    plan.set(`${i}|evening`, "done");
  }
  if (hasTodayMorning) plan.set(`${todayIdx}|morning`, "done");

  // 2) 지난 칸의 약 15%를 짧음 1개 + 놓침으로. 어제까지 저녁 연속(최대 4일)은 건드리지 않는다
  const beforeStreak = todayIdx - STREAK_DAYS - 1;
  const candidates = [];
  if (beforeStreak >= 0) candidates.push(`${beforeStreak}|evening`);
  MORNING_ORDER.filter((i) => i < todayIdx).forEach((i) => candidates.push(`${i}|morning`));
  for (let i = beforeStreak - 1; i >= 0; i--) candidates.push(`${i}|evening`);
  const passed = plan.size;
  const notDone = passed >= 3 ? Math.min(candidates.length, Math.max(1, passed - Math.round(passed * DONE_RATIO))) : 0;
  candidates.slice(0, notDone).forEach((id, n) => {
    if (n === 0) plan.set(id, "short");
    else plan.delete(id); // 기록 없음 = 놓침
  });

  // 3) 이번 주 완료가 적으면(월·화요일 등) 지난 2주 기록으로 누적 스탬프를 맞춘다
  const cells = [...plan].map(([id, status]) => {
    const [i, slot] = id.split("|");
    return { key: keyAt(Number(i)), slot, status };
  });
  const weekDone = cells.filter((c) => c.status === "done").length;
  const prior = [];
  for (let back = 1; back <= 14 && prior.length < TARGET_STAMPS - weekDone; back++) {
    const key = dayKey(addDays(monday, -back));
    prior.push({ key, slot: "evening", status: "done" });
    if (back % 2 === 0 && prior.length < TARGET_STAMPS - weekDone) prior.push({ key, slot: "morning", status: "done" });
  }

  // 4) 짧음 1개의 시간으로 이번 주 평균을 2분 48초 근처에 맞춘다
  const weekCount = cells.length;
  const shortSec = Math.min(150, Math.max(40, TARGET_AVG_SEC * weekCount - 180 * (weekCount - 1)));

  const order = { morning: 0, evening: 1 };
  return [...prior, ...cells]
    .sort((a, b) => a.key.localeCompare(b.key) || order[a.slot] - order[b.slot])
    .map(({ key, slot, status }) => {
      let start = randomStart(key, slot, random);
      if (key === today && start.getTime() + 180_000 > nowDate.getTime()) {
        start = new Date(nowDate.getTime() - 4 * 60_000); // 아직 오지 않은 시각이면 조금 전으로
      }
      const durationSec = status === "done" ? 180 : shortSec;
      return {
        id: `s_${start.getTime()}`,
        startedAt: toLocalISO(start),
        endedAt: toLocalISO(new Date(start.getTime() + durationSec * 1000)),
        durationSec,
        status: status === "done" ? "completed" : "short",
        source: "device",
        speed: 1,
        slotOverride: null,
      };
    });
}
