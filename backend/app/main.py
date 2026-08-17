from fastapi import FastAPI

from app.api.routes import chapters, manga, search

app = FastAPI(title="Tsuzuku", description="Personal manga reader backend")

app.include_router(search.router)
app.include_router(manga.router)
app.include_router(chapters.router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
