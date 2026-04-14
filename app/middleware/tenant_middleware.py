from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request, HTTPException
from app.auth.jwt import decode_token

def is_public_path(path: str):
    public_paths = [
        "/docs",
        "/openapi.json",
        "/auth/login",
        "/users/accept-invite",
        "/users/signup",   
    ]
    return any(path.startswith(p) for p in public_paths)

class TenantMiddleware(BaseHTTPMiddleware):

    async def dispatch(self, request: Request, call_next):

        if is_public_path(request.url.path):
            return await call_next(request)

        auth = request.headers.get("Authorization")

        if not auth:
            raise HTTPException(status_code=401, detail="Missing token")

        token = auth.replace("Bearer ", "")
        payload = decode_token(token)

        request.state.tenant = payload.get("tenant")
        request.state.user_id = payload.get("user_id")
        request.state.role = payload.get("role")

        response = await call_next(request)
        return response