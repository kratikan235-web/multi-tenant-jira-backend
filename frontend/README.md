## Multi-tenant Jira frontend (React + Vite)

### Tenant handling

- Tenant is derived from the **subdomain** of the current URL.
  - `company1.localhost:5173` → tenant = `company1`
  - `company2.localhost:5173` → tenant = `company2`
- API base URL is derived dynamically:
  - Default: `http(s)://<current-hostname>:8000`
  - Override with `VITE_API_BASE_URL` if needed (see `.env.example`)

### Auth handling

- JWT token is stored in `localStorage` under key `mtj_access_token`
- Axios adds `Authorization: Bearer <token>` automatically for all requests

### Run (when npm registry is reachable)

```bash
cd frontend
npm install
npm run dev
```

### Backend endpoints used

- `POST /users/signup`
- `POST /auth/login`
- `GET /auth/users`
- `POST /users/invite` (query params: `email`, `role`)
- `GET /projects/` and `POST /projects/`
- `GET /tasks/?project_id=...`
- `POST /tasks/`
- `PATCH /tasks/{task_id}/status?status=...`

