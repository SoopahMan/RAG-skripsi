from sqlalchemy import Column
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy import DateTime
from sqlalchemy import ForeignKey
from sqlalchemy.sql import func

from config.database import Base


class KnowledgeDocument(Base):

    __tablename__ = "knowledge_documents"

    id = Column(Integer, primary_key=True, index=True)

    document_id = Column(
        String,
        unique=True,
        nullable=False,
        index=True
    )

    filename = Column(String, nullable=False)

    original_filename = Column(String, nullable=False)

    total_pages = Column(Integer, default=0)

    total_chunks = Column(Integer, default=0)

    uploaded_by = Column(
        Integer,
        ForeignKey("users.id")
    )

    status = Column(
        String,
        default="PROCESSING"
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )