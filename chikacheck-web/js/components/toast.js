// 토스트 — 화면 위쪽 가운데에 잠깐 떴다 사라지는 안내 (여러 개면 순서대로 쌓인다)
const MAX_VISIBLE = 3;

export function toast(message, { duration = 2000 } = {}) {
  const root = document.getElementById("toast-root");
  if (!root) return;
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  root.append(el);
  while (root.children.length > MAX_VISIBLE) root.firstElementChild.remove();

  setTimeout(() => {
    el.classList.add("is-leaving");
    el.addEventListener("animationend", () => el.remove(), { once: true });
    setTimeout(() => el.remove(), 400); // 움직임 줄이기 설정에서는 animationend가 안 올 수 있음
  }, duration);
}
