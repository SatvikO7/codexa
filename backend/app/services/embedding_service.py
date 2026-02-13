import chromadb
from chromadb.config import Settings
from typing import List, Tuple
from openai import AsyncOpenAI
from app.core.config import settings
from app.models.models import Project, FileEmbedding
import tiktoken
import asyncio

# Initialize ChromaDB client with persistence
chroma_client = chromadb.Client(Settings(
    persist_directory="./chroma_data",
    anonymized_telemetry=False
))

# Initialize OpenAI client
openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

# Tokenizer for chunking
tokenizer = tiktoken.encoding_for_model("gpt-4")


def chunk_text(text: str, max_tokens: int = 500, overlap: int = 50) -> List[str]:
    """Split text into chunks based on token count."""
    tokens = tokenizer.encode(text)
    chunks = []
    
    i = 0
    while i < len(tokens):
        chunk_tokens = tokens[i:i + max_tokens]
        chunks.append(tokenizer.decode(chunk_tokens))
        i += max_tokens - overlap
    
    return chunks


async def get_embedding(text: str) -> List[float]:
    """Get embedding for a text using OpenAI."""
    response = await openai_client.embeddings.create(
        model=settings.EMBEDDING_MODEL,
        input=text
    )
    return response.data[0].embedding


async def embed_project_files(project_id: str, code_files: List[dict]) -> int:
    """Embed all code files for a project.
    
    Returns:
        Total tokens used for embedding (to charge user)
    """
    total_embedding_tokens = 0
    
    try:
        # Get or create collection for project
        collection = chroma_client.get_or_create_collection(
            name=f"project_{project_id}",
            metadata={"hnsw:space": "cosine"}
        )
        
        all_chunks = []
        all_metadatas = []
        all_ids = []
        
        for file_info in code_files:
            file_path = file_info['path']
            content = file_info['content']
            
            # Skip empty files
            if not content.strip():
                continue
            
            # Chunk the file content
            chunks = chunk_text(content)
            
            for i, chunk in enumerate(chunks):
                chunk_id = f"{project_id}_{file_path}_{i}"
                all_chunks.append(chunk)
                all_metadatas.append({
                    "file_path": file_path,
                    "chunk_index": i,
                    "project_id": project_id
                })
                all_ids.append(chunk_id)
                
                # Save to MongoDB for reference
                file_embedding = FileEmbedding(
                    project_id=project_id,
                    file_path=file_path,
                    chunk_index=i,
                    content=chunk,
                    embedding_id=chunk_id
                )
                await file_embedding.insert()
        
        # Batch embed and add to ChromaDB
        if all_chunks:
            # Get embeddings in batches
            batch_size = 100
            for i in range(0, len(all_chunks), batch_size):
                batch_chunks = all_chunks[i:i + batch_size]
                batch_ids = all_ids[i:i + batch_size]
                batch_metadatas = all_metadatas[i:i + batch_size]
                
                # Get embeddings for batch using OpenAI batch API
                response = await openai_client.embeddings.create(
                    model=settings.EMBEDDING_MODEL,
                    input=batch_chunks
                )
                
                # Track actual token usage from OpenAI
                total_embedding_tokens += response.usage.total_tokens
                
                # Extract embeddings
                embeddings = [item.embedding for item in response.data]
                
                # Add to ChromaDB
                collection.add(
                    documents=batch_chunks,
                    embeddings=embeddings,
                    metadatas=batch_metadatas,
                    ids=batch_ids
                )
                
                await asyncio.sleep(0.1)  # Rate limiting
        
        # Update project status
        project = await Project.find_one(Project.id == project_id)
        if project:
            project.is_embedded = True
            project.embedding_status = "completed"
            await project.save()
        
        return total_embedding_tokens
            
    except Exception as e:
        print(f"Embedding error: {e}")
        # Update project with error status
        project = await Project.find_one(Project.id == project_id)
        if project:
            project.embedding_status = "failed"
            await project.save()
        return total_embedding_tokens


async def search_project_embeddings(
    project_id: str,
    query: str,
    n_results: int = 5
) -> List[dict]:
    """Search for relevant code snippets."""
    try:
        collection = chroma_client.get_collection(name=f"project_{project_id}")
        
        # Get query embedding
        query_embedding = await get_embedding(query)
        
        # Search
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results
        )
        
        if results and results['documents']:
            snippets = []
            for i, doc in enumerate(results['documents'][0]):
                metadata = results['metadatas'][0][i] if results['metadatas'] else {}
                snippets.append({
                    'content': doc,
                    'file_path': metadata.get('file_path', 'unknown'),
                    'chunk_index': metadata.get('chunk_index', 0)
                })
            return snippets
        
        return []
    except Exception as e:
        print(f"Search error: {e}")
        return []


async def delete_project_embeddings(project_id: str):
    """Delete all embeddings for a project."""
    try:
        # Delete ChromaDB collection
        try:
            chroma_client.delete_collection(name=f"project_{project_id}")
        except:
            pass
        
        # Delete MongoDB records
        await FileEmbedding.find(FileEmbedding.project_id == project_id).delete()
        
    except Exception as e:
        print(f"Delete embeddings error: {e}")
