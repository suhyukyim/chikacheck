// 치카 타임 소리 — 구역 음성 안내(브라우저 내장 음성 합성)와 효과음(띵동·뽀글뽀글·배경 음악, Web Audio로 직접 합성 → 파일 없음)
// 브라우저 정책상 소리는 사용자가 한 번 누른 뒤(타이머 버튼 등)에만 난다. 막히면 조용히 넘어간다

/** 구역별 음성 안내 (timer.js ZONES 순서와 같다) */
export const ZONE_SAY = [
  "윗니 바깥쪽! 볼 쪽을 쓱쓱 닦아 보자!",
  "이번엔 윗니 안쪽! 혀 쪽을 쓱쓱!",
  "아랫니 바깥쪽! 볼 쪽을 쓱쓱!",
  "아랫니 안쪽! 혀 쪽을 쓱쓱!",
  "윗니 씹는 면! 앞뒤로 싹싹!",
  "마지막! 아랫니 씹는 면! 앞뒤로 싹싹!",
];
export const DONE_SAY = "다 닦았어! 이가 반짝반짝해!";
export const STOP_SAY = "다음엔 끝까지 닦아 보자!";

const VOICE_STYLE = { pitch: 0.9, rate: 1.15 }; // '씩씩한' 말투
const PREFERRED_VOICE = /google/i; // 크롬의 "Google 한국의". 없으면 기기의 한국어 기본 목소리
const BGM_VOL = 0.06;
const BGM_DUCK = 0.015; // 말하는 동안 배경 음악을 줄인다

// 배경 음악: 직접 만든 짧은 멜로디 [주파수(Hz), 박]
const C5 = 523.3, D5 = 587.3, E5 = 659.3, F5 = 698.5, G5 = 784, A5 = 880;
const SONG = [
  [G5, 1], [E5, 1], [G5, 1], [E5, 1], [F5, 1], [D5, 1], [E5, 2],
  [C5, 1], [D5, 1], [E5, 1], [G5, 1], [A5, 1], [G5, 1], [E5, 2],
  [G5, 1], [A5, 1], [G5, 1], [E5, 1], [F5, 1], [E5, 1], [D5, 2],
  [E5, 1], [D5, 1], [C5, 1], [D5, 1], [E5, 2], [C5, 2],
];
const BEAT = 0.3;

/** getSettings(): { voice, ding, bubble, bgm } (store.settings.sound) */
export function createSound({ getSettings }) {
  let ac = null;
  let bgmBus = null;
  let bgmTimer = null;
  let bgmNext = 0;
  let bgmIdx = 0;
  let bubbleTimer = null;
  let active = false;

  const synth = () => globalThis.speechSynthesis ?? null;
  const on = (key) => getSettings()?.[key] !== false;

  function audio() {
    if (!ac) {
      const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
      bgmBus = ac.createGain();
      bgmBus.gain.value = BGM_VOL;
      bgmBus.connect(ac.destination);
    }
    if (ac.state === "suspended") ac.resume().catch(() => {});
    return ac;
  }

  function tone(freq, start, dur, { type = "sine", vol = 0.18, slideTo = 0, out = null } = {}) {
    const a = audio();
    if (!a) return;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, start);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, start + dur);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(vol, start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g).connect(out ?? a.destination);
    o.start(start);
    o.stop(start + dur + 0.02);
  }

  function duck(down) {
    if (!bgmBus || !ac) return;
    bgmBus.gain.setTargetAtTime(down ? BGM_DUCK : BGM_VOL, ac.currentTime, 0.08);
  }

  function pickVoice() {
    const voices = synth()?.getVoices() ?? [];
    const ko = voices.filter((v) => v.lang?.toLowerCase().startsWith("ko"));
    return ko.find((v) => PREFERRED_VOICE.test(v.name)) ?? ko[0] ?? null;
  }

  function speak(text) {
    const s = synth();
    if (!text || !s || !on("voice")) return;
    s.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ko-KR";
    const voice = pickVoice();
    if (voice) u.voice = voice;
    u.pitch = VOICE_STYLE.pitch;
    u.rate = VOICE_STYLE.rate;
    u.onstart = () => duck(true);
    u.onend = u.onerror = () => duck(false);
    s.speak(u);
  }

  function ding() {
    const a = audio();
    if (!a || !on("ding")) return;
    const t = a.currentTime;
    tone(1318.5, t, 0.35);
    tone(1046.5, t + 0.16, 0.5);
  }

  function bubbleLoop() {
    clearTimeout(bubbleTimer);
    if (!active) return;
    const a = on("bubble") ? audio() : null;
    if (a && a.state === "running") {
      const f = 380 + Math.random() * 380;
      tone(f, a.currentTime, 0.07, { vol: 0.07, slideTo: f * 2.4 });
    }
    bubbleTimer = setTimeout(bubbleLoop, 180 + Math.random() * 260);
  }

  function bgmTick() {
    const a = audio();
    if (!a) return;
    if (bgmNext < a.currentTime) bgmNext = a.currentTime + 0.05;
    while (bgmNext < a.currentTime + 0.4) {
      const [f, beats] = SONG[bgmIdx];
      tone(f, bgmNext, beats * BEAT * 0.9, { type: "triangle", vol: 1, out: bgmBus });
      if (bgmIdx % 4 === 0) tone(f / 2, bgmNext, BEAT * 1.8, { vol: 0.8, out: bgmBus });
      bgmNext += beats * BEAT;
      bgmIdx = (bgmIdx + 1) % SONG.length;
    }
  }

  /** 지금 설정에 맞춰 배경 음악을 켜고 끈다 (설정을 바꾸면 main.js가 부른다) */
  function syncBgm() {
    const want = active && on("bgm");
    if (want && !bgmTimer) {
      if (!audio()) return;
      bgmNext = 0;
      bgmIdx = 0;
      bgmTimer = setInterval(bgmTick, 100);
      bgmTick();
    } else if (!want && bgmTimer) {
      clearInterval(bgmTimer);
      bgmTimer = null;
    }
  }

  return {
    /** 양치 시작: 배경 음악·뽀글 소리 시작 (첫 구역 안내는 zone()이 한다) */
    begin() {
      active = true;
      audio();
      syncBgm();
      bubbleLoop();
    },
    /** 구역이 바뀜: 띵동 → 음성 안내 */
    zone(index, { withDing = true } = {}) {
      if (withDing) ding();
      speak(ZONE_SAY[index]);
    },
    /** 양치 끝(완료·그만하기·취소): 효과음 멈추고 마무리 한마디 */
    end(text = "") {
      active = false;
      clearTimeout(bubbleTimer);
      syncBgm();
      if (text) speak(text);
      else synth()?.cancel();
    },
    syncBgm,
  };
}
