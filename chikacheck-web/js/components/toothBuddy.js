// 이빨 친구 — 표정 있는 큰 이빨 하나. 지금 닦을 면이 빛나고, 칫솔이 문지르고, 구역마다 충치균 3마리가 사라진다
// 왼쪽은 볼, 오른쪽은 혀 캐릭터 (글자 못 읽는 아이도 방향을 안다). 윗니 구역이면 뿌리가 위로 가게 뒤집는다(얼굴은 그대로)
const NS = "http://www.w3.org/2000/svg";
const H = 300;

function el(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  parent?.appendChild(e);
  return e;
}

// 아랫니 기준 좌표 (윗니면 몸 그룹째 뒤집힌다)
const GERM_SPOTS = {
  out: [[60, 100], [58, 122], [62, 146]],
  in: [[180, 100], [182, 122], [178, 146]],
  chew: [[94, 74], [120, 70], [146, 74]],
};
const GERM_PATH = "M -8 0 Q -9 -8 -3 -8 Q 0 -11 3 -8 Q 9 -8 8 0 Q 9 7 0 8 Q -9 7 -8 0 Z";

export function createToothBuddy(container, { reduceMotion = false } = {}) {
  const svg = el("svg", { class: "buddy", viewBox: "0 0 240 300", "aria-hidden": "true" });
  container.append(svg);

  // 볼(왼쪽)·혀(오른쪽)
  const cheek = el("g", { class: "buddy-side" }, svg);
  el("path", { class: "buddy-cheek", d: "M -2 64 Q 50 76 50 150 Q 50 224 -2 236 Z" }, cheek);
  el("ellipse", { class: "buddy-blush", cx: 24, cy: 160, rx: 11, ry: 6.5 }, cheek);
  el("path", { class: "buddy-line", d: "M 14 134 Q 21 127 28 134" }, cheek);
  el("text", { class: "buddy-side-name", x: 22, y: 104 }, cheek).textContent = "볼";
  const tongue = el("g", { class: "buddy-side" }, svg);
  el("path", { class: "buddy-tongue", d: "M 242 92 Q 186 90 186 150 Q 186 212 242 208 Z" }, tongue);
  for (const x of [210, 228]) {
    el("circle", { class: "buddy-eye", cx: x, cy: 128, r: 4 }, tongue);
    el("circle", { class: "buddy-eye-hi", cx: x + 1.5, cy: 126.5, r: 1.4 }, tongue);
  }
  el("path", { class: "buddy-tongue-mouth", d: "M 208 146 Q 219 147 230 146 Q 228 162 219 162 Q 210 162 208 146 Z" }, tongue);
  el("ellipse", { class: "buddy-blush", cx: 203, cy: 142, rx: 5, ry: 3 }, tongue);
  el("text", { class: "buddy-side-name", x: 220, y: 200 }, tongue).textContent = "혀";

  // 이빨 몸 (윗니면 이 그룹만 뒤집는다)
  const body = el("g", {}, svg);
  el("path", {
    class: "buddy-tooth",
    d: "M 64 118 Q 62 80 96 84 Q 108 76 120 84 Q 132 76 144 84 Q 178 80 176 118 L 172 160 Q 170 196 156 232 Q 148 246 140 230 L 128 196 Q 120 186 112 196 L 100 230 Q 92 246 84 232 Q 70 196 68 160 Z",
  }, body);
  el("path", { class: "buddy-gum", d: "M 52 176 Q 52 160 68 162 Q 94 174 120 164 Q 146 174 172 162 Q 188 160 188 176 L 188 238 Q 188 256 170 256 L 70 256 Q 52 256 52 238 Z" }, body);
  const surf = {
    out: el("path", { class: "buddy-surf", d: "M 64 116 L 68 156" }, body),
    in: el("path", { class: "buddy-surf", d: "M 176 116 L 172 156" }, body),
    chew: el("path", { class: "buddy-surf", d: "M 66 106 Q 64 80 96 84 Q 108 76 120 84 Q 132 76 144 84 Q 176 80 174 106" }, body),
  };
  const germs = [0, 1, 2].map(() => {
    const g = el("g", { class: "buddy-germ" }, body);
    el("path", { class: "buddy-germ-body", d: GERM_PATH }, g);
    for (const x of [-3, 3]) {
      el("circle", { class: "buddy-germ-eye", cx: x, cy: -1, r: 2.4 }, g);
      el("circle", { class: "buddy-eye", cx: x + 0.4, cy: -0.6, r: 1.1 }, g);
    }
    return g;
  });
  const brush = el("g", {}, body);
  el("rect", { class: "buddy-handle", x: -16, y: -11, width: 96, height: 8, rx: 4 }, brush);
  el("rect", { class: "buddy-head", x: -15, y: -5, width: 30, height: 10, rx: 2.5 }, brush);
  for (let i = -10; i <= 10; i += 5) el("line", { class: "buddy-tuft", x1: i, y1: -4, x2: i, y2: 4 }, brush);
  for (const [cx, cy, r] of [[-14, 9, 4], [-4, 12, 3], [8, 10, 4.5], [16, 6, 3]]) el("circle", { class: "buddy-foam", cx, cy, r }, brush);

  // 얼굴 (뒤집지 않음)
  const face = el("g", {}, svg);
  const openEyes = el("g", {}, face);
  for (const x of [104, 136]) {
    el("circle", { class: "buddy-eye", cx: x, cy: 120, r: 6 }, openEyes);
    el("circle", { class: "buddy-eye-hi", cx: x + 2, cy: 118, r: 2 }, openEyes);
  }
  const happyEyes = el("g", { visibility: "hidden" }, face);
  el("path", { class: "buddy-line", d: "M 98 122 Q 104 114 110 122" }, happyEyes);
  el("path", { class: "buddy-line", d: "M 130 122 Q 136 114 142 122" }, happyEyes);
  el("ellipse", { class: "buddy-blush", cx: 92, cy: 134, rx: 7, ry: 4 }, face);
  el("ellipse", { class: "buddy-blush", cx: 148, cy: 134, rx: 7, ry: 4 }, face);
  el("path", { class: "buddy-line", d: "M 112 134 Q 120 142 128 134" }, face);

  let part = null;

  return {
    /** parts: { jaw: "up"|"lo", face: "out"|"in"|"chew" } */
    setZone(parts) {
      part = parts;
      const up = parts.jaw === "up";
      body.setAttribute("transform", up ? `translate(0 ${H}) scale(1 -1)` : "");
      face.setAttribute("transform", up ? "translate(0 46)" : "");
      for (const key in surf) surf[key].classList.toggle("is-on", key === parts.face);
      cheek.classList.toggle("is-on", parts.face === "out");
      tongue.classList.toggle("is-on", parts.face === "in");
      GERM_SPOTS[parts.face].forEach(([x, y], i) => {
        // 몸이 뒤집혀도 균 얼굴은 바로 보이게 다시 뒤집는다
        germs[i].setAttribute("transform", `translate(${x} ${y})${up ? " scale(1 -1)" : ""}`);
      });
    },
    /** prog: 이 구역에서 지난 비율 0~1, now: ms */
    draw(prog, now) {
      if (!part) return;
      const wob = reduceMotion ? 0 : Math.sin(now / 70);
      let x;
      let y;
      let rot;
      if (part.face === "out") [x, y, rot] = [52, 124 + 22 * wob, -90];
      else if (part.face === "in") [x, y, rot] = [188, 124 + 22 * wob, 90];
      else [x, y, rot] = [120 + 26 * wob, 64, 0];
      brush.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot})`);
      germs.forEach((g, i) => g.classList.toggle("is-gone", prog > (i + 1) * 0.28));
      const happy = prog > 0.88;
      openEyes.setAttribute("visibility", happy ? "hidden" : "visible");
      happyEyes.setAttribute("visibility", happy ? "visible" : "hidden");
    },
  };
}
