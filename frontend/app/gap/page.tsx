"use client";

import { useState } from "react";
import { Loader2, Sparkles, Copy, Check, ChevronDown, ChevronUp, MessageSquare, FileDown } from "lucide-react";
import { api } from "@/lib/api";
import type { Feedback } from "@/lib/api";

type Step = "input" | "jd_extracted" | "gap_done" | "career_done" | "persona_done";

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
  preferred_missing?: number;
  req_matched_list?: string[];
  req_partial_list?: string[];
  req_missing_list?: string[];
  pref_matched_list?: string[];
  pref_partial_list?: string[];
  pref_missing_list?: string[];
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

function scoreLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "서류 통과 유력", color: "text-green-700" };
  if (score >= 60) return { label: "보완하면 통과 가능", color: "text-blue-700" };
  if (score >= 40) return { label: "적극적 보강 필요", color: "text-yellow-700" };
  return { label: "통과 어려움", color: "text-red-700" };
}

function RequirementRow({
  item,
  type,
  status,
  detail,
}: {
  item: string;
  type: "필수" | "우대";
  status: "matched" | "partial" | "missing";
  detail?: string;
}) {
  const icon = status === "matched" ? "✅" : status === "partial" ? "⚠️" : "❌";
  const badgeClass =
    type === "필수"
      ? "bg-blue-100 text-blue-700 border border-blue-200"
      : "bg-gray-100 text-gray-600 border border-gray-200";
  const rowClass =
    status === "matched"
      ? "border-green-100 bg-green-50"
      : status === "partial"
      ? "border-yellow-100 bg-yellow-50"
      : "border-[var(--border)] bg-[var(--background)]";

  return (
    <div className={`rounded p-3 border text-sm space-y-1 ${rowClass}`}>
      <div className="flex items-center gap-2">
        <span>{icon}</span>
        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${badgeClass}`}>{type}</span>
        <span className="font-medium">{item}</span>
      </div>
      {detail && <div className="text-xs text-[var(--muted)] pl-7">{detail}</div>}
    </div>
  );
}

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
  const [personas, setPersonas] = useState<Feedback[] | null>(null);

  const [showJdDetail, setShowJdDetail] = useState(false);
  const [showFullText, setShowFullText] = useState(false);

  async function runStep1() {
    if (!jd.trim()) { setError("JD를 입력해주세요"); return; }
    setError(null); setLoading(true);
    try {
      const req = await api.extractJD(jd);
      setJdReq(req);
      setStep("jd_extracted");
    } catch (e) {
      setError(e instanceof Error ? e.message : "JD 분석 실패");
    } finally { setLoading(false); }
  }

  async function runStep2() {
    if (!jdReq) return;
    setError(null); setLoading(true);
    try {
      const res = await api.analyzeGap({ jd_requirements: jdReq, user_experience: experience });
      setGap(res as GapAnalysis);
      setStep("gap_done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "갭 분석 실패");
    } finally { setLoading(false); }
  }

  async function runStep3() {
    if (!jdReq || !gap) return;
    setError(null); setLoading(true);
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
    } finally { setLoading(false); }
  }

  async function runStep4() {
    if (!career?.full_text || !jdReq) return;
    setError(null); setLoading(true);
    try {
      const res = await api.multiFeedback({
        draft: career.full_text,
        company: (jdReq.job_title as string) || "",
        job_role: (jdReq.job_title as string) || "",
        job_posting: jd,
        mode: "cover_letter",
      });
      setPersonas(res.feedbacks);
      setStep("persona_done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "페르소나 피드백 실패");
    } finally { setLoading(false); }
  }

  function copyFull() {
    if (!career?.full_text) return;
    navigator.clipboard.writeText(career.full_text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const bd = gap?.score_breakdown;

  // Build unified requirement rows from breakdown
  const reqRows = [
    ...(bd?.req_matched_list ?? []).map((item) => ({ item, type: "필수" as const, status: "matched" as const })),
    ...(bd?.req_partial_list ?? []).map((item) => {
      const p = gap?.partial?.find((x) => x.item === item);
      return { item, type: "필수" as const, status: "partial" as const, detail: p ? `${p.gap} → ${p.suggestion}` : undefined };
    }),
    ...(bd?.req_missing_list ?? []).map((item) => {
      const m = gap?.missing?.find((x) => x.item === item);
      return { item, type: "필수" as const, status: "missing" as const, detail: m?.suggestion };
    }),
  ];

  const prefRows = [
    ...(bd?.pref_matched_list ?? []).map((item) => ({ item, type: "우대" as const, status: "matched" as const })),
    ...(bd?.pref_partial_list ?? []).map((item) => {
      const p = gap?.partial?.find((x) => x.item === item);
      return { item, type: "우대" as const, status: "partial" as const, detail: p ? `${p.gap} → ${p.suggestion}` : undefined };
    }),
    ...(bd?.pref_missing_list ?? []).map((item) => ({ item, type: "우대" as const, status: "missing" as const })),
  ];

  const { label: passLabel, color: passColor } = gap ? scoreLabel(gap.match_score) : { label: "", color: "" };

  const matchedKeywords = [
    ...(bd?.req_matched_list ?? []),
    ...(bd?.pref_matched_list ?? []),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">JD 매칭 분석</h1>
        <p className="text-sm text-[var(--muted)] mt-1">
          JD + 내 경험 → 갭 분석 → 경력기술서 → 페르소나 피드백
        </p>
      </div>

      {/* 진행 단계 */}
      <div className="flex items-center gap-2 text-xs text-[var(--muted)] flex-wrap">
        {(["input", "jd_extracted", "gap_done", "career_done", "persona_done"] as Step[]).map((s, i) => {
          const labels = ["① 입력", "② JD 분석", "③ 갭 분석", "④ 경력기술서", "⑤ 페르소나"];
          const order = ["input", "jd_extracted", "gap_done", "career_done", "persona_done"];
          const done = order.indexOf(step) > i;
          const active = step === s;
          return (
            <span key={s} className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full ${active ? "bg-[var(--accent)] text-white" : done ? "bg-[var(--success)] text-white opacity-70" : "bg-[var(--border)]"}`}>
                {labels[i]}
              </span>
              {i < 4 && <span>→</span>}
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
            <label className="text-sm font-medium">
              내 경험{" "}
              <span className="text-[var(--muted)] font-normal text-xs">(선택 — 저장된 프로필 자동 반영)</span>
            </label>
            <span className="text-xs text-[var(--muted)]">{experience.length}자</span>
          </div>
          <textarea
            className="textarea min-h-[16rem]"
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            placeholder={`이력서 초안, 업무 메모, 프로젝트 설명 등 자유롭게 붙여넣으세요.\n\n예)\n- 춘천성심병원 LLM 기반 임상 문서 요약 시스템 개발\n- Python, LangChain, GPT-4 사용\n- 현재 디에스이트레이드에서 데이터 분석 및 매출 예측 모델 운영`}
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

      {/* ── Step 2: JD 요건 확인 ── */}
      {jdReq && (
        <div className="surface p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">
              JD 분석 완료 — {(jdReq.job_title as string) || "직무"}{" "}
              <span className="text-[var(--muted)] font-normal">({(jdReq.seniority as string) || ""})</span>
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
              <span key={s} className="chip chip-danger">[필수] {s}</span>
            ))}
            {(jdReq.preferred_skills as string[] | undefined)?.map((s) => (
              <span key={s} className="chip chip-warn">[우대] {s}</span>
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

      {/* ── Step 3: 갭 분석 결과 (재설계) ── */}
      {gap && (
        <div className="space-y-4">
          {/* 서류 통과 확률 헤더 카드 */}
          <div className="surface p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="text-xs text-[var(--muted)] uppercase tracking-wider mb-1">서류 통과 예상 확률</div>
                <div className="flex items-end gap-3">
                  <span className="text-5xl font-bold tabular-nums">{gap.match_score}</span>
                  <span className="text-xl text-[var(--muted)] mb-1">%</span>
                  <span className={`text-sm font-medium mb-1 ${passColor}`}>{passLabel}</span>
                </div>
              </div>

              {/* 자격요건 / 우대사항 통계 박스 */}
              <div className="flex gap-3 flex-wrap">
                {(bd?.required_total ?? 0) > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-center min-w-[130px]">
                    <div className="text-xs text-blue-600 mb-1">자격요건</div>
                    <div className="text-xl font-bold text-blue-800">
                      {(bd?.required_matched ?? 0) + (bd?.required_partial ?? 0)}
                      <span className="text-sm font-normal text-blue-600">/{bd?.required_total}</span>
                    </div>
                    <div className="text-xs text-blue-600 mt-0.5">개 충족</div>
                  </div>
                )}
                {(bd?.preferred_total ?? 0) > 0 && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-center min-w-[130px]">
                    <div className="text-xs text-gray-500 mb-1">우대사항</div>
                    <div className="text-xl font-bold text-gray-700">
                      {(bd?.preferred_matched ?? 0) + (bd?.preferred_partial ?? 0)}
                      <span className="text-sm font-normal text-gray-500">/{bd?.preferred_total}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">개 충족</div>
                  </div>
                )}
              </div>
            </div>

            {/* 점수 산출 근거 — 카드 안에 바로 표시 */}
            {bd?.score_reason && (
              <div className="text-xs text-[var(--muted)] border-t border-[var(--border)] pt-3">
                {bd.score_reason}
              </div>
            )}

            {/* 직무 적합도 총평 — 카드 안에 바로 표시 */}
            {gap.match_summary && (
              <div className="border-l-4 border-[var(--accent)] pl-3">
                <div className="text-xs text-[var(--muted)] mb-1">직무 적합도 총평</div>
                <p className="text-sm leading-6">{gap.match_summary}</p>
              </div>
            )}
          </div>

          {/* 치명적 갭 배너 */}
          {(gap.critical_gaps?.length ?? 0) > 0 && (
            <div className="bg-red-50 border border-red-200 rounded p-4 space-y-1">
              <div className="font-medium text-red-700 text-sm">⚡ 채용 결정에 치명적인 갭</div>
              <div className="flex flex-wrap gap-2 mt-1">
                {gap.critical_gaps.map((g, i) => (
                  <span key={i} className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded border border-red-200">{g}</span>
                ))}
              </div>
            </div>
          )}

          {/* 자격요건 / 우대사항 항목별 상세 */}
          {(reqRows.length > 0 || prefRows.length > 0) && (
            <div className="surface p-5 space-y-4">
              {reqRows.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">자격요건 상세</div>
                  <div className="space-y-2">
                    {reqRows.map((r, i) => (
                      <RequirementRow key={i} {...r} />
                    ))}
                  </div>
                </div>
              )}
              {prefRows.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">우대사항 상세</div>
                  <div className="space-y-2">
                    {prefRows.map((r, i) => (
                      <RequirementRow key={i} {...r} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 매칭 키워드 vs 누락 키워드 */}
          {(matchedKeywords.length > 0 || (gap.keyword_gaps?.length ?? 0) > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {matchedKeywords.length > 0 && (
                <div className="surface p-4 space-y-2">
                  <div className="text-xs font-medium text-green-700 uppercase tracking-wider">✅ 매칭된 키워드</div>
                  <div className="flex flex-wrap gap-2">
                    {matchedKeywords.map((k, i) => (
                      <span key={i} className="bg-green-50 border border-green-200 text-green-700 text-xs px-2 py-0.5 rounded">{k}</span>
                    ))}
                  </div>
                </div>
              )}
              {(gap.keyword_gaps?.length ?? 0) > 0 && (
                <div className="surface p-4 space-y-2">
                  <div className="text-xs font-medium text-red-700 uppercase tracking-wider">❌ 누락된 키워드 (ATS)</div>
                  <div className="flex flex-wrap gap-2">
                    {gap.keyword_gaps.map((k, i) => (
                      <span key={i} className="bg-red-50 border border-red-200 text-red-700 text-xs px-2 py-0.5 rounded">{k}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 강조할 강점 */}
          {(gap.strengths_to_highlight?.length ?? 0) > 0 && (
            <div className="surface p-4 space-y-2">
              <div className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">💡 특히 강조할 강점</div>
              <div className="flex flex-wrap gap-2">
                {gap.strengths_to_highlight.map((s, i) => (
                  <span key={i} className="chip">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Partial 항목 보강 제안 */}
          {(gap.partial?.length ?? 0) > 0 && (
            <div className="surface p-5 space-y-2">
              <div className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">⚠️ 보강 제안 ({gap.partial.length})</div>
              <div className="space-y-2">
                {gap.partial.map((p, i) => (
                  <div key={i} className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm space-y-1">
                    <div className="font-medium text-yellow-800">{p.item}</div>
                    <div className="text-yellow-700 text-xs">부족: {p.gap}</div>
                    <div className="text-yellow-800 text-xs">→ {p.suggestion}</div>
                  </div>
                ))}
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
            <div className="flex items-center gap-2">
              <button
                onClick={() => api.exportCareerDocx(career as unknown as Record<string, unknown>)}
                className="text-xs text-[var(--muted)] flex items-center gap-1 px-2 py-1 rounded hover:bg-[var(--accent-soft)] transition"
              >
                <FileDown size={14} />Word 다운로드
              </button>
              <button
                onClick={copyFull}
                className="text-xs text-[var(--muted)] flex items-center gap-1 px-2 py-1 rounded hover:bg-[var(--accent-soft)] transition"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "복사됨" : "전문 복사"}
              </button>
            </div>
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
                  {p.background && <div className="text-xs text-[var(--muted)] italic">{p.background}</div>}
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
                {career.skills.domain?.map((s, i) => <span key={`d${i}`} className="chip">{s}</span>)}
              </div>
            </div>
          )}

          {/* 보완 필요 */}
          {career.supplement_needed?.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-[var(--muted)] uppercase tracking-wider">보완 필요 항목</div>
              <ul className="space-y-1">
                {career.supplement_needed.map((s, i) => (
                  <li key={i} className="flex gap-2 bg-yellow-50 border border-yellow-200 rounded p-2 text-yellow-800 text-xs">
                    <span>⚠</span><span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 전문 보기 */}
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

          {/* → 페르소나 피드백 버튼 */}
          <button
            onClick={runStep4}
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading && step === "career_done" ? (
              <><Loader2 size={16} className="animate-spin" />페르소나 피드백 분석 중...</>
            ) : (
              <><MessageSquare size={16} />전문가 페르소나 피드백 받기</>
            )}
          </button>
        </div>
      )}

      {/* ── Step 5: 페르소나 피드백 ── */}
      {personas && personas.length > 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">전문가 페르소나 피드백</h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              각 전문가가 이 경력기술서를 읽었다면 어떻게 피드백했을지 분석한 결과입니다.
            </p>
          </div>

          {personas.map((fb, i) => (
            <div key={i} className="surface p-5 space-y-4">
              {/* 헤더 */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-sm">{fb.persona}</span>
                  {fb.framework_alignment && (
                    <div className="text-xs text-[var(--muted)] mt-0.5">{fb.framework_alignment}</div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-2xl font-bold tabular-nums">{fb.score}</span>
                  <span className="text-[var(--muted)] text-sm">/10</span>
                </div>
              </div>

              {/* 한 줄 총평 */}
              <div className="bg-[var(--background)] border border-[var(--border)] rounded p-3 text-sm italic text-[var(--foreground)]">
                "{fb.summary}"
              </div>

              {/* 강점 */}
              {fb.strengths?.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-green-700 uppercase tracking-wider">✅ 강점</div>
                  <ul className="space-y-1">
                    {fb.strengths.map((s, j) => (
                      <li key={j} className="text-sm text-green-800 bg-green-50 border border-green-100 rounded px-3 py-1.5">
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 반드시 수정 */}
              {fb.must_fix?.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-red-700 uppercase tracking-wider">🔴 반드시 수정</div>
                  <ul className="space-y-1">
                    {fb.must_fix.map((s, j) => (
                      <li key={j} className="text-sm text-red-800 bg-red-50 border border-red-100 rounded px-3 py-1.5">
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 약점 + 수정 제안 */}
              {fb.weaknesses?.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">📝 세부 피드백 및 수정 제안</div>
                  <div className="space-y-3">
                    {fb.weaknesses.map((w, j) => (
                      <div key={j} className="bg-[var(--background)] border border-[var(--border)] rounded p-3 space-y-2 text-sm">
                        {w.quote && (
                          <blockquote className="text-xs border-l-2 border-[var(--border)] pl-2 text-[var(--muted)] italic">
                            "{w.quote}"
                          </blockquote>
                        )}
                        <div className="text-[var(--foreground)]">
                          <span className="text-yellow-700 font-medium">문제: </span>{w.issue}
                        </div>
                        <div className="bg-blue-50 border border-blue-100 rounded px-3 py-2 text-blue-800 text-xs">
                          <span className="font-medium">수정 제안: </span>{w.suggestion}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 보강 제안 */}
              {fb.enrichment_suggestions && fb.enrichment_suggestions.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">💡 보강 제안</div>
                  <div className="space-y-2">
                    {fb.enrichment_suggestions
                      .filter((e) => e.priority === "high" || e.priority === "medium")
                      .map((e, j) => (
                        <div key={j} className="flex gap-2 text-xs">
                          <span className={`shrink-0 px-1.5 py-0.5 rounded font-medium border ${
                            e.priority === "high"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : "bg-yellow-50 text-yellow-700 border-yellow-200"
                          }`}>
                            {e.priority === "high" ? "필수" : "권장"}
                          </span>
                          <span className="text-[var(--muted)] shrink-0">[{e.type}]</span>
                          <span>{e.where ? `${e.where}: ` : ""}{e.what}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
