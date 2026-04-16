from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request, HTTPException
from app.auth.jwt import decode_token
from fastapi.responses import JSONResponse


def is_public_path(path: str):
    public_paths = [
        "/docs",
        "/openapi.json",
        "/auth/login",
        "/users/signup",
        "/users/accept-invite",
    ]
    return any(path.startswith(p) for p in public_paths)


class TenantMiddleware(BaseHTTPMiddleware):

    async def dispatch(self, request: Request, call_next):

        host = request.headers.get("host")
        if not host:
            raise HTTPException(status_code=400, detail="Invalid host")

        subdomain = host.split(".")[0]

        # Base domain (no tenant)
        if subdomain == "localhost":
            request.state.tenant = None
        else:
            request.state.tenant = subdomain

        # Public APIs skip auth
        if is_public_path(request.url.path):
            return await call_next(request)

        # Auth required
        auth = request.headers.get("Authorization")
        if not auth:
            raise HTTPException(status_code=401, detail="Missing token")

        token = auth.replace("Bearer ", "")
        payload = decode_token(token)

        token_tenant = payload.get("tenant")
        url_tenant = request.state.tenant

        # CORE FIX
        if token_tenant != url_tenant:
            return JSONResponse(
                status_code=403,
                content={
                    "error": "TenantMismatch",
                    "message": f"Token belongs to '{token_tenant}' but request is for '{url_tenant}'"
                }
            )

        request.state.user_id = payload.get("user_id")
        request.state.role = payload.get("role")

        response = await call_next(request)
        return response