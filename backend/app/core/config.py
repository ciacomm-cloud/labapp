import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    db_user: str
    db_password: str
    db_host: str = "127.0.0.1"
    db_port: int = 3306
    db_name: str

    secret_key: str
    access_token_expire_minutes: int = 60 * 24

    @property
    def database_url(self) -> str:
        return (
            f"mysql+pymysql://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )

    class Config:
        env_file = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
        env_prefix = "LABAPP_"


settings = Settings()
