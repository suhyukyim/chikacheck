---
description: "치카체크 Stage 9: GitHub Pages 배포 점검·리허설 문서"
---

CLAUDE.md와 docs/PIPELINE.md의 Stage 9를 읽어. GitHub Pages 배포 전후 점검을 해줘.

## 할 일
1. 저장소 전체에서 `/`로 시작하는 절대 경로(`src="/`, `href="/`, `import ... from "/`, `fetch("/`)를 찾아 상대 경로로 고쳐
2. 대소문자 확인: import 경로와 실제 파일명 대소문자가 정확히 같은지 (GitHub Pages는 대소문자 구분, Windows는 구분 안 해서 로컬에선 모르고 지나감)
3. `index.html`, `manifest.webmanifest`, 아이콘 경로가 하위 경로(`/chikacheck-web/`)에서도 동작하는지
4. `.nojekyll` 빈 파일을 루트에 추가 (밑줄로 시작하는 파일 무시 방지)
5. 발표 리허설 체크리스트를 `docs/DEMO.md`로 작성 — 아래 "9-3"을 기준으로, 우리 코드의 실제 버튼 이름·단축키에 맞게
6. 위 1~4에서 고친 것 목록과 커밋 메시지를 보고해
