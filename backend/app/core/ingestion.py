import uuid

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

from config.database import SessionLocal
from model.document import KnowledgeDocument

from .vector_database import get_vectorstore

from core.upload_progress import (
    update_task,
    finish_task,
    error_task
)


def ingest_pdf_to_chroma(
    file_path: str,
    task_id: str
):

    db = SessionLocal()

    try:

        document_uuid = str(uuid.uuid4())

        filename = file_path.split("/")[-1]

        document = KnowledgeDocument(

            document_id=document_uuid,

            filename=filename,

            original_filename=filename,

            uploaded_by=None,

            status="PROCESSING"

        )

        db.add(document)
        db.commit()
        db.refresh(document)

        update_task(
            task_id,
            10,
            "Membaca file PDF..."
        )

        loader = PyPDFLoader(file_path)

        documents = loader.load()

        document.total_pages = len(documents)

        db.commit()

        for doc in documents:

            doc.metadata["document_id"] = document_uuid

            doc.metadata["filename"] = filename

            doc.metadata["page"] = doc.metadata.get(
                "page",
                0
            )

        update_task(
            task_id,
            30,
            "Melakukan chunking..."
        )

        splitter = RecursiveCharacterTextSplitter(

            chunk_size=1000,

            chunk_overlap=200

        )

        chunks = splitter.split_documents(
            documents
        )

        document.total_chunks = len(chunks)

        db.commit()

        # ======================================================
        # PREVIEW HASIL CHUNKING
        # ======================================================

        OVERLAP = 200
        PREVIEW = 50

        print("\n")
        print("=" * 120)
        print("CONTOH HASIL CHUNKING")
        print("=" * 120)

        print(f"Chunk Size    : 1000 karakter")
        print(f"Chunk Overlap : {OVERLAP} karakter")
        print(f"Total Chunk   : {len(chunks)}")

        print("=" * 120)

        for i, chunk in enumerate(chunks[:5]):

            print(f"\nCHUNK {i+1}")
            print("-" * 120)

            print(f"File     : {chunk.metadata.get('filename')}")
            print(f"Halaman  : {chunk.metadata.get('page', 0) + 1}")
            print(f"Panjang  : {len(chunk.page_content)} karakter")

            print("\nAwal Chunk")
            print(f"\"{chunk.page_content[:PREVIEW]}...\"")

            print("\nAkhir Chunk")
            print(f"\"...{chunk.page_content[-PREVIEW:]}\"")

            if i > 0:

                previous_overlap = chunks[i - 1].page_content[-OVERLAP:]
                current_overlap = chunk.page_content[:OVERLAP]

                print("\n")
                print("HASIL OVERLAP")
                print("-" * 40)

                print("50 karakter terakhir overlap sebelumnya")
                print(f"\"...{previous_overlap[-PREVIEW:]}\"")

                print()

                print("50 karakter pertama overlap sekarang")
                print(f"\"{current_overlap[:PREVIEW]}...\"")

                print()

                if previous_overlap == current_overlap:
                    print("✓ Overlap berhasil (200 karakter identik)")
                else:
                    print("✗ Overlap tidak identik")

            print("-" * 120)

        print("\n" + "=" * 120)
        print("SELESAI MENAMPILKAN CONTOH CHUNKING")
        print("=" * 120)

        update_task(
            task_id,
            55,
            f"Membuat {len(chunks)} chunk..."
        )

        vectorstore = get_vectorstore()

        total = len(chunks)

        batch_size = 20

        for i in range(
            0,
            total,
            batch_size
        ):

            batch_chunks = chunks[
                i:i + batch_size
            ]

            batch_ids = [

                f"{document_uuid}_{j}"

                for j in range(
                    i,
                    min(
                        i + batch_size,
                        total
                    )
                )

            ]

            vectorstore.add_documents(

                documents=batch_chunks,

                ids=batch_ids

            )

            percent = 55 + int(

                (
                    min(
                        i + batch_size,
                        total
                    )
                    / total
                ) * 40

            )

            if percent > 95:
                percent = 95

            update_task(

                task_id,

                percent,

                f"Menyimpan embedding ({min(i+batch_size,total)}/{total})"

            )

        document.status = "READY"

        db.commit()

        finish_task(task_id)

        return document_uuid

    except Exception as e:

        db.rollback()

        try:

            document.status = "FAILED"

            db.commit()

        except:

            pass

        error_task(
            task_id,
            str(e)
        )

        raise

    finally:

        db.close()