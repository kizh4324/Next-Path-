"""Anthropic Claude Messages API wrapper (Story 4.1, ARCH-05).

Two narrow, single-turn, stateless calls — the grounded chatbot (FR-16) and the parent
summary (FR-17). No agent loop, no conversation memory, no tool use.

Degrading gracefully is a product requirement, not a nicety: with no API key configured
or the provider unreachable, callers receive `LLMResult(ok=False, ...)` and surface an
explicit unavailable state. Nothing here ever invents an answer to cover a failure.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

import anthropic
from anthropic import AsyncAnthropic
from anthropic.types import OutputConfigParam, TextBlock

from app.core.config import settings

logger = logging.getLogger(__name__)

# These are deterministic transformations of text we already hold, not open-ended
# reasoning, so low effort is the right setting and keeps cost and latency down.
OUTPUT_CONFIG: OutputConfigParam = {"effort": "low"}

UNAVAILABLE_NO_KEY = (
    "The AI assistant is not configured on this deployment, so it cannot answer right "
    "now. Everything else in Next_Path works without it."
)
UNAVAILABLE_PROVIDER = (
    "The AI assistant could not be reached just now. Please try again in a moment — "
    "your profile, recommendations, and roadmap are unaffected."
)


@dataclass(frozen=True)
class LLMResult:
    """Outcome of a single-turn call. `ok=False` always carries a usable message."""

    ok: bool
    text: str
    model: str | None = None
    input_tokens: int | None = None
    output_tokens: int | None = None
    error_kind: str | None = None
    stop_reason: str | None = None


class LLMClient:
    """Thin async wrapper. Construct once and reuse — the SDK pools connections."""

    def __init__(self) -> None:
        self._client: AsyncAnthropic | None = None

    @property
    def enabled(self) -> bool:
        return settings.llm_enabled

    def _get_client(self) -> AsyncAnthropic:
        if self._client is None:
            self._client = AsyncAnthropic(
                api_key=settings.anthropic_api_key,
                timeout=settings.anthropic_timeout_seconds,
                # The SDK retries 429/5xx/connection errors with backoff. Two is enough
                # for an interactive request a student is waiting on.
                max_retries=2,
            )
        return self._client

    async def generate_message(
        self,
        system_prompt: str,
        user_content: str,
        max_tokens: int | None = None,
    ) -> LLMResult:
        """One stateless request. Never raises — failures come back as `ok=False`."""
        if not self.enabled:
            logger.info("LLM call skipped: no ANTHROPIC_API_KEY configured.")
            return LLMResult(ok=False, text=UNAVAILABLE_NO_KEY, error_kind="not_configured")

        try:
            response = await self._get_client().messages.create(
                model=settings.anthropic_model,
                max_tokens=max_tokens or settings.anthropic_max_tokens,
                system=system_prompt,
                output_config=OUTPUT_CONFIG,
                messages=[{"role": "user", "content": user_content}],
            )
        except anthropic.AuthenticationError:
            logger.error("Anthropic authentication failed — check ANTHROPIC_API_KEY.")
            return LLMResult(ok=False, text=UNAVAILABLE_PROVIDER, error_kind="auth")
        except anthropic.NotFoundError:
            logger.error("Anthropic model not found: %s", settings.anthropic_model)
            return LLMResult(ok=False, text=UNAVAILABLE_PROVIDER, error_kind="model_not_found")
        except anthropic.RateLimitError:
            logger.warning("Anthropic rate limit reached.")
            return LLMResult(ok=False, text=UNAVAILABLE_PROVIDER, error_kind="rate_limit")
        except anthropic.APITimeoutError:
            logger.warning("Anthropic call timed out after %ss.", settings.anthropic_timeout_seconds)
            return LLMResult(ok=False, text=UNAVAILABLE_PROVIDER, error_kind="timeout")
        except anthropic.APIStatusError as exc:
            logger.error("Anthropic API error %s: %s", exc.status_code, exc.message)
            return LLMResult(ok=False, text=UNAVAILABLE_PROVIDER, error_kind="api_error")
        except anthropic.APIConnectionError:
            logger.error("Could not connect to the Anthropic API.")
            return LLMResult(ok=False, text=UNAVAILABLE_PROVIDER, error_kind="connection")
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("Unexpected error during Anthropic call.")
            return LLMResult(ok=False, text=UNAVAILABLE_PROVIDER, error_kind="unexpected")

        # A safety refusal returns HTTP 200 with stop_reason 'refusal' and no usable
        # text, so it has to be checked before reading content.
        if response.stop_reason == "refusal":
            category = getattr(getattr(response, "stop_details", None), "category", None)
            logger.warning("Anthropic declined the request (category=%s).", category)
            return LLMResult(
                ok=False,
                text=UNAVAILABLE_PROVIDER,
                error_kind="refusal",
                stop_reason="refusal",
            )

        # isinstance rather than a `type` string check: a response can also carry
        # thinking and tool blocks, and only TextBlock has `.text`.
        text = "".join(
            block.text for block in response.content if isinstance(block, TextBlock)
        ).strip()

        if not text:
            logger.warning("Anthropic returned no text (stop_reason=%s).", response.stop_reason)
            return LLMResult(ok=False, text=UNAVAILABLE_PROVIDER, error_kind="empty_response")

        return LLMResult(
            ok=True,
            text=text,
            model=response.model,
            input_tokens=response.usage.input_tokens,
            output_tokens=response.usage.output_tokens,
            stop_reason=response.stop_reason,
        )

    async def aclose(self) -> None:
        if self._client is not None:
            await self._client.close()
            self._client = None


llm_client = LLMClient()
