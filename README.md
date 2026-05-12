# 자소서 코파일럿 (Jasoseo Copilot)

> **한 명의 멘토가 아니라, 여러 전문가의 의견을 동시에 받는 자소서**

취업사이다 · 면접왕 이형 같은 유튜브 컨설팅 영상을 학습한 **페르소나들이 내 초안을 병렬로 검토**하고, 자료 보강·전문 용어·정량 수치까지 통합하여 **하나의 자연스러운 글로 합성**하는 AI 자소서·포트폴리오 도구.

---

## 핵심 컨셉

```
       사용자 초안 (자소서 또는 포트폴리오)
                 │
                 ▼
   ┌─────────────────────────────────┐
   │   페르소나 병렬 피드백 (3개 동시)    │
   ├──────────┬──────────┬───────────┤
   │취업사이다 │면접왕 이형│  강민혁    │
   │ STAR기법 │  3C4P    │ 3단법칙   │
   │ 점수 8/10│ 점수 6/10│ 점수 7/10 │
   │ + 약점   │ + 약점   │ + 약점   │
   │ + 보강제안│ + 보강제안│ + 보강제안│
   └──────────┴──────────┴───────────┘
                 │
                 ▼  통합 합성기 (Claude)
   ┌─────────────────────────────────┐
   │  • 공통 약점 반드시 수정             │
   │  • 충돌 의견은 사용자 캐릭터 기준 선택│
   │  • 본문에 못 넣는 자료는 To-do 목록 │
   └─────────────────────────────────┘
                 │
                 ▼
        최종 통합 수정안 + 변경 사항 diff
        + 자료 보강 To-do (영상·다이어그램·전문 용어·수치)
```

---

## 핵심 기능

| 기능 | 설명 |
|------|------|
| **다중 페르소나 병렬 검토** | 취업사이다 / 면접왕 이형 / 강민혁 페르소나가 동시에 초안 채점·약점 진단 |
| **자료 보강 코치** | 시각자료·전문 용어·정량 수치·데모 링크가 빠지면 페르소나가 지적 |
| **자동 합성** | 충돌하는 의견은 사용자의 [핵심 캐릭터]에 맞춰 선택, 한 사람의 글처럼 합성 |
| **JD 매칭 갭 분석** | 채용 공고 붙여넣기 → 요건 추출 → 내 경험과 매칭도 분석 → 경력기술서 자동 생성 |
| **고정 프로필** | PDF 이력서 또는 자유텍스트로 한 번 등록 → 자소서마다 자동 사용 |
| **사용자 작성 지침 통합** | LLM 개발자 전환 전략·핵심 캐릭터·금지 표현·문장 정제 도구가 모든 생성에 자동 적용 |
| **STAR 자동 추출** | Claude가 자유 텍스트·PDF에서 경험을 Situation/Task/Action/Result 구조로 분리 |
| **기업 자동 분석** | Tavily 검색으로 최신 사업 전략 · 직무 역할 · 인재상 자동 수집 |
| **방법론 RAG** | 168개 컨설팅 영상 청크에서 항목·페르소나별 유사 사례 검색 |
| **버전 히스토리** | 초안 → 피드백 → 합성안의 버전 체인 자동 저장 |

---

## 아키텍처

```
┌──────────────────────────────────────────────────────────────┐
│ Next.js 16 Frontend (Notion-style light)                    │
│   /          랜딩 / 진입점 4개                                │
│   /write     새 자소서: 입력 폼 → 초안 생성                    │
│   /review    초안 검토: 병렬 피드백 + 통합 합성 (핵심 화면)     │
│   /gap       JD 매칭: 요건 추출 → 갭 분석 → 경력기술서 생성    │
│   /profile   고정 프로필 + STAR 경험 CRUD + PDF import       │
│   /history   회사·항목별 자소서 버전 히스토리                  │
└──────────────────────────────────────────────────────────────┘
                              │ HTTP (NEXT_PUBLIC_API_URL)
                              ▼
┌──────────────────────────────────────────────────────────────┐
│ FastAPI Backend (27 routes)                                  │
│                                                              │
│ ▸ /api/profile, /api/experiences  사용자 프로필·경험 CRUD     │
│ ▸ /api/profile/import             PDF/text → Claude → STAR  │
│ ▸ /api/personas                   페르소나 목록               │
│ ▸ /api/research/company           Tavily 기업 분석           │
│ ▸ /api/generate/cover-letter      단일 페르소나로 초안 생성    │
│ ▸ /api/generate/multi-feedback    모든 페르소나 병렬 피드백    │
│ ▸ /api/generate/synthesize        피드백 합성 → 최종안        │
│ ▸ /api/generate/interview         자소서 기반 예상 면접 질문   │
│ ▸ /api/history/letters            저장된 자소서 + 버전 체인   │
│ ▸ /api/analyze/gap                JD 갭 분석 (3단계 파이프라인)│
│ ▸ /api/analyze/gap/extract-jd     JD → 요건 JSON 추출       │
│ ▸ /api/analyze/gap/analyze        요건 vs 경험 갭 분석        │
│ ▸ /api/analyze/gap/career-description 갭 → 경력기술서 생성   │
└──────────────────────────────────────────────────────────────┘
                              │
       ┌──────────────────────┼──────────────────────┐
       ▼                      ▼                      ▼
┌─────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ Claude API  │    │ Supabase pgvector│    │ Tavily Search    │
│ (sonnet 4.6)│    │ methodology_chunks│    │ (기업 분석)        │
│  생성·피드백  │    │ user_profile     │    └──────────────────┘
│  ·합성·분석  │    │ experiences      │
└─────────────┘    │ cover_letters    │
                   └──────────────────┘
                              ▲
                              │ ingest_scripts.py
┌──────────────────────────────────────────────────────────────┐
│ 지식 파이프라인 (오프라인)                                       │
│   youtube_collector.py (yt-dlp)                              │
│     ├─ @careersaida   50개 영상 → 108 청크                    │
│     └─ @leebro_interview 30개 영상 → 60 청크                  │
│   ingest_scripts.py                                          │
│     ├─ 채널 메타데이터 자동 태깅 (channel_registry.py)          │
│     └─ fastembed 로컬 임베딩 (384-dim) → Supabase pgvector   │
└──────────────────────────────────────────────────────────────┘
```

---

## 기술 스택

### Frontend
| 구성요소 | 기술 |
|----------|------|
| 프레임워크 | Next.js 16 (App Router, Turbopack) |
| 스타일 | Tailwind v4 (Notion 라이트 톤) |
| 아이콘 | lucide-react |
| 디자인 | 페르소나별 컬러 코딩 좌측 보더, surface 카드 #F7F7F5 |

### Backend
| 구성요소 | 기술 |
|----------|------|
| API 서버 | FastAPI + Uvicorn |
| LLM | Anthropic Claude (`claude-sonnet-4-6`) |
| 기업 리서치 | Tavily Search API |
| **벡터 임베딩** | **fastembed (로컬 ONNX, 외부 API 불필요)** |
| 벡터 DB | Supabase pgvector (384-dim) |
| PDF 파싱 | pypdf (5MB·30쪽 cap) |
| 유튜브 수집 | yt-dlp (VTT 자막 파싱) |
| 패키지 관리 | uv |
| Python | 3.12 x86_64 (`.python-version`) |

### 페르소나
| Key | Label | Channel | 프레임워크 |
|-----|-------|---------|---------|
| `careersaida_star` | 취업사이다 | @careersaida | STAR · 합쇼체 · 면접 연결 |
| `leehyung_3C4P` | 면접왕 이형 | @leebro_interview | 3C4P · 필살기 · 수치 증명 |
| `kang_3step` | 강민혁 | @kang-f2x | 자소서 3단 법칙 · 두괄식 |
| `auto` | 자동 | — | 합성 모드 (모든 RAG 활용) |

### 자료 보강 유형
페르소나가 초안을 검토할 때 다음 항목 누락을 지적합니다:
- `visual` — 다이어그램·스크린샷·그래프·영상
- `technical_term` — LLM/RAG/embedding 같은 구체 용어
- `quantitative` — "75% 단축", "F1 0.92" 같은 정량 수치
- `demo_link` — GitHub, 데모 페이지, 발표 자료
- `reference` — 논문·표준·벤치마크 인용
- `story_detail` — 시행착오·의사결정 이유·당시 고민

---

## 설치 및 실행

### 1. 의존성 설치

```bash
# Python 3.12 환경 (.python-version으로 자동 선택)
uv sync

# Frontend
cd frontend
npm install
```

### 2. 환경 변수

**backend `.env`** (프로젝트 루트):
```env
ANTHROPIC_API_KEY=sk-ant-...
TAVILY_API_KEY=tvly-...
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_KEY=your-supabase-anon-key
CLAUDE_MODEL=claude-sonnet-4-6
# HUGGINGFACE_API_KEY는 더 이상 필요 없음 (fastembed 로컬)
```

**frontend `.env.local`** (`frontend/`):
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. Supabase 테이블 초기화

Supabase SQL Editor에서 **순서대로** 실행:
1. `scripts/setup_supabase.sql` — `methodology_chunks` 테이블
2. `scripts/migration_metadata.sql` — 메타데이터 컬럼·필터 RPC
3. `scripts/migration_persona_v2.sql` — `user_profile`, `experiences`, `cover_letters`

### 4. 서버 실행 (두 터미널 동시)

**터미널 A — 백엔드:**
```bash
uv run uvicorn backend.main:app --reload --port 8000
# Swagger: http://localhost:8000/docs
```

**터미널 B — 프론트엔드:**
```bash
cd frontend
npm run dev
# 사용자 UI: http://localhost:3000
```

> 백엔드를 브라우저로 직접 열면 `/`는 404가 정상입니다. UI는 `localhost:3000`.

---

## 지식 파이프라인: 유튜브 스크립트 수집

### 채널 전체 수집 + 자동 임베딩

```bash
# 취업사이다
uv run python scripts/youtube_collector.py \
  --channel https://www.youtube.com/@careersaida/videos --max 50 --ingest

# 면접왕 이형
uv run python scripts/youtube_collector.py \
  --channel https://www.youtube.com/@leebro_interview/videos --max 30 --ingest
```

채널 핸들은 파일 헤더에 `채널: @핸들`로 자동 기록되고, `channel_registry.py`가 페르소나 메타데이터(`methodology`, `content_type`)를 자동 태깅합니다.

### 채널에서 최근 N개만

```bash
uv run python scripts/youtube_collector.py \
  --channel https://www.youtube.com/@careersaida/videos --max 10 --ingest
```

### 특정 영상만

```bash
uv run python scripts/youtube_collector.py --url https://www.youtube.com/watch?v=XXXX --ingest
uv run python scripts/youtube_collector.py --url URL1 --url URL2 --ingest
```

### 수집만 (임베딩 없이)

```bash
uv run python scripts/youtube_collector.py \
  --channel https://www.youtube.com/@careersaida/videos --max 20
```

### 나중에 임베딩만 별도 실행

```bash
uv run python scripts/ingest_scripts.py
```

### 기존 자막에 채널 헤더 backfill

```bash
uv run python scripts/backfill_channel_header.py "@careersaida"
```

### 수집 결과 확인 (PowerShell)

```powershell
ls C:\Users\hp\jasoseo-copilot\data\youtube_scripts\*.txt | Select-Object Name, Length
(ls C:\Users\hp\jasoseo-copilot\data\youtube_scripts\*.txt).Count
ls C:\Users\hp\jasoseo-copilot\data\youtube_scripts\*.txt | Where-Object { $_.Length -lt 200 }
```

정상 수집된 파일은 `제목_videoID.txt` 형식이며 첫 세 줄:
```
출처: https://www.youtube.com/watch?v=VIDEO_ID
채널: @careersaida
제목: 영상 제목
```

---

## API 핵심 엔드포인트

### `POST /api/profile/import` — PDF/텍스트 → STAR 자동 추출

multipart form: `file` (PDF 선택) + `text` (자유텍스트). Claude가 다음을 추출:
- `profile` (이름, 목표 포지션, 캐릭터 요약, 경력 요약, 학력, 강점, 작성 규칙)
- `experiences[]` (STAR 구조)
- `missing_info[]` (보완 필요 항목)

사용자 검토 후 `POST /api/profile/import/commit`으로 저장.

### `POST /api/generate/cover-letter` — 초안 1차 생성

```json
{
  "company": "삼성전자",
  "job_role": "SW 엔지니어",
  "question": "지원 동기 및 포부",
  "char_limit": 700,
  "experience_ids": [1, 3],
  "methodology_preference": "auto",
  "save": true
}
```

### `POST /api/generate/multi-feedback` — 다중 페르소나 병렬 검토

```json
{
  "draft": "...",
  "company": "삼성전자",
  "job_role": "SW 엔지니어",
  "question": "지원 동기 및 포부",
  "mode": "cover_letter"
}
```

응답: 페르소나별 `score`, `summary`, `must_fix[]`, `weaknesses[]`, `enrichment_suggestions[]`.

### `POST /api/generate/synthesize` — 피드백 합성

```json
{
  "draft": "...",
  "feedbacks": [...],
  "ignored_persona_keys": ["kang_3step"]
}
```

응답: `final_text`, `applied_changes[]`, `enrichment_todo[]`, `synthesis_summary`.

### `POST /api/analyze/gap` — JD 갭 분석 + 경력기술서 (3단계 통합)

```json
{
  "jd": "채용 공고 전문...",
  "user_experience": "내 경험 자유텍스트 (선택 — 저장된 프로필 자동 반영)"
}
```

응답:
- `jd_requirements` — 직무명, 필수/우대 기술, 경력 요건, ATS 키워드
- `gap_analysis` — 매칭 점수(0~100), matched/partial/missing 항목, critical_gaps
- `career_description` — 프로젝트별 경력 (배경→역할→실행→성과), [수치 확인 필요] 플레이스홀더, 보유 역량

단계별 실행이 필요하면 `/api/analyze/gap/extract-jd` → `/api/analyze/gap/analyze` → `/api/analyze/gap/career-description` 순으로 개별 호출 가능.

---

## 프로젝트 구조

```
jasoseo-copilot/
├── backend/
│   ├── main.py                       # FastAPI 앱 (27 routes)
│   ├── config.py                     # 환경 변수
│   ├── routers/
│   │   ├── profile.py                # 프로필·경험·PDF import
│   │   ├── personas.py               # GET /api/personas
│   │   ├── research.py               # Tavily 기업 분석
│   │   ├── generate.py               # 생성·피드백·합성·면접
│   │   ├── history.py                # 자소서 히스토리
│   │   └── analyze.py                # JD 갭 분석 (3단계)
│   ├── modules/
│   │   ├── cover_letter_generator.py # 초안 생성·단일 피드백·면접 질문
│   │   ├── multi_persona.py          # 병렬 피드백 + 합성기
│   │   ├── gap_analyzer.py           # JD 요건 추출·갭 분석·경력기술서 생성
│   │   ├── writing_guide.py          # 사용자 작성 지침 로더 (lru_cache)
│   │   ├── persona_registry.py       # 페르소나별 시스템 프롬프트
│   │   ├── methodology_rag.py        # pgvector 필터 검색
│   │   ├── embedding.py              # fastembed 로컬 임베딩
│   │   ├── user_profile.py           # 프로필·경험 CRUD
│   │   ├── cover_letter_store.py     # 히스토리 저장·버전 체인
│   │   ├── profile_importer.py       # PDF/text → Claude STAR 추출
│   │   ├── channel_registry.py       # 파일 헤더 → 페르소나 매핑
│   │   └── web_searcher.py           # Tavily wrapper
│   └── prompts/
│       └── user_profile.txt          # 사용자 고정 작성 지침 (15개 원칙)
├── frontend/
│   ├── app/
│   │   ├── page.tsx                  # 랜딩
│   │   ├── write/page.tsx            # 새 자소서 작성
│   │   ├── review/page.tsx           # 핵심: 병렬 피드백 + 합성
│   │   ├── gap/page.tsx              # JD 매칭: 갭 분석 + 경력기술서
│   │   ├── profile/page.tsx          # 프로필 + STAR 편집기
│   │   └── history/page.tsx          # 자소서 히스토리
│   ├── components/
│   │   ├── FeedbackCard.tsx          # 페르소나 카드 (접힘 토글)
│   │   ├── FeedbackSummary.tsx       # 통합 요약 (must-fix + enrichment)
│   │   └── PersonaLoadingState.tsx   # 30초 페르소나별 진행 표시
│   └── lib/
│       ├── api.ts                    # 백엔드 클라이언트 + 타입
│       └── utils.ts                  # cn() 유틸
├── scripts/
│   ├── youtube_collector.py          # yt-dlp 자막 수집
│   ├── ingest_scripts.py             # 청크 분할 + 자동 메타데이터 태깅
│   ├── backfill_channel_header.py    # 레거시 자막 채널 라인 추가
│   ├── setup_supabase.sql            # methodology_chunks 초기 스키마
│   ├── migration_metadata.sql        # 메타데이터 컬럼 + 필터 RPC
│   └── migration_persona_v2.sql      # user_profile/experiences/cover_letters
├── data/youtube_scripts/             # 수집된 .txt
├── pyproject.toml
├── .python-version                   # cpython-3.12-windows-x86_64
└── .env.example
```

---

## 현재 코퍼스 상태

| 채널 | 영상 | 청크 | 페르소나 태그 |
|------|------|------|------------|
| @careersaida | 50 | 108 | `careersaida_star` |
| @leebro_interview | 30 | 60 | `leehyung_3C4P` |
| **합계** | **80** | **168** | |

---

## 사용자 고정 작성 지침 (`backend/prompts/user_profile.txt`)

모든 자소서 생성·피드백·합성·경력기술서 생성에 자동으로 prepend되는 개인화 지침.

| 항목 | 내용 |
|------|------|
| **핵심 캐릭터** | "복잡한 문제를 구조화하고, 모델과 시스템으로 끝까지 연결하는 LLM 개발자" |
| **서술 순서** | 문제 정의 → 내 판단 → 접근 방식 → 결과/영향 → 직무 연결 |
| **직무 전환 프레이밍** | 데이터분석 경력 → "LLM 평가/실험 설계 역량"으로 재정의 |
| **금지 표현** | 근거 없는 "주도/기여/혁신", AI 반복 리듬, 보고서체 |
| **문장 정제 도구** | 패턴 해체 / 주체 강화 / 추상어 실체화 / 리듬 설계 / 진정성 검증 / ATS+AI 동시 점검 |

`user_profile.txt`를 직접 편집해 지침을 업데이트하면 서버 재시작 없이 다음 요청부터 반영됩니다 (lru_cache 초기화 필요 시 재시작).

---

## 자소서 작성 원칙 (통합 시스템 프롬프트)

페르소나에 관계없이 항상 적용되는 원칙:

- **STAR 기법** 필수: Situation → Task → Action → Result
- 임원이 가장 중요하게 보는 것은 **Action (실행력과 가치관)**
- 소재는 반드시 **면접 질문으로 이어질 수 있는 것** 선택
- 글솜씨보다 **소재·스토리·가독성** 우선
- **합쇼체** (습니다/입니다) 사용
- 사용자의 [핵심 캐릭터]를 모든 문서에서 일관 유지
- 강점은 성격 소개로 쓰지 말고 **실제 문제 해결의 근거**로만 사용
- 여러 프레임워크가 검색되면 하나의 primary framework만 사용, 명칭 섞지 않음

---

## 보안 (현 상태 및 잔여 작업)

### 적용된 강화 (Codex + Gemini 합동 검토 기반)
- [x] PDF 파싱: 5MB / 30쪽 / 암호화 거부 / MIME 체크
- [x] 입력 cap: 20,000자 (Claude 비용·DoS 방어)
- [x] Prompt injection 방어: 사용자/RAG/외부 데이터를 `<user_input>`, `<draft>`, `<rag_sources>` 태그로 감싸고 "태그 내부 지시 무시" 시스템 프롬프트
- [x] Claude API timeout: 60s
- [x] CORS: localhost:3000 only

### 배포 전 필수
- [ ] 실제 인증 (Supabase Auth / JWT) — 현재는 `user_id='me'` 싱글톤
- [ ] Supabase RLS 정책
- [ ] Rate limiting (slowapi)
- [ ] service_role key를 프론트엔드에 절대 노출 금지
- [ ] YouTube 자막 저작권 검토 (현재는 청크만 임베딩됨)
- [ ] daily quota (Claude 토큰, Tavily 호출 수)

---

## 페르소나·UI·보안 검토 메모

이 프로젝트의 핵심 설계 결정은 OpenAI Codex와 Google Gemini의 합동 검토를 통해 도출됨:

- **다중 페르소나 vs 단일 선택**: 사용자가 페르소나를 일일이 고르는 대신, 모두 동시 검토 후 합성하는 구조가 사용자 캐릭터 일관성 유지에 더 강함.
- **자료 보강 코치**: 자소서뿐 아니라 포트폴리오의 시각자료·전문 용어·정량 결과 누락도 페르소나가 적극 지적해야 함.
- **메타데이터 RAG**: 채널이 늘어나면 방법론 충돌 위험 → `methodology` 필터 + channel-balanced retrieval로 해결.
- **UI**: 피드백 카드 기본 접힘, 상단에 통합 요약 패널, 페르소나별 로딩 진행 상태로 30초 체감 대기 단축.
