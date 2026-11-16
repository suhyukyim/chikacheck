// 내 치카 친구 화면 — 캐릭터 성장 단계, 오늘의 출석(아침·저녁), 이번 주 퀘스트(저녁 7일 연속)
import { characterLabel, renderCharacter } from "../components/character.js";
import { QUEST_GOAL, countStamps, eveningStreak, levelInfo, todayAttendance } from "../domain/rewards.js";

const SLOT_TEXT = { morning: "아침", evening: "저녁" };

let cleanups = [];

export function render(root, ctx) {
  const { store } = ctx;
  ctx.setTitle("내 치카 친구");

  root.innerHTML = `
    <div class="stack">
      <section class="card friend-card" aria-label="내 캐릭터">
        <button type="button" class="character-btn" data-char></button>
        <p class="friend-next" data-next></p>
        <div class="progress" role="progressbar" aria-label="다음 단계까지 모은 스탬프" aria-valuemin="0" aria-valuemax="100" data-level-bar><span></span></div>
        <p class="caption" data-level-caption></p>
      </section>
      <section class="card" aria-labelledby="attend-title">
        <h2 class="card-title" id="attend-title">오늘의 출석</h2>
        <div class="attend-row">
          <span class="attend-dot" role="img" data-attend="morning">아침</span>
          <span class="attend-dot" role="img" data-attend="evening">저녁</span>
          <p class="attend-msg" data-attend-msg></p>
        </div>
      </section>
      <section class="card" aria-labelledby="quest-title">
        <div class="quest-head">
          <h2 class="card-title" id="quest-title">이번 주 퀘스트</h2>
          <span class="quest-count" data-quest-count></span>
        </div>
        <p class="quest-name">저녁 양치 ${QUEST_GOAL}일 연속 성공하기</p>
        <div class="progress" role="progressbar" aria-label="퀘스트 진행" aria-valuemin="0" aria-valuemax="${QUEST_GOAL}" data-quest-bar><span></span></div>
        <p class="quest-done" data-quest-done hidden>성공! 보상 약속을 확인해요</p>
      </section>
    </div>`;

  const charBtn = root.querySelector("[data-char]");
  const next = root.querySelector("[data-next]");
  const levelBar = root.querySelector("[data-level-bar]");
  const levelCaption = root.querySelector("[data-level-caption]");
  const attendMsg = root.querySelector("[data-attend-msg]");
  const questCount = root.querySelector("[data-quest-count]");
  const questBar = root.querySelector("[data-quest-bar]");
  const questDone = root.querySelector("[data-quest-done]");
  let drawn = "";

  function refresh() {
    const { sessions, child } = store.getState();
    const now = new Date();
    const info = levelInfo(countStamps(sessions));
    ctx.setBadge(`${info.level}단계 · ${info.name}`);

    // 캐릭터는 종류나 단계가 바뀔 때만 다시 그린다
    const key = `${child.character}|${info.level}`;
    if (key !== drawn) {
      charBtn.replaceChildren(renderCharacter(child.character, info.level, { decorative: true }));
      charBtn.setAttribute("aria-label", `${characterLabel(child.character)} 치카, ${info.name} — 누르면 점프해요`);
      drawn = key;
    }

    if (info.nextName) {
      next.innerHTML = `다음 단계 <b>${info.nextName}</b>까지 스탬프 <b>${info.remaining}</b>개`;
      levelCaption.textContent = "성장하면 깜짝 아이템을 받아요";
    } else {
      next.innerHTML = `최고 단계 달성! <b>${info.name}</b>`;
      levelCaption.textContent = "멋진 왕관을 받았어요";
    }
    const percent = Math.round(info.progress * 100);
    levelBar.firstElementChild.style.width = `${percent}%`;
    levelBar.setAttribute("aria-valuenow", String(percent));

    const attendance = todayAttendance(sessions, now);
    for (const slot of ["morning", "evening"]) {
      const dot = root.querySelector(`[data-attend="${slot}"]`);
      dot.classList.toggle("is-done", attendance[slot]);
      dot.setAttribute("aria-label", `${SLOT_TEXT[slot]} 출석 ${attendance[slot] ? "완료" : "전"}`);
    }
    const missing = ["morning", "evening"].filter((s) => !attendance[s]).map((s) => SLOT_TEXT[s]);
    attendMsg.textContent = missing.length === 0 ? "오늘 출석 완료!" : `${missing.join("·")} 양치하면 오늘 출석 완료!`;

    const streak = eveningStreak(sessions, now);
    questCount.textContent = `${streak}/${QUEST_GOAL}`;
    questBar.firstElementChild.style.width = `${(streak / QUEST_GOAL) * 100}%`;
    questBar.setAttribute("aria-valuenow", String(streak));
    questDone.hidden = streak < QUEST_GOAL;
  }

  charBtn.addEventListener("click", () => {
    charBtn.classList.remove("is-jumping");
    void charBtn.offsetWidth;
    charBtn.classList.add("is-jumping");
  });

  refresh();
  const timerId = setInterval(refresh, 60_000); // 날짜·시간대가 넘어가면 출석·퀘스트가 바뀜
  cleanups = [store.subscribe(refresh), () => clearInterval(timerId)];
}

export function destroy() {
  cleanups.forEach((fn) => fn());
  cleanups = [];
}
