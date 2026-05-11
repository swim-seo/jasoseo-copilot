-- methodology_chunks 메타데이터 컬럼 추가 + 필터링 검색 함수
-- Supabase SQL Editor에서 실행

-- 1) 메타데이터 컬럼 추가
ALTER TABLE methodology_chunks ADD COLUMN IF NOT EXISTS source_channel TEXT;
ALTER TABLE methodology_chunks ADD COLUMN IF NOT EXISTS methodology TEXT;
ALTER TABLE methodology_chunks ADD COLUMN IF NOT EXISTS content_type TEXT;
ALTER TABLE methodology_chunks ADD COLUMN IF NOT EXISTS question_type TEXT;

-- 2) 기존 청크 backfill (careersaida 채널, 상담 컨텐츠로 가정)
UPDATE methodology_chunks
SET source_channel = 'careersaida',
    methodology    = 'careersaida_star',
    content_type   = 'consultation'
WHERE source_channel IS NULL;

-- 3) 인덱스
CREATE INDEX IF NOT EXISTS methodology_chunks_methodology_idx ON methodology_chunks(methodology);
CREATE INDEX IF NOT EXISTS methodology_chunks_question_type_idx ON methodology_chunks(question_type);

-- 4) 필터링 가능한 검색 함수 (기존 match_methodology_chunks는 유지)
CREATE OR REPLACE FUNCTION match_methodology_chunks_filtered(
    query_embedding vector(384),
    match_count INT DEFAULT 6,
    match_threshold FLOAT DEFAULT 0.25,
    filter_methodology TEXT DEFAULT NULL,
    filter_question_type TEXT DEFAULT NULL,
    filter_content_type TEXT DEFAULT NULL
)
RETURNS TABLE (
    id TEXT,
    content TEXT,
    source TEXT,
    source_channel TEXT,
    methodology TEXT,
    content_type TEXT,
    question_type TEXT,
    similarity FLOAT
)
LANGUAGE sql
AS $$
    SELECT
        id,
        content,
        source,
        source_channel,
        methodology,
        content_type,
        question_type,
        1 - (embedding <=> query_embedding) AS similarity
    FROM methodology_chunks
    WHERE 1 - (embedding <=> query_embedding) > match_threshold
      AND (filter_methodology   IS NULL OR methodology   = filter_methodology)
      AND (filter_question_type IS NULL OR question_type = filter_question_type)
      AND (filter_content_type  IS NULL OR content_type  = filter_content_type)
    ORDER BY embedding <=> query_embedding
    LIMIT match_count;
$$;
