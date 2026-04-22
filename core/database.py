from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings
import os

CHROMA_PATH = "chroma_db"

def get_vectorstore():
    # Mengembalikan instance vectorstore
    return Chroma(
        persist_directory=CHROMA_PATH,
        embedding_function=OpenAIEmbeddings()
    )
