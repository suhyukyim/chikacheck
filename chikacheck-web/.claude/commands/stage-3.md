---
description: "치카체크 Stage 3: 타이머 엔진·치카 타임 화면"
---

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
