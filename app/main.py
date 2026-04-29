import json
from typing import Any
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

from app.config import settings
from app.ollama_client import OllamaClient
from app.repository import NaturalQueryExecutionError, repository
from app.sql_assistant import (
    NaturalQueryRepairContext,
    SqlPlanningModelResponse,
    apply_database_preflight,
    build_sql_draft,
)

app = FastAPI(
    title="World Cup SQL API",
    version="0.1.0",
    description="Thin API that exposes PostgreSQL functions for the World Cup database project.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["x-vercel-ai-ui-message-stream"],
)


def run_query(sql: str, params: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
    try:
        return repository.fetch_all(sql, params)
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


def run_single_query(sql: str, params: tuple[Any, ...] = ()) -> dict[str, Any]:
    try:
        return repository.fetch_one(sql, params)
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


class NaturalQueryExecuteRequest(BaseModel):
    sql: str


class NaturalQueryGenerateRequest(BaseModel):
    prompt: str = Field(min_length=1)


class NaturalQueryRepairContextPayload(BaseModel):
    originalPrompt: str = Field(min_length=1)
    failingSql: str = Field(min_length=1)
    failureScope: str = Field(min_length=1)
    failureDetail: str = Field(min_length=1)

    def to_domain(self) -> NaturalQueryRepairContext:
        return NaturalQueryRepairContext(
            original_prompt=self.originalPrompt,
            failing_sql=self.failingSql,
            failure_scope=self.failureScope,
            failure_detail=self.failureDetail,
        )


class NaturalQueryPlanStreamRequest(BaseModel):
    prompt: str = Field(min_length=1)
    repairContext: NaturalQueryRepairContextPayload | None = None


def get_ollama_client() -> OllamaClient:
    return OllamaClient(
        base_url=settings.ollama_base_url,
        timeout_seconds=settings.ollama_timeout_seconds,
    )


def _stream_headers() -> dict[str, str]:
    return {
        "cache-control": "no-cache",
        "connection": "keep-alive",
        "x-accel-buffering": "no",
        "x-vercel-ai-ui-message-stream": "v1",
    }


def _encode_stream_part(payload: dict[str, Any]) -> bytes:
    return f"data: {json.dumps(payload)}\n\n".encode("utf-8")


def _planning_status(
    *,
    phase: str,
    summary: str,
    detail: str,
    state: str,
) -> dict[str, Any]:
    return {
        "phase": phase,
        "summary": summary,
        "detail": detail,
        "state": state,
    }


@app.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/database/status")
def database_status() -> dict[str, Any]:
    try:
        return repository.get_database_status()
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/database/setup")
def initialize_database() -> dict[str, Any]:
    try:
        return repository.initialize_database()
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/database/reporting")
def apply_reporting_queries() -> dict[str, Any]:
    try:
        return repository.apply_reporting_queries()
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/database/populate")
def populate_database() -> dict[str, Any]:
    try:
        return repository.populate_database()
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.delete("/database/cleanup")
def cleanup_database() -> dict[str, Any]:
    try:
        return repository.cleanup_database()
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/synthetic-data/status")
def synthetic_data_status() -> dict[str, Any]:
    return database_status()


@app.post("/synthetic-data/populate")
def populate_synthetic_data() -> dict[str, Any]:
    return populate_database()


@app.delete("/synthetic-data")
def cleanup_synthetic_data() -> dict[str, Any]:
    return cleanup_database()


@app.get("/editions")
def list_editions() -> list[dict[str, Any]]:
    return run_query("SELECT * FROM world_cup.fn_list_editions()")


@app.get("/editions/{edition_id}/teams")
def list_edition_teams(edition_id: int) -> list[dict[str, Any]]:
    return run_query(
        "SELECT * FROM world_cup.fn_list_edition_teams(%s)",
        (edition_id,),
    )


@app.get("/editions/{edition_id}/groups")
def list_edition_groups(edition_id: int) -> list[dict[str, Any]]:
    return run_query(
        "SELECT * FROM world_cup.fn_list_edition_groups(%s)",
        (edition_id,),
    )


@app.get("/groups/{group_id}/standings")
def list_group_standings(group_id: int) -> list[dict[str, Any]]:
    return run_query(
        "SELECT * FROM world_cup.fn_group_standings(%s)",
        (group_id,),
    )


@app.get("/editions/{edition_id}/matches")
def list_edition_matches(edition_id: int) -> list[dict[str, Any]]:
    return run_query(
        "SELECT * FROM world_cup.fn_list_edition_matches(%s)",
        (edition_id,),
    )


@app.get("/editions/{edition_id}/knockout")
def list_knockout_path(edition_id: int) -> list[dict[str, Any]]:
    return run_query(
        "SELECT * FROM world_cup.fn_knockout_path(%s)",
        (edition_id,),
    )


@app.get("/editions/{edition_id}/teams/{team_id}/squad")
def list_squad(edition_id: int, team_id: int) -> list[dict[str, Any]]:
    return run_query(
        "SELECT * FROM world_cup.fn_list_team_squad(%s, %s)",
        (edition_id, team_id),
    )


@app.get("/matches/{match_id}/events")
def list_match_events(match_id: int) -> list[dict[str, Any]]:
    return run_query(
        "SELECT * FROM world_cup.fn_list_match_events(%s)",
        (match_id,),
    )


@app.get("/editions/{edition_id}/top-scorers")
def list_top_scorers(edition_id: int) -> list[dict[str, Any]]:
    return run_query(
        "SELECT * FROM world_cup.fn_top_scorers(%s)",
        (edition_id,),
    )


@app.get("/teams/{team_id}/history")
def list_team_history(team_id: int) -> list[dict[str, Any]]:
    return run_query(
        "SELECT * FROM world_cup.fn_team_history(%s)",
        (team_id,),
    )


@app.get("/natural-query/status")
async def natural_query_status() -> dict[str, str]:
    ollama_client = get_ollama_client()

    try:
        status = await ollama_client.get_status(settings.ollama_model)
        return status.to_dict()
    finally:
        await ollama_client.close()


@app.post("/natural-query/generate")
async def generate_natural_query(
    payload: NaturalQueryGenerateRequest,
) -> dict[str, str]:
    ollama_client = get_ollama_client()

    try:
        status = await ollama_client.get_status(settings.ollama_model)

        if status.status != "ready":
            raise HTTPException(status_code=503, detail=status.detail)

        raw_response = await ollama_client.generate(
            model=settings.ollama_model,
            prompt=payload.prompt,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    finally:
        await ollama_client.close()

    return {
        "model": settings.ollama_model,
        "rawResponse": raw_response,
    }


@app.post("/natural-query/plan-stream")
async def plan_natural_query(
    payload: NaturalQueryPlanStreamRequest,
) -> StreamingResponse:
    ollama_client = get_ollama_client()
    status = await ollama_client.get_status(settings.ollama_model)
    is_repair = payload.repairContext is not None

    if status.status != "ready":
        await ollama_client.close()
        raise HTTPException(status_code=503, detail=status.detail)

    async def stream() -> Any:
        message_id = f"assistant-{uuid4()}"
        text_part_id = f"text-{uuid4()}"

        try:
            yield _encode_stream_part(
                {
                    "type": "start",
                    "messageId": message_id,
                }
            )
            yield _encode_stream_part(
                {
                    "type": "data-sqlStatus",
                    "id": "sql-status",
                    "data": _planning_status(
                        phase="planning",
                        summary=(
                            "Repairing SQL proposal with local Ollama"
                            if is_repair
                            else "Planning SQL with local Ollama"
                        ),
                        detail=(
                            "The backend is generating one repaired SQL proposal "
                            "from PostgreSQL feedback for the current request."
                            if is_repair
                            else "The backend is generating one structured SQL proposal "
                            "for the current request."
                        ),
                        state="running",
                    ),
                    "transient": True,
                }
            )

            fragments: list[str] = []
            response = ollama_client.stream_structured_generate(
                model=settings.ollama_model,
                prompt=payload.prompt,
                format_schema=SqlPlanningModelResponse.model_json_schema(),
                options={"temperature": 0},
            )

            async for chunk in response:
                fragments.append(chunk)

            raw_response = "".join(fragments).strip()
            draft = apply_database_preflight(
                draft=build_sql_draft(raw_response),
                repository=repository,
            )
            assistant_text = (
                draft.assistant_message
                or draft.clarification
                or (
                    (
                        "I prepared one repaired SQL proposal for review."
                        if is_repair
                        else "I prepared one SQL proposal for review."
                    )
                    if draft.preview_sql
                    else (
                        "I could not derive one repaired SQL proposal from this request."
                        if is_repair
                        else "I could not derive an executable SQL proposal from this request."
                    )
                )
            )

            yield _encode_stream_part(
                {
                    "type": "data-sqlStatus",
                    "id": "sql-status",
                    "data": _planning_status(
                        phase="finalizing",
                        summary=(
                            "Finalizing repaired SQL proposal"
                            if is_repair
                            else "Finalizing SQL proposal"
                        ),
                        detail=(
                            "The assistant finished the structured response and is "
                            "preparing the repaired SQL proposal for review."
                            if is_repair
                            else "The assistant finished the structured response and is "
                            "preparing the SQL proposal for review."
                        ),
                        state="success",
                    ),
                    "transient": True,
                }
            )

            if assistant_text:
                yield _encode_stream_part(
                    {
                        "type": "text-start",
                        "id": text_part_id,
                    }
                )
                yield _encode_stream_part(
                    {
                        "type": "text-delta",
                        "id": text_part_id,
                        "delta": assistant_text,
                    }
                )
                yield _encode_stream_part(
                    {
                        "type": "text-end",
                        "id": text_part_id,
                    }
                )

            yield _encode_stream_part(
                {
                        "type": "data-sqlProposal",
                        "id": f"proposal-{message_id}",
                        "data": {
                            "draft": draft.to_dict(),
                        },
                    }
                )
            yield _encode_stream_part(
                {
                    "type": "finish",
                    "finishReason": "stop",
                }
            )
        except RuntimeError as exc:
            yield _encode_stream_part(
                {
                    "type": "data-sqlStatus",
                    "id": "sql-status",
                    "data": _planning_status(
                        phase="finalizing",
                        summary="Planning failed",
                        detail=str(exc),
                        state="error",
                    ),
                    "transient": True,
                }
            )
            yield _encode_stream_part(
                {
                    "type": "finish",
                    "finishReason": "error",
                }
            )
        finally:
            await ollama_client.close()

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers=_stream_headers(),
    )


@app.post("/natural-query/execute", response_model=None)
def execute_natural_query(
    payload: NaturalQueryExecuteRequest,
) -> dict[str, Any] | JSONResponse:
    try:
        return repository.execute_validated_sql(payload.sql)
    except NaturalQueryExecutionError as exc:
        return JSONResponse(status_code=400, content=exc.to_response())
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
