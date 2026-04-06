import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from database.connection import init_db
from routers import company, market

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

app = FastAPI(title="Quantara API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(company.router, prefix="/api/v1")
app.include_router(market.router,  prefix="/api/v1")


@app.on_event("startup")
def startup_event():
    init_db()
    print("[APP] Quantara API started.")


@app.get("/health")
def health():
    return {"status": "ok"}
