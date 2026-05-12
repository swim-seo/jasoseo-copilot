"use client";

import type { Feedback, EnrichmentItem } from "@/lib/api";

const ENRICHMENT_LABEL: Record<EnrichmentItem["type"], string> = {
  visual: "시각자료",
  technical_term: "전문 용어",
  quantitative: "정량 수치",
  demo_link: "데모·링크",
  reference: "레퍼런스",
  story_detail: "스토리 디테일",
};

export function FeedbackSummary({
  feedbacks,
  ignored,
}: {
  feedbacks: Feedback[];
  ignored: Set<string>;
}) {
  const active = feedbacks.filter((f) => !ignored.has(f.persona_key));
  if (active.length === 0) return null;

  const avgScore =
    active.reduce((sum, f) => sum + (f.score ?? 0), 0) / active.length;

  const mustFixAll = active.flatMap((f) =>
    (f.must_fix ?? []).map((m) => ({ persona: f.persona, text: m }))
  );

  const highPriorityEnrichment = active
    .flatMap((f) => f.enrichment_suggestions ?? [])
    .filter((e) => e.priority === "high");

  // 중복 제거 (type+what)
  const seen = new Set<string>();
  const dedupedEnrichment = highPriorityEnrichment.filter((e) => {
    const key = `${e.type}|${e.what}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return (
    <div
      className="surface p-5 space-y-4"
      style={{ borderLeftWidth: "3px", borderLeftColor: "var(--accent)" }}
    >
      <div className="flex items-baseline justify-between">
        <div className="text-xs tracking-wider text-[var(--muted)] uppercase">
          전문가 검토 요약 ({active.length}명)
        </div>
        <div className="text-2xl font-semibold tabular-nums">
          {avgScore.toFixed(1)}
          <span className="text-sm text-[var(--muted)]">/10</span>
        </div>
      </div>

      {mustFixAll.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-[var(--danger)]">
            반드시 고쳐야 할 것 (Top {Math.min(mustFixAll.length, 5)})
          </div>
          <ul className="space-y-1 text-sm">
            {mustFixAll.slice(0, 5).map((m, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-[var(--danger)] shrink-0">●</span>
                <span>
                  <span className="text-[var(--muted)] text-xs mr-1">
                    [{m.persona}]
                  </span>
                  {m.text}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {dedupedEnrichment.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium">
            보강이 시급한 자료
          </div>
          <div className="flex flex-wrap gap-2">
            {dedupedEnrichment.map((e, i) => (
              <span
                key={i}
                className="chip chip-warn"
                title={e.where}
              >
                {ENRICHMENT_LABEL[e.type] ?? e.type}: {e.what}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="text-xs text-[var(--muted)]">
        아래 카드를 펼쳐 전문가별 상세 의견을 확인하거나, 합성 버튼으로
        통합 수정안을 받으세요.
      </div>
    </div>
  );
}
