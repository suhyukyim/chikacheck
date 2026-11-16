// 치카 타임 화면 — 3분 링 타이머, 이빨 친구 + 3D 입 지도로 닦을 곳 안내, 그만하기 확인, 완료 축하(색종이·캐릭터 점프·스탬프·성장)
import { createRing } from "../components/ring.js";
import { renderCharacter } from "../components/character.js";
import { formatClock } from "../domain/stats.js";
import { countStamps, levelInfo } from "../domain/rewards.js";
import { sessionSlot } from "../domain/time.js";
import { TOTAL_SEC, ZONES, ZONE_PARTS, ZONE_SEC } from "../timer.js";
import { createToothBuddy } from "../components/toothBuddy.js";
import { createMouthMap } from "../components/mouthMap.js";

const CONFETTI_COLORS = ["var(--green)", "var(--coral)", "var(--purple)", "var(--gold)", "var(--pink)", "var(--mint-deep)"];
const CONFETTI_COUNT = 26;

let cleanups = [];

/** 받침에 맞춰 '로/으로' (ㄹ 받침은 '로') */
function withRo(word) {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return `${word}(으)로`;
  const final = code % 28;
  return `${word}${final === 0 || final === 8 ? "로" : "으로"}`;
}

function confettiPieces() {
  let html = "";
  for (let i = 0; i < CONFETTI_COUNT; i++) {
    const x = (i * 37 + 7) % 100;
    const delay = ((i * 3) % 8) * 0.05;
    const rot = (i * 47) % 360;
    const dx = ((i % 5) - 2) * 22;
    const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    html += `<i style="--x:${x}%;--d:${delay}s;--r:${rot}deg;--dx:${dx}px;--c:${color}"></i>`;
  }
  return html;
}

export function render(root, ctx) {
  const { timer, device, store } = ctx;
  ctx.setTitle("치카 타임");

  root.innerHTML = `
    <div class="timer-view" data-state="idle">
      <p class="pill pill--coral demo-chip" data-demo hidden></p>
      <section class="card timer-card" aria-label="양치 타이머">
        <div data-ring></div>
        <div class="timer-idle idle-only">
          <p class="timer-prompt">본체의 타이머 버튼을 눌러 시작해요</p>
          <button type="button" class="btn btn--primary btn--lg" data-action="start">화면에서 시작</button>
        </div>
      </section>
      <section class="card brush-card running-only">
        <div class="brush-stage">
          <div class="brush-buddy" data-buddy></div>
          <div class="mouth-map" data-map><span class="mouth-map-label">입 지도</span></div>
        </div>
        <p class="zone-title" data-zone-card>지금은 <span data-zone-name>${ZONES[0]}</span>!</p>
        <p class="caption">${ZONES.length}구역 중 <b data-zone-no>1</b>번째 · 30초마다 닦을 곳이 바뀌어요</p>
      </section>
      <div class="stop-area running-only">
        <button type="button" class="btn btn--ghost" data-action="stop">그만하기</button>
        <div class="card confirm" data-confirm hidden>
          <p class="confirm-title">정말 그만할까?</p>
          <div class="confirm-actions">
            <button type="button" class="btn btn--ghost" data-action="stop-yes">예</button>
            <button type="button" class="btn btn--soft" data-action="stop-no">아니요</button>
          </div>
        </div>
      </div>
      <p class="sr-only" aria-live="polite" data-live></p>
    </div>`;

  const view = root.querySelector(".timer-view");
  const ring = createRing(view.querySelector("[data-ring]"));
  const reduceMotion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  const buddy = createToothBuddy(view.querySelector("[data-buddy]"), { reduceMotion });
  const map = createMouthMap(view.querySelector("[data-map]"), { reduceMotion });
  let drawnZone = -1;
  let frameId = 0;
  const zoneNo = view.querySelector("[data-zone-no]");
  const zoneName = view.querySelector("[data-zone-name]");
  const zoneCard = view.querySelector("[data-zone-card]");
  const live = view.querySelector("[data-live]");
  const stopBtn = view.querySelector('[data-action="stop"]');
  const confirmBox = view.querySelector("[data-confirm]");
  const demoChip = view.querySelector("[data-demo]");
  let overlay = null;

  function paint(snap) {
    const running = snap.status === "running";
    view.dataset.state = running ? "running" : "idle";
    ring.set(1 - snap.elapsedSec / TOTAL_SEC, formatClock(snap.remainingSec));
    if (!running) {
      hideConfirm();
      stopAnimation();
      return;
    }
    zoneNo.textContent = String(snap.zoneIndex + 1);
    zoneName.textContent = snap.zoneName;
    startAnimation();
  }

  // 이빨 친구·입 지도는 화면이 보일 때 프레임마다 그린다 (타이머 tick은 250ms라 움직임이 끊겨 보임)
  function frame(now) {
    frameId = 0;
    const snap = timer.getState();
    if (snap.status !== "running") return;
    if (snap.zoneIndex !== drawnZone) {
      drawnZone = snap.zoneIndex;
      buddy.setZone(ZONE_PARTS[drawnZone]);
      map.setZone(ZONE_PARTS[drawnZone]);
    }
    const prog = Math.min(1, (snap.elapsedSec - snap.zoneIndex * ZONE_SEC) / ZONE_SEC);
    buddy.draw(prog, now);
    map.draw(prog, now);
    frameId = requestAnimationFrame(frame);
  }

  function startAnimation() {
    if (!frameId) frameId = requestAnimationFrame(frame);
  }

  function stopAnimation() {
    cancelAnimationFrame(frameId);
    frameId = 0;
    drawnZone = -1;
  }

  function showConfirm() {
    stopBtn.hidden = true;
    confirmBox.hidden = false;
    confirmBox.querySelector('[data-action="stop-no"]').focus();
  }

  function hideConfirm() {
    stopBtn.hidden = false;
    confirmBox.hidden = true;
  }

  function bumpZone(snap) {
    zoneCard.classList.remove("is-bump");
    void zoneCard.offsetWidth;
    zoneCard.classList.add("is-bump");
    live.textContent = `${snap.zoneIndex + 1}번째 구역, 지금은 ${snap.zoneName}`;
  }

  function closeCelebration() {
    if (!overlay) return;
    overlay.remove();
    overlay = null;
  }

  /** 확인 → 완료 화면(0:00)에서 대기 화면으로 */
  function dismissCelebration() {
    const hadFocus = overlay?.contains(document.activeElement);
    closeCelebration();
    paint(timer.getState());
    if (hadFocus) view.querySelector('[data-action="start"]')?.focus();
  }

  function showCelebration({ session, gotStamp }) {
    closeCelebration();
    const { sessions, child } = store.getState();
    const stamps = countStamps(sessions);
    const after = levelInfo(stamps);
    const before = levelInfo(stamps - (gotStamp ? 1 : 0));
    let stampText = "오늘 이 시간 스탬프는 이미 받았어요";
    if (gotStamp) stampText = "스탬프 1개 받았어요";
    else if (session && sessionSlot(session).slot === "other") stampText = "스탬프는 아침·저녁 양치에 받아요";

    overlay = document.createElement("div");
    overlay.className = "celebrate";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "celebrate-title");
    overlay.innerHTML = `
      <div class="confetti" aria-hidden="true">${confettiPieces()}</div>
      <div class="celebrate-card">
        <div class="celebrate-char"></div>
        <h2 class="celebrate-title" id="celebrate-title">다 닦았다! 🎉</h2>
        <p class="celebrate-stamp">${stampText}</p>
        ${after.level > before.level ? `<p class="celebrate-grow">치카가 ${withRo(after.name)} 성장했어!</p>` : ""}
        <button type="button" class="btn btn--primary btn--lg btn--block" data-close>확인</button>
      </div>`;
    overlay.querySelector(".celebrate-char").append(renderCharacter(child.character, after.level, { decorative: true }));
    overlay.querySelector("[data-close]").addEventListener("click", dismissCelebration);
    overlay.addEventListener("keydown", (e) => {
      if (e.key === "Escape") dismissCelebration();
    });
    (root.closest(".phone") ?? document.body).append(overlay);
    overlay.querySelector("[data-close]").focus();
    live.textContent = `다 닦았다! ${stampText}`;
  }

  function updateBadge() {
    ctx.setBadge(device.connected ? "본체 버튼 연동" : "본체 미연결", device.connected ? "on" : "off");
  }

  function updateDemoChip() {
    const slot = store.getState().settings.demoSlot;
    demoChip.hidden = slot !== "morning" && slot !== "evening";
    demoChip.textContent = `발표 모드 · 새 기록은 오늘 ${slot === "morning" ? "아침" : "저녁"} 칸에`;
  }

  view.addEventListener("click", (e) => {
    const action = e.target.closest("[data-action]")?.dataset.action;
    if (action === "start") timer.start("screen");
    else if (action === "stop") showConfirm();
    else if (action === "stop-no") hideConfirm();
    else if (action === "stop-yes") {
      hideConfirm();
      timer.stop();
    }
  });

  cleanups = [
    timer.on("tick", paint),
    timer.on("start", (snap) => {
      closeCelebration();
      paint(snap);
    }),
    timer.on("zone", bumpZone),
    timer.on("complete", showCelebration), // 마지막 tick의 0:00 화면을 오버레이 뒤에 그대로 둔다
    timer.on("stop", () => {
      paint(timer.getState());
      ctx.toast("다음엔 끝까지 닦아 보자!");
    }),
    stopAnimation,
    timer.on("cancel", () => paint(timer.getState())),
    device.on("connection", updateBadge),
    store.subscribe(updateDemoChip),
    closeCelebration,
  ];

  paint(timer.getState());
  updateBadge();
  updateDemoChip();
}

export function destroy() {
  cleanups.forEach((fn) => fn());
  cleanups = [];
}
