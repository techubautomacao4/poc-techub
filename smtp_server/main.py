"""
Techub POC - Local SMTP Server
================================
A FastAPI server that reads SMTP credentials from the Supabase database
and provides endpoints for:
  - Testing SMTP connection
  - Sending test emails
  - Sending scheduling invites (with ICS attachment)

Start with: uvicorn main:app --reload --port 3001
"""

import smtplib
import ssl
import os
from datetime import datetime, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client
from dotenv import load_dotenv

# ─── Load env vars ────────────────────────────────────────────────
load_dotenv() # Load from current dir if exists (local dev)
# In production (Railway), variables are injected via environment.

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("VITE_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

app = FastAPI(title="Techub SMTP Server", version="1.0.0")

# ─── CORS ────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Models ───────────────────────────────────────────────────────
class TestConnectionRequest(BaseModel):
    host: str
    port: int
    user: str
    password: str
    use_tls: bool = True


class SendEmailRequest(BaseModel):
    to: str
    subject: str
    body: str
    ics_content: Optional[str] = None   # ICS attachment content (optional)
    ics_filename: Optional[str] = "invite.ics"


# ─── Helper: Fetch SMTP settings from Supabase DB ─────────────────
def get_smtp_settings() -> dict:
    res = supabase.table("system_settings").select("*").in_(
        "key", ["smtp_host", "smtp_port", "smtp_user", "smtp_pass", "smtp_from"]
    ).execute()

    settings: dict = {}
    for row in (res.data or []):
        settings[row["key"]] = row["value"]

    required = ["smtp_host", "smtp_port", "smtp_user", "smtp_pass", "smtp_from"]
    missing = [k for k in required if not settings.get(k)]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Configurações SMTP incompletas no banco. Campos ausentes: {', '.join(missing)}"
        )

    return settings


# ─── Helper: Create SMTP connection ───────────────────────────────
def create_smtp_connection(host: str, port: int, user: str, password: str) -> smtplib.SMTP:
    """
    Tries to connect using the most appropriate method based on port:
    - Port 465: SSL (implicit TLS)
    - Port 587 / 25: STARTTLS (explicit TLS upgrade)
    - Other: plain (fallback with STARTTLS attempt)
    """
    port = int(port)

    if port == 465:
        context = ssl.create_default_context()
        server = smtplib.SMTP_SSL(host, port, context=context, timeout=15)
    else:
        server = smtplib.SMTP(host, port, timeout=15)
        server.ehlo()
        try:
            server.starttls(context=ssl.create_default_context())
            server.ehlo()
        except smtplib.SMTPNotSupportedError:
            # Server doesn't support STARTTLS — continue with plain
            pass

    server.login(user, password)
    return server


# ─── Endpoints ────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "Techub SMTP Server"}


@app.post("/test-connection")
def test_connection():
    """Tests SMTP connectivity using credentials stored in the database."""
    try:
        cfg = get_smtp_settings()
        server = create_smtp_connection(
            host=cfg["smtp_host"],
            port=int(cfg["smtp_port"]),
            user=cfg["smtp_user"],
            password=cfg["smtp_pass"],
        )
        server.quit()
        return {"success": True, "message": "✅ Conexão SMTP estabelecida com sucesso!"}
    except HTTPException as e:
        return {"success": False, "error": e.detail}
    except smtplib.SMTPAuthenticationError:
        return {"success": False, "error": "Autenticação falhou — verifique usuário e senha SMTP."}
    except smtplib.SMTPConnectError as e:
        return {"success": False, "error": f"Não foi possível conectar ao servidor SMTP: {e}"}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/send-email")
def send_email(req: SendEmailRequest):
    """Sends an email using credentials stored in the database."""
    try:
        cfg = get_smtp_settings()

        msg = MIMEMultipart("mixed")
        msg["From"] = cfg["smtp_from"]
        msg["To"] = req.to
        msg["Subject"] = req.subject

        # HTML body
        msg.attach(MIMEText(req.body, "html", "utf-8"))

        # Optional ICS attachment
        if req.ics_content:
            ics_part = MIMEBase("text", "calendar", method="REQUEST", charset="utf-8")
            ics_part.set_payload(req.ics_content.encode("utf-8"))
            encoders.encode_base64(ics_part)
            ics_part.add_header(
                "Content-Disposition",
                "attachment",
                filename=req.ics_filename or "invite.ics"
            )
            msg.attach(ics_part)

        server = create_smtp_connection(
            host=cfg["smtp_host"],
            port=int(cfg["smtp_port"]),
            user=cfg["smtp_user"],
            password=cfg["smtp_pass"],
        )
        server.sendmail(cfg["smtp_from"], req.to, msg.as_string())
        server.quit()

        return {"success": True, "message": f"✅ Email enviado para {req.to}"}
    except HTTPException as e:
        return {"success": False, "error": e.detail}
    except smtplib.SMTPAuthenticationError:
        return {"success": False, "error": "Autenticação falhou — verifique usuário e senha SMTP."}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/send-test-email")
def send_test_email(to: str):
    """Sends a quick test email to validate the full SMTP flow."""
    return send_email(SendEmailRequest(
        to=to,
        subject="✅ Techub POC — Teste de Email",
        body="""
        <html><body style="font-family: Arial, sans-serif; background: #0a0a0a; color: #f4f4f5; padding: 32px;">
            <div style="max-width: 520px; margin: auto; background: #18181b; padding: 32px; border-radius: 16px; border: 1px solid #27272a;">
                <h2 style="color: #00D26A; margin-top: 0;">✅ Email de Teste</h2>
                <p>Este é um email automático de teste gerado pelo sistema <strong>Techub POC</strong>.</p>
                <p>Se você recebeu esta mensagem, as configurações de SMTP estão funcionando corretamente.</p>
                <hr style="border-color: #27272a; margin: 24px 0;" />
                <p style="color: #71717a; font-size: 12px;">Techub POC Scheduling System</p>
            </div>
        </body></html>
        """
    ))


@app.post("/send-invite")
def send_invite(poc_id: str):
    """
    Generates an ICS invite and sends it to all participants of a POC.
    This replaces the 'send-invite' Supabase Edge Function to avoid TCP blocks.
    """
    try:
        # 1. Fetch POC and related data
        res = supabase.table("pocs").select("*, poc_types(name, duration_hours), analysts(name, microsoft_email)").eq("id", poc_id).single().execute()
        poc = res.data
        if not poc:
            return {"success": False, "error": "POC não encontrada."}
            
        # 2. Setup times
        start_dt = datetime.fromisoformat(f"{poc['scheduled_date']}T{poc['requested_time']}:00")
        duration = poc.get("duration_hours") or poc["poc_types"]["duration_hours"] or 4
        end_dt = start_dt + timedelta(hours=duration)
        
        # 3. Generate ICS
        def format_ics_date(dt):
            return dt.strftime("%Y%m%dT%H%M%SZ")

        summary = f"Homologação Techub: {poc['poc_types']['name']} - {poc['client_name']}"
        description = (
            f"POC {poc['poc_code']}\\n"
            f"Cliente: {poc['client_name']}\\n"
            f"Tipo: {poc['poc_types']['name']}\\n"
            f"Local: {poc['address']}\\n\\n"
            f"Participantes:\\n"
            f"- Analista: {poc['analysts']['name']}\\n"
            f"- Comercial: {poc['commercial_contact_name'] or poc['commercial_owner']}\\n"
            f"- Fabricante: {poc['manufacturer_contact_name'] or 'N/A'}"
        ).replace("\n", "\\n")

        ics_lines = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//Techub//Scheduling//PT",
            "METHOD:REQUEST",
            "BEGIN:VEVENT",
            f"UID:{poc['id']}@techub.com.br",
            f"DTSTAMP:{format_ics_date(datetime.utcnow())}",
            f"DTSTART:{format_ics_date(start_dt)}",
            f"DTEND:{format_ics_date(end_dt)}",
            f"SUMMARY:{summary}",
            f"DESCRIPTION:{description}",
            f"LOCATION:{poc['address']}",
            "STATUS:CONFIRMED",
            "SEQUENCE:0",
            "END:VEVENT",
            "END:VCALENDAR"
        ]
        ics_content = "\r\n".join(ics_lines)

        # 4. Prepare email
        cfg = get_smtp_settings()
        recipients = [
            poc["analysts"]["microsoft_email"],
            poc["contact_email"],
            poc["commercial_contact_email"],
            poc["manufacturer_contact_email"],
        ]
        recipients = [r for r in recipients if r] # filter nulls

        if not recipients:
            return {"success": False, "error": "Nenhum destinatário encontrado."}

        msg = MIMEMultipart("mixed")
        msg["From"] = cfg["smtp_from"]
        msg["To"] = ", ".join(recipients)
        msg["Subject"] = f"📅 Convite: {summary}"

        html_body = f"""
        <html><body style="font-family: Arial, sans-serif; color: #333;">
            <h2 style="color: #00D26A;">Solicitação de Homologação Aprovada</h2>
            <p>Olá, uma nova homologação foi agendada para você.</p>
            <div style="background: #f4f4f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>POC:</strong> {poc['poc_code']}</p>
                <p><strong>Cliente:</strong> {poc['client_name']}</p>
                <p><strong>Data:</strong> {poc['scheduled_date']} às {poc['requested_time']}</p>
                <p><strong>Local:</strong> {poc['address']}</p>
            </div>
            <p>O convite de calendário foi anexado a este email.</p>
        </body></html>
        """
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        # Attach ICS
        ics_part = MIMEBase("text", "calendar", method="REQUEST", charset="utf-8")
        ics_part.set_payload(ics_content.encode("utf-8"))
        encoders.encode_base64(ics_part)
        ics_part.add_header("Content-Disposition", "attachment", filename="convite.ics")
        ics_part.add_header("Content-Class", "urn:content-classes:calendarmessage")
        msg.attach(ics_part)

        # 5. Send
        server = create_smtp_connection(
            host=cfg["smtp_host"],
            port=int(cfg["smtp_port"]),
            user=cfg["smtp_user"],
            password=cfg["smtp_pass"],
        )
        server.sendmail(cfg["smtp_from"], recipients, msg.as_string())
        server.quit()

        # 6. Update POC status
        supabase.table("pocs").update({"invite_sent_at": datetime.utcnow().isoformat()}).eq("id", poc_id).execute()

        return {"success": True, "message": f"Convite enviado com sucesso para {len(recipients)} pessoas."}

    except Exception as e:
        return {"success": False, "error": str(e)}
