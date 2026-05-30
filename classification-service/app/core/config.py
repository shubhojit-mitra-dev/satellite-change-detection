from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Classification Service"
    API_V1_STR: str = "/api/v1"
    GOOGLE_CLOUD_PROJECT_ID: str

    model_config = SettingsConfigDict(env_file=".env", env_ignore_empty=True, extra="ignore")

settings = Settings()
