from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from rembgApi import router as rembgRouter
app = FastAPI(docs_url=None, redoc_url=None)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(rembgRouter)