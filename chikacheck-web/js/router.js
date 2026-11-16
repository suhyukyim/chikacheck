// 해시 라우터 — #/login · #/profiles · #/timer · #/friend · #/parent · #/settings 전환과 view 수명(render → destroy) 관리
// guard(path)가 다른 주소를 돌려주면 그쪽으로 보낸다 (로그인·프로필·부모 전용 화면 막기)
export function createRouter({ routes, fallback, outlet, ctx, onChange, guard }) {
  let current = null;

  const currentPath = () => location.hash.replace(/^#/, "");

  function resolve() {
    const route = routes.find((r) => r.path === currentPath());
    if (!route) {
      location.replace(`#${fallback}`); // 없는 주소·빈 주소 → 기본 화면 (기록을 남기지 않음)
      return;
    }
    const redirect = guard?.(route.path);
    if (redirect && redirect !== route.path) {
      location.replace(`#${redirect}`);
      return;
    }
    if (route === current) return;
    current?.view.destroy?.();
    current = route;
    outlet.replaceChildren();
    outlet.scrollTop = 0;
    onChange?.(route);
    route.view.render(outlet, ctx);
    outlet.classList.remove("view-enter");
    void outlet.offsetWidth; // 전환 페이드를 매번 다시 재생
    outlet.classList.add("view-enter");
  }

  return {
    start() {
      window.addEventListener("hashchange", resolve);
      resolve();
    },
    go(path) {
      if (currentPath() !== path) location.hash = `#${path}`;
      else this.refresh();
    },
    /** 권한이 바뀌었을 때(로그아웃·프로필 바꾸기) 지금 주소를 다시 검사해서 그린다 */
    refresh() {
      current?.view.destroy?.();
      current = null;
      resolve();
    },
    get current() {
      return current;
    },
  };
}
