---
description: "치카체크 Stage 2: 저장소·계산 로직·테스트"
---

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
