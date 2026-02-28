from pydantic import BaseModel
from datetime import datetime


class UserCreate(BaseModel):
    username: str
    password: str
    role: str
    email: str | None = None
    contractor_id: int | None = None


class UserResponse(BaseModel):
    id: int
    username: str
    email: str | None
    role: str
    contractor_id: int | None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
