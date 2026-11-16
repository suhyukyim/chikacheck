// 작은 이벤트 도우미 — on/off/emit (타이머와 가상 본체가 같이 쓴다)
export function createEmitter() {
  const handlers = new Map();

  function off(event, cb) {
    handlers.get(event)?.delete(cb);
  }

  /** 등록하고, 해제 함수를 돌려준다 */
  function on(event, cb) {
    if (!handlers.has(event)) handlers.set(event, new Set());
    handlers.get(event).add(cb);
    return () => off(event, cb);
  }

  function emit(event, payload) {
    for (const cb of [...(handlers.get(event) ?? [])]) {
      try {
        cb(payload);
      } catch (err) {
        console.error(err); // 한 구독자의 오류가 타이머·기기 흐름을 멈추지 않게
      }
    }
  }

  return { on, off, emit };
}
