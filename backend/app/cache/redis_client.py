import json
from collections.abc import Awaitable, Callable
from functools import lru_cache
from typing import TypeVar

from pydantic import BaseModel
from redis.asyncio import Redis

from app.core.config import get_settings

T = TypeVar("T", bound=BaseModel)


@lru_cache
def get_redis() -> Redis:
    return Redis.from_url(get_settings().redis_url, decode_responses=True)


async def get_or_set(
    key: str,
    ttl_seconds: int,
    model: type[T],
    fetch: Callable[[], Awaitable[T]],
) -> T:
    """Cache-aside for a single model. Never let a client request trigger a
    live scrape directly — always go through here.
    """
    redis = get_redis()
    cached = await redis.get(key)
    if cached is not None:
        return model.model_validate_json(cached)

    value = await fetch()
    await redis.set(key, value.model_dump_json(), ex=ttl_seconds)
    return value


async def get_or_set_list(
    key: str,
    ttl_seconds: int,
    model: type[T],
    fetch: Callable[[], Awaitable[list[T]]],
) -> list[T]:
    redis = get_redis()
    cached = await redis.get(key)
    if cached is not None:
        return [model.model_validate(item) for item in json.loads(cached)]

    values = await fetch()
    payload = json.dumps([v.model_dump(mode="json") for v in values])
    await redis.set(key, payload, ex=ttl_seconds)
    return values
