from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import JsonOutputParser
from pydantic import BaseModel, Field
from .vector_database import get_vectorstore
from dotenv import load_dotenv
import os

load_dotenv()
api_key=os.getenv("OPENAI_API_KEY")

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import JsonOutputParser
from pydantic import BaseModel, Field
from .vector_database import get_vectorstore
from dotenv import load_dotenv
import os

load_dotenv()
api_key=os.getenv("OPENAI_API_KEY")

class RAGResponse(BaseModel):
    answer: str = Field(description="Jawaban ramah untuk anak SD")
    confidence_score: float = Field(description="Skor keyakinan 0.0 - 1.0 berdasarkan ketersediaan data di konteks")
    source_found: bool = Field(description="Apakah jawaban ditemukan di buku?")

def build_history(history):
    return "\n".join([
        f"{msg.role}: {msg.content}"
        for msg in history
    ])

def get_rag_chain():
    vectorstore = get_vectorstore()
    retriever = vectorstore.as_retriever(search_kwargs={"k": 3})
    
    # 2. Inisialisasi Parser
    parser = JsonOutputParser(pydantic_object=RAGResponse)

    template = """
    Kamu adalah tutor AI SD yang menggunakan metode Socratic.

    TUJUAN:
    Membantu siswa menemukan jawaban sendiri melalui pertanyaan bertahap.

    ATURAN WAJIB:
    - Jangan pernah memberikan jawaban final secara langsung.
    - Gunakan bahasa sederhana untuk anak SD.
    - Berikan petunjuk kecil (hint), bukan solusi penuh.
    - Ajukan pertanyaan yang membantu siswa berpikir.
    - Jika siswa benar → apresiasi lalu lanjutkan.
    - Jika siswa salah → arahkan perlahan tanpa menyalahkan.
    - Selalu akhiri dengan pertanyaan lanjutan.

    PROSES BERPIKIR:
    1. Pahami inti pertanyaan siswa.
    2. Cari materi relevan di KONTEKS.
    3. Jangan langsung memberi jawaban.
    4. Pecah masalah menjadi langkah kecil.
    5. Berikan pertanyaan pemandu.
    6. Dorong siswa berpikir sendiri.

    RIWAYAT CHAT:
    {history}

    KONTEKS:
    {context}

    PERTANYAAN SISWA:
    {question}

    {format_instructions}
    """

    prompt = ChatPromptTemplate.from_template(
        template,
        partial_variables={"format_instructions": parser.get_format_instructions()}
    )
    
    # Gunakan temperature 0 agar skor lebih konsisten (tidak berubah-ubah)
    model = ChatOpenAI(model="gpt-4o-mini", temperature=0.4)

    chain = (
        {"context": retriever, "question": RunnablePassthrough()}
        | prompt
        | model
        | parser
    )
    return chain

