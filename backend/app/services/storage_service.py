import aioboto3
from typing import Optional, BinaryIO
from app.core.config import settings


def get_s3_session():
    """Get an aioboto3 session configured for R2."""
    return aioboto3.Session()


async def get_s3_client():
    """Get an S3 client configured for Cloudflare R2."""
    session = get_s3_session()
    return session.client(
        's3',
        endpoint_url=settings.r2_endpoint,
        aws_access_key_id=settings.R2_ACCESS_KEY_ID,
        aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
        region_name='auto'
    )


async def upload_file_to_r2(
    file_data: bytes,
    key: str,
    content_type: str = 'application/octet-stream'
) -> bool:
    """Upload a file to R2."""
    try:
        async with await get_s3_client() as client:
            await client.put_object(
                Bucket=settings.R2_BUCKET_NAME,
                Key=key,
                Body=file_data,
                ContentType=content_type
            )
        return True
    except Exception as e:
        print(f"R2 upload error: {e}")
        return False


async def download_file_from_r2(key: str) -> Optional[bytes]:
    """Download a file from R2."""
    try:
        async with await get_s3_client() as client:
            response = await client.get_object(
                Bucket=settings.R2_BUCKET_NAME,
                Key=key
            )
            async with response['Body'] as stream:
                return await stream.read()
    except Exception as e:
        print(f"R2 download error: {e}")
        return None


async def delete_file_from_r2(key: str) -> bool:
    """Delete a file from R2."""
    try:
        async with await get_s3_client() as client:
            await client.delete_object(
                Bucket=settings.R2_BUCKET_NAME,
                Key=key
            )
        return True
    except Exception as e:
        print(f"R2 delete error: {e}")
        return False


async def delete_folder_from_r2(prefix: str) -> bool:
    """Delete all files with a given prefix (folder) from R2."""
    try:
        async with await get_s3_client() as client:
            # List all objects with prefix
            paginator = client.get_paginator('list_objects_v2')
            
            async for page in paginator.paginate(
                Bucket=settings.R2_BUCKET_NAME,
                Prefix=prefix
            ):
                if 'Contents' in page:
                    objects = [{'Key': obj['Key']} for obj in page['Contents']]
                    if objects:
                        await client.delete_objects(
                            Bucket=settings.R2_BUCKET_NAME,
                            Delete={'Objects': objects}
                        )
        return True
    except Exception as e:
        print(f"R2 folder delete error: {e}")
        return False


async def list_files_in_r2(prefix: str) -> list:
    """List all files with a given prefix in R2."""
    files = []
    try:
        async with await get_s3_client() as client:
            paginator = client.get_paginator('list_objects_v2')
            
            async for page in paginator.paginate(
                Bucket=settings.R2_BUCKET_NAME,
                Prefix=prefix
            ):
                if 'Contents' in page:
                    for obj in page['Contents']:
                        files.append({
                            'key': obj['Key'],
                            'size': obj['Size'],
                            'last_modified': obj['LastModified']
                        })
    except Exception as e:
        print(f"R2 list error: {e}")
    return files


async def ensure_bucket_exists() -> bool:
    """Ensure the R2 bucket exists (create if not)."""
    try:
        async with await get_s3_client() as client:
            try:
                await client.head_bucket(Bucket=settings.R2_BUCKET_NAME)
            except:
                await client.create_bucket(Bucket=settings.R2_BUCKET_NAME)
        return True
    except Exception as e:
        print(f"R2 bucket check error: {e}")
        return False
