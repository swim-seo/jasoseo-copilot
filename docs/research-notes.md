# Research Notes: Korean 자소서 AI Writing Tool

_Date: 2026-05-11 | Source: Gemini CLI research synthesis_

---

## 1. RAG from Informal Korean Speech Transcripts (YouTube)

- Korean YouTube transcripts use colloquial speech, filler words (어, 그, 뭐), and sentence fragments — preprocess with a Korean-aware tokenizer (e.g., Mecab-ko or Kiwi) before chunking.
- Chunk by semantic pause/topic shift, not fixed token count; YouTube auto-captions lack punctuation so use silence-gap heuristics or a sentence boundary model.
- Use KR-SBERT or KLUE-RoBERTa for embeddings — general multilingual models (e.g., `text-embedding-3-small`) underperform on Korean domain-specific vocabulary.
- Apply metadata filtering (channel, upload date, video category) at retrieval time to avoid mixing methodology content with irrelevant lifestyle content.
- Store raw transcript + cleaned version; RAG against cleaned, but surface raw timestamps for citation so users can verify.

---

## 2. Tavily API Limitations & Stale Search Results

- Tavily's free tier caps at ~1,000 requests/month and has no built-in freshness filter — results can be 6–18 months old for niche Korean companies.
- Mitigation: always pass `days=90` (or similar recency param) in the search query string and append the current year to company queries (e.g., "삼성전자 채용 2026").
- Supplement Tavily with Naver News API for Korean-specific company news — Tavily indexes Western sources more heavily.
- Irrelevance guard: score each result with a lightweight LLM call ("Is this result about [company] hiring for [role]? yes/no") before including in the context window.
- Rate-limit handling: wrap Tavily calls in exponential backoff; cache results in Supabase with a `fetched_at` timestamp.

---

## 3. Claude Prompts for Human-Sounding Cover Letters

- Avoid listing instructions as bullet points in the prompt — Claude tends to mirror that structure in output, producing robotic enumerated paragraphs.
- Provide 2–3 example 자소서 excerpts (few-shot) labelled "written by a Korean 25-year-old" rather than describing style abstractly.
- Instruct Claude to vary sentence length deliberately: one long compound sentence (복합문) followed by a short punchy sentence breaks AI cadence.
- Explicitly forbid cliché phrases common in AI output: "저는 어릴 때부터…", "이 직무에 열정을 가지고…", "귀사의 발전에 기여하고 싶습니다."
- Use a two-pass approach: first draft → then a "humanizer" pass with the instruction "rewrite to sound like an introspective Korean college graduate, not a resume bot."

---

## 4. Korean 자소서 Specific Patterns

- Korean 자소서 uses fixed question prompts set by each company (e.g., "성장과정", "지원동기", "직무역량", "인생관/가치관") — the AI must map user experiences to each question slot, not produce a single narrative.
- Character/byte limits are strict (usually 500–1,000 characters per item); the output pipeline must enforce these, not just suggest them.
- The tone is formal-polished (격식체 합쇼체) but NOT bureaucratic — reviewers penalize both overly casual and overly stiff writing.
- Korean companies value specificity of numbers and outcomes in STAR stories (e.g., "팀 프로세스 개선으로 처리 시간 30% 단축") — the prompt should explicitly ask the user for quantifiable outcomes.
- Unlike Western cover letters, Korean 자소서 rarely mentions salary expectations or references; focus is entirely on fit, growth story, and company-specific value alignment.

---

## 5. Caching Strategy for Company Research

- Cache at two levels: (1) company profile (stable — update weekly), (2) recent news/hiring info (volatile — TTL 24–48 hours).
- Store in Supabase with columns: `company_name`, `research_json`, `fetched_at`, `ttl_hours`. Query: if `fetched_at + ttl_hours < now()`, refresh; else serve cache.
- Serve stale data with a warning badge ("정보 기준: N일 전") rather than blocking the user while refreshing — improves perceived performance.
- For tier-1 large companies (삼성, SK, LG, 현대, 카카오, 네이버), pre-warm cache daily via a cron job; for long-tail companies, lazy-fetch on first request.
- Estimated savings: ~70% Tavily API calls eliminated with a 48-hour TTL on repeat company lookups.

---

## Architecture Evaluation: FastAPI + Tavily + Supabase pgvector + Claude API

### Proposed Architecture
- **Input**: company name, job role, personal experiences list
- **Pipeline**: Tavily search → company/job analysis → pgvector RAG (methodology) → Claude generation
- **Output**: company analysis + 자소서 draft in STAR format

### Top 5 Improvements

1. **Add a question-slot mapper before generation**: Korean 자소서 is structured around fixed company question prompts. Add a pre-generation step that maps the user's experiences to each 자소서 question (성장과정, 지원동기, etc.) before calling Claude. Without this, Claude produces a generic narrative that doesn't match the actual application form.

2. **Split company research into two Tavily queries**: one for "company culture/values" (stable, cache 7 days) and one for "recent news + job description" (volatile, cache 24h). Mixing them degrades relevance and wastes tokens.

3. **Add a Korean NLP pre-processor for experience inputs**: Users write experiences in informal Korean. Run Kiwi or Mecab-ko to normalize before embedding — this dramatically improves RAG retrieval of relevant methodology chunks.

4. **Implement a character-count enforcer post-generation**: Claude does not reliably honor Korean character limits. Add a post-processing step that trims/expands output to within ±50 chars of the target limit using a secondary Claude call with the truncated text and target length.

5. **Add Naver News API as a fallback/supplement to Tavily**: Tavily underperforms on Korean corporate news. A simple Naver News API call (free, no auth needed for basic use) for the company name reliably surfaces recent Korean-language press, significantly improving the company analysis quality.

---

## Summary Verdict

The core architecture is sound. The critical gap is **Korean-specific structuring**: the tool must understand that 자소서 is not one document but a set of fixed-question responses, each with strict length constraints. Address this before optimizing RAG or caching.
