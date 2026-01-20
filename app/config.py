"""
Enhanced configuration with additional settings for the refactored services.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ========================
    # Application Settings
    # ========================
    APP_NAME: str = "JobMatcher"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"

    # ========================
    # Database Settings
    # ========================
    MONGODB_URI: str = "mongodb://localhost:27017"
    MONGODB_DB: str = "jobmatcher"

    # ========================
    # Matching Service Settings
    # ========================
    # Embedding model for semantic matching
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"

    # Cache settings
    ENABLE_CACHING: bool = True
    CACHE_SIZE: int = 1000  # Number of embeddings to cache
    CACHE_TTL: int = 3600  # Cache time-to-live in seconds (1 hour)

    # Matching weights
    SEMANTIC_WEIGHT: float = 0.6  # Weight for semantic similarity
    RULE_WEIGHT: float = 0.4  # Weight for rule-based scoring

    # Query limits
    MAX_CANDIDATES_PER_QUERY: int = 1000
    MAX_JOBS_PER_QUERY: int = 1000
    DEFAULT_MATCH_LIMIT: int = 50
    MIN_MATCH_SCORE: float = 40.0  # Default minimum score (0-100)

    # ========================
    # AI Parser Settings
    # ========================
    OLLAMA_MODEL: str = "qwen2.5:1.5b"
    OLLAMA_TIMEOUT: int = 120  # seconds
    OLLAMA_MAX_RETRIES: int = 3

    # ========================
    # API Settings
    # ========================
    # Rate limiting (requests per minute)
    RATE_LIMIT_PARSE: str = "10/minute"  # For expensive AI parsing
    RATE_LIMIT_MATCH: str = "60/minute"  # For matching operations
    RATE_LIMIT_GENERAL: str = "120/minute"  # For other endpoints

    # CORS settings
    CORS_ORIGINS: list = ["*"]  # In production, specify actual origins

    # ========================
    # File Upload Settings
    # ========================
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_RESUME_TYPES: list = [
        "application/pdf",
        "text/plain",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
        case_sensitive=True
    )


# Global settings instance
settings = Settings()