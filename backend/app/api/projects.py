from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, BackgroundTasks
from typing import List
from app.core.security import get_current_user
from app.models.models import User, Project, Subscription, SubscriptionTier
from app.schemas.schemas import (
    ProjectCreate, ProjectResponse, ProjectListResponse, 
    FileTreeItem, SingleFileUpload
)
from app.services.file_service import (
    extract_and_upload_zip, delete_project_files, 
    get_project_file_tree, is_code_file, get_file_content_from_r2
)
from app.services.embedding_service import embed_project_files, delete_project_embeddings
from app.core.config import settings
from datetime import datetime

router = APIRouter(prefix="/projects", tags=["Projects"])


def get_tier_limits(tier: SubscriptionTier) -> int:
    """Get project limit for a tier."""
    limits = {
        SubscriptionTier.FREE: settings.FREE_TIER_PROJECTS,
        SubscriptionTier.BASIC: settings.BASIC_TIER_PROJECTS,
        SubscriptionTier.PRO: settings.PRO_TIER_PROJECTS,
        SubscriptionTier.PRO_PLUS: settings.PRO_PLUS_TIER_PROJECTS,
    }
    return limits.get(tier, 0)


@router.get("", response_model=ProjectListResponse)
async def list_projects(current_user: User = Depends(get_current_user)):
    """List all projects for the current user."""
    projects = await Project.find(
        Project.user_id == current_user.id
    ).sort(-Project.created_at).to_list()
    
    return ProjectListResponse(
        projects=[ProjectResponse.model_validate(p.model_dump()) for p in projects],
        total=len(projects)
    )


@router.post("/upload-zip", response_model=ProjectResponse)
async def upload_project_zip(
    name: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    description: str = None,
    current_user: User = Depends(get_current_user)
):
    """Upload a zip file to create a new project."""
    # Get user subscription
    subscription = await Subscription.find_one(Subscription.user_id == current_user.id)
    if not subscription:
        subscription = Subscription(
            user_id=current_user.id,
            tier=SubscriptionTier.FREE
        )
        await subscription.insert()
    
    # Check project limits
    project_limit = get_tier_limits(subscription.tier)
    
    # Free tier can only upload single files, not projects
    if subscription.tier == SubscriptionTier.FREE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Free tier can only upload single files. Upgrade to upload full projects."
        )
    
    # Count existing projects
    existing_projects = await Project.find(
        Project.user_id == current_user.id,
        Project.is_single_file == False
    ).count()
    
    if existing_projects >= project_limit:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Project limit reached ({project_limit}). Upgrade your plan for more projects."
        )
    
    # Validate file
    if not file.filename.endswith('.zip'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only .zip files are allowed"
        )
    
    # Read zip content
    content = await file.read()
    
    if len(content) > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size is {settings.MAX_FILE_SIZE // (1024*1024)}MB"
        )
    
    # Create project
    project = Project(
        user_id=current_user.id,
        name=name,
        description=description,
        embedding_status="processing"
    )
    await project.insert()
    
    # Extract and upload files to R2
    try:
        total_files, total_size, code_files = await extract_and_upload_zip(
            content, project.id, current_user.id
        )
        
        project.total_files = total_files
        project.total_size = total_size
        project.storage_key = f"projects/{current_user.id}/{project.id}/"
        await project.save()
        
        # Embed code files and charge tokens
        async def embed_and_charge():
            embedding_tokens = await embed_project_files(project.id, code_files)
            
            # Charge user for embedding (with buffer)
            tokens_to_charge = int(embedding_tokens * 1.5)
            
            # Update user's token usage
            user = await User.find_one(User.id == current_user.id)
            if user:
                user.tokens_used_this_month += tokens_to_charge
                await user.save()
        
        # Run embedding in background
        background_tasks.add_task(embed_and_charge)
        
    except Exception as e:
        # Clean up on error
        await project.delete()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process zip file: {str(e)}"
        )
    
    return ProjectResponse.model_validate(project.model_dump())


@router.post("/file", response_model=ProjectResponse)
async def upload_single_file(
    data: SingleFileUpload,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user)
):
    """Upload a single file (available for all tiers including free)."""
    # Validate content
    file_content = data.content
    
    if len(file_content.encode('utf-8')) > 500 * 1024:  # 500KB limit for single files
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Single file too large. Maximum size is 500KB"
        )
    
    # Create project as single file
    project = Project(
        user_id=current_user.id,
        name=data.name,
        is_single_file=True,
        file_content=file_content,
        file_name=data.file_name,
        total_files=1,
        total_size=len(file_content.encode('utf-8')),
        embedding_status="processing"
    )
    await project.insert()
    
    # Embed the file and charge tokens
    async def embed_and_charge():
        embedding_tokens = await embed_project_files(
            project.id,
            [{'path': data.file_name, 'content': file_content, 'size': len(file_content.encode('utf-8'))}]
        )
        
        # Charge user for embedding (with buffer)
        tokens_to_charge = int(embedding_tokens * 1.5)
        
        # Update user's token usage
        user = await User.find_one(User.id == current_user.id)
        if user:
            user.tokens_used_this_month += tokens_to_charge
            await user.save()
    
    # Run embedding in background
    background_tasks.add_task(embed_and_charge)
    
    return ProjectResponse.model_validate(project.model_dump())


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get a specific project."""
    project = await Project.find_one(
        Project.id == project_id,
        Project.user_id == current_user.id
    )
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    return ProjectResponse.model_validate(project.model_dump())


@router.get("/{project_id}/files")
async def get_project_files(
    project_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get file tree for a project."""
    project = await Project.find_one(
        Project.id == project_id,
        Project.user_id == current_user.id
    )
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Single file projects return simple structure
    if project.is_single_file:
        return {
            "files": [{
                "name": project.file_name,
                "path": project.file_name,
                "is_dir": False
            }]
        }
    
    # Get file tree from R2
    tree = await get_project_file_tree(project.id, current_user.id)
    return {"files": tree}


@router.get("/{project_id}/file-content")
async def get_file_content(
    project_id: str,
    file_path: str,
    current_user: User = Depends(get_current_user)
):
    """Get content of a specific file."""
    project = await Project.find_one(
        Project.id == project_id,
        Project.user_id == current_user.id
    )
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Single file project
    if project.is_single_file:
        if file_path == project.file_name:
            return {"content": project.file_content}
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    # Get from R2
    content = await get_file_content_from_r2(project.id, current_user.id, file_path)
    
    if content is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    return {"content": content}


@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a project."""
    project = await Project.find_one(
        Project.id == project_id,
        Project.user_id == current_user.id
    )
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Delete files from R2 (if not single file)
    if not project.is_single_file:
        await delete_project_files(project.id, current_user.id)
    
    # Delete embeddings from ChromaDB
    await delete_project_embeddings(project.id)
    
    # Delete project document
    await project.delete()
    
    return {"message": "Project deleted successfully"}
