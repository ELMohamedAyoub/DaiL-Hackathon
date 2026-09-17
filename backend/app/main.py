from fastapi import FastAPI
from fastapi.responses import RedirectResponse

from fastapi.middleware.cors import CORSMiddleware

from app.routers import c08, candidates, readiness, vectors

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4927"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return RedirectResponse("/docs")


@app.get("/healthcheck")
async def health_check():
    return {"status": "ok"}


app.include_router(candidates.router, tags=["Candidates"], prefix="/candidates")
app.include_router(vectors.router, tags=["Vectors"], prefix="/vectors")
app.include_router(readiness.router, tags=["C07 readiness"])
app.include_router(c08.router, tags=["C08 report"])
