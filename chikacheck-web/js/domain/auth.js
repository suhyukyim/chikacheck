// 시연용 로그인 규칙 — 공동 계정 확인, 부모 2차 비밀번호 확인, 화면별 접근 권한 (서버 없음: 실제 보안이 아니라 발표용 흉내)
export const DEMO_ACCOUNT = { id: "chika", password: "1234" };
export const PARENT_PIN = "0000";
export const PIN_LENGTH = 4;
export const DEFAULT_PARENT_NAME = "엄마·아빠";
export const NICKNAME_MAX = 10;

/** 부모 프로필만 들어갈 수 있는 화면 */
export const PARENT_ONLY = ["/parent", "/settings"];

/** 아이디는 앞뒤 공백·대소문자 무시, 비밀번호는 그대로 비교 */
export function checkLogin(id, password) {
  return String(id ?? "").trim().toLowerCase() === DEMO_ACCOUNT.id && String(password ?? "") === DEMO_ACCOUNT.password;
}

export function checkPin(pin) {
  return String(pin ?? "") === PARENT_PIN;
}

/**
 * 지금 상태로 path를 열 수 있는지. 열 수 있으면 null, 아니면 대신 보낼 화면
 * - 로그인 전 → /login
 * - 로그인 후 프로필 고르기 전 → /profiles
 * - 프로필을 고른 뒤 /login·/profiles → /timer, 아이가 부모 화면 → /timer
 */
export function resolveAccess({ loggedIn, profile, path }) {
  if (!loggedIn) return path === "/login" ? null : "/login";
  if (!profile) return path === "/profiles" ? null : "/profiles";
  if (path === "/login" || path === "/profiles") return "/timer";
  if (profile !== "parent" && PARENT_ONLY.includes(path)) return "/timer";
  return null;
}
