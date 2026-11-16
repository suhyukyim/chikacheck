---
description: "치카체크 Stage 4: 가상 본체(기기 연결부)"
---

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
