"use client";

import { useEffect, useState } from "react";
import { api, type CoverLetter } from "@/lib/api";
import { Loader2, ChevronRight } from "lucide-react";

export default function HistoryPage() {
  const [letters, setLetters] = useState<CoverLetter[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<CoverLetter | null>(null);

  useEffect(() => {
    api
      .listLetters()
      .then(setLetters)
      .catch(() => setLetters([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter
    ? letters.filter(
        (l) =>
          l.company.toLowerCase().includes(filter.toLowerCase()) ||
          l.question.toLowerCase().includes(filter.toLowerCase())
      )
    : letters;

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">자소서 히스토리</h1>
        <input
          className="input max-w-xs"
          placeholder="회사·항목으로 검색"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
          <Loader2 size={14} className="animate-spin" /> 로딩 중...
        </div>
      ) : letters.length === 0 ? (
        <div className="surface p-8 text-center text-sm text-[var(--muted)]">
          저장된 자소서가 없습니다. 새 자소서를 작성하면 자동 저장됩니다.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-6">
          <ul className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
            {filtered.map((l) => (
              <li
                key={l.id}
                onClick={() => setSelected(l)}
                className={`p-3 rounded-md border cursor-pointer transition ${
                  selected?.id === l.id
                    ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                    : "border-[var(--border)] hover:bg-[var(--accent-soft)]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium truncate">
                    {l.company}
                  </div>
                  <ChevronRight
                    size={16}
                    className="text-[var(--muted)] shrink-0"
                  />
                </div>
                <div className="text-xs text-[var(--muted)] mt-0.5 truncate">
                  {l.question}
                </div>
                <div className="text-xs text-[var(--muted)] mt-1 flex gap-2">
                  <span>v{l.version ?? 1}</span>
                  {l.methodology_preference && (
                    <span>· {l.methodology_preference}</span>
                  )}
                  {l.created_at && (
                    <span>· {new Date(l.created_at).toLocaleDateString()}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <div className="surface p-5 space-y-3 min-h-[70vh]">
            {selected ? (
              <>
                <div>
                  <div className="text-xs tracking-wider text-[var(--muted)] uppercase">
                    {selected.company} · {selected.job_role}
                  </div>
                  <div className="text-base font-semibold mt-1">
                    {selected.question}
                  </div>
                </div>
                <div className="bg-[var(--background)] border border-[var(--border)] rounded p-4 text-sm leading-7 whitespace-pre-wrap max-h-[60vh] overflow-y-auto">
                  {selected.result}
                </div>
              </>
            ) : (
              <div className="text-sm text-[var(--muted)] text-center pt-20">
                좌측 목록에서 자소서를 선택하세요
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
