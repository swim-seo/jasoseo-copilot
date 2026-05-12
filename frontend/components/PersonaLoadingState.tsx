"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, Circle } from "lucide-react";

const PERSONAS_DISPLAY = [
  { key: "careersaida_star", label: "취업사이다", color: "var(--persona-careersaida)" },
  { key: "leehyung_3C4P", label: "면접왕 이형", color: "var(--persona-leehyung)" },
  { key: "kang_3step", label: "강민혁", color: "var(--persona-kang)" },
];

const STAGE_LABELS = [
  "검색 자료 수집 중",
  "약점 분석 중",
  "보강 제안 작성 중",
];

export function PersonaLoadingState() {
  const [elapsed, setElapsed] = useState(0);
  const [stages, setStages] = useState<number[]>([0, 0, 0]);

  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // optimistic staged progression (backend doesn't stream)
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    PERSONAS_DISPLAY.forEach((_, i) => {
      timers.push(
        setTimeout(() => {
          setStages((prev) => {
            const next = [...prev];
            next[i] = 1;
            return next;
          });
        }, 1500 + i * 800)
      );
      timers.push(
        setTimeout(() => {
          setStages((prev) => {
            const next = [...prev];
            next[i] = 2;
            return next;
          });
        }, 8000 + i * 1500)
      );
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="surface p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">전문가별 검토 진행 중</div>
        <div className="text-xs text-[var(--muted)] tabular-nums">
          {elapsed}s 경과
        </div>
      </div>
      <ul className="space-y-2">
        {PERSONAS_DISPLAY.map((p, i) => {
          const stage = stages[i];
          const done = false; // 백엔드 완료까지 알 수 없음 (optimistic)
          return (
            <li
              key={p.key}
              className="flex items-center gap-3 text-sm"
            >
              {done ? (
                <CheckCircle2 size={16} className="text-[var(--success)] shrink-0" />
              ) : stage > 0 ? (
                <Loader2 size={16} className="animate-spin shrink-0" style={{ color: p.color }} />
              ) : (
                <Circle size={16} className="text-[var(--muted)] shrink-0" />
              )}
              <span className="font-medium" style={{ color: p.color }}>
                {p.label}
              </span>
              <span className="text-[var(--muted)] text-xs">
                {stage > 0 ? STAGE_LABELS[stage - 1] ?? "정리 중" : "대기 중"}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="text-xs text-[var(--muted)]">
        세 전문가가 동시에 검토 중입니다. 보통 20~40초 소요됩니다.
      </div>
    </div>
  );
}
