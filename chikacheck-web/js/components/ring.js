// 원형 진행 링 — 12시 방향에서 시작해 시계방향으로 줄어드는 남은 시간 표시 (DOM은 한 번만 만들고 속성만 갱신)
const SIZE = 200;
const STROKE = 14;
const R = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;
const C = SIZE / 2;

export function createRing(container) {
  const wrap = document.createElement("div");
  wrap.className = "ring";
  wrap.innerHTML = `
    <svg viewBox="0 0 ${SIZE} ${SIZE}" aria-hidden="true">
      <circle class="ring-track" cx="${C}" cy="${C}" r="${R}" fill="none" stroke-width="${STROKE}"/>
      <circle class="ring-fill" cx="${C}" cy="${C}" r="${R}" fill="none" stroke-width="${STROKE}"
        stroke-linecap="round" transform="rotate(-90 ${C} ${C})"
        stroke-dasharray="${CIRCUMFERENCE} ${CIRCUMFERENCE}"/>
    </svg>
    <div class="ring-center">
      <div class="ring-time" role="timer">3:00</div>
      <div class="ring-label">남은 시간</div>
    </div>`;
  container.append(wrap);

  const fill = wrap.querySelector(".ring-fill");
  const time = wrap.querySelector(".ring-time");
  let lastLabel = null;

  return {
    /** ratio: 남은 비율(1 = 꽉 참, 0 = 빈 링), label: 가운데 숫자 */
    set(ratio, label) {
      const r = Math.min(1, Math.max(0, ratio));
      // 지나간 만큼 시작점을 시계방향으로 밀어서, 12시 쪽부터 비어 가게 한다
      fill.style.strokeDashoffset = `${-(1 - r) * CIRCUMFERENCE}px`;
      fill.style.opacity = r <= 0 ? "0" : "1";
      if (label !== lastLabel) {
        time.textContent = label;
        lastLabel = label;
      }
    },
  };
}
