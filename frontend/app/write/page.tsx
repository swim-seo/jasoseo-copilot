"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles, ArrowRight } from "lucide-react";
import { api, type Experience } from "@/lib/api";
import { useRouter } from "next/navigation";

const COMMON_QUESTIONS = [
  "지원 동기 및 포부",
  "성장 과정",
  "직무 역량",
  "팀 경험 및 갈등 해결",
  "사회 이슈 및 견해",
];

export default function WritePage() {
  const router = useRouter();

  const [company, setCompany] = useState("");
  const [jobRole, setJobRole] = useState("");
  const [question, setQuestion] = useState(COMMON_QUESTIONS[0]);
  const [charLimit, setCharLimit] = useState(700);
  const [extraContext, setExtraContext] = useState("");
  const [jobPosting, setJobPosting] = useState("");

  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [selectedExpIds, setSelectedExpIds] = useState<Set<number>>(new Set());

  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<string>("");
  const [letterId, setLetterId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listExperiences()
      .then((list) => setExperiences(list))
      .catch(() => setExperiences([]));
  }, []);

  function toggleExp(id?: number) {
    if (id === undefined) return;
    setSelectedExpIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function generate() {
    if (!company || !jobRole) {
      setError("회사명과 직무를 입력해주세요");
      return;
    }
    setError(null);
    setGenerating(true);
    setResult("");
    try {
      const res = await api.generateCoverLetter({
        company,
        job_role: jobRole,
        question,
        char_limit: charLimit,
        job_posting: jobPosting,
        extra_context: extraContext,
        experience_ids: Array.from(selectedExpIds),
        save: true,
      });
      setResult(res.result);
      setLetterId(res.saved?.id ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "생성 실패");
    } finally {
      setGenerating(false);
    }
  }

  function goReview() {
    if (!result) return;
    sessionStorage.setItem(
      "jasoseo:review:bootstrap",
      JSON.stringify({ company, job_role: jobRole, question, draft: result })
    );
    router.push("/review");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">새 자소서 작성</h1>
      <p className="text-sm text-[var(--muted)] -mt-2">
        회사·직무·항목과 사용할 경험을 고르면 초안 1차를 생성합니다. 이후{" "}
        <span className="font-medium">초안 검토</span>로 넘어가서 전문가별
        피드백 + 통합 수정안을 받으세요.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-6">
        {/* 좌: 입력 */}
        <div className="space-y-4">
          <div className="surface p-5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[var(--muted)] mb-1">
                  회사명
                </label>
                <input
                  className="input"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="삼성전자"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--muted)] mb-1">
                  직무
                </label>
                <input
                  className="input"
                  value={jobRole}
                  onChange={(e) => setJobRole(e.target.value)}
                  placeholder="SW 엔지니어"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-[var(--muted)] mb-1">
                자소서 항목
              </label>
              <select
                className="input"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              >
                {COMMON_QUESTIONS.map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
                <option value="">직접 입력...</option>
              </select>
              {!COMMON_QUESTIONS.includes(question) && (
                <input
                  className="input mt-2"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="항목을 직접 입력"
                />
              )}
            </div>
            <div>
              <label className="block text-xs text-[var(--muted)] mb-1">
                글자 수 ({charLimit}자)
              </label>
              <input
                type="range"
                min={300}
                max={2000}
                step={100}
                value={charLimit}
                onChange={(e) => setCharLimit(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          <div className="surface p-5 space-y-3">
            <div className="flex items-baseline justify-between">
              <label className="text-sm font-medium">
                사용할 경험 ({selectedExpIds.size}/{experiences.length})
              </label>
              <span className="text-xs text-[var(--muted)]">
                선택 안 하면 모든 경험 사용
              </span>
            </div>
            {experiences.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">
                저장된 경험이 없습니다. 먼저{" "}
                <a href="/profile" className="underline">
                  내 프로필
                </a>
                에 경험을 등록하세요.
              </p>
            ) : (
              <ul className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {experiences.map((exp) => {
                  const checked = exp.id ? selectedExpIds.has(exp.id) : false;
                  return (
                    <li
                      key={exp.id}
                      onClick={() => toggleExp(exp.id)}
                      className={`p-3 rounded-md border cursor-pointer transition ${
                        checked
                          ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                          : "border-[var(--border)] hover:bg-[var(--accent-soft)]"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          readOnly
                          className="accent-[var(--accent)]"
                        />
                        <div className="text-sm font-medium">{exp.title}</div>
                      </div>
                      {exp.org && (
                        <div className="text-xs text-[var(--muted)] ml-6 mt-0.5">
                          {exp.org}
                          {exp.period ? ` · ${exp.period}` : ""}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="surface p-5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                채용 공고 (JD) 붙여넣기
              </label>
              <span className="text-xs text-[var(--muted)]">
                {jobPosting.length}자 · 권장
              </span>
            </div>
            <textarea
              className="textarea min-h-40"
              value={jobPosting}
              onChange={(e) => setJobPosting(e.target.value)}
              placeholder="채용 공고 전문을 그대로 붙여넣으세요. 자격 요건·우대사항·주요 업무가 모두 들어가면 페르소나가 JD 핵심을 더 정확히 반영합니다."
            />
          </div>

          <details className="surface p-5">
            <summary className="text-sm font-medium cursor-pointer">
              추가 자료 (뉴스·IR·사내 자료, 선택)
            </summary>
            <div className="mt-3">
              <textarea
                className="textarea min-h-24"
                value={extraContext}
                onChange={(e) => setExtraContext(e.target.value)}
                placeholder="이 회사 관련 최근 뉴스, IR 자료, 사업 보고서 등"
              />
            </div>
          </details>

          <button
            onClick={generate}
            disabled={generating}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {generating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                초안 생성 중...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                자소서 초안 생성
              </>
            )}
          </button>
          {error && <div className="text-sm text-[var(--danger)]">{error}</div>}
        </div>

        {/* 우: 결과 */}
        <div className="space-y-4">
          {!result && !generating && (
            <div className="surface p-8 text-center text-sm text-[var(--muted)]">
              왼쪽에서 입력 후 초안 생성을 누르세요. 결과가 여기 표시됩니다.
            </div>
          )}
          {result && (
            <div className="surface p-5 space-y-4">
              <div className="text-xs tracking-wider text-[var(--muted)] uppercase">
                생성된 초안
              </div>
              <div className="bg-[var(--background)] border border-[var(--border)] rounded p-4 text-sm leading-7 whitespace-pre-wrap">
                {result}
              </div>
              <button
                onClick={goReview}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                전문가별 피드백으로 넘기기
                <ArrowRight size={16} />
              </button>
              {letterId && (
                <div className="text-xs text-[var(--muted)] text-center">
                  히스토리에 저장됨 (#{letterId})
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
