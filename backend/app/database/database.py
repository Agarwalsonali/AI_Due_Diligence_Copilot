from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,
    echo=False
)

async_session_maker = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

class Base(DeclarativeBase):
    pass

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        yield session

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Lightweight column migration: create_all does not add new columns to
        # tables that already exist. reports.file_data stores the generated PDF
        # bytes in the database (added 2026-10).
        if engine.dialect.name == "postgresql":
            from sqlalchemy import text
            await conn.execute(text(
                "ALTER TABLE reports ADD COLUMN IF NOT EXISTS file_data BYTEA"
            ))
