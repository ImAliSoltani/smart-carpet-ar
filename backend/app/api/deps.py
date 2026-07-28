from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.services.embeddings import EmbeddingBackend, get_embedding_backend
from app.services.storage import Storage

DbSession = Annotated[AsyncSession, Depends(get_session)]


def get_storage() -> Storage:
    return Storage()


StorageDep = Annotated[Storage, Depends(get_storage)]
EmbeddingDep = Annotated[EmbeddingBackend, Depends(get_embedding_backend)]
