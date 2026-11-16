// 부모 화면 — 이번 주 실천율·평균 양치 시간, 주간 달력, 보상 약속(편집), 미양치 알림 설정
import { renderWeekCalendar } from "../components/calendar.js";
import { formatDuration, weekAvgDuration, weekCells, weekRate } from "../domain/stats.js";
import { AGE_GROUPS, DEFAULT_CHILD_NAME } from "../store.js";

const REWARD_MAX = 60;
const PENCIL_ICON = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/></svg>`;
const CHEVRON_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>`;

let cleanups = [];

/** "21:00" → "밤 9시", "07:30" → "오전 7시 30분" */
export function koreanTime(hhmm) {
  const [h, m] = String(hhmm).split(":").map(Number);
  if (!Number.isFinite(h)) return hhmm;
  const period = h < 5 ? "새벽" : h < 12 ? "오전" : h < 18 ? "오후" : h < 21 ? "저녁" : "밤";
  const hour = h % 12 || 12;
  return `${period} ${hour}시${m ? ` ${m}분` : ""}`;
}

export function render(root, ctx) {
  const { store } = ctx;

  root.innerHTML = `
    <div class="stack">
      <div class="stat-grid">
        <section class="card" aria-labelledby="rate-title">
          <h2 class="stat-label" id="rate-title">이번 주 실천율</h2>
          <p class="stat" data-rate></p>
          <p class="caption" data-rate-sub></p>
        </section>
        <section class="card" aria-labelledby="avg-title">
          <h2 class="stat-label" id="avg-title">평균 양치 시간</h2>
          <p class="stat" data-avg></p>
          <p class="caption">목표 3분</p>
        </section>
      </div>
      <section class="card" aria-labelledby="cal-title">
        <div class="card-head">
          <h2 class="card-title" id="cal-title">이번 주 달력</h2>
          <span class="caption" data-range></span>
        </div>
        <p class="empty-note" data-empty hidden>첫 양치를 기록해 보세요 · 본체의 타이머 버튼을 눌러요</p>
        <div data-calendar></div>
      </section>
      <section class="card reward-card" aria-labelledby="reward-title">
        <div class="reward-head">
          <h2 class="card-title" id="reward-title">보상 약속</h2>
          <button type="button" class="icon-btn" aria-label="보상 약속 고치기" data-reward-edit>${PENCIL_ICON}</button>
        </div>
        <p class="reward-text" data-reward-text></p>
        <form class="reward-edit" data-reward-form hidden>
          <label class="sr-only" for="reward-input">보상 약속 내용</label>
          <input class="text-input" id="reward-input" type="text" maxlength="${REWARD_MAX}" autocomplete="off">
          <div class="edit-actions">
            <button type="button" class="btn btn--ghost" data-reward-cancel>취소</button>
            <button type="submit" class="btn btn--soft">저장</button>
          </div>
        </form>
      </section>
      <section class="card" aria-labelledby="reminder-title">
        <div class="setting-row">
          <div>
            <h2 class="card-title" id="reminder-title">미양치 알림</h2>
            <p class="caption" data-reminder-desc></p>
          </div>
          <button type="button" class="switch" role="switch" aria-labelledby="reminder-title" data-reminder-toggle></button>
        </div>
        <label class="time-field">알림 시각
          <input class="time-input" type="time" data-reminder-time>
        </label>
        <p class="caption note">앱이 열려 있을 때만 알려드려요 (실제 제품은 푸시 알림)</p>
        <button type="button" class="btn btn--soft btn--block note" data-reminder-preview>알림 미리보기</button>
      </section>
      <a class="link-row" href="#/settings">설정 ${CHEVRON_ICON}</a>
    </div>`;

  const $ = (sel) => root.querySelector(sel);
  const rewardText = $("[data-reward-text]");
  const rewardForm = $("[data-reward-form]");
  const rewardInput = $("#reward-input");
  const rewardEditBtn = $("[data-reward-edit]");
  const toggle = $("[data-reminder-toggle]");
  const timeInput = $("[data-reminder-time]");
  let editing = false;

  function refresh() {
    const state = store.getState();
    const now = new Date();
    const name = state.child.name?.trim() || DEFAULT_CHILD_NAME;
    ctx.setTitle(`${name} 양치 기록`);
    ctx.setBadge(AGE_GROUPS.find((g) => g.value === state.child.ageGroup)?.label ?? null);

    const rate = weekRate(state.sessions, now);
    $("[data-rate]").textContent = rate.percent === null ? "-" : `${rate.percent}%`;
    $("[data-rate-sub]").textContent = `${rate.total}회 중 ${rate.done}회`;
    const avg = weekAvgDuration(state.sessions, now);
    $("[data-avg]").textContent = avg === null ? "-" : formatDuration(avg);

    const cells = weekCells(state.sessions, now);
    const fmt = (key) => `${Number(key.slice(5, 7))}.${Number(key.slice(8))}`;
    $("[data-range]").textContent = `${fmt(cells[0].dayKey)} – ${fmt(cells[6].dayKey)}`;
    $("[data-empty]").hidden = state.sessions.length > 0;
    $("[data-calendar]").replaceChildren(renderWeekCalendar(cells));

    if (!editing) rewardText.textContent = state.settings.rewardPromise;

    const { enabled, time } = state.settings.reminder;
    toggle.setAttribute("aria-checked", String(enabled));
    $("[data-reminder-desc]").textContent = `${koreanTime(time)}까지 기록이 없으면 알려드려요`;
    if (document.activeElement !== timeInput) timeInput.value = time;
  }

  function setEditing(on) {
    editing = on;
    rewardForm.hidden = !on;
    rewardText.hidden = on;
    rewardEditBtn.hidden = on;
    if (on) {
      rewardInput.value = store.getState().settings.rewardPromise;
      rewardInput.focus();
      rewardInput.select();
    } else {
      refresh();
      rewardEditBtn.focus();
    }
  }

  rewardEditBtn.addEventListener("click", () => setEditing(true));
  $("[data-reward-cancel]").addEventListener("click", () => setEditing(false));
  rewardInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setEditing(false);
  });
  rewardForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const value = rewardInput.value.trim().slice(0, REWARD_MAX);
    if (!value) {
      ctx.toast("약속 내용을 적어 주세요");
      return;
    }
    store.update((d) => {
      d.settings.rewardPromise = value;
    });
    setEditing(false);
    ctx.toast("보상 약속을 저장했어요");
  });

  toggle.addEventListener("click", () => {
    const enabled = toggle.getAttribute("aria-checked") !== "true";
    store.update((d) => {
      d.settings.reminder.enabled = enabled;
    });
    if (enabled) ctx.reminder.requestPermission();
  });
  timeInput.addEventListener("change", () => {
    if (!timeInput.value) return;
    store.update((d) => {
      d.settings.reminder.time = timeInput.value;
    });
  });
  $("[data-reminder-preview]").addEventListener("click", () => ctx.reminder.preview());

  refresh();
  const timerId = setInterval(refresh, 60_000); // 시간대가 지나면 '예정' 칸이 '놓침'으로 바뀜
  cleanups = [store.subscribe(refresh), () => clearInterval(timerId)];
}

export function destroy() {
  cleanups.forEach((fn) => fn());
  cleanups = [];
}
