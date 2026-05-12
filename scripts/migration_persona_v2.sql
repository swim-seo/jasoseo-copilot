-- Phase 1: 사용자 프로필 + 경험 + 자소서 히스토리
-- Supabase SQL Editor에서 실행

-- 1) user_profile: 고정된 사용자 프로필 (한 명만 가정 → singleton row)
CREATE TABLE IF NOT EXISTS user_profile (
    id TEXT PRIMARY KEY DEFAULT 'me',
    name TEXT,
    target_role TEXT,
    character_summary TEXT,
    career_summary TEXT,
    education TEXT,
    strengths TEXT,
    company_preferences TEXT,
    writing_rules TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2) experiences: STAR 형태로 정리된 경험들
CREATE TABLE IF NOT EXISTS experiences (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT DEFAULT 'me' REFERENCES user_profile(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    org TEXT,
    period TEXT,
    situation TEXT,
    task TEXT,
    action TEXT,
    result TEXT,
    tech_stack TEXT,
    tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS experiences_user_idx ON experiences(user_id);

-- 3) cover_letters: 자소서 결과물 + 버전 히스토리
CREATE TABLE IF NOT EXISTS cover_letters (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT DEFAULT 'me',
    parent_id BIGINT REFERENCES cover_letters(id) ON DELETE SET NULL,
    company TEXT NOT NULL,
    job_role TEXT,
    question TEXT NOT NULL,
    methodology_preference TEXT DEFAULT 'auto',
    char_limit INT DEFAULT 700,
    company_analysis JSONB,
    job_posting TEXT,
    used_experience_ids BIGINT[],
    extra_context TEXT,
    result TEXT NOT NULL,
    feedback_request TEXT,
    version INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cover_letters_user_idx ON cover_letters(user_id);
CREATE INDEX IF NOT EXISTS cover_letters_parent_idx ON cover_letters(parent_id);
CREATE INDEX IF NOT EXISTS cover_letters_company_idx ON cover_letters(company);

-- 4) updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_profile_updated ON user_profile;
CREATE TRIGGER user_profile_updated BEFORE UPDATE ON user_profile
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS experiences_updated ON experiences;
CREATE TRIGGER experiences_updated BEFORE UPDATE ON experiences
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
