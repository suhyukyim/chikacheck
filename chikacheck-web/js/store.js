// 저장소 — localStorage 읽기/쓰기·마이그레이션·구독. 다른 파일은 localStorage를 직접 쓰지 않는다
import { DEFAULT_PARENT_NAME } from "./domain/auth.js";

export const STORAGE_KEY = "chikacheck:v1";
export const SCHEMA_VERSION = 1;
export const DEFAULT_CHILD_NAME = "우리 아이";
export const DEFAULT_REWARD = "저녁 양치 7일 연속 성공하면 주말에 놀이터 1시간!";

export const AGE_GROUPS = [
  { value: "under3", label: "만 3세 미만" },
  { value: "3-6", label: "만 3~6세" },
  { value: "7plus", label: "만 7세 이상" },
];

export function defaultState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    auth: { loggedIn: false }, // 고른 프로필은 저장하지 않는다 → 다시 열면 프로필 선택부터
    child: { name: DEFAULT_CHILD_NAME, ageGroup: "3-6", character: "rabbit" },
    parent: { nickname: DEFAULT_PARENT_NAME },
    sessions: [],
    settings: {
      rewardPromise: DEFAULT_REWARD,
      reminder: { enabled: true, time: "21:00" },
      sound: { voice: true, ding: true, bubble: true, bgm: true },
      demoSpeed: 1,
      demoSlot: "auto",
    },
  };
}

const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

const isValidSession = (s) =>
  isObject(s) && typeof s.id === "string" && typeof s.startedAt === "string" && !Number.isNaN(Date.parse(s.startedAt));

/** 저장된 값을 현재 형식으로 맞춘다. v1은 빠진 값을 기본값으로 채우기만 한다 (형식이 바뀌면 schemaVersion을 올리고 여기서 변환) */
export function migrate(raw) {
  const base = defaultState();
  if (!isObject(raw)) return base;
  const child = isObject(raw.child) ? raw.child : {};
  const settings = isObject(raw.settings) ? raw.settings : {};
  const reminder = isObject(settings.reminder) ? settings.reminder : {};
  const sound = isObject(settings.sound) ? settings.sound : {};
  const auth = isObject(raw.auth) ? raw.auth : {};
  const parent = isObject(raw.parent) ? raw.parent : {};
  return {
    schemaVersion: SCHEMA_VERSION,
    auth: { ...base.auth, ...auth },
    child: { ...base.child, ...child },
    parent: { ...base.parent, ...parent },
    sessions: Array.isArray(raw.sessions) ? raw.sessions.filter(isValidSession) : [],
    settings: {
      ...base.settings,
      ...settings,
      reminder: { ...base.settings.reminder, ...reminder },
      sound: { ...base.settings.sound, ...sound },
    },
  };
}

function browserStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null; // 저장소를 막아 둔 브라우저: 메모리에서만 동작
  }
}

export function createStore({ storage = browserStorage(), key = STORAGE_KEY } = {}) {
  const brokenKey = `${key}:broken`;
  const listeners = new Set();
  let warnedWrite = false;
  let state = load();

  function load() {
    let raw = null;
    try {
      raw = storage?.getItem(key) ?? null;
    } catch {
      raw = null;
    }
    if (raw === null) return defaultState();
    try {
      return migrate(JSON.parse(raw));
    } catch {
      try {
        storage.setItem(brokenKey, raw);
      } catch {
        // 백업 실패해도 앱은 기본 상태로 계속 동작
      }
      console.warn(`[치카체크] 저장된 데이터를 읽지 못해 처음 상태로 시작해요. 원본은 "${brokenKey}"에 보관했어요.`);
      const fresh = defaultState();
      write(fresh);
      return fresh;
    }
  }

  function write(value) {
    try {
      storage?.setItem(key, JSON.stringify(value));
    } catch {
      if (!warnedWrite) console.warn("[치카체크] 저장 공간에 쓰지 못했어요. 새로고침하면 기록이 사라질 수 있어요.");
      warnedWrite = true;
    }
  }

  function notify() {
    const snapshot = getState();
    listeners.forEach((cb) => cb(snapshot));
  }

  function getState() {
    return structuredClone(state);
  }

  function update(fn) {
    const draft = structuredClone(state);
    fn(draft);
    state = draft;
    write(state);
    notify();
  }

  function subscribe(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  }

  function resetAll() {
    state = defaultState();
    write(state);
    notify();
  }

  function addSession(session) {
    update((d) => {
      d.sessions.push({ ...session });
    });
  }

  function updateSession(id, patch) {
    update((d) => {
      const target = d.sessions.find((s) => s.id === id);
      if (target) Object.assign(target, patch);
    });
  }

  function getRunningSession() {
    const running = state.sessions.find((s) => s.status === "running");
    return running ? { ...running } : null;
  }

  return { getState, update, subscribe, resetAll, addSession, updateSession, getRunningSession };
}

/** 앱 전체가 함께 쓰는 저장소 */
export const store = createStore();
