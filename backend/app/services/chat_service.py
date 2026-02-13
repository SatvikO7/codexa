from typing import Tuple, List
from openai import AsyncOpenAI
from app.core.config import settings
from app.services.embedding_service import search_project_embeddings
from app.models.models import ChatMessage, SubscriptionTier
import tiktoken

# Initialize OpenAI client
openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

# Tokenizer for counting (only used for estimates now)
tokenizer = tiktoken.encoding_for_model("gpt-4")

# Token buffer multiplier to account for overhead
TOKEN_BUFFER_MULTIPLIER = 1.5

# Context retrieval limits per tier
CONTEXT_LIMITS = {
    SubscriptionTier.FREE: 3,
    SubscriptionTier.BASIC: 4,
    SubscriptionTier.PRO: 5,
    SubscriptionTier.PRO_PLUS: 6,
}


def count_tokens(text: str) -> int:
    """Count tokens in a text (for estimates only)."""
    return len(tokenizer.encode(text))


async def get_chat_response(
    project_id: str,
    user_message: str,
    user_id: str,
    user_tier: SubscriptionTier = SubscriptionTier.FREE
) -> Tuple[str, int]:
    """Get AI response for a user message about their code.
    
    Returns:
        Tuple of (response_text, tokens_charged_to_user)
    """
    
    # Get context limit based on tier
    context_limit = CONTEXT_LIMITS.get(user_tier, 3)
    
    # Search for relevant code snippets (tier-based limit)
    relevant_snippets = await search_project_embeddings(
        project_id, 
        user_message, 
        n_results=context_limit
    )
    
    # Build context from snippets
    context_parts = []
    for snippet in relevant_snippets:
        context_parts.append(f"File: {snippet['file_path']}\n```\n{snippet['content']}\n```")
    
    context = "\n\n".join(context_parts)
    
    # Get recent chat history (limit to 6 messages to control costs)
    recent_messages = await ChatMessage.find(
        ChatMessage.project_id == project_id,
        ChatMessage.user_id == user_id
    ).sort(-ChatMessage.created_at).limit(6).to_list()
    
    # Reverse to get chronological order
    recent_messages = list(reversed(recent_messages))
    
    # Build messages for OpenAI
    messages = [
        {
            "role": "system",
            "content": f"""You are an expert code assistant helping users understand their codebase.
Your job is to answer questions about the code, explain functions, and help users understand how their project works.

IMPORTANT RULES:
1. ONLY answer questions about the code - do NOT generate new code
2. ONLY use information from the provided code context
3. If you don't know something or can't find it in the context, say so
4. Be concise and helpful
5. When explaining code, reference specific file names and line locations

Here is the relevant code context from the user's project:

{context}

Use this context to answer the user's questions about their code."""
        }
    ]
    
    # Add recent chat history
    for msg in recent_messages[:-1]:  # Exclude the current message
        messages.append({
            "role": msg.role,
            "content": msg.content
        })
    
    # Add current user message
    messages.append({
        "role": "user",
        "content": user_message
    })
    
    # Call OpenAI
    response = await openai_client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=messages,
        max_tokens=2000,
        temperature=0.3
    )
    
    assistant_message = response.choices[0].message.content
    
    # Use OpenAI's actual token counts (most accurate)
    actual_tokens = response.usage.total_tokens
    
    # Apply buffer multiplier to account for overhead and ensure profitability
    tokens_charged = int(actual_tokens * TOKEN_BUFFER_MULTIPLIER)
    
    return assistant_message, tokens_charged


async def check_token_limit(user_id: str, tier_limit: int) -> bool:
    """Check if user has exceeded their token limit."""
    from app.models.models import User
    
    user = await User.find_one(User.id == user_id)
    if not user:
        return False
    
    return user.tokens_used_this_month < tier_limit
