# 치카체크 웹 개발 파이프라인

> Stage 0(사람이 직접) → Stage 1~8(AI 명령어) → Stage 9(배포·리허설) 순서로 진행한다.
> 각 Stage는 **명령어 하나 = 커밋 하나**. 완료 기준을 전부 통과하기 전엔 다음 Stage로 넘어가지 않는다.

## 명령어 쓰는 법 (VSCode + Claude Code 확장)

- Claude Code 채팅창에 `/stage-1` 처럼 입력 → `.claude/commands/stage-1.md` 내용이 그대로 실행된다
- `CLAUDE.md`(코딩 규칙)는 매번 자동으로 읽히므로 따로 붙여넣을 필요 없다
- 명령어가 목록에 안 보이면: 키트 폴더를 **VSCode 작업 폴더 최상위**로 열었는지 확인 (`.claude` 폴더가 루트에 있어야 함)

보조 명령어
- `/check 3` → Stage 3 완료 기준을 Claude가 코드로 하나씩 검수
- `/fix 타이머가 0초에서 안 멈춤` → 버그 고치기 (원인 → 수정 → 재확인 순서)

## 한 Stage를 도는 루프

```
1) /stage-N 실행
2) AI가 범위 요약 → 구현 → 완료 기준 ✅/❌ 보고
3) Live Server로 직접 눌러보기 (보고서의 "직접 확인 방법" 따라)
4) tests.html 열어서 전부 PASS 확인 (Stage 2부터)
5) 문제 있으면 /fix ..., 애매하면 /check N
6) git add . && git commit -m "stage-N: ..."
7) 다음 Stage
```

> 팁: Stage가 끝나고 커밋했으면 `/clear`로 대화를 비우고 다음 Stage를 시작한다. 대화가 길어지면 앞 내용을 덜 정확하게 기억한다.
> 파일을 고칠 때마다 승인 창이 뜨는데, 처음엔 하나씩 보면서 승인하는 걸 추천 (Stage 1~2에서 Claude가 규칙대로 하는지 확인).

---

## Stage 0. 준비 (사람이 직접, 15분)

1. VSCode 확장 설치: **Live Server**(Ritwick Dey), **Claude Code**
2. GitHub에서 새 저장소 만들기: 이름 `chikacheck-web`, Public, README 없이
3. 이 키트 압축을 푼 폴더를 VSCode로 열기
4. 터미널에서
   ```bash
   git init
   git branch -M main
   git add .
   git commit -m "stage-0: PRD, 디자인, 파이프라인 문서"
   git remote add origin https://github.com/<내아이디>/chikacheck-web.git
   git push -u origin main
   ```
5. 확인: 폴더에 `CLAUDE.md`, `CLAUDE.md`, `docs/PRD.md`, `docs/DESIGN.md`, `docs/PIPELINE.md`, `.claude/commands/` 가 있다
6. Claude Code 채팅창에 `/` 입력 → `stage-1` ~ `stage-9`, `check`, `fix`가 보이면 준비 끝

---

## Stage 1. 뼈대 · 라우터 · 레이아웃

<!-- stage:1 -->
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
<!-- /stage -->

---

## Stage 2. 저장소 · 계산 로직 · 테스트

<!-- stage:2 -->
docs/PRD.md(특히 4장 규칙, 5장 데이터 모델)와 CLAUDE.md를 읽어. 지금은 **Stage 2: 저장소·계산 로직·테스트**만 구현해. 화면은 건드리지 마.

## 만들 파일

### `js/store.js`
- 키 `chikacheck:v1`, PRD 5장의 기본 상태
- `getState()` — 현재 상태 반환 (복사본)
- `update(fn)` — `fn(draft)`로 수정 → 저장 → 구독자 호출
- `subscribe(cb)` → 해제 함수 반환
- `resetAll()` — 기본 상태로
- `migrate(raw)` — `schemaVersion` 없거나 낮으면 변환 (지금은 v1 기본값 채우기만)
- JSON이 깨져 있으면: 원본을 `chikacheck:v1:broken`에 백업하고 기본 상태로 시작, `console.warn` 1회
- 세션 헬퍼: `addSession(session)`, `updateSession(id, patch)`, `getRunningSession()`

### `js/domain/time.js` (순수 함수, `now`는 인자로)
- `dayKey(date)` → `"YYYY-MM-DD"` (로컬 시각 기준)
- `getSlot(date)` → `{ slot: "morning"|"evening"|"other", dayKey }`
- `sessionSlot(session)` → `slotOverride`가 있으면 `{ slot: slotOverride, dayKey: dayKey(startedAt) }`, 없으면 `getSlot(startedAt)` — **stats·rewards는 전부 이 함수로 칸을 판정**
  - 아침 05:00~11:59, 저녁 17:00~02:59, **00:00~02:59는 전날 저녁**
- `startOfWeek(now)` → 그 주 월요일 00:00 Date
- `weekDayKeys(now)` → 월~일 dayKey 7개
- `slotEnd(dayKey, slot)` → 그 칸이 끝나는 시각 (아침: 당일 12:00, 저녁: 다음날 03:00)

### `js/domain/stats.js`
- `cellStatus(sessions, dayKey, slot, now)` → `"done"|"short"|"upcoming"|"missed"` (PRD 4.3)
- `weekCells(sessions, now)` → `[{ dayKey, weekday: "월".."일", isToday, morning, evening }]` 7개
- `weekRate(sessions, now)` → `{ done, total, percent }` (PRD 4.4, total 0이면 percent `null`)
- `weekAvgDuration(sessions, now)` → 초 또는 `null` (PRD 4.5)
- `formatDuration(sec)` → `"2분 48초"`, `formatClock(sec)` → `"2:48"`
- `running` 상태 세션은 달력·통계에서 **short처럼** 취급하지 말고 **제외**한다 (진행 중이니까)

### `js/domain/rewards.js`
- `LEVELS = [{level:1,name:"아기 치카",min:0},{level:2,name:"꼬마 치카",min:5},{level:3,name:"치카 히어로",min:15},{level:4,name:"치카 마스터",min:30}]`
- `countStamps(sessions)` — 날짜×slot 칸마다 completed 있으면 1 (other 제외)
- `levelInfo(stamps)` → `{ level, name, nextName|null, remaining|0, progress(0~1) }`
- `todayAttendance(sessions, now)` → `{ morning: bool, evening: bool }` (오늘 dayKey 기준 done 여부)
- `eveningStreak(sessions, now)` → 0~7 (PRD 4.7)
- `isFirstStampOfSlot(sessions, session)` → 이 completed 세션이 그 칸의 첫 completed인지 (완료 축하 문구용)

### `tests.html` + `js/tests/run.js`
- 라이브러리 없이 `test(name, fn)`, `eq(actual, expected)` 직접 구현
- 결과를 화면에 PASS(초록)/FAIL(빨강) 목록 + 맨 위 "N개 중 M개 통과"
- 아래 케이스는 **전부** 넣어 (날짜는 2026년 10월 기준, 2026-10-24는 토요일)
  1. 04:59 → other / 05:00 → morning / 11:59 → morning / 12:00 → other
  2. 16:59 → other / 17:00 → evening / 23:59 → evening
  3. 10-25 01:30 → evening, dayKey `2026-10-24` / 03:00 → other
  4. `startOfWeek(2026-10-25 일요일)` → `2026-10-19` 월요일 / `startOfWeek(2026-10-19 00:00)` → 같은 날
  5. 같은 칸 completed 2개 → 스탬프 1 / short만 있는 칸 → 0 / other 시간 completed → 0
  6. 스탬프 4 → 1단계, remaining 1 / 5 → 2단계 / 30 → 4단계, nextName null
  7. cellStatus: 기록 없고 아직 시간대 전 → upcoming / 지남 → missed / short+completed → done
  8. weekRate: 지난 칸 4개 중 done 3 → 75%, upcoming 칸은 분모에서 제외
  9. eveningStreak: 월~금 저녁 done, 토요일 19:00(저녁 아직 진행 중·기록 없음) → 5
  10. eveningStreak: 수요일 저녁 missed → 그 뒤부터 다시 셈
  11. formatDuration(168) → "2분 48초" / formatClock(120) → "2:00"
  12. store: 깨진 JSON 넣고 불러오면 기본 상태 + broken 키에 백업
  13. slotOverride "evening"인 14:00 completed → 그날 저녁 칸 done, 스탬프 1

## 완료 기준
- [ ] `tests.html` 전부 PASS (최소 25개 단언)
- [ ] `js/domain/*.js`에 `document`, `localStorage`, `Date.now()`, `new Date()`(인자 없는) 가 하나도 없다
- [ ] `localStorage`는 `store.js`에서만 사용
- [ ] index.html 화면은 Stage 1과 동일하게 동작 (깨진 곳 없음)
- [ ] 콘솔 에러 0개

끝나면 완료 기준을 ✅/❌로 보고하고, 내가 직접 확인할 방법과 커밋 메시지를 알려줘.
<!-- /stage -->

---

## Stage 3. 타이머 엔진 · 치카 타임 화면

<!-- stage:3 -->
docs/PRD.md 3.1·4.1·5장, docs/DESIGN.md 5장 "치카 타임", CLAUDE.md를 읽어. 지금은 **Stage 3: 타이머 엔진과 치카 타임 화면**만 구현해. 가상 본체는 아직 없으니 화면의 시작 버튼으로 테스트한다.

## 만들 파일

### `js/timer.js`
- `createTimer({ store, getSpeed })` → `{ start(source), stop(), getState(), on(event, cb) }`
- 상수: `TOTAL_SEC = 180`, `ZONE_SEC = 30`, `ZONES = ["윗니 바깥쪽","윗니 안쪽","아랫니 바깥쪽","아랫니 안쪽","윗니 씹는 면","아랫니 씹는 면"]`
- `start(source)`: 이미 진행 중이면 아무것도 안 하고 `false` 반환. 아니면 세션 생성(`status:"running"`, `speed` 기록, `settings.demoSlot`이 auto가 아니면 `slotOverride` 기록) 후 `true`
- 경과 시간 = `min(180, (지금 - startedAt) / 1000 × speed)` — setInterval 누적이 아니라 **시작 시각 기준 계산** (탭 전환·절전에도 정확)
- 250ms마다 `tick` 이벤트: `{ status, remainingSec, elapsedSec, zoneIndex(0~5), zoneName, germsLeft(= 6 - zoneIndex, 완료 시 0) }`
- 구역 번호가 바뀌면 `zone` 이벤트 1회
- 180초 도달 → 세션 `completed`, `durationSec:180`, `endedAt` 저장 → `complete` 이벤트 `{ session, gotStamp }` (`isFirstStampOfSlot` 사용)
- `stop()` → `short`, 경과 초 저장 → `stop` 이벤트
- 앱 시작 시 복원: `getRunningSession()`이 있으면 이어서 진행, 이미 180초 지났으면 즉시 completed 처리 (축하 오버레이는 띄우지 않음)
- 배속: `getSpeed()` = 주소의 `?speed=` 값(1/10/30만 허용) → 없으면 `settings.demoSpeed` → 없으면 1

### `js/components/ring.js`
- SVG 원형 진행 링 (지름 200, 두께 14, 12시에서 시작, `stroke-dasharray`로 남은 비율 표시)
- `createRing(container)` → `{ set(ratio, label) }` — DOM을 매번 새로 만들지 말고 속성만 갱신

### `js/views/timerView.js` (DESIGN.md 5장 그대로)
- 상단 배지 "본체 버튼 연동" (지금은 회색 "본체 미연결", Stage 4에서 연결)
- 대기 상태: 링 꽉 참 + `3:00` + "본체의 타이머 버튼을 눌러 시작해요" + 보조 버튼 "화면에서 시작"(source `"screen"`)
- 진행 상태: 링·숫자 갱신, 6칸 세그먼트(완료 초록/현재 코랄/남은 회색) + "6구역 중 N번째"
  - 안내 카드 "지금은 {zoneName}!" + "30초마다 닦을 곳이 바뀌어요" — 구역 바뀔 때 튀는 효과
  - 충치균 카드 "충치균 N마리 남았어!" + "끝까지 닦으면 모두 사라져요" + 보라 점 N개
  - "그만하기" 작은 버튼 → `confirm` 대신 화면 안 확인 카드("정말 그만할까?" 예/아니요)
- 완료: 오버레이 "다 닦았다! 🎉" + gotStamp면 "스탬프 1개 받았어요", 아니면 "오늘 이 시간 스탬프는 이미 받았어요" + 확인 버튼 → 대기 상태
- 스크린리더: 구역이 바뀔 때만 읽히는 `aria-live="polite"` 영역
- `destroy()`에서 이벤트 구독 해제 (타이머 자체는 계속 돈다 — 다른 탭 갔다 와도 이어서 보여야 함)

### `js/main.js`
- 타이머는 앱 전체에 하나만 만들고 `ctx.timer`로 view에 넘긴다

## 완료 기준
- [ ] `index.html?speed=30` 에서 "화면에서 시작" → 약 6초 만에 3:00→0:00, 1초 간격으로 매끄럽게 감소
- [ ] 구역 6개가 순서대로 바뀌고, 3번째 구역일 때 "아랫니 바깥쪽", 충치균 4마리 (시안과 동일)
- [ ] 완료 오버레이 표시, 같은 시간대 두 번째 완료 땐 "이미 받았어요" 문구
- [ ] 진행 중 새로고침 → 이어서 진행 / 진행 중 "내 친구" 탭 갔다 오기 → 이어서 표시
- [ ] 그만하기 → 기록이 `short`로 저장 (개발자도구 Application 탭에서 확인)
- [ ] 진행 중 "화면에서 시작"을 또 눌러도 기록이 2개 생기지 않음
- [ ] tests.html 여전히 전부 PASS
- [ ] 360px에서 링·카드가 잘리지 않음, 콘솔 에러 0개

끝나면 완료 기준을 ✅/❌로 보고하고, 내가 직접 확인할 방법과 커밋 메시지를 알려줘.
<!-- /stage -->

---

## Stage 4. 가상 본체 (기기 연결부)

<!-- stage:4 -->
docs/PRD.md 3.5·부록 A, docs/DESIGN.md, CLAUDE.md를 읽어. 지금은 **Stage 4: 기기 인터페이스와 가상 본체**를 구현해.

## 만들 파일

### `js/device/device.js` — 기기 규약 (나중에 BLE로 교체할 자리)
- `createDevice(kind = "simulator", options)` → 아래 모양의 객체
  ```js
  {
    kind, connected,            // boolean
    connect(), disconnect(),
    on(event, cb), off(event, cb),   // 기기 → 웹: "timerButton", "connection"
    showTime(remainingSec),          // 웹 → 기기: LED에 남은 시간
    showIdle(),                      // LED "3:00"
    showDone(),                      // LED "--:--" 깜빡임 후 idle
    blink()                          // 무시된 입력 알림
  }
  ```
- 파일 맨 위 주석에 이 규약과 "BLE 구현 시 ble.js가 같은 모양을 반환하면 된다"를 적어
- `kind`가 `"ble"`이면 지금은 `throw new Error("BLE는 다음 단계에서 지원")`

### `js/device/simulator.js` — 가상 본체 패널 (`#device-slot`에 그림)
- 제안서 본체 그림 컨셉을 **CSS/SVG 단순 도형**으로: 크림색 토끼 얼굴 본체 + 긴 귀, 가운데 **핑크 코 = 배출 버튼**, 오른쪽에 붙은 **타이머 모듈**(검은 LED 창 + 초록 원형 타이머 버튼), 왼쪽에 민트색 칫솔 컵(장식)
- LED 글자: 고정폭 숫자, 초록빛 글로우, `m:ss`
- 타이머 버튼 클릭 → `timerButton` 이벤트, 눌림 애니메이션
- 배출 버튼 클릭 → 패널 안에서 완두콩 크기 방울이 아래로 떨어지는 효과 + 토스트 "완두콩만큼 나왔어요!" (**이벤트 발생·기록 없음** — 실제 배출부는 기계식)
- 패널 아래 작은 안내: "T 타이머 · D 배출"
- 모바일(<900px): 하단 시트, 손잡이를 누르면 접기/펼치기 (접어도 LED는 보이게)
- `settings.showDevicePanel`이 false면 숨김

### `js/components/toast.js`
- `toast(message, { duration = 2000 })` — 화면 위쪽 가운데, 겹치면 순서대로

### `js/main.js` 연결
- `device.on("timerButton")` → `timer.start("device")`가 false면(이미 진행 중) `device.blink()`
- 타이머 `tick` → `device.showTime(remainingSec)` (초가 바뀔 때만 호출)
- `complete` → `device.showDone()` / `stop` → `device.showIdle()`
- 키보드 `T` → 타이머 버튼과 똑같이, `D` → 배출 버튼과 똑같이 (가상 본체 버튼도 눌리는 애니메이션)
- 치카 타임 배지: connected면 초록 "본체 버튼 연동", 아니면 회색 "본체 미연결"
- 앱 시작 시 진행 중 타이머 복원되면 LED도 바로 남은 시간 표시

## 완료 기준
- [ ] 가상 본체 타이머 버튼 → 기록 생성(source `"device"`) + 치카 타임 화면과 LED가 **같은 숫자**로 감소
- [ ] 진행 중 본체 버튼 다시 누르기 → 기록 늘지 않고 LED 깜빡임
- [ ] 배출 버튼 → 방울 효과 + 토스트, `sessions` 개수 변화 없음
- [ ] "내 친구"/"부모" 화면에 있어도 본체 버튼으로 시작되고 LED 동작
- [ ] 키보드 T / D 동작, 입력창에 글 쓰는 중엔 동작 안 함
- [ ] 1280px: 폰 화면 오른쪽에 본체 크게 / 360px: 하단 시트 접기·펴기
- [ ] `js/views/` 안에서 `simulator.js`를 import하지 않는다
- [ ] tests.html 전부 PASS, 콘솔 에러 0개

끝나면 완료 기준을 ✅/❌로 보고하고, 내가 직접 확인할 방법과 커밋 메시지를 알려줘.
<!-- /stage -->

---

## Stage 5. 내 치카 친구 (캐릭터 · 출석 · 퀘스트)

<!-- stage:5 -->
docs/PRD.md 3.2·4.6·4.7, docs/DESIGN.md 5장 "내 치카 친구"·6장 캐릭터, CLAUDE.md를 읽어. 지금은 **Stage 5: 내 치카 친구 화면과 캐릭터 SVG**를 구현해.

## 만들 파일
- `assets/characters/rabbit.svg`, `bear.svg`, `cat.svg`
  - 직접 그린 단순 도형만 (원·타원·패스). 기존 캐릭터와 닮지 않게.
  - 공통 틀: 크림 얼굴, 점 눈, 핑크 볼, 웃는 입. 토끼=긴 귀(안쪽 핑크), 곰=동그란 귀, 고양이=세모 귀
  - 단계 소품 레이어 `<g id="acc-ribbon">`, `<g id="acc-cape">`, `<g id="acc-crown">` 포함, 기본은 숨김
  - **인라인으로 넣어 쓸 수 있게** `js/components/character.js`에서 SVG 문자열로 관리해도 됨 (fetch 쓰면 file 경로 문제 생기니 문자열 방식 권장). 그 경우 assets 폴더는 생략 가능
- `js/components/character.js` — `renderCharacter(kind, level)` → SVG 요소, 단계에 맞는 소품 표시 (2: 리본, 3: 리본+망토, 4: 망토+왕관)
- `js/views/friendView.js` (DESIGN.md 5장 그대로)
  - 배지 "{level}단계 · {name}"
  - 캐릭터 카드: 캐릭터 + "다음 단계 **{nextName}**까지 스탬프 {remaining}개" + 진행 바 + "성장하면 깜짝 아이템을 받아요" (최고 단계면 "최고 단계 달성! 치카 마스터")
  - 오늘의 출석: 아침/저녁 동그라미 + 미완료 쪽 안내 문구 ("저녁 양치하면 오늘 출석 완료!"), 둘 다 하면 "오늘 출석 완료!"
  - 이번 주 퀘스트: "저녁 양치 7일 연속 성공하기" + "{streak}/7" + 진행 바, 7 달성 시 "성공! 보상 약속을 확인해요"
  - 캐릭터 누르면 살짝 점프 (재미 요소)
  - store `subscribe`로 기록이 바뀌면 자동 갱신, `destroy()`에서 해제
- 타이머 완료 직후 단계가 올랐으면: 완료 오버레이에 "치카가 {name}(으)로 성장했어!" 한 줄 추가 (timerView 수정)

## 완료 기준
- [ ] 기록 0개: 1단계 아기 치카, "다음 단계 꼬마 치카까지 스탬프 5개", 출석 둘 다 점선, 퀘스트 0/7
- [ ] `?speed=30`으로 다른 시간대에 완료 쌓기 → 스탬프·단계·진행 바 즉시 반영 (탭 이동 없이도)
- [ ] 같은 시간대 여러 번 완료해도 스탬프는 1개만 증가
- [ ] 단계 오를 때 소품이 바뀌고 완료 오버레이에 성장 문구
- [ ] 캐릭터 3종 모두 깨지지 않고 렌더링 (Stage 7 전이라도 코드에서 kind 바꿔 확인)
- [ ] tests.html 전부 PASS, 콘솔 에러 0개

끝나면 완료 기준을 ✅/❌로 보고하고, 내가 직접 확인할 방법과 커밋 메시지를 알려줘.
<!-- /stage -->

---

## Stage 6. 부모 화면 (게이트 · 달력 · 통계 · 보상 · 알림)

<!-- stage:6 -->
docs/PRD.md 3.3·3.6·4.3~4.5, docs/DESIGN.md 5장 "양치 달력", CLAUDE.md를 읽어. 지금은 **Stage 6: 부모 화면**을 구현해.

## 만들 파일
- `js/components/parentGate.js`
  - `#/parent`, `#/settings` 진입 시 덧셈 문제(한 자리 + 한 자리, 합 10 이상) 카드, 숫자 키패드 입력
  - 맞으면 이번 접속 동안(`sessionStorage`는 금지 — store 밖 저장 금지이므로 **메모리 변수**로) 다시 안 물음
  - 틀리면 카드 흔들기 + 새 문제, "아이 화면으로" 버튼
- `js/components/calendar.js` — `renderWeekCalendar(cells)` → 월~일 × 아침/저녁 점 표 (DESIGN.md 점 스타일 4종, 오늘 열 표시, 범례), 각 점에 `aria-label` ("10월 24일 저녁 완료")
- `js/views/parentView.js`
  - 제목 "우리 아이 양치 기록" (아이 이름이 있으면 "{name} 양치 기록")
  - 2열 통계 카드: 실천율 `{percent}%` + "{total}회 중 {done}회" / 평균 양치 시간 `{m분 ss초}` + "목표 3분" (값 없으면 `-`)
  - 이번 주 달력
  - 보상 약속 카드: 문구 표시 + 연필 버튼 → 그 자리에서 입력창(최대 60자) → 저장
  - 미양치 알림 카드: 토글 + 시각 선택(`<input type="time">`) + 안내 "앱이 열려 있을 때만 알려드려요 (실제 제품은 푸시 알림)" + "알림 미리보기" 버튼
  - 맨 아래 "설정" 링크 → `#/settings`
  - store 구독으로 자동 갱신
- `js/reminder.js` (main.js에서 시작)
  - 1분마다 확인: 알림 켜짐 + 현재 시각 ≥ 설정 시각 + 오늘 저녁 칸이 done/short 아님 + 오늘 아직 안 알림 → 상단 배너 "오늘 저녁 양치 기록이 아직 없어요" + `Notification` 권한이 granted면 브라우저 알림
  - 권한 요청은 토글을 켤 때 한 번만
  - "오늘 이미 알림" 여부는 메모리 변수로 (날짜 바뀌면 초기화)

## 완료 기준
- [ ] 부모 탭 → 덧셈 문제 → 맞히면 진입, 틀리면 새 문제 / 한 번 맞히면 새로고침 전까지 다시 안 물음
- [ ] 기록 0개: 실천율 `-` 또는 0% (지난 칸이 있으면 0%), 평균 `-`, 달력은 지난 칸 missed·남은 칸 upcoming
- [ ] 저녁 시간에 `?speed=30`으로 완료 1회 → 오늘 저녁 점이 즉시 초록, 실천율·평균 갱신
- [ ] 그만하기로 끝낸 칸 → 주황 테두리
- [ ] 보상 약속 수정 → 새로고침 후에도 유지
- [ ] "알림 미리보기" → 배너 표시 / 토글 끄면 실제 알림 안 뜸
- [ ] 1280px·360px 모두 달력 7열이 한 줄에 들어감
- [ ] tests.html 전부 PASS, 콘솔 에러 0개

끝나면 완료 기준을 ✅/❌로 보고하고, 내가 직접 확인할 방법과 커밋 메시지를 알려줘.
<!-- /stage -->

---

## Stage 7. 설정 · 시연 도구 (데모 데이터)

<!-- stage:7 -->
docs/PRD.md 3.4, CLAUDE.md를 읽어. 지금은 **Stage 7: 설정 화면과 발표용 시연 도구**를 구현해.

## 만들 파일
- `js/views/settingsView.js` (부모 게이트 적용)
  - **아이 정보**: 호칭 입력(최대 10자), 연령대 선택(만 3세 미만 / 만 3~6세 / 만 7세 이상), 캐릭터 선택(토끼·곰·고양이 미리보기 카드 3개)
  - **시연 도구** 카드 (부모 화면과 구분되게 점선 테두리 + "발표용" 배지)
    - 타이머 배속 ×1 / ×10 / ×30 (세그먼트 버튼). 주소에 `?speed`가 있으면 "주소 설정(×30)이 우선 적용 중" 안내
    - 가상 본체 패널 표시 토글
    - **발표 모드 시간대 고정**: 자동 / 아침 / 저녁 (세그먼트 버튼) + 안내 "낮 발표 때 저녁으로 두면 새 기록이 오늘 저녁 칸에 들어가요". auto가 아니면 치카 타임 상단에 작은 "발표 모드" 표시
    - "데모 데이터 채우기" → 확인 후 기존 기록을 데모 기록으로 **교체**
    - "데이터 전체 초기화" → 2단계 확인(두 번째는 "초기화"라고 입력) → `resetAll()`
  - 뒤로 → `#/parent`
- `js/demo.js` — `generateDemoSessions(now)` (순수 함수, `now` 인자)
  - 목표: 발표 때 화면이 시안처럼 보이게
  - 지난 2주 + 이번 주 **오늘 이전 날짜까지** 기록 생성, **오늘 아침은 done, 오늘 저녁은 비워둠** (발표에서 직접 채우는 장면용)
  - 이번 주: 지난 칸의 약 85%가 done, 1개는 short(예: 수요일 저녁, 95초)
  - 저녁 연속: 오늘 기준 어제까지 4일 연속 done이 되게 (가능한 요일이면) → 퀘스트 4/7 근처
  - 누적 스탬프가 약 9개 → "2단계 · 꼬마 치카, 다음 단계까지 6개" 근처
  - 각 done의 durationSec 180, startedAt은 아침 07:10~08:20 / 저녁 19:30~20:40 사이 랜덤 (단, **시드 고정 난수**로 매번 같은 결과)
  - 평균 시간이 2분 40~50초대가 나오게 short 하나를 포함
  - 이번 주가 월요일이라 지난 칸이 거의 없으면 그래도 이전 주 기록으로 단계·스탬프는 맞추기
- tests.html에 데모 테스트 추가: 같은 now면 결과 동일 / 오늘 저녁 칸 기록 없음 / 미래 시각 기록 없음

## 완료 기준
- [ ] 이름 "하윤" 입력 → 부모 화면 제목 "하윤 양치 기록"
- [ ] 캐릭터를 곰으로 바꾸면 내 친구 화면 캐릭터가 곰
- [ ] 배속 ×10 선택 → 주소 파라미터 없이도 18초 만에 완료
- [ ] 데모 데이터 → 부모 화면이 시안과 비슷(실천율 80%대, 평균 2분 40초대, 주황 1개), 내 친구 2단계, 오늘 저녁은 비어 있음
- [ ] 데모 상태에서 본체 버튼으로 저녁 양치 완료 → 퀘스트 +1, 스탬프 +1, 부모 달력 오늘 저녁 초록
- [ ] 오후 2시에 발표 모드 "저녁" → 완료 시 오늘 저녁 칸 초록 / "자동"으로 돌리면 이후 기록은 other
- [ ] 초기화 → 모든 화면이 기록 0 상태
- [ ] tests.html 전부 PASS, 콘솔 에러 0개

끝나면 완료 기준을 ✅/❌로 보고하고, 내가 직접 확인할 방법과 커밋 메시지를 알려줘.
<!-- /stage -->

---

## Stage 8. 다듬기 (완성도 · 접근성 · 앱처럼 보이기)

<!-- stage:8 -->
docs/DESIGN.md 7·8장, CLAUDE.md를 읽어. 지금은 **Stage 8: 다듬기**만 해. 새 기능을 추가하지 말고 기존 화면의 완성도를 올려.

## 할 일
1. **완료 축하**: CSS만으로 색종이(20~30조각, 1.5초) + 캐릭터 점프. `prefers-reduced-motion`이면 색종이 없이 페이드만
2. **화면 전환**: view 바뀔 때 200ms 페이드
3. **빈 상태 문구**: 기록 0개일 때 부모 화면 달력 위에 "첫 양치를 기록해 보세요 · 본체의 타이머 버튼을 눌러요"
4. **앱처럼**: `manifest.webmanifest`(이름 치카체크, `display: standalone`, 배경·테마색은 tokens 값), SVG 파비콘(토끼 얼굴), `apple-touch-icon`용 메타, iOS 상태바 메타
   - 서비스 워커는 만들지 마 (캐시 문제로 발표 직전 수정이 안 보일 수 있음)
5. **접근성 점검**: 모든 버튼 `aria-label` 또는 텍스트, 포커스 링 보이게(`:focus-visible`), 색만으로 구분되는 달력 점에 `aria-label`, 대비 확인
6. **반응형 점검**: 360 / 390 / 768 / 1280 / 1920px에서 깨짐·가로 스크롤 없는지. 1920px 발표 화면에서 폰+본체가 너무 작으면 `≥1600px`에서 전체 `zoom` 대신 폰 폭 460px·본체 420px로 키우기
7. **코드 정리**: 안 쓰는 코드·`console.log` 삭제, 각 파일 맨 위 한 줄 주석(역할), 중복 함수 정리
8. **README.md** 작성: 프로젝트 소개 2줄, 배포 주소 자리, 실행 방법(Live Server), 시연 순서 요약, 폴더 구조, 팀원(4팀)

## 완료 기준
- [ ] 완료 시 색종이·점프, 움직임 줄이기 설정에선 최소 효과
- [ ] 크롬 개발자도구 Lighthouse(모바일) 접근성 90점 이상
- [ ] 크롬에서 "앱 설치" 또는 휴대폰 "홈 화면에 추가" 시 토끼 아이콘·이름 치카체크
- [ ] 5가지 폭에서 깨짐 없음 (스크린샷 확인 방법 안내)
- [ ] `console.log` 0개(tests 제외), 콘솔 에러 0개, tests.html 전부 PASS

끝나면 완료 기준을 ✅/❌로 보고하고, 내가 직접 확인할 방법과 커밋 메시지를 알려줘.
<!-- /stage -->

---

## Stage 9. 배포 · 발표 리허설 (사람 + AI)

### 9-1. GitHub Pages 배포 (사람이 직접, 5분)
1. `git push`
2. GitHub 저장소 → **Settings → Pages**
3. Source: **Deploy from a branch** / Branch: `main`, 폴더 `/ (root)` → Save
4. 1~2분 뒤 상단에 뜨는 주소 확인: `https://<내아이디>.github.io/chikacheck-web/`
5. README.md의 배포 주소 자리에 붙여넣고 커밋·푸시

> 주의: 주소가 `/chikacheck-web/` 하위 경로라서, 코드에서 `/js/main.js`처럼 **슬래시로 시작하는 경로를 쓰면 깨진다.** 항상 `js/main.js`처럼 상대 경로.

### 9-2. 배포 점검 명령어

<!-- stage:9 -->
CLAUDE.md와 docs/PIPELINE.md의 Stage 9를 읽어. GitHub Pages 배포 전후 점검을 해줘.

## 할 일
1. 저장소 전체에서 `/`로 시작하는 절대 경로(`src="/`, `href="/`, `import ... from "/`, `fetch("/`)를 찾아 상대 경로로 고쳐
2. 대소문자 확인: import 경로와 실제 파일명 대소문자가 정확히 같은지 (GitHub Pages는 대소문자 구분, Windows는 구분 안 해서 로컬에선 모르고 지나감)
3. `index.html`, `manifest.webmanifest`, 아이콘 경로가 하위 경로(`/chikacheck-web/`)에서도 동작하는지
4. `.nojekyll` 빈 파일을 루트에 추가 (밑줄로 시작하는 파일 무시 방지)
5. 발표 리허설 체크리스트를 `docs/DEMO.md`로 작성 — 아래 "9-3"을 기준으로, 우리 코드의 실제 버튼 이름·단축키에 맞게
6. 위 1~4에서 고친 것 목록과 커밋 메시지를 보고해
<!-- /stage -->

### 9-3. 발표 리허설 체크리스트 (DEMO.md 초안)

**발표 전날**
- [ ] 휴대폰·노트북 둘 다 배포 주소 열림
- [ ] 노트북 크롬 창 크기 1280px 이상 → 폰 화면 + 본체 나란히
- [ ] 설정 → 데모 데이터 채우기 → 배속 ×10
- [ ] 발표가 12~17시면 설정 → **발표 모드 시간대 고정: 저녁** (안 하면 기록이 달력에 안 나옴)
- [ ] 와이파이 없을 때 대비: 로컬 Live Server 버전도 준비

**시연 (약 1분)**
1. "아이가 칫솔을 꺼내고" → 본체 코 버튼(D) → "완두콩만큼!"
2. 본체 타이머 버튼(T) → 화면과 LED 동시 카운트, 구역·충치균 변화 설명
3. 완료 → 색종이, 스탬프
4. 키 `2` → 내 치카 친구: 진행 바·퀘스트 +1
5. 키 `3` → 덧셈 게이트 → 부모 달력 오늘 점 초록, 실천율·평균
6. "알림 미리보기"로 미양치 알림 설명

**끝나고**
- [ ] 설정 → 데이터 전체 초기화 (다음 발표팀/교수님 확인용)

---

## 부록. 보조 명령어 본문

<!-- command:check -->
CLAUDE.md와 docs/PIPELINE.md를 읽어. Stage {{ARG}}의 "완료 기준"을 하나씩 검수해줘.

1. 각 항목마다 관련 코드를 직접 열어 확인하고 ✅ / ❌ / ⚠️(코드상 맞지만 사람이 화면으로 확인 필요)로 표시
2. ❌는 이유와 고칠 위치(파일:함수)를 적고, **고치기 전에 나한테 물어봐**
3. CLAUDE.md "반드시 지킬 것" 위반도 같이 찾아 (hex 색, localStorage 직접 호출, 프레임워크, 절대 경로 등)
4. 마지막에 "다음 Stage로 넘어가도 되는지" 한 줄 판단
<!-- /command -->

<!-- command:fix -->
CLAUDE.md와 docs/PRD.md를 읽어. 아래 문제를 고쳐줘.

문제: {{ARG}}

순서
1. 재현 방법을 한 줄로 정리하고, 원인 후보를 코드에서 찾아 1~3개 제시
2. 가장 유력한 원인을 고치되, **문제와 상관없는 코드는 건드리지 마**
3. PRD 규칙과 충돌하면 고치기 전에 물어봐
4. 고친 뒤: 바뀐 파일·이유, 내가 직접 확인할 방법, tests.html에 추가할 테스트가 있으면 추가
5. 커밋 메시지 제안: `fix: ...`
<!-- /command -->
