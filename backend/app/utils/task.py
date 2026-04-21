from sqlalchemy import text


def format_task_response(task, db):
    project = db.execute(text("""
        SELECT id, name FROM projects WHERE id = :id
    """), {"id": task.project_id}).fetchone()

    assigned_user = None
    if task.assigned_to:
        assigned_user = db.execute(text("""
            SELECT id, email FROM users WHERE id = :id
        """), {"id": task.assigned_to}).fetchone()

    created_user = db.execute(text("""
        SELECT id, email FROM users WHERE id = :id
    """), {"id": task.created_by}).fetchone()

    return {
        "id": task.id,
        "title": task.title,
        "description": task.description,
        "status": task.status,

        "project": {
            "id": project.id,
            "name": project.name
        } if project else None,

        "assigned_to": {
            "id": assigned_user.id,
            "email": assigned_user.email
        } if assigned_user else None,

        "created_by": {
            "id": created_user.id,
            "email": created_user.email
        }
    }