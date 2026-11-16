// 미양치 알림 — 앱이 열려 있을 때만 1분마다 확인해서, 설정 시각이 지났는데 오늘 저녁 기록이 없으면 상단 배너(+허용 시 브라우저 알림)
import { cellStatus } from "./domain/stats.js";
import { dayKey } from "./domain/time.js";

export const REMINDER_TEXT = "오늘 저녁 양치 기록이 아직 없어요";
const CHECK_MS = 60_000;
const BELL_ICON = `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/></svg>`;

const isRecorded = (status) => status === "done" || status === "short";

/** 알림이 필요한지: 켜짐 + 설정 시각 지남 + 양치 중 아님 + 오늘 저녁 칸이 완료·짧음이 아님 */
export function needsReminder(state, now) {
  const { enabled, time } = state.settings.reminder;
  if (!enabled) return false;
  const [h, m = 0] = String(time).split(":").map(Number);
  const d = new Date(now);
  if (!Number.isFinite(h) || d.getHours() * 60 + d.getMinutes() < h * 60 + m) return false;
  if (state.sessions.some((s) => s.status === "running")) return false;
  return !isRecorded(cellStatus(state.sessions, dayKey(d), "evening", d));
}

export function startReminder({ store, mount, clock = () => new Date() }) {
  let notifiedDay = null; // 오늘 이미 알렸는지 (메모리에만, 날짜가 바뀌면 다시 알릴 수 있음)
  let banner = null;

  function hide() {
    banner?.remove();
    banner = null;
  }

  function show() {
    hide();
    banner = document.createElement("div");
    banner.className = "banner";
    banner.setAttribute("role", "alert");
    banner.innerHTML = `
      ${BELL_ICON}
      <div class="banner-text">
        <strong>${REMINDER_TEXT}</strong>
        <span class="caption">미양치 알림 · 실제 제품은 앱 푸시로 보내요</span>
      </div>
      <button type="button" class="icon-btn" aria-label="알림 닫기">✕</button>`;
    banner.querySelector("button").addEventListener("click", hide);
    mount.append(banner);
  }

  function notifySystem() {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    try {
      new Notification("치카체크", { body: REMINDER_TEXT, icon: "assets/icons/icon-192.png", lang: "ko" });
    } catch {
      // 안드로이드 크롬 등은 페이지에서 바로 알림을 만들 수 없음 → 배너만 보여 준다
    }
  }

  function check() {
    const now = clock();
    if (notifiedDay === dayKey(now) || !needsReminder(store.getState(), now)) return;
    notifiedDay = dayKey(now);
    show();
    notifySystem();
  }

  /** 알림 토글을 켤 때 한 번만 권한을 묻는다 */
  async function requestPermission() {
    if (!("Notification" in window) || Notification.permission !== "default") return;
    try {
      await Notification.requestPermission();
    } catch {
      // 권한 창을 띄울 수 없는 환경 → 배너만
    }
  }

  // 양치를 시작했거나 오늘 저녁 기록이 생기면 배너를 내린다
  store.subscribe((state) => {
    if (!banner) return;
    const now = clock();
    const running = state.sessions.some((s) => s.status === "running");
    if (running || isRecorded(cellStatus(state.sessions, dayKey(now), "evening", now))) hide();
  });

  check();
  setInterval(check, CHECK_MS);
  return { check, preview: show, hide, requestPermission };
}
