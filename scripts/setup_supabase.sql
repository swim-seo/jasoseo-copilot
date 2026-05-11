-- Supabase SQL Editor에서 실행하세요

-- pgvector 확장 활성화
CREATE EXTENSION IF NOT EXISTS vector;

-- 취업사이다 방법론 청크 테이블
CREATE TABLE IF NOT EXISTS methodology_chunks (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    source TEXT NOT NULL,
    embedding vector(384),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 유사도 검색 함수
CREATE OR REPLACE FUNCTION match_methodology_chunks(
    query_embedding vector(384),
    match_count INT DEFAULT 6,
    match_threshold FLOAT DEFAULT 0.25
)
RETURNS TABLE (
    id TEXT,
    content TEXT,
    source TEXT,
    similarity FLOAT
)
LANGUAGE sql
AS $$
    SELECT
        id,
        content,
        source,
        1 - (embedding <=> query_embedding) AS similarity
    FROM methodology_chunks
    WHERE 1 - (embedding <=> query_embedding) > match_threshold
    ORDER BY embedding <=> query_embedding
    LIMIT match_count;
$$;

-- 검색 성능 인덱스
CREATE INDEX IF NOT EXISTS methodology_chunks_embedding_idx
ON methodology_chunks USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 50);
