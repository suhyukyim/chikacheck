---
description: "치카체크: Stage 완료 기준 검수 (예: /check 3)"
argument-hint: "[Stage 번호]"
---

CLAUDE.md와 docs/PIPELINE.md를 읽어. Stage $ARGUMENTS의 "완료 기준"을 하나씩 검수해줘.

1. 각 항목마다 관련 코드를 직접 열어 확인하고 ✅ / ❌ / ⚠️(코드상 맞지만 사람이 화면으로 확인 필요)로 표시
2. ❌는 이유와 고칠 위치(파일:함수)를 적고, **고치기 전에 나한테 물어봐**
3. CLAUDE.md "반드시 지킬 것" 위반도 같이 찾아 (hex 색, localStorage 직접 호출, 프레임워크, 절대 경로 등)
4. 마지막에 "다음 Stage로 넘어가도 되는지" 한 줄 판단
