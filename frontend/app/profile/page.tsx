"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { Loader2, Upload, Sparkles, Save, Trash2, Plus, FileText } from "lucide-react";
import {
  api,
  type Experience,
  type ImportPreview,
  type Profile,
} from "@/lib/api";

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile>({});
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // import state
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pdfName, setPdfName] = useState<string>("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [p, exps] = await Promise.all([
        api.getProfile().catch(() => ({} as Profile)),
        api.listExperiences().catch(() => []),
      ]);
      setProfile(p ?? {});
      setExperiences(exps ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const [importError, setImportError] = useState<string | null>(null);

  async function runImport() {
    const file = fileInputRef.current?.files?.[0];
    if (!importText.trim() && !file) {
      setImportError("PDF나 텍스트를 입력해주세요");
      return;
    }
    setImportError(null);
    setImporting(true);
    try {
      const preview = await api.importProfile(importText, file);
      setImportPreview(preview);
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "Import 실패");
    } finally {
      setImporting(false);
    }
  }

  async function commitImport(replace: boolean) {
    if (!importPreview) return;
    setSaving(true);
    try {
      await api.commitImport({
        profile: importPreview.profile,
        experiences: importPreview.experiences,
        replace_experiences: replace,
      });
      setImportPreview(null);
      setImportText("");
      setPdfName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  async function saveProfile() {
    setSaving(true);
    try {
      await api.updateProfile(profile);
    } finally {
      setSaving(false);
    }
  }

  async function addExp() {
    const created = await api.upsertExperience({ title: "새 경험" });
    setExperiences((prev) => [created, ...prev]);
  }

  async function updateExpField(id: number | undefined, patch: Partial<Experience>) {
    if (id === undefined) return;
    setExperiences((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...patch } : e))
    );
  }

  async function saveExp(exp: Experience) {
    await api.upsertExperience(exp);
  }

  async function deleteExp(id: number | undefined) {
    if (id === undefined) return;
    if (!confirm("이 경험을 삭제하시겠어요?")) return;
    await api.deleteExperience(id);
    setExperiences((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <div className="space-y-8">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">내 프로필</h1>
        <p className="text-sm text-[var(--muted)]">
          한 번 등록하면 자소서 작성 시 자동으로 사용됩니다
        </p>
      </div>

      {/* Import 섹션 */}
      <section className="surface p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} />
          <h2 className="font-semibold">PDF 이력서 / 자유 텍스트로 한번에 채우기</h2>
        </div>
        <p className="text-sm text-[var(--muted)]">
          이력서 PDF를 올리거나 자유롭게 경력을 입력하세요. Claude가 STAR
          구조로 정리하고, 빠진 항목은 따로 알려줍니다.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
          <textarea
            className="textarea"
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="예: 춘천성심병원에서 LLM 개발자로 2년간 의료 문서 자동 요약 시스템 개발. 의사들의 차트 정리 시간을 2시간에서 30분으로 단축..."
          />
          <div className="flex flex-col gap-2 md:w-44">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn-ghost flex items-center justify-center gap-2"
            >
              <Upload size={14} />
              {pdfName || "PDF 업로드"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) =>
                setPdfName(e.target.files?.[0]?.name ?? "")
              }
            />
            <button
              onClick={runImport}
              disabled={importing}
              className="btn-primary flex items-center justify-center gap-2"
            >
              {importing ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Sparkles size={14} />
              )}
              분석
            </button>
          </div>
        </div>

        {importError && (
          <div role="alert" className="alert-banner">
            {importError}
          </div>
        )}

        {importPreview && (
          <div className="mt-3 space-y-3 border-t border-[var(--border)] pt-4">
            <div className="text-sm font-medium">분석 결과 미리보기</div>

            {importPreview.missing_info?.length > 0 && (
              <div className="bg-[var(--background)] border border-[var(--warn)] rounded p-3">
                <div className="text-xs font-medium text-[var(--warn)] mb-1">
                  보완이 필요한 항목
                </div>
                <ul className="text-sm space-y-0.5">
                  {importPreview.missing_info.map((m, i) => (
                    <li key={i}>• {m}</li>
                  ))}
                </ul>
              </div>
            )}

            {importPreview.profile && (
              <div className="text-sm space-y-1">
                {importPreview.profile.character_summary && (
                  <div>
                    <span className="text-[var(--muted)]">캐릭터:</span>{" "}
                    {importPreview.profile.character_summary}
                  </div>
                )}
                {importPreview.profile.career_summary && (
                  <div>
                    <span className="text-[var(--muted)]">경력 요약:</span>{" "}
                    {importPreview.profile.career_summary}
                  </div>
                )}
              </div>
            )}

            {importPreview.experiences?.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs tracking-wider text-[var(--muted)] uppercase">
                  추출된 경험 ({importPreview.experiences.length}개)
                </div>
                <ul className="space-y-1">
                  {importPreview.experiences.map((e, i) => (
                    <li
                      key={i}
                      className="text-sm bg-[var(--background)] border border-[var(--border)] rounded p-2"
                    >
                      <span className="font-medium">{e.title}</span>
                      {e.org && (
                        <span className="text-[var(--muted)]"> · {e.org}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => commitImport(false)}
                disabled={saving}
                className="btn-primary flex items-center gap-2"
              >
                <Save size={14} />
                기존에 추가로 저장
              </button>
              <button
                onClick={() => commitImport(true)}
                disabled={saving}
                className="btn-ghost flex items-center gap-2"
              >
                기존 경험 삭제 후 새로 저장
              </button>
              <button
                onClick={() => setImportPreview(null)}
                className="btn-ghost"
              >
                취소
              </button>
            </div>
          </div>
        )}
      </section>

      {loading ? (
        <div className="text-sm text-[var(--muted)]">로딩 중...</div>
      ) : (
        <>
          {/* 프로필 필드 */}
          <section className="surface p-5 space-y-4">
            <div className="flex items-center gap-2">
              <FileText size={16} />
              <h2 className="font-semibold">고정 프로필</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field
                label="이름"
                value={profile.name}
                onChange={(v) => setProfile({ ...profile, name: v })}
              />
              <Field
                label="목표 포지션"
                value={profile.target_role}
                onChange={(v) => setProfile({ ...profile, target_role: v })}
              />
              <Field
                label="학력 (한 줄)"
                value={profile.education}
                onChange={(v) => setProfile({ ...profile, education: v })}
              />
              <Field
                label="강점 (콤마 나열)"
                value={profile.strengths}
                onChange={(v) => setProfile({ ...profile, strengths: v })}
              />
            </div>
            <FieldArea
              label="핵심 캐릭터 (한 문장)"
              value={profile.character_summary}
              onChange={(v) =>
                setProfile({ ...profile, character_summary: v })
              }
            />
            <FieldArea
              label="경력 요약"
              value={profile.career_summary}
              onChange={(v) => setProfile({ ...profile, career_summary: v })}
            />
            <FieldArea
              label="선호 회사 성향"
              value={profile.company_preferences}
              onChange={(v) =>
                setProfile({ ...profile, company_preferences: v })
              }
            />
            <FieldArea
              label="작성 규칙 / 개인 원칙"
              value={profile.writing_rules}
              onChange={(v) => setProfile({ ...profile, writing_rules: v })}
            />
            <button
              onClick={saveProfile}
              disabled={saving}
              className="btn-primary flex items-center gap-2"
            >
              <Save size={14} /> 프로필 저장
            </button>
          </section>

          {/* 경험들 */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">STAR 경험 ({experiences.length})</h2>
              <button onClick={addExp} className="btn-ghost flex items-center gap-2">
                <Plus size={14} /> 경험 추가
              </button>
            </div>
            <div className="space-y-3">
              {experiences.map((exp) => (
                <ExperienceEditor
                  key={exp.id}
                  exp={exp}
                  onChange={(patch) => updateExpField(exp.id, patch)}
                  onSave={() => saveExp(exp)}
                  onDelete={() => deleteExp(exp.id)}
                />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs text-[var(--muted)] mb-1">{label}</label>
      <input
        className="input"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function FieldArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs text-[var(--muted)] mb-1">{label}</label>
      <textarea
        className="textarea min-h-20"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function ExperienceEditor({
  exp,
  onChange,
  onSave,
  onDelete,
}: {
  exp: Experience;
  onChange: (patch: Partial<Experience>) => void;
  onSave: () => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  return (
    <div className="surface p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-2">
        <input
          className="input"
          value={exp.title ?? ""}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="경험 제목"
        />
        <input
          className="input"
          value={exp.org ?? ""}
          onChange={(e) => onChange({ org: e.target.value })}
          placeholder="조직"
        />
        <input
          className="input"
          value={exp.period ?? ""}
          onChange={(e) => onChange({ period: e.target.value })}
          placeholder="기간"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <FieldArea
          label="S — 상황"
          value={exp.situation}
          onChange={(v) => onChange({ situation: v })}
        />
        <FieldArea
          label="T — 맡은 역할"
          value={exp.task}
          onChange={(v) => onChange({ task: v })}
        />
        <FieldArea
          label="A — 실행"
          value={exp.action}
          onChange={(v) => onChange({ action: v })}
        />
        <FieldArea
          label="R — 결과 (수치 우선)"
          value={exp.result}
          onChange={(v) => onChange({ result: v })}
        />
      </div>
      <input
        className="input"
        value={exp.tech_stack ?? ""}
        onChange={(e) => onChange({ tech_stack: e.target.value })}
        placeholder="사용 기술 (콤마 나열)"
      />
      <div className="flex justify-end gap-2">
        <button
          onClick={async () => {
            setSaving(true);
            try {
              await onSave();
            } finally {
              setSaving(false);
            }
          }}
          disabled={saving}
          className="btn-primary flex items-center gap-2"
        >
          {saving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Save size={14} />
          )}
          저장
        </button>
        <button onClick={onDelete} className="btn-ghost flex items-center gap-2">
          <Trash2 size={14} /> 삭제
        </button>
      </div>
    </div>
  );
}
