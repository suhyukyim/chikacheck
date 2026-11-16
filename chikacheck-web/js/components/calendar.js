// 주간 양치 달력 — 월~일 × 아침/저녁 점 표 (완료·짧음·예정·놓침), 오늘 열 표시, 범례
import { formatMonthDay } from "../domain/time.js";

const STATUS_TEXT = { done: "완료", short: "짧게 닦음", upcoming: "예정", missed: "놓침" };
const SLOT_TEXT = { morning: "아침", evening: "저녁" };

/** cells: stats.weekCells() 결과 */
export function renderWeekCalendar(cells) {
  const wrap = document.createElement("div");
  const head = cells
    .map((c) => {
      const day = Number(c.dayKey.slice(8));
      const today = c.isToday ? ` class="is-today" aria-current="date"` : "";
      return `<th scope="col"${today}>${c.weekday}<small>${day}</small></th>`;
    })
    .join("");
  const row = (slot) =>
    `<tr><th scope="row">${SLOT_TEXT[slot]}</th>${cells
      .map((c) => {
        const label = `${formatMonthDay(c.dayKey)} ${SLOT_TEXT[slot]} ${STATUS_TEXT[c[slot]]}`;
        return `<td><span class="dot dot--${c[slot]}" role="img" aria-label="${label}"></span></td>`;
      })
      .join("")}</tr>`;

  wrap.innerHTML = `
    <table class="calendar">
      <caption class="sr-only">이번 주 아침·저녁 양치 기록</caption>
      <thead><tr><td class="cal-corner"></td>${head}</tr></thead>
      <tbody>${row("morning")}${row("evening")}</tbody>
    </table>
    <ul class="legend" aria-label="범례">
      <li><span class="dot dot--done"></span>초록 완료</li>
      <li><span class="dot dot--short"></span>주황 짧음</li>
      <li><span class="dot dot--upcoming"></span>회색 예정</li>
      <li><span class="dot dot--missed"></span>빈 원 놓침</li>
    </ul>`;
  return wrap;
}
