# 치카체크 웹 (발표용 시연 프로토타입)

어린이 정량 치약 디스펜서 「치카체크」와 함께 쓰는 양치 기록 웹입니다.
본체 하드웨어 대신 키보드 단축키(`T` 타이머 버튼 · `D` 배출 버튼)와 화면 시작 버튼으로 제안서의 사용 흐름 ①~⑥을 시연합니다.

- 배포 주소: `https://<깃허브아이디>.github.io/chikacheck-web/` ← 배포 후 여기에 붙여 넣기
- 단위 테스트: 배포 주소 뒤에 `tests.html`

## 실행 방법

ES Module을 쓰기 때문에 파일을 더블클릭(`file://`)하면 동작하지 않습니다. 웹 서버로 열어 주세요.

1. VSCode에서 이 폴더를 열고 **Live Server** 확장으로 `index.html` 열기 → `http://127.0.0.1:5500/`
2. 테스트: `http://127.0.0.1:5500/tests.html` → 맨 위가 "N개 중 N개 통과"인지 확인

Live Server가 없으면 터미널에서 `python3 -m http.server 5500` 후 같은 주소로 열면 됩니다.

## 시연 순서 (약 1분, 자세한 체크리스트는 [docs/DEMO.md](docs/DEMO.md))

처음 열면 로그인(시연용 공동 계정 `chika` / `1234`) → 프로필 선택. 아이는 바로, **엄마·아빠**는 2차 비밀번호 `0000`.
시연은 **엄마·아빠** 프로필로 하면 모든 탭을 오갈 수 있습니다.

| 순서 | 동작 | 단축키 |
|---|---|---|
| 1 | 본체 배출 버튼 → "완두콩만큼 나왔어요!" | `D` |
| 2 | 본체 타이머 버튼(또는 화면에서 시작) → 3분 카운트, 30초마다 이빨 친구·3D 입 지도·음성 안내가 다음 구역으로 | `T` |
| 3 | 완료 → 색종이, 스탬프 +1 | |
| 4 | 내 치카 친구 → 진행 바·퀘스트 +1 | `2` |
| 5 | 부모 → 달력 오늘 저녁 초록, 실천율·평균 시간 | `3` |
| 6 | "알림 미리보기"로 미양치 알림 설명 | |

발표 전: 설정 → **데모 데이터 채우기** + **배속 ×10**(3분이 18초). 발표가 낮(12~17시)이면 **발표 모드 시간대 고정: 저녁**.
주소에 `?speed=30`을 붙이면 설정보다 우선합니다 (3분이 6초).

## 폴더 구조

```
chikacheck-web/
├─ index.html              앱 화면 (해시 라우터: #/login #/profiles #/timer #/friend #/parent #/settings)
├─ tests.html              브라우저 단위 테스트
├─ manifest.webmanifest    홈 화면 추가용 (이름·아이콘)
├─ css/                    tokens(색·간격 변수) · base · components
├─ js/
│  ├─ main.js              앱 시작, 라우터·타이머·기기·알림 연결, 단축키
│  ├─ router.js  store.js  timer.js  sound.js  reminder.js  demo.js  emitter.js
│  ├─ domain/              순수 계산: time(시간대) · stats(달력·실천율) · rewards(스탬프·단계·퀘스트) · auth(로그인·화면 권한)
│  ├─ device/              device.js(기기 규약) · simulator.js(가상 본체)
│  ├─ views/               로그인 · 프로필 선택 · 치카 타임 · 내 치카 친구 · 부모 · 설정
│  ├─ components/          ring · calendar · character · pinPad · toothBuddy(이빨 친구) · mouthMap(3D 입 지도) · toast
│  └─ tests/run.js
├─ assets/icons/           토끼 아이콘 (파비콘·홈 화면)
└─ docs/                   PRD · DESIGN · PIPELINE · DEMO
```

- 기록은 브라우저 `localStorage`(키 `chikacheck:v1`)에만 저장합니다. 서버는 없고, 로그인은 **시연용 흉내**입니다 (아이디·비밀번호가 공개된 코드에 있으니 실제 비밀번호를 쓰지 마세요).
- 실제 BLE 본체는 `js/device/device.js` 규약과 같은 모양의 `ble.js`를 만들어 바꿔 끼우면 됩니다 (PRD 부록 A).

## 팀

4팀 — 사업 아이디어 「치카체크」
