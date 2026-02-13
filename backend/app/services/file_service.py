import zipfile
import io
import tempfile
import os
from pathlib import Path
from typing import List, Tuple, Optional
from app.services.storage_service import (
    upload_file_to_r2, download_file_from_r2, 
    delete_folder_from_r2, list_files_in_r2
)

# Universal gitignore patterns
GITIGNORE_PATTERNS = {
    # Directories to completely skip
    "dirs": {
        "node_modules", ".git", ".svn", ".hg", "__pycache__", ".pytest_cache",
        ".mypy_cache", ".tox", ".nox", ".coverage", "htmlcov", ".hypothesis",
        "venv", ".venv", "env", ".env", "virtualenv", ".virtualenv",
        "dist", "build", "eggs", ".eggs", "*.egg-info", "sdist", "wheels",
        ".idea", ".vscode", ".vs", "*.xcodeproj", "*.xcworkspace",
        "target", "out", "bin", "obj", ".gradle", ".mvn",
        ".next", ".nuxt", ".output", ".cache", ".parcel-cache",
        "coverage", ".nyc_output", "bower_components",
        ".terraform", ".serverless", "cdk.out",
        ".docker", "vendor", "Pods", ".dart_tool",
        ".pub-cache", ".flutter-plugins", ".flutter-plugins-dependencies",
    },
    # File extensions to skip
    "extensions": {
        ".pyc", ".pyo", ".pyd", ".so", ".dll", ".dylib", ".exe", ".obj", ".o",
        ".a", ".lib", ".jar", ".war", ".ear", ".class",
        ".log", ".tmp", ".temp", ".swp", ".swo", ".swn",
        ".DS_Store", ".Thumbs.db", ".desktop.ini",
        ".lock", ".lockb",
        ".map", ".min.js", ".min.css",
        ".wasm", ".br", ".gz", ".zip", ".tar", ".rar", ".7z",
        ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".webp", ".bmp",
        ".mp3", ".mp4", ".wav", ".avi", ".mov", ".mkv", ".flv",
        ".ttf", ".otf", ".woff", ".woff2", ".eot",
        ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
        ".db", ".sqlite", ".sqlite3", ".mdb",
    },
    # Specific files to skip
    "files": {
        ".gitignore", ".gitattributes", ".gitmodules",
        ".npmrc", ".yarnrc", ".nvmrc", ".npmignore",
        ".dockerignore", "Dockerfile", "docker-compose.yml",
        ".editorconfig", ".prettierrc", ".eslintrc",
        "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
        "Pipfile.lock", "poetry.lock", "Cargo.lock",
        "composer.lock", "Gemfile.lock",
        ".env", ".env.local", ".env.production", ".env.development",
        "LICENSE", "LICENSE.md", "LICENSE.txt",
        "CHANGELOG.md", "CHANGELOG", "HISTORY.md",
        "CONTRIBUTING.md", "CODE_OF_CONDUCT.md",
        "Makefile", "CMakeLists.txt", "Rakefile",
        "Procfile", "Vagrantfile", "Jenkinsfile",
    }
}

# Supported code file extensions for embedding
CODE_EXTENSIONS = {
    ".py", ".js", ".ts", ".jsx", ".tsx", ".vue", ".svelte",
    ".java", ".kt", ".kts", ".scala", ".groovy",
    ".c", ".cpp", ".cc", ".cxx", ".h", ".hpp", ".hxx",
    ".cs", ".fs", ".vb",
    ".go", ".rs", ".rb", ".php", ".pl", ".pm",
    ".swift", ".m", ".mm",
    ".dart", ".lua", ".r", ".R",
    ".sql", ".sh", ".bash", ".zsh", ".fish", ".ps1",
    ".html", ".htm", ".css", ".scss", ".sass", ".less",
    ".json", ".yaml", ".yml", ".toml", ".xml", ".ini", ".cfg",
    ".md", ".rst", ".txt",
    ".dockerfile", ".tf", ".hcl",
}


def should_skip_path(path: Path) -> bool:
    """Check if a path should be skipped based on gitignore patterns."""
    name = path.name.lower()
    
    # Check directory names
    if path.is_dir():
        if name in GITIGNORE_PATTERNS["dirs"] or any(
            name.endswith(ext) for ext in [".egg-info"]
        ):
            return True
    
    # Check file extensions
    suffix = path.suffix.lower()
    if suffix in GITIGNORE_PATTERNS["extensions"]:
        return True
    
    # Check specific files
    if name in GITIGNORE_PATTERNS["files"]:
        return True
    
    # Skip hidden files (except common config files)
    if name.startswith(".") and suffix not in {".py", ".js", ".ts", ".json", ".yaml", ".yml"}:
        return True
    
    return False


def is_code_file(path: Path) -> bool:
    """Check if a file is a code file that should be embedded."""
    return path.suffix.lower() in CODE_EXTENSIONS


async def extract_and_upload_zip(
    zip_content: bytes,
    project_id: str,
    user_id: str,
    max_files: int = 2000,
    max_size: int = 200 * 1024 * 1024  # 200MB
) -> Tuple[int, int, List[dict]]:
    """
    Extract a zip file and upload files to R2.
    Returns: (total_files, total_size, list of code file info)
    """
    total_files = 0
    total_size = 0
    code_files = []
    storage_prefix = f"projects/{user_id}/{project_id}/"
    
    with zipfile.ZipFile(io.BytesIO(zip_content), 'r') as zip_ref:
        for info in zip_ref.infolist():
            # Skip directories
            if info.is_dir():
                continue
            
            file_path = Path(info.filename)
            
            # Check all parent directories
            skip = False
            for parent in file_path.parents:
                if parent.name.lower() in GITIGNORE_PATTERNS["dirs"]:
                    skip = True
                    break
            
            if skip:
                continue
            
            # Check the file itself
            if should_skip_path(file_path):
                continue
            
            # Check size limits
            if total_size + info.file_size > max_size:
                break
            
            if total_files >= max_files:
                break
            
            # Read file content
            file_data = zip_ref.read(info)
            
            # Upload to R2
            r2_key = f"{storage_prefix}{info.filename}"
            await upload_file_to_r2(file_data, r2_key)
            
            total_files += 1
            total_size += info.file_size
            
            # Track code files for embedding
            if is_code_file(file_path):
                try:
                    content = file_data.decode('utf-8', errors='ignore')
                    code_files.append({
                        'path': info.filename,
                        'content': content,
                        'size': info.file_size
                    })
                except:
                    pass
    
    return total_files, total_size, code_files


async def get_file_content_from_r2(project_id: str, user_id: str, file_path: str) -> Optional[str]:
    """Get file content from R2."""
    key = f"projects/{user_id}/{project_id}/{file_path}"
    data = await download_file_from_r2(key)
    if data:
        try:
            return data.decode('utf-8', errors='ignore')
        except:
            return None
    return None


async def delete_project_files(project_id: str, user_id: str) -> bool:
    """Delete all project files from R2."""
    prefix = f"projects/{user_id}/{project_id}/"
    return await delete_folder_from_r2(prefix)


async def get_project_file_tree(project_id: str, user_id: str) -> List[dict]:
    """Generate a file tree structure from R2 files."""
    prefix = f"projects/{user_id}/{project_id}/"
    files = await list_files_in_r2(prefix)
    
    if not files:
        return []
    
    # Build tree structure
    tree = {}
    for file_info in files:
        # Remove prefix from key
        relative_path = file_info['key'].replace(prefix, '')
        parts = relative_path.split('/')
        
        current = tree
        for i, part in enumerate(parts):
            if part not in current:
                is_file = (i == len(parts) - 1)
                current[part] = {
                    '_info': {
                        'name': part,
                        'path': '/'.join(parts[:i+1]),
                        'is_dir': not is_file,
                        'size': file_info['size'] if is_file else 0
                    },
                    '_children': {} if not is_file else None
                }
            if current[part]['_children'] is not None:
                current = current[part]['_children']
    
    # Convert to list format
    def tree_to_list(tree_dict) -> List[dict]:
        result = []
        for key, value in sorted(tree_dict.items()):
            if key.startswith('_'):
                continue
            node = {
                'name': value['_info']['name'],
                'path': value['_info']['path'],
                'is_dir': value['_info']['is_dir']
            }
            if value['_children']:
                node['children'] = tree_to_list(value['_children'])
            result.append(node)
        # Sort: directories first, then files
        return sorted(result, key=lambda x: (not x['is_dir'], x['name'].lower()))
    
    return tree_to_list(tree)
