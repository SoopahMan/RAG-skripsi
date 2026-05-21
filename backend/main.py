from fastapi import FastAPI
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
import os

from config.database import SessionLocal
from core.auth.auth import hash_password
from model.auth_model import User
from config.database import Base, engine

from endpoint import chat, auth, ujian
from contextlib import asynccontextmanager



load_dotenv()

def create_admin():
    db = SessionLocal()
    user = db.query(User).filter(User.username == "admin").first()

    if not user:
        admin = User(
            username="admin",
            password=hash_password("admin123"),
            role="admin"
        )
        db.add(admin)
        db.commit()

    db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_admin()
    yield

app = FastAPI(lifespan=lifespan)

Base.metadata.create_all(bind=engine)


origins = [
    "http://localhost",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



app.include_router(chat.router)
app.include_router(auth.router)
app.include_router(ujian.router)