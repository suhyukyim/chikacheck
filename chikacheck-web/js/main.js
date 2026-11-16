// 앱 시작점 — 저장소·타이머·가상 본체·라우터·알림·소리를 만들고 서로 연결, 로그인·프로필 상태 관리, 키보드 단축키 등록
import { store } from "./store.js";
import { createRouter } from "./router.js";
import { createTimer, readUrlSpeed, resolveSpeed } from "./timer.js";
import { createSound, DONE_SAY, STOP_SAY } from "./sound.js";
import { resolveAccess } from "./domain/auth.js";
import { createDevice } from "./device/device.js";
import { startReminder } from "./reminder.js";
import { toast } from "./components/toast.js";
import * as timerView from "./views/timerView.js";
import * as friendView from "./views/friendView.js";
import * as parentView from "./views/parentView.js";
import * as settingsView from "./views/settingsView.js";
import * as loginView from "./views/loginView.js";
import * as profileView from "./views/profileView.js";

const ROUTES = [
  { path: "/login", title: "치카체크", view: loginView, tab: null },
  { path: "/profiles", title: "누가 쓸까요?", view: profileView, tab: null },
  { path: "/timer", title: "치카 타임", view: timerView, tab: "/timer" },
  { path: "/friend", title: "내 치카 친구", view: friendView, tab: "/friend" },
  { path: "/parent", title: "양치 기록", view: parentView, tab: "/parent" },
  { path: "/settings", title: "설정", view: settingsView, tab: "/parent" },
];

const NAV_KEYS = {
  Digit1: "/timer",
  Numpad1: "/timer",
  Digit2: "/friend",
  Numpad2: "/friend",
  Digit3: "/parent",
  Numpad3: "/parent",
};

const titleEl = document.getElementById("screen-title");
const badgeEl = document.getElementById("screen-badge");
const deviceSlot = document.getElementById("device-slot");
const tabs = [...document.querySelectorAll(".tab")];
const profileBtn = document.getElementById("profile-btn");
const profileName = document.getElementById("profile-name");

// 지금 고른 프로필("child" | "parent" | null) — 저장하지 않는다 (다시 열면 프로필 선택부터)
let profile = null;
function setTitle(text) {
  titleEl.textContent = text;
  document.title = text === "치카 타임" ? "치카체크" : `${text} · 치카체크`;
}

/** tone: "on"(초록) | "off"(회색). text가 없으면 숨김 */
function setBadge(text, tone = "on") {
  badgeEl.hidden = !text;
  badgeEl.textContent = text ?? "";
  badgeEl.classList.toggle("pill--off", tone === "off");
}

// 타이머 (앱 전체에 하나) — 배속은 주소 ?speed= → 설정 → 1
const urlSpeed = readUrlSpeed(location.search);
const timer = createTimer({
  store,
  getSpeed: () => resolveSpeed(urlSpeed, store.getState().settings.demoSpeed),
});

// 기기: 지금은 가상 본체. 실제 BLE를 붙일 때는 createDevice("ble")만 바꾸면 된다
const device = createDevice("simulator", { mount: deviceSlot });

device.on("timerButton", () => {
  // 진행 중이거나 프로필을 고르기 전이면 무시하고 LED만 깜빡 (아이 오조작 방지)
  if (!profile || !timer.start("device")) device.blink();
});

// 소리: 시작하면 배경 음악·뽀글, 구역마다 띵동 + 음성 안내, 끝나면 한마디
const sound = createSound({ getSettings: () => store.getState().settings.sound });
timer.on("start", () => sound.begin());
timer.on("zone", (snap) => sound.zone(snap.zoneIndex, { withDing: snap.zoneIndex > 0 }));
timer.on("complete", () => sound.end(DONE_SAY));
timer.on("stop", () => sound.end(STOP_SAY));
timer.on("cancel", () => sound.end());

let ledSec = null;
timer.on("tick", ({ status, remainingSec }) => {
  if (status !== "running" || remainingSec === ledSec) return; // 초가 바뀔 때만 LED 갱신
  ledSec = remainingSec;
  device.showTime(remainingSec);
});
timer.on("complete", () => {
  ledSec = null;
  device.showDone();
});
for (const event of ["stop", "cancel"]) {
  timer.on(event, () => {
    ledSec = null;
    device.showIdle();
  });
}

const reminder = startReminder({ store, mount: document.getElementById("banner-slot") });

/** 프로필에 따라 탭·상단 프로필 버튼을 맞춘다 */
function applyProfileUi(state = store.getState()) {
  document.body.dataset.profile = profile ?? "none";
  tabs.forEach((tab) => {
    tab.hidden = !profile || (tab.dataset.path === "/parent" && profile !== "parent");
  });
  profileBtn.hidden = !profile;
  profileName.textContent = profile === "parent" ? state.parent.nickname : state.child.name;
}

const auth = {
  get profile() {
    return profile;
  },
  login() {
    store.update((d) => {
      d.auth.loggedIn = true;
    });
    router.go("/profiles");
  },
  choose(next) {
    profile = next;
    applyProfileUi();
    router.go("/timer");
  },
  switchProfile() {
    profile = null;
    applyProfileUi();
    router.go("/profiles");
  },
  logout() {
    profile = null;
    store.update((d) => {
      d.auth.loggedIn = false;
    });
    applyProfileUi();
    router.go("/login");
  },
};

const ctx = {
  store,
  auth,
  timer,
  device,
  reminder,
  urlSpeed,
  setTitle,
  setBadge,
  toast,
  navigate: (path) => router.go(path),
};

const router = createRouter({
  routes: ROUTES,
  fallback: "/timer",
  outlet: document.getElementById("view"),
  ctx,
  guard: (path) => resolveAccess({ loggedIn: store.getState().auth.loggedIn, profile, path }),
  onChange(route) {
    setTitle(route.title);
    setBadge(null);
    tabs.forEach((tab) => {
      if (tab.dataset.path === route.tab) tab.setAttribute("aria-current", "page");
      else tab.removeAttribute("aria-current");
    });
  },
});

// 치카 타임이 아닌 화면에서 양치가 끝나면 토스트로 알려 준다
timer.on("complete", ({ gotStamp }) => {
  if (router.current?.path !== "/timer") toast(gotStamp ? "다 닦았다! 스탬프 1개 받았어요" : "다 닦았다!");
});

// 가상 본체 패널은 화면에 띄우지 않는다 (기기 연결부·T/D 단축키는 그대로 동작)
deviceSlot.hidden = true;
document.body.classList.add("no-device");

const isTyping = (el) =>
  el instanceof HTMLElement && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));

// 발표용 단축키: 1 치카 타임 · 2 내 친구 · 3 부모 · T 타이머 버튼 · D 배출 버튼
window.addEventListener("keydown", (e) => {
  if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;
  if (NAV_KEYS[e.code]) {
    router.go(NAV_KEYS[e.code]);
    return;
  }
  if (e.repeat) return;
  if (e.code === "KeyT") device.press?.("timer");
  else if (e.code === "KeyD") device.press?.("dispense");
});

tabs.forEach((tab) => tab.addEventListener("click", () => router.go(tab.dataset.path)));
profileBtn.addEventListener("click", () => auth.switchProfile());

// 다른 탭에 갔다 돌아오면 바로 남은 시간을 다시 계산
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) timer.sync();
});

store.subscribe((state) => {
  applyProfileUi(state);
  sound.syncBgm(); // 설정에서 배경 음악을 켜고 끄면 바로 반영
});
applyProfileUi();
device.connect();
timer.restore(); // 진행 중이던 양치가 있으면 이어서 (LED도 바로 남은 시간 표시)
router.start();
