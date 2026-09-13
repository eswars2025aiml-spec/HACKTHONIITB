import os
from sqlalchemy import create_engine, text

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg://life_rpg:life_rpg_dev_password@database:5432/life_rpg",
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)


def check_database() -> bool:
    with engine.connect() as connection:
        return connection.execute(text("SELECT 1")).scalar_one() == 1
