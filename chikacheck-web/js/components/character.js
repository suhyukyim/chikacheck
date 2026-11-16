// 캐릭터 그림 — 직접 그린 단순 도형 SVG(토끼·곰·고양이, 귀 모양만 다름)와 단계별 소품(리본·망토·왕관)
export const CHARACTERS = [
  { kind: "rabbit", label: "토끼" },
  { kind: "bear", label: "곰" },
  { kind: "cat", label: "고양이" },
];

const EARS = {
  rabbit: `
    <ellipse class="ch-skin" cx="76" cy="46" rx="15" ry="38" transform="rotate(-12 76 46)"/>
    <ellipse class="ch-inner" cx="76" cy="50" rx="7" ry="26" transform="rotate(-12 76 50)"/>
    <ellipse class="ch-skin" cx="124" cy="46" rx="15" ry="38" transform="rotate(12 124 46)"/>
    <ellipse class="ch-inner" cx="124" cy="50" rx="7" ry="26" transform="rotate(12 124 50)"/>`,
  bear: `
    <circle class="ch-skin" cx="58" cy="62" r="20"/>
    <circle class="ch-inner" cx="58" cy="62" r="10"/>
    <circle class="ch-skin" cx="142" cy="62" r="20"/>
    <circle class="ch-inner" cx="142" cy="62" r="10"/>`,
  cat: `
    <path class="ch-skin" d="M52 84 L60 28 L98 56 Z"/>
    <path class="ch-inner" d="M61 72 L65 42 L86 57 Z"/>
    <path class="ch-skin" d="M148 84 L140 28 L102 56 Z"/>
    <path class="ch-inner" d="M139 72 L135 42 L114 57 Z"/>`,
};

// 소품: 2단계 리본 → 3단계 리본+망토 → 4단계 망토+왕관
const ACCESSORIES = {
  ribbon: (level) => level === 2 || level === 3,
  cape: (level) => level >= 3,
  crown: (level) => level >= 4,
};

function markup(kind) {
  return `
    <svg class="character" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <g class="acc" data-acc="cape">
        <path class="ch-cape" d="M62 144 Q100 128 138 144 L156 194 Q100 184 44 194 Z"/>
      </g>
      ${EARS[kind]}
      <ellipse class="ch-skin" cx="100" cy="164" rx="40" ry="30"/>
      <circle class="ch-skin" cx="100" cy="100" r="54"/>
      <circle class="ch-eye" cx="80" cy="98" r="6"/>
      <circle class="ch-eye" cx="120" cy="98" r="6"/>
      <circle class="ch-eye-hi" cx="82" cy="96" r="2"/>
      <circle class="ch-eye-hi" cx="122" cy="96" r="2"/>
      <ellipse class="ch-cheek" cx="67" cy="116" rx="10" ry="6"/>
      <ellipse class="ch-cheek" cx="133" cy="116" rx="10" ry="6"/>
      <path class="ch-mouth" d="M91 115 Q100 125 109 115"/>
      <g class="acc" data-acc="cape">
        <circle class="ch-knot" cx="100" cy="152" r="7"/>
      </g>
      <g class="acc" data-acc="ribbon">
        <path class="ch-ribbon" d="M100 152 L78 140 L78 164 Z"/>
        <path class="ch-ribbon" d="M100 152 L122 140 L122 164 Z"/>
        <circle class="ch-ribbon" cx="100" cy="152" r="6"/>
      </g>
      <g class="acc" data-acc="crown">
        <path class="ch-crown" d="M72 56 L77 24 L91 40 L100 16 L109 40 L123 24 L128 56 Z"/>
        <circle class="ch-gem" cx="100" cy="44" r="4"/>
      </g>
    </svg>`;
}

export function characterLabel(kind) {
  return CHARACTERS.find((c) => c.kind === kind)?.label ?? "토끼";
}

/** kind: rabbit|bear|cat, level: 1~4 → SVG 요소. decorative면 스크린리더에서 숨긴다 */
export function renderCharacter(kind = "rabbit", level = 1, { size, label, decorative = false } = {}) {
  const safeKind = EARS[kind] ? kind : "rabbit";
  const tpl = document.createElement("template");
  tpl.innerHTML = markup(safeKind).trim();
  const svg = tpl.content.firstElementChild;
  svg.classList.add(`character--${safeKind}`);
  if (size) {
    svg.setAttribute("width", size);
    svg.setAttribute("height", size);
  }
  if (decorative) {
    svg.setAttribute("aria-hidden", "true");
  } else {
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", label ?? `${characterLabel(safeKind)} 치카`);
  }
  svg.querySelectorAll(".acc").forEach((g) => {
    g.classList.toggle("is-on", ACCESSORIES[g.dataset.acc](level));
  });
  return svg;
}
