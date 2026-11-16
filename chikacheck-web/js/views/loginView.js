// 로그인 화면 — 가족이 함께 쓰는 시연용 공동 계정으로 들어간다 (서버 없이 화면에서만 확인)
import { renderCharacter } from "../components/character.js";
import { DEMO_ACCOUNT, checkLogin } from "../domain/auth.js";

export function render(root, ctx) {
  const { store } = ctx;
  ctx.setTitle("치카체크");
  ctx.setBadge(null);

  root.innerHTML = `
    <div class="auth">
      <div class="auth-hero">
        <span class="auth-logo" data-logo></span>
        <h2 class="auth-title">치카체크</h2>
        <p class="caption">가족이 함께 쓰는 계정으로 로그인해 주세요</p>
      </div>
      <form class="card auth-form" novalidate>
        <div class="field">
          <label class="field-label" for="login-id">아이디</label>
          <input class="text-input" id="login-id" type="text" autocomplete="username" autocapitalize="none" spellcheck="false">
        </div>
        <div class="field">
          <label class="field-label" for="login-pw">비밀번호</label>
          <input class="text-input" id="login-pw" type="password" autocomplete="current-password">
        </div>
        <p class="form-error" role="alert" data-error hidden>아이디나 비밀번호가 맞지 않아요</p>
        <button type="submit" class="btn btn--primary btn--lg btn--block">로그인</button>
      </form>
      <p class="caption auth-hint">시연용 계정 · 아이디 <b>${DEMO_ACCOUNT.id}</b> · 비밀번호 <b>${DEMO_ACCOUNT.password}</b></p>
    </div>`;

  root.querySelector("[data-logo]").replaceWith(renderCharacter(store.getState().child.character, 1, { decorative: true }));

  const form = root.querySelector(".auth-form");
  const idInput = root.querySelector("#login-id");
  const pwInput = root.querySelector("#login-pw");
  const error = root.querySelector("[data-error]");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (checkLogin(idInput.value, pwInput.value)) {
      ctx.auth.login();
      return;
    }
    error.hidden = false;
    form.classList.remove("is-shaking");
    void form.offsetWidth; // 흔들기 애니메이션 다시 시작
    form.classList.add("is-shaking");
    pwInput.value = "";
    pwInput.focus();
  });
  form.addEventListener("input", () => {
    error.hidden = true;
  });
}

export function destroy() {}
