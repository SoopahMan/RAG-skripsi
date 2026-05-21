from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from .vector_database import get_vectorstore

def ingest_pdf_to_chroma(file_path: str):
    # 1. Load PDF
    loader = PyPDFLoader(file_path)
    documents = loader.load()
    
    # 2. Chunking (Dioptimalkan untuk anak SD)
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=600, 
        chunk_overlap=100
    )
    chunks = text_splitter.split_documents(documents)
    
    # 3. Simpan ke Chroma
    vectorstore = get_vectorstore()
    vectorstore.add_documents(chunks)
    
    return f"Berhasil memproses {len(chunks)} bagian dari {file_path}"
