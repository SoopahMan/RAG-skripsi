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

def get_rag_chain():
    vectorstore = get_vectorstore()
    retriever = vectorstore.as_retriever(search_kwargs={"k": 3})
    
    # 2. Inisialisasi Parser
    parser = JsonOutputParser(pydantic_object=RAGResponse)

    template = """
    Kamu adalah guru IPA SD yang ceria. Jawablah HANYA berdasarkan KONTEKS yang diberikan.
    
    
    TUGAS UTAMA:
    Berikan jawaban yang akurat berdasarkan KONTEKS. Pastikan jawaban selaras dengan istilah yang ditanyakan.

    PROSES BERPIKIR AI:
    1. Identifikasi kata kunci utama dalam pertanyaan (contoh: "Geografis", "Astronomis", "Olahraga", "Pernapasan").
    2. Cari definisi atau penjelasan kata kunci tersebut di dalam KONTEKS.
    3. Bandingkan: Apakah teks di KONTEKS benar-benar menjelaskan istilah tersebut? 
    4. Cari penjelasan istilah tersebut di KONTEKS. Jika judul bab menyesatkan (misal: judul 'Geografis' tapi isinya 'Astronomis'), kamu harus cerdas membedakannya.
    5. Jika tidak ada penjelasan yang benar-benar cocok di KONTEKS, sampaikan bahwa materi tersebut belum lengkap di buku.
    
    KONTEKS:
    {context}

    {format_instructions}
    
    Pertanyaan: {question}
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

