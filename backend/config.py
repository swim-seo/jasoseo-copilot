from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    ANTHROPIC_API_KEY: str
    TAVILY_API_KEY: str
    SUPABASE_URL: str
    SUPABASE_KEY: str
    CLAUDE_MODEL: str = "claude-sonnet-4-6"

    model_config = {"env_file": ".env"}


settings = Settings()
