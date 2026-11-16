// 3분 양치 타이머 엔진 — 시작 시각 기준으로 경과 시간을 계산(배속·새로고침 복원 포함)하고, 30초마다 구역을 바꾸고, 기록을 저장한다
import { createEmitter } from "./emitter.js";
import { isFirstStampOfSlot } from "./domain/rewards.js";
import { toLocalISO } from "./domain/time.js";

export const TOTAL_SEC = 180;
export const ZONE_SEC = 30;
export const ZONES = ["윗니 바깥쪽", "윗니 안쪽", "아랫니 바깥쪽", "아랫니 안쪽", "윗니 씹는 면", "아랫니 씹는 면"];
/** ZONES와 같은 순서: 어느 턱(up/lo)의 어느 면(out 바깥 · in 안쪽 · chew 씹는 면)인지 — 이빨 친구·입 지도 그림용 */
export const ZONE_PARTS = [
  { jaw: "up", face: "out" },
  { jaw: "up", face: "in" },
  { jaw: "lo", face: "out" },
  { jaw: "lo", face: "in" },
  { jaw: "up", face: "chew" },
  { jaw: "lo", face: "chew" },
];
export const SPEEDS = [1, 10, 30];
const TICK_MS = 250;

/** 주소의 ?speed= 값 (1/10/30만 허용, 아니면 null) */
export function readUrlSpeed(search) {
  const value = Number(new URLSearchParams(search).get("speed"));
  return SPEEDS.includes(value) ? value : null;
}

/** 배속 우선순위: 주소 → 설정 → 1 */
export function resolveSpeed(urlSpeed, settingSpeed) {
  if (SPEEDS.includes(urlSpeed)) return urlSpeed;
  if (SPEEDS.includes(settingSpeed)) return settingSpeed;
  return 1;
}

/** 경과 초 → 화면·LED가 함께 쓰는 타이머 상태 */
export function timerSnapshot(elapsedSec, status = "running") {
  const elapsed = Math.min(TOTAL_SEC, Math.max(0, elapsedSec));
  const zoneIndex = Math.min(ZONES.length - 1, Math.floor(elapsed / ZONE_SEC));
  return {
    status,
    elapsedSec: elapsed,
    remainingSec: Math.max(0, Math.ceil(TOTAL_SEC - elapsed - 1e-6)),
    zoneIndex,
    zoneName: ZONES[zoneIndex],
    germsLeft: elapsed >= TOTAL_SEC ? 0 : ZONES.length - zoneIndex,
  };
}

/** 기록 id("s_" + 시작 ms)에서 정확한 시작 시각을 읽는다 (startedAt 문자열은 초 단위까지만 있음) */
function startMsOf(session) {
  const fromId = Number(String(session.id).replace(/^s_/, ""));
  return Number.isFinite(fromId) && fromId > 0 ? fromId : Date.parse(session.startedAt);
}

/**
 * 이벤트: start · tick(250ms마다) · zone(구역이 바뀔 때) · complete({ session, gotStamp }) · stop({ session })
 *         cancel(진행 중 기록이 초기화·데모 데이터로 사라졌을 때)
 */
export function createTimer({ store, getSpeed = () => 1, clock = () => Date.now() }) {
  const events = createEmitter();
  let run = null; // { id, startMs, speed, zoneIndex }
  let intervalId = null;

  const elapsedOf = (r) => ((clock() - r.startMs) / 1000) * r.speed;
  const snapshot = () => (run ? timerSnapshot(elapsedOf(run)) : timerSnapshot(0, "idle"));

  function stopLoop() {
    run = null;
    clearInterval(intervalId);
    intervalId = null;
  }

  function begin(session) {
    run = { id: session.id, startMs: startMsOf(session), speed: session.speed || 1, zoneIndex: -1 };
    clearInterval(intervalId);
    intervalId = setInterval(tick, TICK_MS);
    events.emit("start", snapshot());
    tick();
  }

  function tick() {
    if (!run) return;
    const snap = snapshot();
    if (snap.zoneIndex !== run.zoneIndex) {
      run.zoneIndex = snap.zoneIndex;
      if (snap.elapsedSec < TOTAL_SEC) events.emit("zone", snap);
    }
    events.emit("tick", snap);
    if (snap.elapsedSec >= TOTAL_SEC) complete(run);
  }

  function complete(r, { silent = false } = {}) {
    stopLoop();
    const endedMs = r.startMs + (TOTAL_SEC / r.speed) * 1000;
    store.updateSession(r.id, { status: "completed", durationSec: TOTAL_SEC, endedAt: toLocalISO(new Date(endedMs)) });
    if (silent) return;
    const { sessions } = store.getState();
    const session = sessions.find((s) => s.id === r.id) ?? null;
    events.emit("complete", { session, gotStamp: session ? isFirstStampOfSlot(sessions, session) : false });
  }

  /** 타이머 시작. 이미 진행 중이면 아무것도 안 하고 false */
  function start(source) {
    if (run) return false;
    const startMs = clock();
    const { demoSlot } = store.getState().settings;
    const session = {
      id: `s_${startMs}`,
      startedAt: toLocalISO(new Date(startMs)),
      endedAt: null,
      durationSec: 0,
      status: "running",
      source: source === "device" ? "device" : "screen",
      speed: getSpeed(),
      slotOverride: demoSlot === "morning" || demoSlot === "evening" ? demoSlot : null,
    };
    store.addSession(session);
    begin(session);
    return true;
  }

  /** 그만하기 → 'short'로 저장. 진행 중이 아니면 false */
  function stop() {
    const r = run;
    if (!r) return false;
    const elapsed = elapsedOf(r);
    if (elapsed >= TOTAL_SEC) {
      complete(r);
      return false;
    }
    stopLoop();
    store.updateSession(r.id, { status: "short", durationSec: Math.floor(elapsed), endedAt: toLocalISO(new Date(clock())) });
    const session = store.getState().sessions.find((s) => s.id === r.id) ?? null;
    events.emit("stop", { session });
    return true;
  }

  /** 앱 시작 시: 진행 중이던 기록을 이어서 진행하거나, 이미 3분이 지났으면 조용히 completed로 마감 */
  function restore() {
    const running = store
      .getState()
      .sessions.filter((s) => s.status === "running")
      .sort((a, b) => startMsOf(a) - startMsOf(b));
    const latest = running.pop();
    if (!latest) return;
    if (running.length > 0) {
      // 진행 중 기록이 여러 개면(비정상) 최신 것만 이어 가고 나머지는 짧음으로 마감
      const stale = new Set(running.map((s) => s.id));
      store.update((d) => {
        d.sessions.forEach((s) => {
          if (stale.has(s.id)) s.status = "short";
        });
      });
    }
    const r = { id: latest.id, startMs: startMsOf(latest), speed: latest.speed || 1 };
    if (elapsedOf(r) >= TOTAL_SEC) complete(r, { silent: true });
    else begin(latest);
  }

  // 초기화·데모 데이터 교체로 진행 중 기록이 사라지면 타이머도 멈춘다
  store.subscribe((state) => {
    if (!run) return;
    const current = state.sessions.find((s) => s.id === run.id);
    if (current && current.status === "running") return;
    stopLoop();
    events.emit("cancel", snapshot());
  });

  return {
    start,
    stop,
    restore,
    sync: tick,
    getState: snapshot,
    isRunning: () => run !== null,
    on: events.on,
    off: events.off,
  };
}
