// 가상 본체 패널 — 크림 토끼 본체(핑크 코 = 배출 버튼) + 타이머 모듈(LED·타이머 버튼) + 칫솔 컵. device.js 규약과 같은 모양을 돌려준다
import { createEmitter } from "../emitter.js";
import { formatClock } from "../domain/stats.js";
import { toast } from "../components/toast.js";

const IDLE_SEC = 180;
const DONE_BLINK_MS = 2400;

const ART = `
  <svg class="device-art" viewBox="0 0 320 260" aria-hidden="true">
    <ellipse class="dv-shadow" cx="166" cy="246" rx="146" ry="9"/>
    <g transform="rotate(-10 40 120)">
      <rect class="dv-brush" x="34" y="66" width="12" height="108" rx="6"/>
      <rect class="dv-bristle" x="29" y="50" width="22" height="26" rx="6"/>
    </g>
    <path class="dv-cup" d="M14 150 H74 L68 232 Q67 242 57 242 H31 Q21 242 20 232 Z"/>
    <rect class="dv-cup-rim" x="11" y="146" width="66" height="12" rx="6"/>
    <rect class="dv-body" x="108" y="8" width="34" height="96" rx="17" transform="rotate(-8 125 104)"/>
    <rect class="dv-ear-in" x="117" y="22" width="16" height="68" rx="8" transform="rotate(-8 125 104)"/>
    <rect class="dv-body" x="178" y="8" width="34" height="96" rx="17" transform="rotate(8 195 104)"/>
    <rect class="dv-ear-in" x="187" y="22" width="16" height="68" rx="8" transform="rotate(8 195 104)"/>
    <rect class="dv-body" x="84" y="80" width="168" height="148" rx="62"/>
    <circle class="dv-eye" cx="140" cy="128" r="6"/>
    <circle class="dv-eye" cx="196" cy="128" r="6"/>
    <ellipse class="dv-cheek" cx="118" cy="156" rx="11" ry="7"/>
    <ellipse class="dv-cheek" cx="218" cy="156" rx="11" ry="7"/>
    <circle class="dv-socket" cx="168" cy="152" r="28"/>
    <path class="dv-line" d="M158 190 q5 6 10 0 q5 6 10 0"/>
    <rect class="dv-nozzle" x="156" y="220" width="24" height="12" rx="5"/>
    <g class="dv-drop"><ellipse class="dv-paste" cx="168" cy="242" rx="7" ry="6"/></g>
    <rect class="dv-module" x="236" y="108" width="76" height="120" rx="22"/>
    <rect class="dv-led" x="244" y="121" width="60" height="34" rx="8"/>
    <text class="dv-led-text" x="274" y="144" text-anchor="middle" data-led>3:00</text>
  </svg>`;

const CHEVRON = `<svg class="device-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg>`;

function restartClass(el, className) {
  el.classList.remove(className);
  void el.getBoundingClientRect(); // 같은 애니메이션을 연달아 다시 재생
  el.classList.add(className);
}

export function createSimulator({ mount }) {
  const events = createEmitter();
  const root = document.createElement("section");
  root.className = "device";
  root.dataset.open = "false";
  root.innerHTML = `
    <button type="button" class="device-toggle" aria-expanded="false" aria-controls="device-body">
      <span class="device-grip" aria-hidden="true"></span>
      <span class="device-toggle-label">가상 본체</span>
      <span class="device-led-mini" aria-hidden="true" data-led>3:00</span>
      ${CHEVRON}
    </button>
    <div class="device-body" id="device-body">
      <div class="device-head">
        <h2 class="device-title">가상 본체</h2>
        <span class="pill" data-conn>연결됨</span>
      </div>
      <p class="caption device-sub">실제 본체 대신 화면 속 본체로 시연해요</p>
      <div class="device-stage">
        ${ART}
        <button type="button" class="device-btn device-btn--nose" aria-label="배출 버튼 (치약 완두콩만큼)" data-btn="dispense"></button>
        <button type="button" class="device-btn device-btn--timer" aria-label="타이머 버튼" data-btn="timer"></button>
      </div>
      <p class="device-hint"><kbd>T</kbd> 타이머 · <kbd>D</kbd> 배출</p>
    </div>`;
  mount.replaceChildren(root);

  const leds = root.querySelectorAll("[data-led]");
  const toggle = root.querySelector(".device-toggle");
  const conn = root.querySelector("[data-conn]");
  const drop = root.querySelector(".dv-drop");
  const buttons = {
    timer: root.querySelector('[data-btn="timer"]'),
    dispense: root.querySelector('[data-btn="dispense"]'),
  };
  let doneTimeout = null;

  const setLed = (text) => leds.forEach((el) => (el.textContent = text));

  function showTime(remainingSec) {
    clearTimeout(doneTimeout);
    root.classList.remove("is-done");
    setLed(formatClock(remainingSec));
  }

  function showIdle() {
    showTime(IDLE_SEC);
  }

  function showDone() {
    clearTimeout(doneTimeout);
    setLed("--:--");
    restartClass(root, "is-done");
    doneTimeout = setTimeout(showIdle, DONE_BLINK_MS);
  }

  function blink() {
    restartClass(root, "is-blink");
  }

  function dispense() {
    restartClass(drop, "is-falling");
    toast("완두콩만큼 나왔어요!");
  }

  /** 버튼 누르기 (클릭·키보드 공통) */
  function press(name) {
    const btn = buttons[name];
    if (!btn) return;
    restartClass(btn, "is-pressed");
    setTimeout(() => btn.classList.remove("is-pressed"), 160);
    if (name === "timer") events.emit("timerButton");
    else dispense();
  }

  buttons.timer.addEventListener("click", () => press("timer"));
  buttons.dispense.addEventListener("click", () => press("dispense"));
  toggle.addEventListener("click", () => {
    const open = root.dataset.open !== "true";
    root.dataset.open = String(open);
    toggle.setAttribute("aria-expanded", String(open));
  });

  const device = {
    kind: "simulator",
    connected: false,
    connect() {
      device.connected = true;
      conn.textContent = "연결됨";
      conn.classList.remove("pill--off");
      events.emit("connection", { connected: true });
    },
    disconnect() {
      device.connected = false;
      conn.textContent = "연결 끊김";
      conn.classList.add("pill--off");
      events.emit("connection", { connected: false });
    },
    on: events.on,
    off: events.off,
    showTime,
    showIdle,
    showDone,
    blink,
    press,
  };
  showIdle();
  return device;
}
