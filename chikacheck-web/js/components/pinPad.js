// 숫자 비밀번호 입력판 — 점 N개 + 0~9 키패드 + 실제 키보드 숫자 입력 (부모 2차 비밀번호용)
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

/**
 * container 안에 입력판을 그린다. N자리를 다 넣으면 onComplete(pin) 호출
 * 반환: { reset(), destroy() }
 */
export function createPinPad(container, { length = 4, onComplete }) {
  container.innerHTML = `
    <div class="pin-dots" aria-hidden="true">${"<i></i>".repeat(length)}</div>
    <p class="sr-only" aria-live="polite" data-pin-live></p>
    <div class="keypad" role="group" aria-label="숫자 키패드">
      ${KEYS.map((k) => {
        if (k === "") return `<span aria-hidden="true"></span>`;
        if (k === "del") return `<button type="button" data-key="del" aria-label="한 글자 지우기">←</button>`;
        return `<button type="button" data-key="${k}">${k}</button>`;
      }).join("")}
    </div>`;

  const dots = [...container.querySelectorAll(".pin-dots i")];
  const live = container.querySelector("[data-pin-live]");
  let input = "";
  let locked = false;
  let doneTimer = null;

  function paint() {
    dots.forEach((d, i) => d.classList.toggle("is-on", i < input.length));
    live.textContent = input.length ? `${input.length}자리 입력` : "";
  }

  function press(key) {
    if (locked) return;
    if (key === "del") input = input.slice(0, -1);
    else if (input.length < length) input += key;
    paint();
    if (input.length === length) {
      locked = true;
      doneTimer = setTimeout(() => onComplete(input), 160); // 마지막 점이 채워지는 걸 보여 주고 확인
    }
  }

  const onClick = (e) => {
    const key = e.target.closest("[data-key]")?.dataset.key;
    if (key) press(key);
  };
  container.addEventListener("click", onClick);

  // 실제 키보드 숫자도 받는다. 처리한 키는 preventDefault → main.js의 1/2/3 단축키가 건너뛴다
  const onKey = (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const digit = /^(Digit|Numpad)(\d)$/.exec(e.code)?.[2];
    if (digit) press(digit);
    else if (e.key === "Backspace") press("del");
    else return;
    e.preventDefault();
  };
  document.addEventListener("keydown", onKey);
  paint();

  return {
    reset() {
      input = "";
      locked = false;
      paint();
    },
    destroy() {
      clearTimeout(doneTimer);
      container.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    },
  };
}
