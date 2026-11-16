// 프로필 선택 — 넷플릭스처럼 아이 / 엄마·아빠 중 고른다. 아이는 바로, 부모는 2차 비밀번호(4자리)를 넣어야 들어간다
import { renderCharacter } from "../components/character.js";
import { createPinPad } from "../components/pinPad.js";
import { countStamps, levelInfo } from "../domain/rewards.js";
import { PARENT_PIN, PIN_LENGTH, checkPin } from "../domain/auth.js";

const LOCK_ICON = `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5M12 14.5v2"/></svg>`;
const PARENT_ICON = `<svg viewBox="0 0 64 64" aria-hidden="true"><circle class="pf-head" cx="24" cy="24" r="10"/><path class="pf-body" d="M8 54c0-10 7-17 16-17s16 7 16 17z"/><circle class="pf-head" cx="44" cy="28" r="8"/><path class="pf-body2" d="M31 54c1-8 6-13 13-13s12 5 13 13z"/><path class="pf-heart" d="M34 14c0-3 4-4 5-1 1-3 5-2 5 1 0 3-5 6-5 6s-5-3-5-6z"/></svg>`;

let pad = null;

export function render(root, ctx) {
  const { store } = ctx;
  ctx.setBadge(null);

  function closePad() {
    pad?.destroy();
    pad = null;
  }

  function showPicker() {
    closePad();
    ctx.setTitle("누가 쓸까요?");
    const { child, parent, sessions } = store.getState();
    const level = levelInfo(countStamps(sessions)).level;
    root.innerHTML = `
      <div class="profiles">
        <p class="profiles-lead">프로필을 골라 주세요</p>
        <div class="profile-grid">
          <button type="button" class="profile-card" data-pick="child">
            <span class="profile-avatar" data-avatar></span>
            <span class="profile-name" data-child-name></span>
            <span class="caption">바로 들어가요</span>
          </button>
          <button type="button" class="profile-card" data-pick="parent">
            <span class="profile-avatar profile-avatar--parent">${PARENT_ICON}</span>
            <span class="profile-name" data-parent-name></span>
            <span class="caption profile-lock">${LOCK_ICON}비밀번호</span>
          </button>
        </div>
        <button type="button" class="btn btn--ghost" data-logout>로그아웃</button>
      </div>`;
    root.querySelector("[data-avatar]").append(renderCharacter(child.character, level, { decorative: true }));
    root.querySelector("[data-child-name]").textContent = child.name;
    root.querySelector("[data-parent-name]").textContent = parent.nickname;

    root.querySelector(".profiles").addEventListener("click", (e) => {
      const pick = e.target.closest("[data-pick]")?.dataset.pick;
      if (pick === "child") ctx.auth.choose("child");
      else if (pick === "parent") showPin();
      else if (e.target.closest("[data-logout]")) ctx.auth.logout();
    });
  }

  function showPin() {
    const { parent } = store.getState();
    ctx.setTitle("부모님 확인");
    root.innerHTML = `
      <section class="card gate" aria-labelledby="pin-title">
        <div class="gate-icon">${LOCK_ICON}</div>
        <h2 class="gate-title" id="pin-title"></h2>
        <p class="caption">비밀번호 ${PIN_LENGTH}자리를 눌러 주세요 · 시연용 ${PARENT_PIN}</p>
        <div class="pin-area" data-pad></div>
        <button type="button" class="btn btn--ghost gate-leave" data-back>프로필 다시 고르기</button>
      </section>`;
    root.querySelector("#pin-title").textContent = `${parent.nickname} 비밀번호`;
    const card = root.querySelector(".gate");
    pad = createPinPad(root.querySelector("[data-pad]"), {
      length: PIN_LENGTH,
      onComplete(pin) {
        if (checkPin(pin)) {
          ctx.auth.choose("parent");
          return;
        }
        card.classList.remove("is-shaking");
        void card.offsetWidth; // 흔들기 애니메이션 다시 시작
        card.classList.add("is-shaking");
        ctx.toast("비밀번호가 달라요");
        pad.reset();
      },
    });
    root.querySelector("[data-back]").addEventListener("click", showPicker);
    root.querySelector('[data-key="1"]').focus();
  }

  showPicker();
}

export function destroy() {
  pad?.destroy();
  pad = null;
}
