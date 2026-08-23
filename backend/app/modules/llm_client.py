"""Multi-provider LLM wrapper — Google Gemini or Anthropic Claude (Story 4.1, ARCH-05).

Two narrow, single-turn, stateless calls — the grounded chatbot (FR-16) and the parent
summary (FR-17). No agent loop, no conversation memory, no tool use.

Provider selection: when GEMINI_API_KEY is set it takes priority (free tier available).
Falls back to Anthropic when only ANTHROPIC_API_KEY is set. With neither key, callers
receive `LLMResult(ok=False, ...)` and surface an explicit unavailable state.

Degrading gracefully is a product requirement, not a nicety: nothing here ever invents
an answer to cover a failure.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

from app.core.config import settings

logger = logging.getLogger(__name__)

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


class GeminiClient:
    """Google Gemini client using the google-genai SDK."""

    def __init__(self) -> None:
        self._client: object | None = None

    def _get_client(self) -> object:
        if self._client is None:
            from google import genai  # type: ignore[import-untyped]

            self._client = genai.Client(api_key=settings.gemini_api_key)
        return self._client

    async def generate_message(
        self,
        system_prompt: str,
        user_content: str,
        max_tokens: int | None = None,
    ) -> LLMResult:
        """One stateless Gemini request. Never raises — failures come back as ok=False."""
        try:
            from google.genai import types  # type: ignore[import-untyped]

            client = self._get_client()

            config = types.GenerateContentConfig(
                system_instruction=system_prompt,
                max_output_tokens=max_tokens or settings.gemini_max_tokens,
                temperature=0.3,
            )

            # Run the synchronous SDK call in a thread to avoid blocking the event loop.
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: client.models.generate_content(
                    model=settings.gemini_model,
                    contents=user_content,
                    config=config,
                ),
            )

            text = response.text
            if not text or not text.strip():
                logger.warning("Gemini returned empty text.")
                return LLMResult(ok=False, text=UNAVAILABLE_PROVIDER, error_kind="empty_response")

            usage = getattr(response, "usage_metadata", None)
            return LLMResult(
                ok=True,
                text=text.strip(),
                model=settings.gemini_model,
                input_tokens=getattr(usage, "prompt_token_count", None),
                output_tokens=getattr(usage, "candidates_token_count", None),
                stop_reason="end_turn",
            )

        except asyncio.CancelledError:
            raise
        except Exception as exc:
            logger.exception("Gemini API call failed: %s", exc)
            return LLMResult(ok=False, text=UNAVAILABLE_PROVIDER, error_kind="gemini_error")

    async def aclose(self) -> None:
        self._client = None


class AnthropicClient:
    """Anthropic Claude client — the original provider."""

    def __init__(self) -> None:
        self._client: object | None = None

    def _get_client(self) -> object:
        if self._client is None:
            from anthropic import AsyncAnthropic

            self._client = AsyncAnthropic(
                api_key=settings.anthropic_api_key,
                timeout=settings.anthropic_timeout_seconds,
                max_retries=2,
            )
        return self._client  # type: ignore[return-value]

    async def generate_message(
        self,
        system_prompt: str,
        user_content: str,
        max_tokens: int | None = None,
    ) -> LLMResult:
        """One stateless Anthropic request. Never raises — failures come back as ok=False."""
        import anthropic
        from anthropic.types import TextBlock

        try:
            client = self._get_client()
            response = await client.messages.create(  # type: ignore[union-attr]
                model=settings.anthropic_model,
                max_tokens=max_tokens or settings.anthropic_max_tokens,
                system=system_prompt,
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

        if response.stop_reason == "refusal":
            logger.warning("Anthropic declined the request.")
            return LLMResult(ok=False, text=UNAVAILABLE_PROVIDER, error_kind="refusal",
                             stop_reason="refusal")

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
            await self._client.close()  # type: ignore[union-attr]
            self._client = None


class LLMClient:
    """Multi-provider LLM client. Picks the right backend from config."""

    def __init__(self) -> None:
        self._gemini: GeminiClient | None = None
        self._anthropic: AnthropicClient | None = None

    @property
    def enabled(self) -> bool:
        return settings.llm_enabled

    @property
    def provider(self) -> str:
        return settings.llm_provider

    def _get_backend(self) -> GeminiClient | AnthropicClient | None:
        provider = settings.llm_provider
        if provider == "gemini":
            if self._gemini is None:
                self._gemini = GeminiClient()
            return self._gemini
        if provider == "anthropic":
            if self._anthropic is None:
                self._anthropic = AnthropicClient()
            return self._anthropic
        return None

    async def generate_message(
        self,
        system_prompt: str,
        user_content: str,
        max_tokens: int | None = None,
    ) -> LLMResult:
        """One stateless request. Never raises — failures come back as `ok=False`."""
        if not self.enabled:
            logger.info("LLM call skipped: no API key configured.")
            return LLMResult(ok=False, text=UNAVAILABLE_NO_KEY, error_kind="not_configured")

        backend = self._get_backend()
        if backend is None:
            return LLMResult(ok=False, text=UNAVAILABLE_NO_KEY, error_kind="not_configured")

        logger.info("LLM call via %s (model=%s)", self.provider,
                     settings.gemini_model if self.provider == "gemini" else settings.anthropic_model)
        return await backend.generate_message(system_prompt, user_content, max_tokens)

    async def aclose(self) -> None:
        if self._gemini is not None:
            await self._gemini.aclose()
        if self._anthropic is not None:
            await self._anthropic.aclose()


llm_client = LLMClient()
