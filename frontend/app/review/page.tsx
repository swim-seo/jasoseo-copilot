"use client";

import { useState, useEffect } from "react";
import { Loader2, Sparkles, Copy, Check } from "lucide-react";
import { api, type Feedback, type SynthesisResult } from "@/lib/api";
import { FeedbackCard } from "@/components/FeedbackCard";
import { FeedbackSummary } from "@/components/FeedbackSummary";
import { PersonaLoadingState } from "@/components/PersonaLoadingState";

type Mode = "cover_letter" | "portfolio";

function readBootstrap(): {
  draft?: string;
  company?: string;
  job_role?: string;
  question?: string;
} {
  if (typeof window === "undefined") return {};
  const raw = sessionStorage.getItem("jasoseo:review:bootstrap");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export default function ReviewPage() {
  const initial = readBootstrap();

  const [mode, setMode] = useState<Mode>("cover_letter");
  const [draft, setDraft] = useState(initial.draft ?? "");
  const [company, setCompany] = useState(initial.company ?? "");
  const [jobRole, setJobRole] = useState(initial.job_role ?? "");
  const [question, setQuestion] = useState(initial.question ?? "");

  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [ignored, setIgnored] = useState<Set<string>>(new Set());
  const [synthesis, setSynthesis] = useState<SynthesisResult | null>(null);

  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [loadingSynth, setLoadingSynth] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("jasoseo:review:bootstrap");
    }
  }, []);

  async function runFeedback() {
    if (!draft.trim()) {
      setError("초안을 입력해주세요");
      return;
    }
    setError(null);
    setLoadingFeedback(true);
    setSynthesis(null);
    try {
      const res = await api.multiFeedback({
        draft,
        company,
        job_role: jobRole,
        question,
        mode,
      });
      setFeedbacks(res.feedbacks);
    } catch (e) {
      setError(e instanceof Error ? e.message : "피드백 실패");
    } finally {
      setLoadingFeedback(false);
    }
  }

  async function runSynth() {
    setError(null);
    setLoadingSynth(true);
    try {
      const res = await api.synthesize({
        draft,
        feedbacks,
        ignored_persona_keys: Array.from(ignored),
        company,
        job_role: jobRole,
        question,
        save: true,
      });
      setSynthesis(res.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "합성 실패");
    } finally {
      setLoadingSynth(false);
    }
  }

  function copyFinal() {
    if (!synthesis?.final_text) return;
    navigator.clipboard.writeText(synthesis.final_text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">초안 검토</h1>
        <div className="flex gap-2 text-sm">
          <button
            onClick={() => setMode("cover_letter")}
            className={`px-3 py-1 rounded-md transition ${
              mode === "cover_letter"
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--muted)] hover:bg-[var(--accent-soft)]"
            }`}
          >
            자소서
          </button>
          <button
            onClick={() => setMode("portfolio")}
            className={`px-3 py-1 rounded-md transition ${
              mode === "portfolio"
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--muted)] hover:bg-[var(--accent-soft)]"
            }`}
          >
            포트폴리오
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6">
        {/* 좌: 입력 */}
        <div className="space-y-4">
          <div className="surface p-5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[var(--muted)] mb-1">
                  회사 (선택)
                </label>
                <input
                  className="input"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="예: 삼성전자"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--muted)] mb-1">
                  직무 (선택)
                </label>
                <input
                  className="input"
                  value={jobRole}
                  onChange={(e) => setJobRole(e.target.value)}
                  placeholder="예: SW 엔지니어"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-[var(--muted)] mb-1">
                자소서 항목 (선택)
              </label>
              <input
                className="input"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="예: 지원 동기 및 포부"
              />
            </div>
          </div>

          <div className="surface p-5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                {mode === "cover_letter" ? "자소서 초안" : "포트폴리오 내용"}
              </label>
              <span className="text-xs text-[var(--muted)]">
                {draft.length}자
              </span>
            </div>
            <textarea
              className="textarea min-h-[24rem]"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={
                mode === "cover_letter"
                  ? "여기에 자소서 초안을 붙여넣거나 직접 작성하세요. STAR 형식이 아니어도 됩니다."
                  : "포트폴리오 텍스트, 프로젝트 설명, 데모 링크 등을 붙여넣으세요."
              }
            />
            <button
              onClick={runFeedback}
              disabled={loadingFeedback || !draft.trim()}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loadingFeedback ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  전문가별 피드백 받는 중...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  모든 전문가에게 피드백 받기
                </>
              )}
            </button>
            {error && (
              <div className="text-sm text-[var(--danger)]">{error}</div>
            )}
          </div>
        </div>

        {/* 우: 피드백 + 합성 결과 */}
        <div className="space-y-4">
          {feedbacks.length === 0 && !loadingFeedback && (
            <div className="surface p-8 text-center text-sm text-[var(--muted)]">
              초안을 입력하고 <span className="font-medium">피드백 받기</span>를
              누르면 여기에 전문가별 검토 결과가 나타납니다.
            </div>
          )}

          {loadingFeedback && <PersonaLoadingState />}

          {feedbacks.length > 0 && !loadingFeedback && (
            <>
              <FeedbackSummary feedbacks={feedbacks} ignored={ignored} />

              <button
                onClick={runSynth}
                disabled={loadingSynth}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loadingSynth ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    통합 수정안 만드는 중...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    피드백 합성 → 최종 수정안
                  </>
                )}
              </button>

              <details className="space-y-3">
                <summary className="text-xs tracking-wider text-[var(--muted)] uppercase cursor-pointer hover:text-[var(--foreground)] transition py-2">
                  전문가별 상세 피드백 ({feedbacks.length}명) 보기
                </summary>
                <div className="space-y-3 pt-2">
                  {feedbacks.map((f) => (
                    <FeedbackCard
                      key={f.persona_key}
                      feedback={f}
                      ignored={ignored.has(f.persona_key)}
                      onToggleIgnore={() => {
                        setIgnored((prev) => {
                          const next = new Set(prev);
                          if (next.has(f.persona_key))
                            next.delete(f.persona_key);
                          else next.add(f.persona_key);
                          return next;
                        });
                      }}
                    />
                  ))}
                </div>
              </details>
            </>
          )}

          {synthesis && (
            <div className="surface p-5 space-y-4 border-[var(--accent)]">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">최종 수정안</div>
                <button
                  onClick={copyFinal}
                  className="text-xs text-[var(--muted)] flex items-center gap-1 px-2 py-1 rounded hover:bg-[var(--accent-soft)] transition"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? "복사됨" : "복사"}
                </button>
              </div>

              <p className="text-xs text-[var(--muted)] leading-relaxed bg-[var(--background)] border border-[var(--border)] rounded p-3">
                {synthesis.synthesis_summary}
              </p>

              <div className="bg-[var(--background)] border border-[var(--border)] rounded p-4 text-sm leading-7 whitespace-pre-wrap">
                {synthesis.final_text}
              </div>

              {synthesis.enrichment_todo &&
                synthesis.enrichment_todo.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs tracking-wider text-[var(--muted)] uppercase">
                      추가로 준비할 자료 (To-do)
                    </div>
                    <ul className="space-y-2 text-sm">
                      {synthesis.enrichment_todo.map((e, i) => (
                        <li
                          key={i}
                          className="flex flex-col gap-1 bg-[var(--background)] border border-[var(--border)] rounded p-3"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`chip ${
                                e.priority === "high"
                                  ? "chip-danger"
                                  : e.priority === "medium"
                                  ? "chip-warn"
                                  : ""
                              }`}
                            >
                              {e.type}
                            </span>
                            <span className="font-medium">{e.what}</span>
                          </div>
                          {e.rationale && (
                            <div className="text-[var(--muted)] text-[13px]">
                              {e.rationale}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              {synthesis.applied_changes &&
                synthesis.applied_changes.length > 0 && (
                  <details className="text-sm">
                    <summary className="cursor-pointer text-[var(--muted)] text-xs tracking-wider uppercase">
                      변경 사항 ({synthesis.applied_changes.length}) 보기
                    </summary>
                    <ul className="mt-2 space-y-2">
                      {synthesis.applied_changes.map((c, i) => (
                        <li
                          key={i}
                          className="text-[13px] bg-[var(--background)] border border-[var(--border)] rounded p-3 space-y-1"
                        >
                          <div>
                            <span className="text-[var(--muted)]">전:</span>{" "}
                            <span className="line-through">{c.from}</span>
                          </div>
                          <div>
                            <span className="text-[var(--success)]">후:</span>{" "}
                            {c.to}
                          </div>
                          <div className="text-[var(--muted)] text-[12px]">
                            {c.reason}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
