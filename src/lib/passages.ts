/**
 * 필사 표시 순서 규칙 (서버 SQL과 동일하게 유지).
 *
 * src/app/api/books/[id]/route.ts 의
 *   ORDER BY (page IS NULL) ASC, page ASC, COALESCE(position, id) ASC, id ASC
 * 와 같은 규칙을 클라이언트에서도 쓰기 위한 유틸이다.
 *
 * 우선순위:
 *   1) page 있는 필사가 먼저(오름차순)
 *   2) page가 같거나 없으면 → 수동 재정렬 position(있으면), 없으면 저장 순서 id
 *   3) page 없는 필사는 뒤쪽에 저장 순서(id)대로
 */
export interface SortablePassage {
  id: number;
  page: number | null;
  position?: number | null;
}

export function sortPassages<T extends SortablePassage>(passages: readonly T[]): T[] {
  return [...passages].sort((a, b) => {
    const aNoPage = a.page == null;
    const bNoPage = b.page == null;
    // 1) page 없는 필사는 뒤로
    if (aNoPage !== bNoPage) return aNoPage ? 1 : -1;
    // 2) 둘 다 page 있으면 page 오름차순
    if (!aNoPage && !bNoPage && a.page !== b.page) {
      return (a.page as number) - (b.page as number);
    }
    // 3) tiebreak: 수동 재정렬 position(없으면 id), 최종 id
    const aKey = a.position ?? a.id;
    const bKey = b.position ?? b.id;
    if (aKey !== bKey) return aKey - bKey;
    return a.id - b.id;
  });
}
