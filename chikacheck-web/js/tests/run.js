// 단위 테스트 — 라이브러리 없이 test()/eq()로 계산 로직·저장소·타이머·데모 데이터를 확인한다 (tests.html에서 실행)
import { dayKey, getSlot, sessionSlot, slotEnd, startOfWeek, toLocalISO, weekDayKeys } from "../domain/time.js";
import { cellStatus, formatClock, formatDuration, weekAvgDuration, weekCells, weekRate } from "../domain/stats.js";
import { countStamps, eveningStreak, isFirstStampOfSlot, levelInfo, todayAttendance } from "../domain/rewards.js";
import { STORAGE_KEY, createStore, defaultState, migrate } from "../store.js";
import { ZONES, ZONE_PARTS, createTimer, readUrlSpeed, resolveSpeed, timerSnapshot } from "../timer.js";
import { generateDemoSessions } from "../demo.js";
import { needsReminder } from "../reminder.js";
import { DEFAULT_PARENT_NAME, checkLogin, checkPin, resolveAccess } from "../domain/auth.js";
import { ZONE_SAY } from "../sound.js";

// ───────── 아주 작은 테스트 도구 ─────────
const results = [];
let current = null;

function test(name, fn) {
  current = { name, asserts: 0, failures: [] };
  try {
    fn();
  } catch (err) {
    current.failures.push(`예외: ${err?.stack ?? err}`);
  }
  results.push(current);
}

function deepEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  return keysA.length === keysB.length && keysA.every((k) => deepEqual(a[k], b[k]));
}

function eq(actual, expected, label = "") {
  current.asserts += 1;
  if (!deepEqual(actual, expected)) {
    current.failures.push(`${label ? `${label}: ` : ""}기대 ${JSON.stringify(expected)} / 실제 ${JSON.stringify(actual)}`);
  }
}

// ───────── 테스트용 기록 만들기 ─────────
// 날짜는 로컬 시각으로 만든다 (월은 0부터: 9 = 10월). 2026-10-24는 토요일.
const at = (d, h, m = 0) => new Date(2026, 9, d, h, m);
let seq = 0;
function rec(date, status = "completed", extra = {}) {
  seq += 1;
  return {
    id: `s_test${seq}`,
    startedAt: toLocalISO(date),
    endedAt: null,
    durationSec: status === "completed" ? 180 : 90,
    status,
    source: "device",
    speed: 1,
    slotOverride: null,
    ...extra,
  };
}
const eveningsDone = (days) => days.map((d) => rec(at(d, 19, 30)));

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
    dump: () => Object.fromEntries(data),
  };
}

// ───────── 1~4. 시간대·주 시작 ─────────
test("1. 아침 경계: 04:59 other / 05:00 morning / 11:59 morning / 12:00 other", () => {
  eq(getSlot(at(24, 4, 59)).slot, "other", "04:59");
  eq(getSlot(at(24, 5, 0)).slot, "morning", "05:00");
  eq(getSlot(at(24, 11, 59)).slot, "morning", "11:59");
  eq(getSlot(at(24, 12, 0)).slot, "other", "12:00");
});

test("2. 저녁 경계: 16:59 other / 17:00 evening / 23:59 evening", () => {
  eq(getSlot(at(24, 16, 59)).slot, "other", "16:59");
  eq(getSlot(at(24, 17, 0)).slot, "evening", "17:00");
  eq(getSlot(at(24, 23, 59)).slot, "evening", "23:59");
});

test("3. 자정 넘김: 10-25 01:30은 전날(10-24) 저녁, 03:00은 other", () => {
  eq(getSlot(at(25, 1, 30)), { slot: "evening", dayKey: "2026-10-24" }, "01:30");
  eq(getSlot(at(25, 3, 0)).slot, "other", "03:00");
  eq(getSlot(at(25, 2, 59)).dayKey, "2026-10-24", "02:59");
});

test("4. 주 시작은 월요일", () => {
  eq(dayKey(startOfWeek(at(25, 12))), "2026-10-19", "일요일 → 월요일");
  eq(dayKey(startOfWeek(at(19, 0))), "2026-10-19", "월요일 00:00 → 같은 날");
  eq(weekDayKeys(at(24, 12)), ["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25"]);
});

test("시간 보조: dayKey 형식, slotEnd, 로컬 ISO 왕복", () => {
  eq(dayKey(at(5, 9)), "2026-10-05", "한 자리 날짜 0 채움");
  eq(slotEnd("2026-10-24", "morning").getTime(), at(24, 12).getTime(), "아침 끝 = 12:00");
  eq(slotEnd("2026-10-24", "evening").getTime(), at(25, 3).getTime(), "저녁 끝 = 다음날 03:00");
  const iso = toLocalISO(at(24, 20, 13));
  eq(new Date(iso).getTime(), at(24, 20, 13).getTime(), "ISO → Date 같은 시각");
  eq(/^2026-10-24T20:13:00[+-]\d\d:\d\d$/.test(iso), true, "형식");
});

// ───────── 5~6. 스탬프·단계 ─────────
test("5. 스탬프: 같은 칸 완료 2개 → 1 / short만 → 0 / other 시간 완료 → 0", () => {
  eq(countStamps([rec(at(24, 19)), rec(at(24, 20))]), 1, "같은 칸 2개");
  eq(countStamps([rec(at(24, 19), "short")]), 0, "short만");
  eq(countStamps([rec(at(24, 14))]), 0, "other 시간");
  eq(countStamps([rec(at(24, 8)), rec(at(24, 19)), rec(at(25, 1))]), 2, "하루 최대 2개 (01시는 전날 저녁)");
});

test("6. 단계: 4개 → 1단계(남은 1) / 5개 → 2단계 / 30개 → 4단계(다음 없음)", () => {
  const l4 = levelInfo(4);
  eq([l4.level, l4.remaining, l4.nextName], [1, 1, "꼬마 치카"], "4개");
  eq(levelInfo(5).level, 2, "5개");
  eq(levelInfo(9), { level: 2, name: "꼬마 치카", nextName: "치카 히어로", remaining: 6, progress: 0.4 }, "9개 (시안)");
  const l30 = levelInfo(30);
  eq([l30.level, l30.nextName, l30.remaining, l30.progress], [4, null, 0, 1], "30개");
});

// ───────── 7~8. 달력 칸·실천율 ─────────
test("7. 칸 상태: 시간대 전 upcoming / 지남 missed / short+completed → done / short만 → short", () => {
  eq(cellStatus([], "2026-10-24", "evening", at(24, 15)), "upcoming", "저녁 전");
  eq(cellStatus([], "2026-10-24", "morning", at(24, 15)), "missed", "아침 지남");
  eq(cellStatus([], "2026-10-24", "evening", at(25, 2, 59)), "upcoming", "02:59엔 아직 저녁");
  eq(cellStatus([], "2026-10-24", "evening", at(25, 3)), "missed", "03:00엔 놓침");
  eq(cellStatus([rec(at(24, 8), "short"), rec(at(24, 9))], "2026-10-24", "morning", at(24, 15)), "done", "short+completed");
  eq(cellStatus([rec(at(24, 8), "short")], "2026-10-24", "morning", at(24, 15)), "short", "short만");
  eq(cellStatus([rec(at(24, 19), "running")], "2026-10-24", "evening", at(24, 19, 1)), "upcoming", "진행 중은 제외");
});

test("8. 실천율: 지난 칸 4개 중 done 3 → 75%, upcoming은 분모에서 제외", () => {
  // 2026-10-21(수) 04:00 → 월 아침·저녁, 화 아침·저녁이 지난 칸 (수 아침은 아직)
  const sessions = [rec(at(19, 8)), rec(at(19, 19)), rec(at(20, 8))];
  eq(weekRate(sessions, at(21, 4)), { done: 3, total: 4, percent: 75 });
  eq(weekRate([], at(19, 4)), { done: 0, total: 0, percent: null }, "지난 칸 없음");
  eq(weekRate([rec(at(19, 19))], at(19, 19, 30)), { done: 1, total: 2, percent: 50 }, "진행 중 시간대라도 기록 있으면 포함");
});

test("평균 시간: 이번 주 아침·저녁 기록만, 진행 중·other 제외", () => {
  const sessions = [
    rec(at(20, 8)),
    rec(at(21, 19), "short", { durationSec: 156 }),
    rec(at(22, 14), "completed", { durationSec: 30 }), // other → 제외
    rec(at(12, 8)), // 지난주 → 제외
    rec(at(24, 19), "running", { durationSec: 0 }), // 진행 중 → 제외
  ];
  eq(weekAvgDuration(sessions, at(24, 20)), 168, "(180+156)/2");
  eq(weekAvgDuration([], at(24, 20)), null, "기록 없음");
});

test("주간 칸: 7개, 요일·오늘 표시", () => {
  const cells = weekCells([rec(at(24, 8))], at(24, 15));
  eq(cells.length, 7);
  eq(cells.map((c) => c.weekday).join(""), "월화수목금토일");
  eq([cells[5].isToday, cells[5].morning, cells[5].evening, cells[6].morning], [true, "done", "upcoming", "upcoming"]);
});

// ───────── 9~10. 저녁 연속 퀘스트 ─────────
test("9. 저녁 연속: 월~금 done, 토 19:00(기록 없음) → 5", () => {
  eq(eveningStreak(eveningsDone([19, 20, 21, 22, 23]), at(24, 19)), 5);
});

test("10. 저녁 연속: 수요일 놓치면 그 뒤부터 다시 센다", () => {
  eq(eveningStreak(eveningsDone([19, 20, 22, 23]), at(24, 19)), 2, "목·금");
  eq(eveningStreak([...eveningsDone([19, 20, 22, 23]), rec(at(24, 19, 5))], at(24, 19, 30)), 3, "오늘 저녁까지 하면 3");
  eq(eveningStreak([...eveningsDone([19, 20, 21, 22]), rec(at(23, 19), "short")], at(24, 19)), 0, "어제 짧음이면 0");
  eq(eveningStreak(eveningsDone([19, 20, 21, 22]), at(24, 1, 30)), 4, "토 01:30: 금요일 저녁은 아직 진행 중(기록 없음) → 끊지 않음");
  eq(eveningStreak(eveningsDone([19, 20, 21, 22, 23, 24, 25]), at(25, 22)), 7, "7일 달성");
});

test("오늘의 출석·첫 스탬프 판정", () => {
  const morning = rec(at(24, 8));
  eq(todayAttendance([morning], at(24, 15)), { morning: true, evening: false });
  const first = rec(at(24, 19));
  const second = rec(at(24, 20));
  eq(isFirstStampOfSlot([first, second], first), true, "첫 완료");
  eq(isFirstStampOfSlot([first, second], second), false, "두 번째 완료");
  eq(isFirstStampOfSlot([rec(at(24, 14))], rec(at(24, 14, 5))), false, "other 시간은 스탬프 없음");
});

// ───────── 11. 시간 표기 ─────────
test("11. 표기: formatDuration(168) → 2분 48초 / formatClock(120) → 2:00", () => {
  eq(formatDuration(168), "2분 48초");
  eq(formatDuration(180), "3분 00초");
  eq(formatClock(120), "2:00");
  eq(formatClock(180), "3:00");
  eq(formatClock(9), "0:09");
});

// ───────── 12. 저장소 ─────────
test("12. 저장소: 깨진 JSON → 기본 상태 + broken 키에 백업 (경고 1회)", () => {
  const storage = memoryStorage({ [STORAGE_KEY]: "{깨진 json" });
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (...args) => warnings.push(args.join(" "));
  try {
    const s = createStore({ storage });
    eq(s.getState(), defaultState(), "기본 상태");
  } finally {
    console.warn = originalWarn;
  }
  eq(storage.getItem(`${STORAGE_KEY}:broken`), "{깨진 json", "원본 백업");
  eq(warnings.length, 1, "console.warn 1회");
  eq(JSON.parse(storage.getItem(STORAGE_KEY)).schemaVersion, 1, "기본 상태로 다시 저장");
});

test("저장소: update·subscribe·세션 헬퍼·resetAll", () => {
  const storage = memoryStorage();
  const s = createStore({ storage });
  let calls = 0;
  const off = s.subscribe(() => (calls += 1));
  s.addSession(rec(at(24, 19), "running", { id: "s_1" }));
  eq(s.getRunningSession()?.id, "s_1", "진행 중 찾기");
  s.updateSession("s_1", { status: "completed", durationSec: 180 });
  eq(s.getRunningSession(), null, "완료 후 없음");
  eq(JSON.parse(storage.getItem(STORAGE_KEY)).sessions[0].status, "completed", "저장됨");
  const copy = s.getState();
  copy.sessions.length = 0;
  eq(s.getState().sessions.length, 1, "getState는 복사본");
  off();
  s.resetAll();
  eq([calls, s.getState().sessions.length], [2, 0], "구독 해제 후엔 호출 안 됨");
});

test("저장소: migrate가 빠진 값을 채운다", () => {
  const m = migrate({ child: { name: "하윤" }, settings: { reminder: { time: "20:30" } }, sessions: [{ bad: true }] });
  eq([m.schemaVersion, m.child.name, m.child.character], [1, "하윤", "rabbit"]);
  eq(m.settings.reminder, { enabled: true, time: "20:30" });
  eq([m.settings.demoSlot, m.sessions.length], ["auto", 0], "잘못된 기록은 버림");
  eq(migrate(null), defaultState(), "null → 기본 상태");
});

test("저장소: 예전 데이터(로그인·소리 설정 없음) → 로그아웃 상태·기본 부모 이름·소리 전부 켜짐", () => {
  const m = migrate({ child: { name: "하윤" }, settings: { demoSpeed: 10 } });
  eq(m.auth, { loggedIn: false });
  eq(m.parent, { nickname: DEFAULT_PARENT_NAME });
  eq(m.settings.sound, { voice: true, ding: true, bubble: true, bgm: true });
  eq(m.settings.demoSpeed, 10, "기존 설정 유지");
  const kept = migrate({ auth: { loggedIn: true }, parent: { nickname: "엄마" }, settings: { sound: { bgm: false } } });
  eq([kept.auth.loggedIn, kept.parent.nickname, kept.settings.sound.bgm, kept.settings.sound.voice], [true, "엄마", false, true]);
});

// ───────── 13. 발표 모드 ─────────
test("13. 발표 모드: slotOverride evening인 14:00 완료 → 그날 저녁 칸 done, 스탬프 1", () => {
  const s = rec(at(24, 14), "completed", { slotOverride: "evening" });
  eq(sessionSlot(s), { slot: "evening", dayKey: "2026-10-24" });
  eq(cellStatus([s], "2026-10-24", "evening", at(24, 15)), "done");
  eq(countStamps([s]), 1);
  eq(isFirstStampOfSlot([s], s), true, "축하 문구용 첫 스탬프");
});

// ───────── 타이머 ─────────
test("타이머 상태: 60초 경과 → 2:00, 3번째 구역 '아랫니 바깥쪽', 충치균 4마리", () => {
  const snap = timerSnapshot(60);
  eq([snap.remainingSec, snap.zoneIndex, snap.zoneName, snap.germsLeft], [120, 2, "아랫니 바깥쪽", 4]);
  eq(timerSnapshot(0, "idle").remainingSec, 180, "대기 3:00");
  eq(timerSnapshot(0.4).remainingSec, 180, "0.4초 경과는 아직 3:00");
  eq([timerSnapshot(180).remainingSec, timerSnapshot(180).germsLeft, timerSnapshot(999).zoneIndex], [0, 0, 5], "완료");
});

test("배속: 주소(1/10/30만) → 설정 → 1", () => {
  eq(readUrlSpeed("?speed=30"), 30);
  eq(readUrlSpeed("?speed=7"), null, "허용 안 되는 값");
  eq(readUrlSpeed(""), null);
  eq(resolveSpeed(30, 10), 30, "주소 우선");
  eq(resolveSpeed(null, 10), 10, "설정");
  eq(resolveSpeed(null, undefined), 1, "기본 1");
});

test("타이머 엔진: 시작 → 중복 시작 막기 → 완료 저장(+스탬프) / 그만하기 → short", () => {
  let nowMs = at(24, 19).getTime();
  const s = createStore({ storage: memoryStorage() });
  const timer = createTimer({ store: s, getSpeed: () => 30, clock: () => nowMs });
  const events = [];
  timer.on("zone", (e) => events.push(`zone${e.zoneIndex}`));
  timer.on("complete", (e) => events.push(`complete:${e.gotStamp}`));

  eq(timer.start("device"), true, "시작");
  eq(timer.start("screen"), false, "진행 중 다시 시작 → false");
  eq(s.getState().sessions.length, 1, "기록 1개만");
  eq([s.getState().sessions[0].status, s.getState().sessions[0].speed], ["running", 30]);

  nowMs += 2000; // ×30 → 60초 경과
  timer.sync();
  eq(timer.getState().zoneName, "아랫니 바깥쪽", "2초 뒤 3번째 구역");
  nowMs += 4000; // 총 180초
  timer.sync();
  const done = s.getState().sessions[0];
  eq([done.status, done.durationSec, timer.getState().status], ["completed", 180, "idle"], "완료 저장");
  eq(events.join(","), "zone0,zone2,complete:true", "이벤트");

  timer.start("screen");
  nowMs += 1000; // 30초
  eq(timer.stop(), true, "그만하기");
  const short = s.getState().sessions[1];
  eq([short.status, short.durationSec], ["short", 30], "짧음 저장");
});

test("타이머 엔진: 새로고침 복원 (진행 중 이어 가기 / 3분 지났으면 completed)", () => {
  let nowMs = at(24, 19).getTime();
  const s = createStore({ storage: memoryStorage() });
  s.addSession({ ...rec(at(24, 19), "running"), id: `s_${nowMs}`, speed: 10 });
  nowMs += 6000; // ×10 → 60초
  const t1 = createTimer({ store: s, clock: () => nowMs });
  t1.restore();
  eq([t1.getState().status, t1.getState().remainingSec], ["running", 120], "이어서 진행");
  t1.stop();

  const s2 = createStore({ storage: memoryStorage() });
  s2.addSession({ ...rec(at(24, 19), "running"), id: `s_${at(24, 19).getTime()}`, speed: 1 });
  const t2 = createTimer({ store: s2, clock: () => at(24, 19, 5).getTime() });
  t2.restore();
  eq([s2.getState().sessions[0].status, t2.getState().status], ["completed", "idle"], "3분 지남 → completed");
});

test("타이머 엔진: 발표 모드 시간대가 기록에 붙는다", () => {
  const s = createStore({ storage: memoryStorage() });
  s.update((d) => {
    d.settings.demoSlot = "evening";
  });
  const timer = createTimer({ store: s, clock: () => at(24, 14).getTime() });
  timer.start("device");
  eq(s.getState().sessions[0].slotOverride, "evening");
  timer.stop();
});

// ───────── 데모 데이터 ─────────
test("데모: 같은 now면 결과 동일 / 오늘 저녁 칸 기록 없음 / 미래 기록 없음", () => {
  const now = at(24, 14);
  const a = generateDemoSessions(now);
  eq(a, generateDemoSessions(now), "결정적");
  eq(a.filter((s) => sessionSlot(s).dayKey === "2026-10-24" && sessionSlot(s).slot === "evening").length, 0, "오늘 저녁 비움");
  eq(a.every((s) => new Date(s.endedAt) <= now), true, "미래 없음");
  eq(new Set(a.map((s) => s.id)).size, a.length, "id 중복 없음");
});

test("데모(토 14:00): 실천율 80%대·평균 2분 48초·주황 1개·스탬프 9·퀘스트 4/7·오늘 아침 완료", () => {
  const now = at(24, 14);
  const demo = generateDemoSessions(now);
  const rate = weekRate(demo, now);
  eq(rate.percent >= 80 && rate.percent < 90, true, `실천율 ${rate.percent}%`);
  eq(formatDuration(weekAvgDuration(demo, now)), "2분 48초");
  eq(weekCells(demo, now).flatMap((c) => [c.morning, c.evening]).filter((x) => x === "short").length, 1, "주황 1개");
  eq(countStamps(demo), 9, "스탬프");
  eq(eveningStreak(demo, now), 4, "퀘스트");
  eq(todayAttendance(demo, now), { morning: true, evening: false }, "오늘 아침만");
});

test("데모: 어느 요일·시각이든 미래 기록 없고 2단계 이상", () => {
  for (let day = 19; day <= 25; day++) {
    for (const hour of [4, 6, 10, 14, 21]) {
      const now = at(day, hour);
      const demo = generateDemoSessions(now);
      const label = `${day}일 ${hour}시`;
      eq(demo.every((s) => new Date(s.endedAt) <= now), true, `${label} 미래 없음`);
      eq(levelInfo(countStamps(demo)).level >= 2, true, `${label} 단계`);
    }
  }
});

// ───────── 알림·게이트 ─────────
test("미양치 알림: 시각 전 / 기록 있음 / 꺼짐 / 양치 중이면 안 알림", () => {
  const state = defaultState();
  eq(needsReminder(state, at(24, 20, 59)), false, "21시 전");
  eq(needsReminder(state, at(24, 21)), true, "21시, 기록 없음");
  eq(needsReminder({ ...state, sessions: [rec(at(24, 19))] }, at(24, 21)), false, "저녁 완료");
  eq(needsReminder({ ...state, sessions: [rec(at(24, 20), "running")] }, at(24, 21)), false, "양치 중");
  eq(needsReminder({ ...state, settings: { ...state.settings, reminder: { enabled: false, time: "21:00" } } }, at(24, 22)), false, "꺼짐");
});

// ───────── 로그인·프로필 ─────────
test("로그인: chika / 1234만 통과 (아이디 공백·대소문자 무시, 비밀번호는 정확히)", () => {
  eq(checkLogin("chika", "1234"), true);
  eq(checkLogin("  ChiKa ", "1234"), true, "아이디 공백·대소문자");
  eq(checkLogin("chika", " 1234"), false, "비밀번호 공백");
  eq(checkLogin("chika", "0000"), false);
  eq(checkLogin("", ""), false);
  eq(checkLogin(undefined, null), false);
});

test("부모 2차 비밀번호: 0000만 통과", () => {
  eq([checkPin("0000"), checkPin("000"), checkPin("1234"), checkPin(""), checkPin(null)], [true, false, false, false, false]);
});

test("화면 권한: 로그인 전 → /login, 프로필 전 → /profiles, 아이는 부모 화면 못 감", () => {
  const go = (loggedIn, profile, path) => resolveAccess({ loggedIn, profile, path });
  eq([go(false, null, "/timer"), go(false, null, "/login")], ["/login", null], "로그인 전");
  eq([go(true, null, "/timer"), go(true, null, "/profiles")], ["/profiles", null], "프로필 고르기 전");
  eq([go(true, "child", "/timer"), go(true, "child", "/friend")], [null, null], "아이: 아이 화면");
  eq([go(true, "child", "/parent"), go(true, "child", "/settings")], ["/timer", "/timer"], "아이: 부모 화면 막힘");
  eq([go(true, "parent", "/parent"), go(true, "parent", "/settings"), go(true, "parent", "/timer")], [null, null, null], "부모: 모두");
  eq([go(true, "parent", "/login"), go(true, "child", "/profiles")], ["/timer", "/timer"], "고른 뒤 로그인·프로필 화면 → 치카 타임");
});

test("치카 타임 안내: 구역 6개마다 그림 정보·음성 문구가 하나씩", () => {
  eq([ZONE_PARTS.length, ZONE_SAY.length], [ZONES.length, ZONES.length]);
  const named = ZONES.map((z, i) => {
    const p = ZONE_PARTS[i];
    return `${p.jaw === "up" ? "윗니" : "아랫니"} ${{ out: "바깥쪽", in: "안쪽", chew: "씹는 면" }[p.face]}`;
  });
  eq(named, ZONES, "그림 정보가 구역 이름과 같은 순서");
  eq(ZONE_SAY.every((say, i) => say.includes(ZONES[i])), true, "음성 문구에 구역 이름이 들어 있음");
});

// ───────── 결과 표시 ─────────
const passed = results.filter((r) => r.failures.length === 0).length;
const asserts = results.reduce((n, r) => n + r.asserts, 0);
const summary = document.getElementById("summary");
summary.textContent = `${results.length}개 중 ${passed}개 통과 (단언 ${asserts}개)`;
summary.className = passed === results.length ? "is-pass" : "is-fail";
document.title = `${passed === results.length ? "PASS" : "FAIL"} ${passed}/${results.length} · 치카체크 테스트`;

const list = document.getElementById("results");
for (const r of results) {
  const li = document.createElement("li");
  li.className = r.failures.length ? "fail" : "pass";
  li.innerHTML = `<span class="tag">${r.failures.length ? "FAIL" : "PASS"}</span>`;
  li.append(document.createTextNode(r.name), Object.assign(document.createElement("span"), { className: "count", textContent: ` · 단언 ${r.asserts}개` }));
  for (const f of r.failures) {
    li.append(Object.assign(document.createElement("div"), { className: "detail", textContent: f }));
  }
  list.append(li);
}
