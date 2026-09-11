from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str

    # Qdrant
    QDRANT_URL: str
    QDRANT_COLLECTION: str

    # LLM Provider Configuration
    LLM_PROVIDER: str = "gemini"  # Options: gemini, openai

    # Gemini Configuration
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-flash"

    # OpenAI Configuration (for backward compatibility)
    LLM_API_KEY: str = ""
    LLM_BASE_URL: str = "https://api.openai.com/v1"
    LLM_MODEL: str = "gpt-4o-mini"

    # Embeddings (still using OpenAI-compatible endpoint)
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    EMBEDDING_DIMENSIONS: int = 1536

    # Auth
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_MINUTES: int = 1440

    # App
    CORS_ORIGINS: str
    UPLOAD_DIR: str = "data/uploads"
    MAX_FILE_SIZE_MB: int = 50

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()

def get_settings() -> Settings:
    return settings
