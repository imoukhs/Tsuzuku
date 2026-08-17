from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    redis_url: str = "redis://localhost:6379/0"
    supabase_url: str | None = None
    supabase_key: str | None = None

    chapters_cache_ttl_seconds: int = 60 * 30
    pages_cache_ttl_seconds: int = 60 * 60 * 12
    search_cache_ttl_seconds: int = 60 * 10


@lru_cache
def get_settings() -> Settings:
    return Settings()
