"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, EyeOff, Eye } from "lucide-react";
import type { Feedback, EnrichmentItem } from "@/lib/api";

const PERSONA_COLOR: Record<string, string> = {
  careersaida_star: "var(--persona-careersaida)",
  leehyung_3C4P: "var(--persona-leehyung)",
  kang_3step: "var(--persona-kang)",
};

const ENRICHMENT_LABEL: Record<EnrichmentItem["type"], string> = {
  visual: "시각자료",
  technical_term: "전문 용어",
  quantitative: "정량 수치",
  demo_link: "데모·링크",
  reference: "레퍼런스",
  story_detail: "스토리 디테일",
};

export function FeedbackCard({
  feedback,
  ignored,
  onToggleIgnore,
  defaultOpen = false,
}: {
  feedback: Feedback;
  ignored: boolean;
  onToggleIgnore: () => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const color = PERSONA_COLOR[feedback.persona_key] ?? "var(--muted)";
  const score = feedback.score ?? 0;

  const scoreChip =
    score >= 8 ? "chip-success" : score >= 5 ? "chip-warn" : "chip-danger";

  return (
    <div
      className="surface p-5 space-y-3 transition"
      style={{
        borderLeft: `3px solid ${color}`,
        opacity: ignored ? 0.5 : 1,
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className="font-semibold text-sm"
            style={{ color }}
          >
            {feedback.persona}
          </span>
          <span className={`chip ${scoreChip}`}>{score}/10</span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={onToggleIgnore}
            className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] flex items-center gap-1 px-2 py-1 rounded hover:bg-[var(--accent-soft)] transition"
            title={ignored ? "다시 반영" : "이 의견 무시"}
          >
            {ignored ? <Eye size={14} /> : <EyeOff size={14} />}
            {ignored ? "반영" : "무시"}
          </button>
          <button
            onClick={() => setOpen((s) => !s)}
            aria-expanded={open}
            aria-label={open ? "접기" : "펼치기"}
            className="text-[var(--muted)] hover:text-[var(--foreground)] p-1"
          >
            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      <p className="text-sm leading-relaxed">{feedback.summary}</p>

      {open && (
        <div className="space-y-4 pt-1">
          {feedback.must_fix?.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs tracking-wider text-[var(--muted)] uppercase">
                반드시 고칠 것
              </div>
              <ul className="text-sm space-y-1">
                {feedback.must_fix.map((m, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-[var(--danger)]">●</span>
                    <span>{m}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {feedback.weaknesses?.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs tracking-wider text-[var(--muted)] uppercase">
                약점 진단
              </div>
              {feedback.weaknesses.map((w, i) => (
                <div
                  key={i}
                  className="bg-[var(--background)] border border-[var(--border)] rounded-md p-3 text-sm space-y-1"
                >
                  <div className="text-[var(--muted)] text-[13px] italic">
                    &ldquo;{w.quote}&rdquo;
                  </div>
                  <div className="text-[13px]">
                    <span className="font-medium">문제:</span> {w.issue}
                  </div>
                  <div className="text-[13px] text-[var(--success)]">
                    <span className="font-medium">제안:</span> {w.suggestion}
                  </div>
                </div>
              ))}
            </div>
          )}

          {feedback.enrichment_suggestions &&
            feedback.enrichment_suggestions.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs tracking-wider text-[var(--muted)] uppercase">
                  보강 제안 (자료·용어·수치)
                </div>
                <ul className="space-y-1 text-sm">
                  {feedback.enrichment_suggestions.map((e, i) => (
                    <li
                      key={i}
                      className="flex flex-wrap items-center gap-2 text-[13px]"
                    >
                      <span
                        className={`chip ${
                          e.priority === "high"
                            ? "chip-danger"
                            : e.priority === "medium"
                            ? "chip-warn"
                            : ""
                        }`}
                      >
                        {ENRICHMENT_LABEL[e.type] ?? e.type}
                      </span>
                      <span className="text-[var(--muted)]">{e.where}</span>
                      <span>→ {e.what}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

          {feedback.strengths?.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs tracking-wider text-[var(--muted)] uppercase">
                강점
              </div>
              <ul className="text-sm space-y-1">
                {feedback.strengths.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-[var(--success)]">●</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
