from sqlalchemy import text


def add_project_member(db, project_id: int, user_id: int) -> None:
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

