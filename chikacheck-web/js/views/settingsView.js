// 설정 화면 — 부모 프로필(이름·로그아웃), 아이 정보(호칭·연령대·캐릭터), 소리, 발표용 시연 도구(배속·발표 모드·데모 데이터·초기화)
import { CHARACTERS, renderCharacter } from "../components/character.js";
import { countStamps, levelInfo } from "../domain/rewards.js";
import { generateDemoSessions } from "../demo.js";
import { AGE_GROUPS, DEFAULT_CHILD_NAME } from "../store.js";
import { SPEEDS } from "../timer.js";
import { DEFAULT_PARENT_NAME, NICKNAME_MAX } from "../domain/auth.js";

const NAME_MAX = 10;
const RESET_WORD = "초기화";
const SOUND_OPTIONS = [
  { key: "voice", label: "음성 안내", caption: "30초마다 닦을 곳을 말로 알려 줘요" },
  { key: "ding", label: "띵동", caption: "닦을 곳이 바뀔 때" },
  { key: "bubble", label: "뽀글뽀글", caption: "양치하는 동안 거품 소리" },
  { key: "bgm", label: "배경 음악", caption: "음성 안내 때는 작아져요" },
];
const SLOT_OPTIONS = [
  { value: "auto", label: "자동" },
  { value: "morning", label: "아침" },
  { value: "evening", label: "저녁" },
];

function segmented(name, label, options, value) {
  return `
    <div class="segmented" role="group" aria-label="${label}" data-seg="${name}">
      ${options
        .map((o) => `<button type="button" data-value="${o.value}" aria-pressed="${String(o.value) === String(value)}">${o.label}</button>`)
        .join("")}
    </div>`;
}

export function render(root, ctx) {
  const { store } = ctx;
  ctx.setTitle("설정");
  ctx.setBadge(null);

  function draw() {
    const { child, parent, settings, sessions } = store.getState();
    const level = levelInfo(countStamps(sessions)).level;
    root.innerHTML = `
      <div class="stack">
        <button type="button" class="back-btn" data-back>‹ 양치 기록으로</button>

        <section class="card" aria-labelledby="profile-title">
          <div class="section-head"><h2 class="card-title" id="profile-title">부모 프로필</h2></div>
          <div class="field">
            <label class="field-label" for="parent-name">프로필 이름</label>
            <input class="text-input" id="parent-name" type="text" maxlength="${NICKNAME_MAX}" autocomplete="off" placeholder="${DEFAULT_PARENT_NAME}">
            <p class="caption">프로필 선택 화면에 보이는 이름이에요 (예: 엄마, 아빠)</p>
          </div>
          <button type="button" class="btn btn--ghost btn--block logout-btn" data-logout>로그아웃</button>
        </section>

        <section class="card" aria-labelledby="child-title">
          <div class="section-head"><h2 class="card-title" id="child-title">아이 정보</h2></div>
          <div class="field">
            <label class="field-label" for="child-name">호칭</label>
            <input class="text-input" id="child-name" type="text" maxlength="${NAME_MAX}" autocomplete="off" placeholder="${DEFAULT_CHILD_NAME}">
          </div>
          <div class="field">
            <span class="field-label">연령대</span>
            ${segmented("age", "연령대", AGE_GROUPS, child.ageGroup)}
          </div>
          <div class="field">
            <span class="field-label">캐릭터</span>
            <div class="char-picker" role="group" aria-label="캐릭터 선택">
              ${CHARACTERS.map(
                (c) => `<button type="button" class="char-option" data-char="${c.kind}" aria-pressed="${c.kind === child.character}"><span data-preview="${c.kind}"></span>${c.label}</button>`,
              ).join("")}
            </div>
          </div>
        </section>

        <section class="card" aria-labelledby="sound-title">
          <div class="section-head"><h2 class="card-title" id="sound-title">치카 타임 소리</h2></div>
          ${SOUND_OPTIONS.map(
            (o) => `
          <div class="setting-row">
            <div>
              <span class="field-label" id="sound-${o.key}">${o.label}</span>
              <p class="caption">${o.caption}</p>
            </div>
            <button type="button" class="switch" role="switch" aria-labelledby="sound-${o.key}" aria-checked="${settings.sound[o.key] !== false}" data-sound="${o.key}"></button>
          </div>`,
          ).join("")}
        </section>

        <section class="card demo-card" aria-labelledby="demo-title">
          <div class="section-head">
            <h2 class="card-title" id="demo-title">시연 도구</h2>
            <span class="pill pill--coral">발표용</span>
          </div>
          <div class="field">
            <span class="field-label">타이머 배속</span>
            ${segmented("speed", "타이머 배속", SPEEDS.map((s) => ({ value: s, label: `×${s}` })), settings.demoSpeed)}
            ${ctx.urlSpeed ? `<p class="caption">주소 설정(×${ctx.urlSpeed})이 우선 적용 중이에요</p>` : ""}
          </div>
          <div class="field">
            <span class="field-label">발표 모드 시간대 고정</span>
            ${segmented("slot", "발표 모드 시간대 고정", SLOT_OPTIONS, settings.demoSlot)}
            <p class="caption">낮 발표 때 저녁으로 두면 새 기록이 오늘 저녁 칸에 들어가요</p>
          </div>
          <div class="demo-actions">
            <button type="button" class="btn btn--soft btn--block" data-demo>데모 데이터 채우기</button>
            <div class="inline-confirm" data-demo-confirm hidden>
              <p>지금 기록을 지우고 데모 기록으로 바꿀까요?</p>
              <div class="edit-actions">
                <button type="button" class="btn btn--ghost" data-demo-cancel>취소</button>
                <button type="button" class="btn btn--soft" data-demo-ok>바꾸기</button>
              </div>
            </div>
            <button type="button" class="btn btn--danger btn--block" data-reset>데이터 전체 초기화</button>
            <div class="inline-confirm" data-reset-step1 hidden>
              <p>모든 기록과 설정이 지워져요. 계속할까요?</p>
              <div class="edit-actions">
                <button type="button" class="btn btn--ghost" data-reset-cancel>취소</button>
                <button type="button" class="btn btn--danger" data-reset-next>계속</button>
              </div>
            </div>
            <form class="inline-confirm" data-reset-step2 hidden>
              <label for="reset-word">확인을 위해 <b>${RESET_WORD}</b>라고 입력해 주세요</label>
              <input class="text-input" id="reset-word" type="text" autocomplete="off">
              <div class="edit-actions">
                <button type="button" class="btn btn--ghost" data-reset-cancel>취소</button>
                <button type="submit" class="btn btn--danger-solid" data-reset-ok disabled>초기화</button>
              </div>
            </form>
          </div>
        </section>
      </div>`;

    const nameInput = root.querySelector("#child-name");
    nameInput.value = child.name;
    root.querySelector("#parent-name").value = parent.nickname;
    root.querySelectorAll("[data-preview]").forEach((slot) => {
      slot.replaceWith(renderCharacter(slot.dataset.preview, level, { decorative: true }));
    });
    bind(nameInput);
  }

  function setPressed(group, value) {
    root.querySelectorAll(`${group} [aria-pressed]`).forEach((btn) => {
      btn.setAttribute("aria-pressed", String((btn.dataset.value ?? btn.dataset.char) === String(value)));
    });
  }

  function bind(nameInput) {
    const $ = (sel) => root.querySelector(sel);
    const show = (sel, on) => ($(sel).hidden = !on);

    nameInput.addEventListener("input", () => {
      const name = nameInput.value.trim().slice(0, NAME_MAX);
      store.update((d) => {
        d.child.name = name;
      });
    });
    nameInput.addEventListener("blur", () => {
      if (nameInput.value.trim()) return;
      nameInput.value = DEFAULT_CHILD_NAME;
      store.update((d) => {
        d.child.name = DEFAULT_CHILD_NAME;
      });
    });

    root.querySelectorAll("[data-seg]").forEach((group) => {
      group.addEventListener("click", (e) => {
        const value = e.target.closest("[data-value]")?.dataset.value;
        if (value === undefined) return;
        const seg = group.dataset.seg;
        store.update((d) => {
          if (seg === "age") d.child.ageGroup = value;
          if (seg === "speed") d.settings.demoSpeed = Number(value);
          if (seg === "slot") d.settings.demoSlot = value;
        });
        setPressed(`[data-seg="${seg}"]`, value);
        if (seg === "speed") ctx.toast(`새 양치부터 ×${value} 배속이에요`);
      });
    });

    $(".char-picker").addEventListener("click", (e) => {
      const kind = e.target.closest("[data-char]")?.dataset.char;
      if (!kind) return;
      store.update((d) => {
        d.child.character = kind;
      });
      setPressed(".char-picker", kind);
    });

    const parentInput = $("#parent-name");
    parentInput.addEventListener("input", () => {
      const name = parentInput.value.trim().slice(0, NICKNAME_MAX);
      store.update((d) => {
        d.parent.nickname = name;
      });
    });
    parentInput.addEventListener("blur", () => {
      if (parentInput.value.trim()) return;
      parentInput.value = DEFAULT_PARENT_NAME;
      store.update((d) => {
        d.parent.nickname = DEFAULT_PARENT_NAME;
      });
    });
    $("[data-logout]").addEventListener("click", () => ctx.auth.logout());

    root.querySelectorAll("[data-sound]").forEach((sw) => {
      sw.addEventListener("click", () => {
        const on = sw.getAttribute("aria-checked") !== "true";
        sw.setAttribute("aria-checked", String(on));
        store.update((d) => {
          d.settings.sound[sw.dataset.sound] = on;
        });
      });
    });

    // 데모 데이터: 확인 1회 후 기록을 데모 기록으로 교체 (진행 중인 양치는 그대로 둔다)
    $("[data-demo]").addEventListener("click", () => show("[data-demo-confirm]", true));
    $("[data-demo-cancel]").addEventListener("click", () => show("[data-demo-confirm]", false));
    $("[data-demo-ok]").addEventListener("click", () => {
      const demo = generateDemoSessions(new Date());
      store.update((d) => {
        d.sessions = [...demo, ...d.sessions.filter((s) => s.status === "running")];
      });
      show("[data-demo-confirm]", false);
      ctx.toast("데모 데이터를 채웠어요");
      draw(); // 캐릭터 미리보기 단계 갱신
    });

    // 초기화: 2단계 확인 (두 번째는 '초기화' 입력)
    const resetWord = $("#reset-word");
    const resetOk = $("[data-reset-ok]");
    const closeReset = () => {
      show("[data-reset-step1]", false);
      show("[data-reset-step2]", false);
      show("[data-reset]", true);
      resetWord.value = "";
      resetOk.disabled = true;
    };
    $("[data-reset]").addEventListener("click", () => {
      show("[data-reset]", false);
      show("[data-reset-step1]", true);
    });
    root.querySelectorAll("[data-reset-cancel]").forEach((btn) => btn.addEventListener("click", closeReset));
    $("[data-reset-next]").addEventListener("click", () => {
      show("[data-reset-step1]", false);
      show("[data-reset-step2]", true);
      resetWord.focus();
    });
    resetWord.addEventListener("input", () => {
      resetOk.disabled = resetWord.value.trim() !== RESET_WORD;
    });
    $("[data-reset-step2]").addEventListener("submit", (e) => {
      e.preventDefault();
      if (resetWord.value.trim() !== RESET_WORD) return;
      store.resetAll();
      store.update((d) => {
        d.auth.loggedIn = true; // 초기화해도 지금 쓰는 중이니 로그인은 유지
      });
      ctx.toast("모든 데이터를 지웠어요");
      draw();
    });

    $("[data-back]").addEventListener("click", () => ctx.navigate("/parent"));
  }

  draw();
}

// 구독·타이머가 없어서 정리할 것이 없다 (초기화로 진행 중 기록이 사라지면 timer.js가 스스로 멈춘다)
export function destroy() {}
