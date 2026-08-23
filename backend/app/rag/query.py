"""Query rewriting for follow-up questions.

Converts ambiguous follow-up questions into standalone queries that
can be used for retrieval without conversation context.

Example:
  "Which one is the most significant?"
  → "Which of NVIDIA's identified business risks is the most significant?"

Falls back to the original question if rewriting fails.
"""
from typing import Optional
from app.rag.generator import get_llm_generator
from app.core.logging import get_logger

logger = get_logger("query")

REWRITE_SYSTEM_PROMPT = """You are a query rewriting assistant. Your job is to rewrite follow-up questions into standalone, self-contained search queries.

Rules:
- Rewrite the follow-up into a complete, standalone question that can be understood without conversation history.
- Preserve the company name, topic, and document context from the previous conversation.
- Do NOT add information that wasn't implied by the original question.
- Do NOT answer the question — only rewrite it.
- If the question is already standalone, return it unchanged.
- Keep the rewritten query concise (under 200 characters ideally).

Return ONLY the rewritten query text. No quotes, no explanation."""


async def rewrite_query(
    current_question: str,
    conversation_history: list[dict],
    company_name: Optional[str] = None,
) -> str:
    """Rewrite a follow-up question into a standalone query.

    Args:
        current_question: The user's current question.
        conversation_history: List of previous messages [{role, content}].
        company_name: Name of the company being discussed, if known.

    Returns:
        A standalone query suitable for retrieval. Falls back to original on failure.
    """
    # Skip rewriting if:
    # - No conversation history (this is the first question)
    # - Question is already self-contained (>50 chars and contains a question word)
    if not conversation_history:
        return current_question

    standalone_indicators = ["what", "how", "why", "when", "where", "which", "who", "describe", "explain", "compare"]
    q_lower = current_question.lower().strip()
    is_likely_followup = (
        len(current_question) < 30
        or not any(q_lower.startswith(w) for w in standalone_indicators)
    )

    if not is_likely_followup:
        logger.info("query_already_standalone", question=current_question[:100])
        return current_question

    # Build context from recent messages
    recent = conversation_history[-4:]  # Last 4 messages
    history_text = "\n".join(
        f"{'User' if m['role'] == 'user' else 'Assistant'}: {m['content'][:200]}"
        for m in recent
    )

    context_parts = [f"Conversation history:\n{history_text}"]
    if company_name:
        context_parts.append(f"Company being discussed: {company_name}")
    context_parts.append(f"\nFollow-up question: {current_question}")
    context_parts.append("\nRewritten standalone query:")

    user_message = "\n".join(context_parts)

    try:
        generator = get_llm_generator()
        result = await generator.generate(
            REWRITE_SYSTEM_PROMPT,
            user_message,
            [],  # No document context needed for rewriting
        )
        rewritten = result.get("answer", "").strip().strip('"').strip("'")

        if rewritten and len(rewritten) > 5:
            logger.info(
                "query_rewritten",
                original=current_question[:100],
                rewritten=rewritten[:100],
            )
            return rewritten
        else:
            logger.warning("query_rewrite_empty", original=current_question[:100])
            return current_question

    except Exception as e:
        logger.error("query_rewrite_failed", error=str(e))
        return current_question
