from datetime import datetime
from pydantic import BaseModel


class KnowledgeDocumentResponse(BaseModel):

    id: int

    document_id: str

    filename: str

    original_filename: str

    total_pages: int

    total_chunks: int

    status: str

    created_at: datetime

    class Config:

        from_attributes = True