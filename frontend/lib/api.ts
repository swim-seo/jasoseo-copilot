const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(
  path: string,
  init?: RequestInit & { json?: unknown }
): Promise<T> {
  const { json, headers, ...rest } = init ?? {};
  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: {
      ...(json ? { "Content-Type": "application/json" } : {}),
      ...(headers ?? {}),
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

export type Persona = {
  key: string;
  label: string;
  tagline: string;
  channel: string | null;
};

export type Profile = {
  id?: string;
  name?: string;
  target_role?: string;
  character_summary?: string;
  career_summary?: string;
  education?: string;
  strengths?: string;
  company_preferences?: string;
  writing_rules?: string;
};

export type Experience = {
  id?: number;
  title: string;
  org?: string;
  period?: string;
  situation?: string;
  task?: string;
  action?: string;
  result?: string;
  tech_stack?: string;
  tags?: string[];
};

export type ImportPreview = {
  raw_text: string;
  profile: Profile;
  experiences: Experience[];
  missing_info: string[];
  error?: string;
};

export type EnrichmentItem = {
  type:
    | "visual"
    | "technical_term"
    | "quantitative"
    | "demo_link"
    | "reference"
    | "story_detail";
  where?: string;
  what: string;
  priority?: "high" | "medium" | "low";
};

export type Feedback = {
  persona: string;
  persona_key: string;
  score: number;
  summary: string;
  strengths: string[];
  weaknesses: { quote: string; issue: string; suggestion: string }[];
  must_fix: string[];
  framework_alignment?: string;
  enrichment_suggestions?: EnrichmentItem[];
};

export type SynthesisResult = {
  synthesis_summary: string;
  applied_changes: { from: string; to: string; reason: string }[];
  ignored_suggestions: { persona: string; suggestion: string; reason: string }[];
  enrichment_todo?: (EnrichmentItem & { rationale?: string })[];
  final_text: string;
};

export type CoverLetter = {
  id: number;
  parent_id?: number | null;
  company: string;
  job_role?: string;
  question: string;
  methodology_preference?: string;
  char_limit?: number;
  result: string;
  version?: number;
  created_at?: string;
};

export const api = {
  // Profile
  getProfile: () => request<Profile>("/api/profile"),
  updateProfile: (fields: Profile) =>
    request<Profile>("/api/profile", { method: "PUT", json: fields }),
  // Experiences
  listExperiences: () => request<Experience[]>("/api/experiences"),
  upsertExperience: (exp: Experience) =>
    request<Experience>("/api/experiences", { method: "POST", json: exp }),
  deleteExperience: (id: number) =>
    request<{ deleted: number }>(`/api/experiences/${id}`, { method: "DELETE" }),
  // Import
  importProfile: async (text: string, file?: File): Promise<ImportPreview> => {
    const form = new FormData();
    if (text) form.append("text", text);
    if (file) form.append("file", file);
    const res = await fetch(`${API_BASE}/api/profile/import`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) throw new Error(`Import failed: ${res.status}`);
    return res.json();
  },
  commitImport: (payload: {
    profile: Profile;
    experiences: Experience[];
    replace_experiences?: boolean;
  }) =>
    request("/api/profile/import/commit", { method: "POST", json: payload }),

  // Personas
  listPersonas: () => request<Persona[]>("/api/personas"),

  // Generate
  generateCoverLetter: (params: {
    company: string;
    job_role: string;
    question: string;
    char_limit?: number;
    job_posting?: string;
    extra_context?: string;
    methodology_preference?: string;
    experience_ids?: number[];
    save?: boolean;
  }) =>
    request<{ result: string; saved: CoverLetter | null }>(
      "/api/generate/cover-letter",
      { method: "POST", json: params }
    ),

  multiFeedback: (params: {
    draft: string;
    company?: string;
    job_role?: string;
    question?: string;
    job_posting?: string;
    mode?: "cover_letter" | "portfolio";
    persona_keys?: string[];
  }) =>
    request<{ feedbacks: Feedback[]; mode: string }>(
      "/api/generate/multi-feedback",
      { method: "POST", json: params }
    ),

  synthesize: (params: {
    draft: string;
    feedbacks: Feedback[];
    ignored_persona_keys?: string[];
    company?: string;
    job_role?: string;
    question?: string;
    job_posting?: string;
    parent_letter_id?: number;
    save?: boolean;
  }) =>
    request<{ result: SynthesisResult; saved: CoverLetter | null }>(
      "/api/generate/synthesize",
      { method: "POST", json: params }
    ),

  interview: (params: {
    cover_letter_text: string;
    company?: string;
    job_role?: string;
  }) =>
    request<{ result: string }>("/api/generate/interview", {
      method: "POST",
      json: params,
    }),

  // History
  listLetters: (company?: string) =>
    request<CoverLetter[]>(
      `/api/history/letters${company ? `?company=${encodeURIComponent(company)}` : ""}`
    ),
  getLetter: (id: number) =>
    request<CoverLetter>(`/api/history/letters/${id}`),
  getThread: (id: number) =>
    request<CoverLetter[]>(`/api/history/letters/${id}/thread`),
};
