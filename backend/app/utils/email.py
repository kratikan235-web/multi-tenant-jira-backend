import os
import smtplib
from email.message import EmailMessage


def _env(name: str, default: str | None = None) -> str | None:
    v = os.getenv(name)
    if v is None:
        return default
    v = v.strip()
    return v if v else default


def send_invite_email(*, to_email: str, tenant: str, activation_url: str) -> bool:
    """
    Sends an invite email if SMTP env vars are configured.
    Returns True if sent, False if skipped (missing config).
    Raises on SMTP errors when config is present.
    """
    host = _env("SMTP_HOST")
    port_raw = _env("SMTP_PORT", "587")
    username = _env("SMTP_USER")
    password = _env("SMTP_PASS")
    from_email = _env("SMTP_FROM", username)

    if not host or not from_email:
        return False

    try:
        port = int(port_raw or "587")
    except ValueError:
        port = 587

    msg = EmailMessage()
    msg["Subject"] = f"You're invited to {tenant}"
    msg["From"] = from_email
    msg["To"] = to_email
    msg.set_content(
        "\n".join(
            [
                f"You've been invited to tenant: {tenant}",
                "",
                "Activate your account by setting a password:",
                activation_url,
                "",
                "If you did not expect this invite, you can ignore this email.",
            ]
        )
    )

    with smtplib.SMTP(host, port) as server:
        server.ehlo()
        if port in (587, 25):
            server.starttls()
            server.ehlo()
        if username and password:
            server.login(username, password)
        server.send_message(msg)

    return True

