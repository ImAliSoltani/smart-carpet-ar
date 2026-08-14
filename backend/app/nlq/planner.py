"""The two ways a sentence becomes a query, behind one interface.

The shape is the same one `app.services.embeddings` already uses for the vision
model, and for the same reason: the choice of provider is a deployment decision,
and the application should be able to not know which one it got.

`RuleBasedPlanner` is the default and always available. `OpenAiCompatiblePlanner`
is configured by environment and speaks the chat-completions schema that DeepSeek,
OpenRouter, a local llama.cpp server and OpenAI all accept, so switching between
them is a base URL and a model name rather than a rewrite.

**The model's answer is never trusted, only validated.** It comes back as JSON,
goes through `QueryPlan`, and anything outside the vocabulary raises rather than
reaching the catalogue. If the call fails, times out, returns prose instead of
JSON, or produces a plan that will not validate, the rule-based planner answers
instead — the shopper gets a slightly blunter search rather than an error, and
nobody watching a demo learns that the API key expired.
"""

from __future__ import annotations

import json
import logging
from decimal import Decimal
from typing import Protocol

from pydantic import ValidationError

from app.nlq import rules
from app.nlq.prompt import build_system_prompt
from app.nlq.schema import QueryPlan

logger = logging.getLogger(__name__)

# Long enough for a small model over a slow link, short enough that the shopper
# is not left watching a box. The fallback costs nothing, so waiting longer than
# this to avoid it is the wrong trade.
REQUEST_TIMEOUT_S = 8.0


class QueryPlanner(Protocol):
    async def plan(
        self,
        query: str,
        *,
        price_floor: Decimal | None = None,
        price_ceiling: Decimal | None = None,
    ) -> QueryPlan:
        """Turn a Persian sentence into a validated catalogue query."""
        ...


class RuleBasedPlanner:
    """Vocabulary matching, no model. See `app.nlq.rules`."""

    name = "rules"

    async def plan(
        self,
        query: str,
        *,
        price_floor: Decimal | None = None,
        price_ceiling: Decimal | None = None,
    ) -> QueryPlan:
        return rules.parse(query, price_floor=price_floor, price_ceiling=price_ceiling)


class OpenAiCompatiblePlanner:
    """Any provider speaking `POST /chat/completions`.

    Holds a `RuleBasedPlanner` and falls back to it on every failure path,
    which is what lets this be configured on a machine with no network and
    still serve the feature.
    """

    name = "llm"

    def __init__(self, *, base_url: str, api_key: str, model: str) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.model = model
        self._fallback = RuleBasedPlanner()

    async def plan(
        self,
        query: str,
        *,
        price_floor: Decimal | None = None,
        price_ceiling: Decimal | None = None,
    ) -> QueryPlan:
        try:
            payload = await self._ask(query, price_floor, price_ceiling)
        except Exception as exc:  # noqa: BLE001 — every failure has one answer
            logger.warning("planner falling back to rules: %s", exc)
            return await self._fallback.plan(
                query, price_floor=price_floor, price_ceiling=price_ceiling
            )

        try:
            plan = QueryPlan.model_validate(payload)
        except ValidationError as exc:
            # The model answered with something outside the vocabulary. That is
            # exactly what the schema is for, and the rules still know the
            # sentence.
            logger.warning("planner produced an invalid plan: %s", exc)
            return await self._fallback.plan(
                query, price_floor=price_floor, price_ceiling=price_ceiling
            )

        # A model that understood nothing is worse than the rules, which at
        # least match words. Cheap to check and it costs one comparison.
        if plan.is_empty:
            return await self._fallback.plan(
                query, price_floor=price_floor, price_ceiling=price_ceiling
            )
        return plan

    async def _ask(
        self, query: str, price_floor: Decimal | None, price_ceiling: Decimal | None
    ) -> dict:
        import httpx

        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_S) as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={
                    "model": self.model,
                    "messages": [
                        {
                            "role": "system",
                            "content": build_system_prompt(price_floor, price_ceiling),
                        },
                        {"role": "user", "content": query},
                    ],
                    # Deterministic, because this is translation and there is
                    # nothing here for sampling to improve.
                    "temperature": 0,
                    "response_format": {"type": "json_object"},
                },
            )
            response.raise_for_status()
            content = response.json()["choices"][0]["message"]["content"]

        # Providers that ignore `response_format` wrap the object in a code
        # fence; unwrapping is two lines and saves a whole class of fallback.
        text = content.strip()
        if text.startswith("```"):
            text = text.split("```")[1].removeprefix("json").strip()
        return json.loads(text)


_planner: QueryPlanner | None = None


def get_planner() -> QueryPlanner:
    """App-wide planner. Tests override this via `set_planner`."""
    global _planner
    if _planner is None:
        from app.core.config import get_settings

        settings = get_settings()
        if settings.llm_api_key and settings.llm_base_url:
            _planner = OpenAiCompatiblePlanner(
                base_url=settings.llm_base_url,
                api_key=settings.llm_api_key,
                model=settings.llm_model,
            )
            logger.info("جست‌وجوی گفتگویی با مدل %s", settings.llm_model)
        else:
            _planner = RuleBasedPlanner()
            logger.info(
                "جست‌وجوی گفتگویی روی پارسر قاعده‌محور اجرا می‌شود "
                "(LLM_API_KEY و LLM_BASE_URL تنظیم نشده‌اند)"
            )
    return _planner


def set_planner(planner: QueryPlanner | None) -> None:
    global _planner
    _planner = planner
