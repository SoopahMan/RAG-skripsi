from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from config.database import get_db
from model.auth_model import User
from schema.auth_schema import LoginRequest, UserCreate, UserResponse, UserUpdate
from core.auth.auth import get_current_user, hash_password, verify_password, create_access_token

router = APIRouter()

def require_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Hanya admin yang dapat mengelola user")
    return current_user

@router.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    
    user = db.query(User).filter(User.username == data.username).first()

    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")

    if not verify_password(data.password, user.password):
        raise HTTPException(status_code=401, detail="Password salah")

    token = create_access_token({
        "sub": str(user.id),
        "username": user.username,
        "role": user.role
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "role": user.role
        }
    }

@router.get("/users", response_model=list[UserResponse])
def get_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin)
):
    return db.query(User).order_by(User.id.asc()).all()

@router.post("/users", response_model=UserResponse, status_code=201)
def create_user(
    data: UserCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin)
):
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(status_code=400, detail="Username sudah digunakan")

    user = User(
        username=data.username,
        password=hash_password(data.password),
        role=data.role
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.put("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")

    duplicate = db.query(User).filter(
        User.username == data.username,
        User.id != user_id
    ).first()
    if duplicate:
        raise HTTPException(status_code=400, detail="Username sudah digunakan")

    if user.id == current_user.id and data.role != "admin":
        raise HTTPException(status_code=400, detail="Admin aktif tidak dapat menghapus role admin sendiri")

    user.username = data.username
    user.role = data.role
    if data.password:
        user.password = hash_password(data.password)

    db.commit()
    db.refresh(user)
    return user

@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Admin aktif tidak dapat menghapus dirinya sendiri")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")

    db.delete(user)
    db.commit()
    return {"message": "User berhasil dihapus"}