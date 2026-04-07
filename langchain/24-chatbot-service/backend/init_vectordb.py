import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

from langchain_community.document_loaders import PyPDFLoader
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

# --- PDF 로드 ---
data_dir = Path(__file__).parent / "data"
docs = []
for pdf_path in sorted(data_dir.glob("*.pdf")):
    loader = PyPDFLoader(str(pdf_path))
    docs.extend(loader.load())

print(f"로드된 문서: {len(docs)}개 페이지")

# --- 청킹 ---
splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
chunks = splitter.split_documents(docs)

print(f"청킹 결과: {len(chunks)}개 청크")

# --- 벡터 DB에 적재 ---
VECTOR_DB_URL = os.getenv("VECTOR_DB_URL")

if VECTOR_DB_URL:
    from langchain_postgres import PGVector

    vectorstore = PGVector(
        connection=VECTOR_DB_URL,
        embeddings=embeddings,
        collection_name="ai_chatbot",
    )
    vectorstore.add_documents(chunks)
else:
    from langchain_chroma import Chroma

    vectorstore = Chroma.from_documents(
        chunks, embeddings, collection_name="ai_chatbot", persist_directory="./chroma_db"
    )

print(f"벡터 DB 초기화 완료: {len(chunks)}개 청크 적재")
