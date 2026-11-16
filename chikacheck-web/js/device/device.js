// 기기(본체) 연결 규약 — 화면 코드는 이 파일을 통해서만 본체와 주고받는다
//
// createDevice(kind)가 돌려주는 객체 모양. BLE 구현 시 ble.js가 같은 모양을 반환하면 simulator.js 대신 끼울 수 있다.
//   kind                      "simulator" | "ble"
//   connected                 boolean
//   connect(), disconnect()
//   on(event, cb) → 해제 함수, off(event, cb)
//     기기 → 웹 이벤트: "timerButton"(타이머 버튼 누름), "connection"({ connected })
//   showTime(remainingSec)    웹 → 기기: LED에 남은 시간 표시
//   showIdle()                LED "3:00"
//   showDone()                LED "--:--" 깜빡임 후 idle
//   blink()                   무시된 입력 알림 (LED 한 번 깜빡)
//   press(button)             (선택) 키보드 단축키로 "timer" | "dispense" 버튼 누르기 — 시뮬레이터만
//
// 배출 버튼은 실제 본체에서 기계식(래칫)이라 전자 신호가 없다 → 이벤트·기록 없음.
import { createSimulator } from "./simulator.js";

export function createDevice(kind = "simulator", options = {}) {
  if (kind === "simulator") return createSimulator(options);
  if (kind === "ble") throw new Error("BLE는 다음 단계에서 지원");
  throw new Error(`알 수 없는 기기 종류: ${kind}`);
}
