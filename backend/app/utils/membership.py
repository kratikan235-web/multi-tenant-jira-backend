from sqlalchemy import text


def ensure_project_members_table(db) -> None:
    # Use raw SQL so existing tenants can create it lazily.
    db.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS project_members (
                id SERIAL PRIMARY KEY,
                project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                added_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
                UNIQUE (project_id, user_id)
            )
            """
        )
    )
    db.commit()

    # Backfill memberships for older data:
    # - project creator is a member
    # - task creator is a member of that project
    # - task assignee is a member of that project
    #
    # All inserts are idempotent due to UNIQUE(project_id, user_id).
    db.execute(
        text(
            """
            INSERT INTO project_members (project_id, user_id)
            SELECT p.id, p.created_by
            FROM projects p
            WHERE p.created_by IS NOT NULL
            ON CONFLICT (project_id, user_id) DO NOTHING
            """
        )
    )
    db.execute(
        text(
            """
            INSERT INTO project_members (project_id, user_id)
            SELECT t.project_id, t.created_by
            FROM tasks t
            WHERE t.created_by IS NOT NULL
            ON CONFLICT (project_id, user_id) DO NOTHING
            """
        )
    )
    db.execute(
        text(
            """
            INSERT INTO project_members (project_id, user_id)
            SELECT t.project_id, t.assigned_to
            FROM tasks t
            WHERE t.assigned_to IS NOT NULL
            ON CONFLICT (project_id, user_id) DO NOTHING
            """
        )
    )
    db.commit()


def add_project_member(db, project_id: int, user_id: int) -> None:
    ensure_project_members_table(db)
    db.execute(
        text(
            """
            INSERT INTO project_members (project_id, user_id)
            VALUES (:project_id, :user_id)
            ON CONFLICT (project_id, user_id) DO NOTHING
            """
        ),
        {"project_id": project_id, "user_id": user_id},
    )
    db.commit()


def require_project_access(db, project_id: int, user_id: int, role: str | None = None) -> None:
    ensure_project_members_table(db)

    # Jira-like: ADMIN can access any project.
    if (role or "").upper() == "ADMIN":
        return

    member = db.execute(
        text(
            """
            SELECT 1
            FROM project_members
            WHERE project_id = :project_id AND user_id = :user_id
            """
        ),
        {"project_id": project_id, "user_id": user_id},
    ).fetchone()
    if not member:
        # Import here to avoid circular imports.
        from fastapi import HTTPException

        raise HTTPException(status_code=403, detail="Forbidden: not a member of this project")

