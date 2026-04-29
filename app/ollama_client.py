from __future__ import annotations

from collections.abc import AsyncIterator, Mapping
from dataclasses import dataclass
from typing import Any

from ollama import AsyncClient, ResponseError
from pydantic.json_schema import JsonSchemaValue


class OllamaClientError(RuntimeError):
    pass


@dataclass(frozen=True)
class OllamaProviderStatus:
    provider: str
    base_url: str
    model: str
    status: str
    summary: str
    detail: str

    def to_dict(self) -> dict[str, str]:
        return {
            "provider": self.provider,
            "baseUrl": self.base_url,
            "model": self.model,
            "status": self.status,
            "summary": self.summary,
            "detail": self.detail,
        }


class OllamaClient:
    def __init__(self, base_url: str, timeout_seconds: int) -> None:
        self.base_url = base_url.rstrip("/")
        self.timeout_seconds = timeout_seconds
        self._client = AsyncClient(
            host=self.base_url,
            timeout=self.timeout_seconds,
        )

    async def close(self) -> None:
        http_client = getattr(self._client, "_client", None)

        if http_client is not None:
            await http_client.aclose()

    async def get_status(self, model: str) -> OllamaProviderStatus:
        try:
            payload = await self._client.list()
        except (ConnectionError, ResponseError) as exc:
            return OllamaProviderStatus(
                provider="ollama",
                base_url=self.base_url,
                model=model,
                status="unavailable",
                summary="Local Ollama server unavailable",
                detail=str(exc),
            )

        discovered_models = {
            entry.model
            for entry in payload.models
            if isinstance(entry.model, str) and entry.model
        }

        if model not in discovered_models:
            return OllamaProviderStatus(
                provider="ollama",
                base_url=self.base_url,
                model=model,
                status="unavailable",
                summary="Configured Ollama model unavailable",
                detail=(
                    f"The local Ollama server is reachable, but the configured model "
                    f"'{model}' is not installed. Pull it in Ollama or change "
                    "OLLAMA_MODEL."
                ),
            )

        return OllamaProviderStatus(
            provider="ollama",
            base_url=self.base_url,
            model=model,
            status="ready",
            summary="Local Ollama server ready",
            detail=(
                f"The local Ollama server is reachable and the configured model "
                f"'{model}' is available for SQL generation."
            ),
        )

    async def generate(self, model: str, prompt: str) -> str:
        try:
            payload = await self._client.generate(
                model=model,
                prompt=prompt,
                stream=False,
            )
        except (ConnectionError, ResponseError) as exc:
            raise OllamaClientError(str(exc)) from exc

        response_text = payload.response
        if not isinstance(response_text, str) or not response_text.strip():
            raise OllamaClientError(
                "The local Ollama server returned an empty generation response."
            )

        return response_text

    async def generate_structured(
        self,
        *,
        model: str,
        prompt: str,
        format_schema: JsonSchemaValue,
        options: Mapping[str, Any] | None = None,
    ) -> str:
        fragments: list[str] = []

        async for chunk in self.stream_structured_generate(
            model=model,
            prompt=prompt,
            format_schema=format_schema,
            options=options,
        ):
            fragments.append(chunk)

        return "".join(fragments).strip()

    async def stream_structured_generate(
        self,
        *,
        model: str,
        prompt: str,
        format_schema: JsonSchemaValue,
        options: Mapping[str, Any] | None = None,
    ) -> AsyncIterator[str]:
        try:
            response = await self._client.generate(
                model=model,
                prompt=prompt,
                format=format_schema,
                stream=True,
                options=options,
            )
        except (ConnectionError, ResponseError) as exc:
            raise OllamaClientError(str(exc)) from exc

        async for chunk in response:
            if chunk.response:
                yield chunk.response
