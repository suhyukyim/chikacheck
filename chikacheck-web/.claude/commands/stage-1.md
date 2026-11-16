---
description: "치카체크 Stage 1: 뼈대·라우터·레이아웃"
---

docs/PRD.md, docs/DESIGN.md, CLAUDE.md를 먼저 읽어. 지금은 **Stage 1: 뼈대·라우터·레이아웃**만 구현해.

## 만들 파일
- `index.html`
  - `<html lang="ko">`, viewport meta, `<meta name="color-scheme" content="light">`, title "치카체크"
  - Pretendard CDN 링크 (DESIGN.md 2장 주소)
  - 구조: `#app` 안에 `.phone`(화면 영역: `header.topbar` + `main#view` + `nav.tabbar`)과 `aside#device-slot`(가상 본체 자리)
  - `<script type="module" src="js/main.js">`
- `css/tokens.css` — DESIGN.md 1·3장의 모든 변수를 `:root`에 정의
- `css/base.css` — 리셋, body 배경 `--bg`, 폰트, 버튼 기본(최소 48px), `.card`, `.pill`, `.progress`
- `css/components.css` — `.topbar`, `.tabbar`(하단 고정, 탭 3개, 현재 탭 초록), 레이아웃
  - 화면 폭 < 900px: `.phone` 최대 420px 가운데, `#device-slot`은 화면 아래 시트 자리
  - 화면 폭 ≥ 900px: `.phone`(420px)과 `#device-slot`(360px)을 가로로 나란히, 화면 가운데
- `js/router.js`
  - 해시 라우팅: `#/timer`, `#/friend`, `#/parent`, `#/settings`
  - 없는 주소나 빈 해시 → `#/timer`로 교체(`location.replace`)
  - 라우트 표: `{ path, title, view, tab }` — tab은 하단 탭 강조용 (`settings`는 `parent` 탭 강조)
  - 화면 전환 시 이전 view의 `destroy()`가 있으면 호출
- `js/views/timerView.js`, `friendView.js`, `parentView.js`, `settingsView.js`
  - 각각 `export function render(root, ctx)`와 `export function destroy()`
  - 지금은 제목과 "Stage N에서 구현" 안내 카드 하나만
- `js/main.js` — 라우터 시작, 상단 제목 갱신, 하단 탭 클릭 연결
  - 키보드 단축키: `1` 치카 타임, `2` 내 친구, `3` 부모 (input/textarea에 포커스 있으면 무시)
- `#device-slot` 안에는 회색 점선 박스 "가상 본체 (Stage 4)"만

## 하지 말 것
- 타이머, 저장소, 기기 로직은 아직 만들지 마. 자리만.

## 완료 기준
- [ ] Live Server로 열면 크림색 배경, 상단 제목 "치카 타임", 하단 탭 3개(치카 타임 / 내 친구 / 부모)
- [ ] 탭을 누르면 주소가 `#/timer` `#/friend` `#/parent`로 바뀌고 제목과 본문이 바뀐다
- [ ] `#/abc`처럼 없는 주소 → `#/timer`로 이동
- [ ] 새로고침해도 현재 화면 유지, 브라우저 뒤로가기 동작
- [ ] 키보드 1/2/3으로 화면 이동
- [ ] 1280px 폭: 폰 화면과 가상 본체 박스가 가로로 나란히 / 360px 폭: 세로로 쌓이고 가로 스크롤 없음
- [ ] 색 hex가 `tokens.css` 밖에 없다 (검색해서 확인)
- [ ] 콘솔 에러 0개

끝나면 완료 기준을 ✅/❌로 보고하고, 내가 직접 확인할 방법과 커밋 메시지를 알려줘.
