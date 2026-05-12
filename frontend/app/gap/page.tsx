"use client";

import { useState } from "react";
import { Loader2, Sparkles, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
import { api } from "@/lib/api";

type Step = "input" | "jd_extracted" | "gap_done" | "career_done";

type MatchItem = { item: string; evidence: string; strength: "strong" | "moderate" };
type PartialItem = { item: string; evidence: string; gap: string; suggestion: string };
type MissingItem = { item: string; priority: "high" | "medium" | "low"; suggestion: string };

type ScoreBreakdown = {
  required_total?: number;
  required_matched?: number;
  required_partial?: number;
  required_missing?: number;
  preferred_total?: number;
  preferred_matched?: number;
  preferred_partial?: number;
  req_matched_list?: string[];
  req_partial_list?: string[];
  req_missing_list?: string[];
  score_reason?: string;
};

type GapAnalysis = {
  match_score: number;
  match_summary: string;
  matched: MatchItem[];
  partial: PartialItem[];
  missing: MissingItem[];
  keyword_gaps: string[];
  strengths_to_highlight: string[];
  critical_gaps: string[];
  score_breakdown?: ScoreBreakdown;
};

type CareerDesc = {
  profile_summary: string;
  projects: {
    project_name: string;
    company: string;
    period: string;
    role: string;
    background: string;
    actions: string[];
    results: string[];
  }[];
  skills: { core: string[]; tools: string[]; domain: string[] };
  supplement_needed: string[];
  full_text: string;
};

export default function GapPage() {
  const [step, setStep] = useState<Step>("input");
  const [jd, setJd] = useState("");
  const [experience, setExperience] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [jdReq, setJdReq] = useState<Record<string, any> | null>(null);
  const [gap, setGap] = useState<GapAnalysis | null>(null);
  const [career, setCareer] = useState<CareerDesc | null>(null);

  const [showJdDetail, setShowJdDetail] = useState(false);
  const [showFullText, setShowFullText] = useState(false);

  async function runStep1() {
    if (!jd.trim()) {
      setError("JD를 입력해주세요");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const req = await api.extractJD(jd);
      setJdReq(req);
      setStep("jd_extracted");
    } catch (e) {
      setError(e instanceof Error ? e.message : "JD 분석 실패");
    } finally {
      setLoading(false);
    }
  }

  async function runStep2() {
    if (!jdReq) return;
    setError(null);
    setLoading(true);
    try {
      const res = await api.analyzeGap({ jd_requirements: jdReq, user_experience: experience });
      setGap(res as GapAnalysis);
      setStep("gap_done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "갭 분석 실패");
    } finally {
      setLoading(false);
    }
  }

  async function runStep3() {
    if (!jdReq || !gap) return;
    setError(null);
    setLoading(true);
    try {
      const res = await api.generateCareerDescription({
        jd_requirements: jdReq,
        gap_analysis: gap as unknown as Record<string, unknown>,
        user_experience: experience,
      });
      setCareer(res as unknown as CareerDesc);
      setStep("career_done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "경력기술서 생성 실패");
    } finally {
      setLoading(false);
    }
  }

  function copyFull() {
    if (!career?.full_text) return;
    navigator.clipboard.writeText(career.full_text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const priorityClass = (p: string) =>
    p === "high" ? "chip-danger" : p === "medium" ? "chip-warn" : "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">JD 매칭 분석</h1>
        <p className="text-sm text-[var(--muted)] mt-1">
          JD + 내 경험 → 갭 분석 → 경력기술서 자동 생성
        </p>
      </div>

      {/* 진행 단계 표시 */}
      <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
        {(["input", "jd_extracted", "gap_done", "career_done"] as Step[]).map((s, i) => {
          const labels = ["① 입력", "② JD 분석", "③ 갭 분석", "④ 경력기술서"];
          const done = ["input", "jd_extracted", "gap_done", "career_done"].indexOf(step) > i;
          const active = step === s;
          return (
            <span key={s} className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full ${active ? "bg-[var(--accent)] text-white" : done ? "bg-[var(--success)] text-white opacity-70" : "bg-[var(--border)]"}`}>
                {labels[i]}
              </span>
              {i < 3 && <span>→</span>}
            </span>
          );
        })}
      </div>

      {/* ── Step 1: 입력 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="surface p-5 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">채용 공고 (JD)</label>
            <span className="text-xs text-[var(--muted)]">{jd.length}자</span>
          </div>
          <textarea
            className="textarea min-h-[16rem]"
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            placeholder="채용 공고 전문을 붙여넣으세요. 자격 요건·우대사항이 포함된 원문 전체를 넣을수록 분석이 정확합니다."
          />
        </div>

        <div className="surface p-5 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">내 경험 <span className="text-[var(--muted)] font-normal text-xs">(선택 — 저장된 프로필 자동 반영)</span></label>
            <span className="text-xs text-[var(--muted)]">{experience.length}자</span>
          </div>
          <textarea
            className="textarea min-h-[16rem]"
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            placeholder={`이력서 초안, 업무 메모, 프로젝트 설명 등 형식에 구애받지 말고 자유롭게 붙여넣으세요.\n\n예)\n- 춘천성심병원에서 LLM 기반 임상 문서 요약 시스템 개발\n- Python, LangChain, GPT-4 사용\n- 의사 3명이 실제 사용, 피드백 반영해서 2차 배포\n- 현재 디에스이트레이드에서 데이터 분석 중, 매출 예측 모델 운영`}
          />
        </div>
      </div>

      <button
        onClick={runStep1}
        disabled={loading || !jd.trim()}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        {loading && step === "input" ? (
          <><Loader2 size={16} className="animate-spin" />JD 요건 분석 중...</>
        ) : (
          <><Sparkles size={16} />JD 요건 추출하기</>
        )}
      </button>

      {error && <div className="text-sm text-[var(--danger)]">{error}</div>}

      {/* ── Step 2: JD 요건 확인 + 갭 분석 ── */}
      {jdReq && (
        <div className="surface p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">
              JD 분석 결과 — {(jdReq.job_title as string) || "직무"} ({(jdReq.seniority as string) || ""})
            </div>
            <button
              onClick={() => setShowJdDetail((v) => !v)}
              className="text-xs text-[var(--muted)] flex items-center gap-1"
            >
              {showJdDetail ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {showJdDetail ? "접기" : "상세보기"}
            </button>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            {(jdReq.required_skills as string[] | undefined)?.map((s) => (
              <span key={s} className="chip chip-danger">{s}</span>
            ))}
            {(jdReq.preferred_skills as string[] | undefined)?.map((s) => (
              <span key={s} className="chip chip-warn">{s}</span>
            ))}
          </div>

          {showJdDetail && (
            <div className="grid grid-cols-2 gap-3 text-xs">
              {jdReq.years_experience && (
                <div><span className="text-[var(--muted)]">경력: </span>{jdReq.years_experience as string}</div>
              )}
              {jdReq.education && (
                <div><span className="text-[var(--muted)]">학력: </span>{jdReq.education as string}</div>
              )}
              {(jdReq.core_responsibilities as string[] | undefined)?.length ? (
                <div className="col-span-2">
                  <div className="text-[var(--muted)] mb-1">핵심 업무</div>
                  <ul className="space-y-0.5 list-disc list-inside">
                    {(jdReq.core_responsibilities as string[]).map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              ) : null}
            </div>
          )}

          <button
            onClick={runStep2}
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading && step === "jd_extracted" ? (
              <><Loader2 size={16} className="animate-spin" />갭 분석 중...</>
            ) : (
              <><Sparkles size={16} />내 경험과 갭 분석하기</>
            )}
          </button>
        </div>
      )}

      {/* ── Step 3: 갭 분석 결과 ── */}
      {gap && (
        <div className="surface p-5 space-y-5">
          {/* 매칭 점수 */}
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="text-3xl font-bold">{gap.match_score}<span className="text-base font-normal text-[var(--muted)]">/100</span></div>
              <div>
                <div className="text-sm font-medium">매칭도</div>
                <div className="text-xs text-[var(--muted)]">{gap.match_summary}</div>
              </div>
            </div>

            {gap.score_breakdown?.score_reason && (
              <div className="bg-[var(--background)] border border-[var(--border)] rounded p-3 text-xs space-y-2">
                <div className="font-medium text-[var(--foreground)]">점수 산출 근거</div>
                <div className="text-[var(--muted)]">{gap.score_breakdown.score_reason}</div>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {gap.score_breakdown.req_matched_list && gap.score_breakdown.req_matched_list.length > 0 && (
                    <div>
                      <div className="text-green-700 font-medium mb-1">✅ 필수 충족</div>
                      {gap.score_breakdown.req_matched_list.map((i, idx) => (
                        <div key={idx} className="text-green-700">{i}</div>
                      ))}
                    </div>
                  )}
                  {gap.score_breakdown.req_partial_list && gap.score_breakdown.req_partial_list.length > 0 && (
                    <div>
                      <div className="text-yellow-700 font-medium mb-1">⚠️ 부분 충족</div>
                      {gap.score_breakdown.req_partial_list.map((i, idx) => (
                        <div key={idx} className="text-yellow-700">{i}</div>
                      ))}
                    </div>
                  )}
                  {gap.score_breakdown.req_missing_list && gap.score_breakdown.req_missing_list.length > 0 && (
                    <div>
                      <div className="text-red-700 font-medium mb-1">❌ 필수 미충족</div>
                      {gap.score_breakdown.req_missing_list.map((i, idx) => (
                        <div key={idx} className="text-red-700">{i}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {(gap.critical_gaps?.length ?? 0) > 0 && (
            <div className="bg-red-50 border border-red-200 rounded p-3 text-sm space-y-1">
              <div className="font-medium text-red-700">치명적 갭</div>
              {gap.critical_gaps.map((g, i) => <div key={i} className="text-red-600">• {g}</div>)}
            </div>
          )}

          {/* 강조할 강점 */}
          {(gap.strengths_to_highlight?.length ?? 0) > 0 && (
            <div className="space-y-2">
              <div className="text-xs tracking-wider text-[var(--muted)] uppercase">강조할 강점</div>
              <div className="flex flex-wrap gap-2">
                {gap.strengths_to_highlight.map((s, i) => <span key={i} className="chip">{s}</span>)}
              </div>
            </div>
          )}

          {/* Matched */}
          {(gap.matched?.length ?? 0) > 0 && (
            <div className="space-y-2">
              <div className="text-xs tracking-wider text-[var(--muted)] uppercase">매칭됨 ({gap.matched.length})</div>
              <div className="space-y-2">
                {gap.matched.map((m, i) => (
                  <div key={i} className="bg-green-50 border border-green-200 rounded p-3 text-sm">
                    <div className="font-medium text-green-800">{m.item}</div>
                    <div className="text-green-700 text-xs mt-1">근거: {m.evidence}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Partial */}
          {(gap.partial?.length ?? 0) > 0 && (
            <div className="space-y-2">
              <div className="text-xs tracking-wider text-[var(--muted)] uppercase">보강 필요 ({gap.partial.length})</div>
              <div className="space-y-2">
                {gap.partial.map((p, i) => (
                  <div key={i} className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm space-y-1">
                    <div className="font-medium text-yellow-800">{p.item}</div>
                    <div className="text-yellow-700 text-xs">부족한 점: {p.gap}</div>
                    <div className="text-yellow-800 text-xs">→ {p.suggestion}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Missing */}
          {(gap.missing?.length ?? 0) > 0 && (
            <div className="space-y-2">
              <div className="text-xs tracking-wider text-[var(--muted)] uppercase">없는 항목 ({gap.missing.length})</div>
              <div className="space-y-2">
                {gap.missing.map((m, i) => (
                  <div key={i} className="bg-[var(--background)] border border-[var(--border)] rounded p-3 text-sm space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`chip ${priorityClass(m.priority)}`}>{m.priority}</span>
                      <span className="font-medium">{m.item}</span>
                    </div>
                    <div className="text-[var(--muted)] text-xs">→ {m.suggestion}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 키워드 갭 */}
          {(gap.keyword_gaps?.length ?? 0) > 0 && (
            <div className="space-y-2">
              <div className="text-xs tracking-wider text-[var(--muted)] uppercase">누락 키워드 (ATS)</div>
              <div className="flex flex-wrap gap-2">
                {gap.keyword_gaps.map((k, i) => <span key={i} className="chip chip-danger">{k}</span>)}
              </div>
            </div>
          )}

          <button
            onClick={runStep3}
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading && step === "gap_done" ? (
              <><Loader2 size={16} className="animate-spin" />경력기술서 생성 중...</>
            ) : (
              <><Sparkles size={16} />경력기술서 생성하기</>
            )}
          </button>
        </div>
      )}

      {/* ── Step 4: 경력기술서 ── */}
      {career && (
        <div className="surface p-5 space-y-5">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">경력기술서</div>
            <button
              onClick={copyFull}
              className="text-xs text-[var(--muted)] flex items-center gap-1 px-2 py-1 rounded hover:bg-[var(--accent-soft)] transition"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "복사됨" : "전문 복사"}
            </button>
          </div>

          {/* 요약 프로필 */}
          <div className="space-y-1">
            <div className="text-xs text-[var(--muted)] uppercase tracking-wider">요약 프로필</div>
            <p className="text-sm leading-7 bg-[var(--background)] border border-[var(--border)] rounded p-3">
              {career.profile_summary}
            </p>
          </div>

          {/* 프로젝트별 경력 */}
          {(career.projects?.length ?? 0) > 0 && (
            <div className="space-y-3">
              <div className="text-xs text-[var(--muted)] uppercase tracking-wider">프로젝트별 경력</div>
              {career.projects.map((p, i) => (
                <div key={i} className="bg-[var(--background)] border border-[var(--border)] rounded p-4 text-sm space-y-2">
                  <div className="font-semibold">{p.project_name}</div>
                  <div className="text-[var(--muted)] text-xs">{p.company} · {p.role} · {p.period}</div>
                  {p.background && (
                    <div className="text-xs text-[var(--muted)] italic">{p.background}</div>
                  )}
                  {p.actions?.length > 0 && (
                    <ul className="space-y-1 list-disc list-inside text-[13px]">
                      {p.actions.map((a, j) => <li key={j}>{a}</li>)}
                    </ul>
                  )}
                  {p.results?.length > 0 && (
                    <ul className="space-y-1 text-[13px]">
                      {p.results.map((r, j) => (
                        <li key={j} className="flex gap-2">
                          <span className="text-[var(--success)] shrink-0">→</span>
                          <span className={r.includes("수치 확인 필요") ? "text-yellow-700" : ""}>{r}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 역량 */}
          {career.skills && (
            <div className="space-y-2">
              <div className="text-xs text-[var(--muted)] uppercase tracking-wider">보유 역량</div>
              <div className="flex flex-wrap gap-2">
                {career.skills.core?.map((s, i) => <span key={i} className="chip">{s}</span>)}
                {career.skills.tools?.map((s, i) => <span key={`t${i}`} className="chip chip-warn">{s}</span>)}
              </div>
            </div>
          )}

          {/* 보완 필요 */}
          {career.supplement_needed?.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-[var(--muted)] uppercase tracking-wider">보완 필요 항목</div>
              <ul className="space-y-1 text-sm">
                {career.supplement_needed.map((s, i) => (
                  <li key={i} className="flex gap-2 bg-yellow-50 border border-yellow-200 rounded p-2 text-yellow-800 text-xs">
                    <span>⚠</span><span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 전문 (마크다운) */}
          <div className="space-y-2">
            <button
              onClick={() => setShowFullText((v) => !v)}
              className="text-xs text-[var(--muted)] flex items-center gap-1"
            >
              {showFullText ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              전문 보기
            </button>
            {showFullText && (
              <pre className="bg-[var(--background)] border border-[var(--border)] rounded p-4 text-xs leading-6 whitespace-pre-wrap overflow-auto max-h-[40rem]">
                {career.full_text}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
