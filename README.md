# 자소서 코파일럿 (Jasoseo Copilot)

취업사이다 유튜브 컨설팅 방법론을 학습한 AI 자소서 작성 도우미.  
기업 최신 동향을 자동 검색하고, 내 경험을 STAR 구조로 자연스러운 자소서로 변환합니다.

---

## 핵심 기능

| 기능 | 설명 |
|------|------|
| **기업 자동 분석** | Tavily 웹 검색으로 최신 사업 전략 · 직무 역할 · 인재상 자동 수집 |
| **방법론 RAG** | @careersaida 유튜브 상담 영상 스크립트를 pgvector로 임베딩 → 항목별 유사 컨설팅 사례 검색 |
| **자소서 생성** | Claude API (claude-sonnet-4-6) → 기업분석 + 소재선택 이유 + STAR 본문 3단 출력 |
| **스크립트 수집기** | yt-dlp로 채널 전체 또는 개별 영상 한국어 자막 자동 수집 |

---

## 아키텍처

```
[사용자]
  │  회사명 · 직무 · 항목 · 경험 입력
  ▼
[FastAPI Backend]
  ├── POST /api/research/company
  │     └── web_searcher.py (Tavily API)
  │           ├── 최신 사업 전략 검색
  │           ├── 직무 역할 검색
  │           └── 인재상·채용 공고 검색
  │
  └── POST /api/generate/cover-letter
        ├── web_searcher.py  → 기업 분석 자동화
        ├── methodology_rag.py → Supabase pgvector 유사 컨설팅 검색
        └── cover_letter_generator.py (Claude API)
              └── [기업·직무 분석] + [소재 선택 이유] + [자소서 본문] 출력

[지식 파이프라인 (별도 실행)]
  youtube_collector.py (yt-dlp)
    └── @careersaida 자막 수집 → data/youtube_scripts/*.txt
          └── ingest_scripts.py
                └── 청크 분할 → HuggingFace Embeddings → Supabase (methodology_chunks)
```

---

## 기술 스택

### Backend (Python / FastAPI)
| 구성요소 | 기술 |
|----------|------|
| API 서버 | FastAPI + Uvicorn |
| 자소서 생성 | Anthropic Claude API (`claude-sonnet-4-6`) |
| 기업 리서치 | Tavily Search API (웹 검색) |
| 벡터 임베딩 | HuggingFace Inference API (`paraphrase-multilingual-MiniLM-L12-v2`, 384-dim) |
| 벡터 DB | Supabase pgvector |
| 유튜브 수집 | yt-dlp (VTT 자막 파싱) |
| 설정 관리 | pydantic-settings |
| 패키지 관리 | uv |

### 생성 출력 구조 (Claude)
```
[기업·직무 분석]  ← 이 회사가 지금 무엇을 원하는지
[소재 선택 이유]  ← 내 경험 중 왜 이 소재를 골랐는지
[자소서 본문]     ← STAR 구조, 합쇼체, 목표 글자 수 준수
```

---

## 설치 및 실행

### 1. 의존성 설치

```bash
uv sync
```

### 2. 환경 변수 설정

```bash
cp .env.example .env
# .env 파일에 키 입력
```

```env
ANTHROPIC_API_KEY=sk-ant-...
TAVILY_API_KEY=tvly-...
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_KEY=your-supabase-anon-key
HUGGINGFACE_API_KEY=hf_...
CLAUDE_MODEL=claude-sonnet-4-6
```

### 3. Supabase 테이블 초기화

Supabase SQL Editor에서 `scripts/setup_supabase.sql` 실행 (최초 1회).

### 4. 서버 실행

```bash
uv run uvicorn backend.main:app --reload --port 8000
# API 문서: http://localhost:8000/docs
```

---

## 지식 파이프라인: 유튜브 스크립트 수집

### 채널 전체 수집 + 자동 임베딩 (한 번에)

```bash
uv run python scripts/youtube_collector.py \
  --channel https://www.youtube.com/@careersaida --ingest
```

### 채널에서 최근 N개만

```bash
uv run python scripts/youtube_collector.py \
  --channel https://www.youtube.com/@careersaida --max 10 --ingest
```

### 특정 영상만

```bash
uv run python scripts/youtube_collector.py \
  --url https://www.youtube.com/watch?v=XXXX --ingest
```

### 여러 영상 URL 지정

```bash
uv run python scripts/youtube_collector.py \
  --url URL1 --url URL2 --ingest
```

### 수집만 (임베딩 없이)

```bash
uv run python scripts/youtube_collector.py \
  --channel https://www.youtube.com/@careersaida --max 20
# 수집된 파일: data/youtube_scripts/
```

### 나중에 임베딩만 별도 실행

```bash
uv run python scripts/ingest_scripts.py
```

---

## API 엔드포인트

### `POST /api/research/company` — 기업 리서치

```json
{
  "company": "삼성전자",
  "job_role": "소프트웨어 엔지니어"
}
```

응답: 최신 사업 전략 · 직무 역할 · 인재상 (Tavily 검색 결과)

---

### `POST /api/generate/cover-letter` — 자소서 생성

```json
{
  "company": "삼성전자",
  "job_role": "소프트웨어 엔지니어",
  "question": "직무 역량",
  "experiences": [
    {
      "title": "사내 데이터 파이프라인 개선 프로젝트",
      "description": "처리 속도 3배 향상, 팀 주도, Python 사용"
    }
  ],
  "char_limit": 700,
  "job_posting": "(선택) 채용 공고 전문 붙여넣기",
  "extra_context": "(선택) 뉴스·IR 등 추가 자료"
}
```

### `GET /api/generate/questions` — 자주 쓰는 자소서 항목 목록

---

## 프로젝트 구조

```
jasoseo-copilot/
├── backend/
│   ├── main.py                       # FastAPI 앱, CORS 설정
│   ├── config.py                     # pydantic-settings 환경변수
│   ├── routers/
│   │   ├── generate.py               # POST /api/generate/cover-letter
│   │   └── research.py               # POST /api/research/company
│   └── modules/
│       ├── cover_letter_generator.py # Claude 호출, 프롬프트 조합
│       ├── web_searcher.py           # Tavily 기업 분석
│       ├── methodology_rag.py        # Supabase pgvector 검색
│       └── embedding.py              # HuggingFace Inference API
├── scripts/
│   ├── youtube_collector.py          # yt-dlp 자막 수집기
│   ├── ingest_scripts.py             # 청크 분할 + 임베딩 저장
│   └── setup_supabase.sql            # methodology_chunks 테이블 + RPC
├── data/
│   └── youtube_scripts/              # 수집된 .txt 스크립트 저장 위치
├── prompts/
│   └── cover_letter_examples.txt     # 참고 예시 (선택)
├── pyproject.toml
└── .env.example
```

---

## 자소서 작성 원칙 (취업사이다 방법론)

- **STAR 기법** 필수: Situation → Task → Action → Result
- 임원이 가장 중요하게 보는 것은 **Action (실행력과 가치관)**
- 소재는 반드시 **면접 질문으로 이어질 수 있는 것** 선택
- 글솜씨보다 **소재·스토리·가독성** 우선
- **합쇼체** (습니다/입니다) 사용, AI 탐지 표현 자동 회피
