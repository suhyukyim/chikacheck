// 입 지도 — 장난감 치아 모형 같은 3D 그림(캔버스, 라이브러리 없이 직접 투영). 지금 닦는 면이 민트색으로 빛나고 거품·별이 따라간다
// 아랫니 구역은 위에서, 윗니 구역은 아래에서 비추고, 닦는 쪽으로 천천히 돌아간다. 색은 tokens.css 변수에서 읽는다
const V = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  norm: (a) => {
    const l = Math.hypot(a[0], a[1], a[2]) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
  },
};
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

// ───────── 모형 (처음 한 번만 만든다) ─────────
const RX = 38;
const RZ = 44;
const Z0 = -14;
const GAP = 13; // 윗니·아랫니 사이 (입 벌린 정도)
const TOOTH_WEIGHTS = [1.5, 1.35, 1.05, 0.9, 0.85, 0.85, 0.9, 1.05, 1.35, 1.5]; // 유치 10개: 어금니 넓게, 앞니 좁게

function archAt(t) {
  const P = [RX * Math.cos(t), 0, Z0 + RZ * Math.sin(t)];
  const N = V.norm([Math.cos(t) / RX, 0, Math.sin(t) / RZ]);
  return { P, N, T: [-N[2], 0, N[0]] };
}

/** 아치 길이를 따라 이빨 자리를 나눈다 (틈 없이 붙게) */
function toothSlots() {
  const n = 600;
  const cum = [0];
  for (let i = 1; i <= n; i++) {
    const a = archAt((Math.PI * (i - 1)) / n).P;
    const b = archAt((Math.PI * i) / n).P;
    cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[2] - a[2]));
  }
  const tAt = (len) => {
    let i = cum.findIndex((c) => c >= len);
    if (i < 1) i = 1;
    const f = (len - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
    return (Math.PI * (i - 1 + f)) / n;
  };
  const sum = TOOTH_WEIGHTS.reduce((x, y) => x + y, 0);
  let acc = 0;
  return TOOTH_WEIGHTS.map((wt) => {
    const len = (cum[n] * wt) / sum;
    const slot = { t: tAt(acc + len / 2), w: len };
    acc += len;
    return slot;
  });
}

function buildModel() {
  const faces = [];
  const spots = { up: [], lo: [] };
  const faceSpots = []; // 얼굴을 그릴 가운데 앞니
  const addFace = (pts, center, info) => {
    let n = V.norm(V.cross(V.sub(pts[1], pts[0]), V.sub(pts[2], pts[0])));
    const c = V.mul(pts.reduce((s, p) => V.add(s, p), [0, 0, 0]), 1 / pts.length);
    if (V.dot(n, V.sub(c, center)) < 0) n = V.mul(n, -1);
    faces.push({ pts, n, c, ...info });
    return faces[faces.length - 1];
  };
  const slots = toothSlots();

  for (const jaw of ["up", "lo"]) {
    const s = jaw === "up" ? 1 : -1;
    slots.forEach(({ t, w: segW }, k) => {
      const front = Math.sin(t);
      const molar = 1 - front;
      const { P, N, T } = archAt(t);
      const a = (segW * 1.04) / 2; // 옆 이빨과 살짝 겹치게
      const b = (5.5 + 5.5 * molar) / 2;
      const h = 8 + 4 * front;
      const ring = Array.from({ length: 12 }, (_, i) => {
        const q = (Math.PI * 2 * i) / 12;
        return [a * Math.cos(q), b * Math.sin(q)];
      });
      const at = ([u, v], y, sc) => V.add(V.add(P, V.add(V.mul(T, u * sc), V.mul(N, v * sc))), [0, y, 0]);
      const root = ring.map((q) => at(q, s * (GAP + h + 3), 1));
      const mid = ring.map((q) => at(q, s * (GAP + 2.2), 0.98));
      const tip = ring.map((q) => at(q, s * GAP, 0.72));
      const center = V.add(P, [0, s * (GAP + (h + 3) / 2), 0]);
      for (let i = 0; i < 12; i++) {
        const j = (i + 1) % 12;
        const side = addFace([root[i], root[j], mid[j], mid[i]], center, { kind: "tooth", jaw });
        const nn = V.dot(side.n, N);
        side.part = nn > 0.45 ? "out" : nn < -0.45 ? "in" : "side";
        addFace([mid[i], mid[j], tip[j], tip[i]], center, { kind: "tooth", jaw, part: "chew" });
      }
      addFace(tip, center, { kind: "tooth", jaw, part: "chew" });
      spots[jaw].push({ t, d: b * 2, h });
      if (k === 4 || k === 5) faceSpots.push({ jaw, P, N, T, y: s * (GAP + h * 0.55) });
    });

    // 잇몸: 말굽 모양 벽 (바깥·안쪽·위아래 면)
    const y1 = s * (GAP + 8);
    const y2 = s * (GAP + 14);
    const SEG = 24;
    const Y = (p, y) => [p[0], y, p[2]];
    for (let i = 0; i < SEG; i++) {
      const A = archAt(-0.04 * Math.PI + (1.08 * Math.PI * i) / SEG);
      const B = archAt(-0.04 * Math.PI + (1.08 * Math.PI * (i + 1)) / SEG);
      const oA = V.add(A.P, V.mul(A.N, 6.5));
      const oB = V.add(B.P, V.mul(B.N, 6.5));
      const iA = V.sub(A.P, V.mul(A.N, 7));
      const iB = V.sub(B.P, V.mul(B.N, 7));
      const center = V.add(V.mul(V.add(A.P, B.P), 0.5), [0, (y1 + y2) / 2, 0]);
      addFace([Y(oA, y1), Y(oB, y1), Y(oB, y2), Y(oA, y2)], center, { kind: "gum", jaw });
      addFace([Y(iA, y1), Y(iB, y1), Y(iB, y2), Y(iA, y2)], center, { kind: "gum", jaw });
      addFace([Y(oA, y2), Y(oB, y2), Y(iB, y2), Y(iA, y2)], center, { kind: "gum", jaw });
      addFace([Y(oA, y1), Y(oB, y1), Y(iB, y1), Y(iA, y1)], center, { kind: "gum", jaw });
    }
  }
  return { faces, spots, faceSpots };
}

let MODEL = null;

// ───────── 그리기 ─────────
function readColors() {
  const css = getComputedStyle(document.documentElement);
  const rgb = (name) => {
    const hex = css.getPropertyValue(name).trim().replace("#", "");
    return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) || 0);
  };
  return {
    tooth: rgb("--toy-tooth"),
    gum: rgb("--toy-gum"),
    gumTop: rgb("--toy-gum-top"),
    hot: rgb("--toy-hot"),
    hotDeep: rgb("--toy-hot-deep"),
    bg: rgb("--surface"),
    ink: rgb("--ink"),
    blush: rgb("--blush"),
    foam: rgb("--foam"),
    foamLine: rgb("--foam-line"),
    sparkle: rgb("--gold"),
  };
}

const LIGHT = V.norm([-0.35, 0.8, 0.7]);
const rgba = (c, a = 1) => `rgba(${c.map((v) => Math.round(Math.min(255, Math.max(0, v)))).join(",")},${a})`;

export function createMouthMap(container, { reduceMotion = false } = {}) {
  MODEL ??= buildModel();
  const cv = document.createElement("canvas");
  cv.className = "mouth-map-canvas";
  cv.setAttribute("aria-hidden", "true");
  container.append(cv);
  const ctx = cv.getContext("2d");
  const COL = readColors();
  let part = null;
  let yaw = 0;
  let pitch = 0.4;
  let prevNow = 0;

  function draw(prog, now) {
    if (!part || !ctx) return;
    const W = cv.clientWidth;
    if (!W) return;
    const Hh = Math.round(W * 0.82);
    const dpr = globalThis.devicePixelRatio || 1;
    if (cv.width !== Math.round(W * dpr)) {
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(Hh * dpr);
      cv.style.height = `${Hh}px`;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, Hh);

    // 카메라: 아랫니는 위에서, 윗니는 아래에서. 닦는 쪽으로 살짝 돌아감
    const up = part.jaw === "up";
    const tCur = Math.PI * (0.05 + 0.9 * prog);
    const side = Math.PI / 2 - tCur;
    const pitchT = part.face === "chew" ? (up ? -0.7 : 0.75) : up ? -0.3 : 0.4;
    const yawT = part.face === "chew" ? side * 0.3 : part.face === "out" ? side * 0.75 : -side * 0.75;
    const dt = prevNow ? Math.min(0.1, (now - prevNow) / 1000) : 1;
    prevNow = now;
    const ease = reduceMotion ? 1 : Math.min(1, dt * 3);
    pitch += (pitchT - pitch) * ease;
    yaw += (yawT - yaw) * ease;
    const ya = yaw + (reduceMotion ? 0 : Math.sin(now / 1900) * 0.07);

    const target = [0, up ? 6 : -6, Z0 + 14];
    const D = 170;
    const cam = V.add(target, [D * Math.sin(ya) * Math.cos(pitch), D * Math.sin(pitch), D * Math.cos(ya) * Math.cos(pitch)]);
    const f = V.norm(V.sub(target, cam));
    const r = V.norm(V.cross(f, [0, 1, 0]));
    const u = V.cross(r, f);
    const focal = W * 1.3;
    const proj = (p) => {
      const v = V.sub(p, cam);
      const zc = V.dot(v, f);
      return [W / 2 + (focal * V.dot(v, r)) / zc, Hh / 2 - (focal * V.dot(v, u)) / zc, zc];
    };

    const pulse = reduceMotion ? 0.5 : 0.5 + 0.5 * Math.sin(now / 190);
    const list = [];
    for (const fc of MODEL.faces) {
      if (V.dot(fc.n, V.sub(cam, fc.c)) <= 0) continue; // 뒷면 생략
      let base = COL.tooth;
      if (fc.kind === "gum") base = Math.abs(fc.n[1]) > 0.7 ? COL.gumTop : COL.gum;
      else if (fc.jaw === part.jaw && fc.part === part.face) base = mix(COL.hot, COL.hotDeep, 0.2 + 0.35 * pulse);
      const lam = Math.max(0, V.dot(fc.n, LIGHT));
      let col = base.map((v) => v * (0.84 + 0.2 * lam));
      if (fc.kind === "tooth" && lam > 0.8) col = mix(col, [255, 255, 255], (lam - 0.8) * 2.5);
      if (fc.jaw !== part.jaw) col = mix(col, COL.bg, 0.6);
      const pts = fc.pts.map(proj);
      // 닦는 쪽 턱은 항상 맨 앞에 (다른 턱에 가리지 않게), 그 안에서는 먼 것부터
      list.push({ pts, depth: pts.reduce((s, p) => s + p[2], 0) / pts.length, col, act: fc.jaw === part.jaw ? 1 : 0 });
    }
    list.sort((a, b) => a.act - b.act || b.depth - a.depth);
    ctx.lineJoin = "round";
    ctx.lineWidth = 0.6;
    for (const it of list) {
      ctx.beginPath();
      it.pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
      ctx.closePath();
      ctx.fillStyle = ctx.strokeStyle = rgba(it.col);
      ctx.fill();
      ctx.stroke();
    }

    // 지금 닦는 곳: 거품 + 반짝이 별
    const spot = MODEL.spots[part.jaw].reduce((best, q) => (Math.abs(q.t - tCur) < Math.abs(best.t - tCur) ? q : best));
    const { P, N } = archAt(tCur);
    const s = up ? 1 : -1;
    const off = part.face === "out" ? spot.d / 2 + 2 : part.face === "in" ? -(spot.d / 2 + 2) : 0;
    const m = proj(V.add(V.add(P, V.mul(N, off)), [0, s * (GAP + (part.face === "chew" ? -1 : spot.h * 0.45)), 0]));
    const sc = focal / m[2];
    [[-4, -2, 3.2], [2.5, -4, 2.4], [4.5, 1.5, 3], [-1, 3.5, 2.2], [-6, 3, 1.8]].forEach(([dx, dy, rr], i) => {
      const bob = reduceMotion ? 0 : Math.sin(now / 160 + i * 1.7) * 0.8;
      ctx.beginPath();
      ctx.arc(m[0] + dx * sc, m[1] + (dy + bob) * sc, rr * sc * (0.9 + 0.15 * pulse), 0, Math.PI * 2);
      ctx.fillStyle = rgba(COL.foam, 0.92);
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = rgba(COL.foamLine);
      ctx.stroke();
    });
    const star = (x, y, rr) => {
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const ang = (Math.PI * i) / 4;
        const len = i % 2 ? rr * 0.35 : rr;
        ctx.lineTo(x + len * Math.cos(ang), y + len * Math.sin(ang));
      }
      ctx.closePath();
      ctx.fillStyle = rgba(COL.sparkle);
      ctx.fill();
    };
    const tw = reduceMotion ? 1 : 0.6 + 0.4 * Math.sin(now / 120);
    star(m[0] + 9 * sc, m[1] - 7 * sc, 3 * sc * tw);
    star(m[0] - 9 * sc, m[1] - 6 * sc, 2 * sc * (1.6 - tw));

    // 가운데 앞니 얼굴 (카메라 쪽을 볼 때만)
    for (const fs of MODEL.faceSpots) {
      if (V.dot(fs.N, V.sub(cam, V.add(fs.P, [0, fs.y, 0]))) <= 0) continue;
      const front = V.add(V.add(fs.P, V.mul(fs.N, 2.7)), [0, fs.y, 0]);
      const dim = fs.jaw !== part.jaw ? 0.45 : 1;
      const pt = (du, dv) => proj(V.add(front, V.add(V.mul(fs.T, du), [0, dv, 0])));
      const s2 = focal / proj(front)[2];
      for (const du of [-1.3, 1.3]) {
        const e = pt(du, 0.6);
        ctx.beginPath();
        ctx.arc(e[0], e[1], 0.75 * s2, 0, Math.PI * 2);
        ctx.fillStyle = rgba(COL.ink, dim);
        ctx.fill();
        const bl = pt(du * 1.55, -0.9);
        ctx.beginPath();
        ctx.ellipse(bl[0], bl[1], 0.9 * s2, 0.5 * s2, 0, 0, Math.PI * 2);
        ctx.fillStyle = rgba(COL.blush, 0.75 * dim);
        ctx.fill();
      }
      const mo = pt(0, -0.7);
      ctx.beginPath();
      ctx.arc(mo[0], mo[1] - 0.3 * s2, 0.7 * s2, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.lineWidth = Math.max(1, 0.35 * s2);
      ctx.strokeStyle = rgba(COL.ink, dim);
      ctx.stroke();
    }
  }

  return {
    setZone(parts) {
      part = parts;
    },
    draw,
  };
}
