import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from './emailService.js';

dotenv.config({ path: '../.env' });

const app = express();
const port = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('ERRO: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não configurados no .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// --- 5. LOGS E DEPURAÇÃO (Padrão profissional requisitado) ---
const logPath = path.join(process.cwd(), 'notification_debug.log');

function logNotification(details) {
    const timestamp = new Date().toLocaleString('pt-BR');
    const status = details.success ? '✅ SUCESSO' : '❌ ERRO';
    const logEntry = `[${timestamp}] [${status}] TO: ${details.to} | SUBJECT: ${details.subject} ${details.error ? '| ERROR: ' + details.error : ''}\n`;

    console.log(logEntry.trim());
    try {
        fs.appendFileSync(logPath, logEntry);
    } catch (err) {
        console.error('Falha ao escrever no log:', err);
    }
}

// --- 3. SISTEMA DE TEMPLATES ---
function renderTemplate(templateName, vars) {
    const templates = {
        APPROVE_POC: `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
                <div style="background: #00D26A; padding: 24px; color: black; text-align: center;">
                    <h2 style="margin: 0;">Homologação Aprovada - Convite Analista</h2>
                </div>
                <div style="padding: 32px; background: white;">
                    <p>Olá, uma nova homologação foi agendada e você é o analista responsável.</p>
                    <div style="background: #f8f9fa; padding: 24px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #00D26A;">
                        <p style="margin: 0 0 8px 0;"><strong>POC:</strong> {{poc_code}}</p>
                        <p style="margin: 0 0 8px 0;"><strong>Cliente:</strong> {{client_name}}</p>
                        <p style="margin: 0 0 8px 0;"><strong>Analista:</strong> {{analyst_name}}</p>
                        <p style="margin: 0 0 8px 0;"><strong>Data:</strong> {{scheduled_date}} às {{requested_time}}</p>
                        <p style="margin: 0;"><strong>Local:</strong> {{address}}</p>
                    </div>
                    <p>O convite de calendário (ICS) foi anexado a este email para sincronização com seu Outlook/Google.</p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 32px 0;" />
                    <p style="font-size: 12px; color: #999; text-align: center;">Sistema Techub POC Automação</p>
                </div>
            </div>
        `,
        APPROVE_POC_CLIENT: `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
                <div style="background: #00D26A; padding: 24px; color: black; text-align: center;">
                    <h2 style="margin: 0;">Sua Solicitação de Homologação foi Aprovada</h2>
                </div>
                <div style="padding: 32px; background: white;">
                    <p>Olá, temos uma ótima notícia! Sua solicitação de homologação foi aprovada pelo nosso time.</p>
                    <div style="background: #f8f9fa; padding: 24px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #00D26A;">
                        <p style="margin: 0 0 8px 0;"><strong>POC:</strong> {{poc_code}}</p>
                        <p style="margin: 0 0 8px 0;"><strong>Cliente:</strong> {{client_name}}</p>
                        <p style="margin: 0 0 8px 0;"><strong>Analista Responsável:</strong> {{analyst_name}}</p>
                        <p style="margin: 0 0 8px 0;"><strong>Data Agendada:</strong> {{scheduled_date}} às {{requested_time}}</p>
                        <p style="margin: 0;"><strong>Local:</strong> {{address}}</p>
                    </div>
                    <p>O analista designado entrará em contato em breve, ou comparecerá ao local no horário agendado.</p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 32px 0;" />
                    <p style="font-size: 12px; color: #999; text-align: center;">Sistema Techub POC Automação</p>
                </div>
            </div>
        `,
        REJECT_POC_CLIENT: `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
                <div style="background: #EF4444; padding: 24px; color: white; text-align: center;">
                    <h2 style="margin: 0;">Atualização de Solicitação de Homologação</h2>
                </div>
                <div style="padding: 32px; background: white;">
                    <p>Olá. Informamos que a solicitação de homologação (POC) foi recusada após análise técnica/comercial.</p>
                    <div style="background: #f8f9fa; padding: 24px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #EF4444;">
                        <p style="margin: 0 0 8px 0;"><strong>POC:</strong> {{poc_code}}</p>
                        <p style="margin: 0 0 8px 0;"><strong>Cliente:</strong> {{client_name}}</p>
                    </div>
                    <p>Para mais informações sobre o motivo da recusa, por favor entre em contato com nosso time responsável.</p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 32px 0;" />
                    <p style="font-size: 12px; color: #999; text-align: center;">Sistema Techub POC Automação</p>
                </div>
            </div>
        `,
        TEST_EMAIL: `
            <div style="font-family: Arial, sans-serif; background: #0a0a0a; color: #f4f4f5; padding: 32px;">
                <div style="max-width: 520px; margin: auto; background: #18181b; padding: 32px; border-radius: 16px; border: 1px solid #27272a;">
                    <h2 style="color: #00D26A; margin-top: 0;">✅ Email de Teste</h2>
                    <p>Este é um email de teste disparado pelo novo backend <strong>Pro</strong>.</p>
                    <p>Se você recebeu esta mensagem, o roteamento SMTP via Nodemailer está operando corretamente e puxando os dados do banco.</p>
                    <hr style="border-color: #27272a; margin: 24px 0;" />
                    <p style="color: #71717a; font-size: 12px;">Techub POC Scheduling System</p>
                </div>
            </div>
        `
    };

    let html = templates[templateName] || '';
    Object.keys(vars).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        html = html.replace(regex, vars[key] || 'Não informado');
    });
    return html;
}

// Helper para buscar configurações de SMTP no banco (Totalmente Dinâmico)
async function getSmtpSettings() {
    const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .like('key', 'smtp_%');

    if (error) throw error;

    const settings = {};
    data.forEach(row => { settings[row.key] = row.value; });

    // Fallback de Senha: se 'smtp_pass' estiver vazio, tenta 'smtp_password'
    const finalPass = settings.smtp_pass || settings.smtp_password;
    // Fallback de Remetente: se 'smtp_from' estiver vazio, tenta 'smtp_from_email'
    const finalFrom = settings.smtp_from || settings.smtp_from_email;

    const required = ['smtp_host', 'smtp_port', 'smtp_user'];
    const missing = required.filter(k => !settings[k]);

    if (missing.length > 0 || !finalPass || !finalFrom) {
        throw new Error(`Configurações SMTP incompletas no Banco. Verifique Host, Porta, Usuário, Senha e Remetente.`);
    }

    return {
        ...settings,
        smtp_pass: finalPass,
        smtp_from: finalFrom,
        // Formato amigável do remetente
        formatted_from: settings.smtp_from_name
            ? `"${settings.smtp_from_name}" <${finalFrom}>`
            : finalFrom
    };
}

// --- ENDPOINTS ---

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'Techub Backend v2 Pro' });
});

// Endpoint: Testar Conexão (Botão nas Configurações)
app.post('/test-connection', async (req, res) => {
    try {
        const cfg = await getSmtpSettings();
        await sendEmail({
            host: cfg.smtp_host,
            port: cfg.smtp_port,
            secure: cfg.smtp_port === '465',
            user: cfg.smtp_user,
            pass: cfg.smtp_pass,
            from: cfg.formatted_from,
            to: cfg.smtp_user,
            subject: 'Teste de Conexão SMTP',
            html: '<p>Teste de conexão bem sucedido!</p>'
        });
        res.json({ success: true, message: '✅ Conexão estabelecida e email enviado!' });
    } catch (error) {
        logNotification({ to: 'Test', subject: 'Falha Teste Conexão', success: false, error: error.message });
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint: Enviar Email de Teste (UI)
app.post('/send-test-email', async (req, res) => {
    const { to } = req.query;
    if (!to) return res.status(400).json({ success: false, error: 'Destinatário ausente.' });

    try {
        const cfg = await getSmtpSettings();
        const html = renderTemplate('TEST_EMAIL', {});
        await sendEmail({
            host: cfg.smtp_host,
            port: cfg.smtp_port,
            secure: cfg.smtp_port === '465',
            user: cfg.smtp_user,
            pass: cfg.smtp_pass,
            from: cfg.formatted_from,
            to,
            subject: '✅ Techub POC — Teste de Email (Node.js Pro)',
            html
        });
        logNotification({ to, subject: 'Email de Teste', success: true });
        res.json({ success: true, message: `✅ Email enviado para ${to}` });
    } catch (error) {
        logNotification({ to: to || 'N/A', subject: 'Falha Email Teste', success: false, error: error.message });
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint: Aprovar POC (Gatilho da Central de Análise)
app.post('/approve-poc', async (req, res) => {
    const { poc_id } = req.query;
    if (!poc_id) return res.status(400).json({ success: false, error: 'poc_id ausente.' });

    try {
        const cfg = await getSmtpSettings();

        // 1. Detalhes da POC
        const { data: poc, error: pocError } = await supabase
            .from('pocs')
            .select('*, poc_types(name, duration_hours)')
            .eq('id', poc_id)
            .single();

        if (pocError || !poc) throw new Error('POC não encontrada.');

        // 2. Round Robin
        const isSoftware = (poc.poc_types.name.toUpperCase() || '').includes('SOFTWARE');
        const requiredTag = isSoftware ? 'SOFTWARE' : 'HARDWARE';

        let { data: analysts } = await supabase
            .from('analysts')
            .select('*')
            .eq('active', true)
            .order('last_assigned_at', { ascending: true, nullsFirst: true });

        if (!analysts || analysts.length === 0) throw new Error('Nenhum analista ativo.');

        let selectedAnalyst = analysts.find(a => a.type_tag === requiredTag || a.type_tag === 'HARDWARE_SOFTWARE');
        if (!selectedAnalyst) selectedAnalyst = analysts[0];

        // 3. Persistência
        const now = new Date().toISOString();
        await supabase.from('pocs').update({
            assigned_analyst_id: selectedAnalyst.id,
            status: 'SCHEDULED',
            updated_at: now
        }).eq('id', poc_id);

        await supabase.from('analysts').update({ last_assigned_at: now }).eq('id', selectedAnalyst.id);

        // 4. Datas
        const datePart = poc.scheduled_date.split('T')[0];
        const timePart = poc.requested_time || '09:00';
        const startTime = new Date(`${datePart}T${timePart}:00`);
        const duration = poc.duration_hours || poc.poc_types.duration_hours || 4;
        const endTime = new Date(startTime.getTime() + duration * 60 * 60 * 1000);

        // 5. ICS
        const formatDateICS = (date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        const icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Techub//POC System//PT',
            'METHOD:REQUEST',
            'BEGIN:VEVENT',
            `UID:${poc.id}@techub.com.br`,
            `DTSTAMP:${formatDateICS(new Date())}`,
            `DTSTART:${formatDateICS(startTime)}`,
            `DTEND:${formatDateICS(endTime)}`,
            `SUMMARY:Homologação: ${poc.client_name}`,
            `DESCRIPTION:POC ${poc.poc_code}\\nAnalista: ${selectedAnalyst.name}`,
            `ATTENDEE;RSVP=TRUE:mailto:${selectedAnalyst.microsoft_email}`,
            `ORGANIZER;CN="Sistema Techub":mailto:noreply@techub.com.br`,
            'END:VEVENT',
            'END:VCALENDAR'
        ].join('\r\n');

        // 6. Temples & Variáveis
        const vars = {
            poc_code: poc.poc_code,
            client_name: poc.client_name,
            analyst_name: selectedAnalyst.name,
            scheduled_date: datePart,
            requested_time: timePart,
            address: poc.address || 'Remoto'
        };

        const htmlAnalyst = renderTemplate('APPROVE_POC', vars);
        const htmlClient = renderTemplate('APPROVE_POC_CLIENT', vars);

        // A. Enviar email para o ANALISTA com ICS
        await sendEmail({
            host: cfg.smtp_host,
            port: cfg.smtp_port,
            secure: cfg.smtp_port === '465',
            user: cfg.smtp_user,
            pass: cfg.smtp_pass,
            from: cfg.formatted_from,
            to: selectedAnalyst.microsoft_email,
            subject: `📅 Convite de Homologação: ${poc.client_name}`,
            html: htmlAnalyst,
            icalEvent: {
                filename: 'convite.ics',
                method: 'request',
                content: icsContent
            }
        });

        // B. Enviar email para Solicitante/Cliente sem ICS
        const clientRecipientsRaw = [poc.contact_email, poc.commercial_contact_email, poc.manufacturer_contact_email].filter(Boolean);
        const uniqueClientRecipients = [...new Set(clientRecipientsRaw)].filter(e => e !== selectedAnalyst.microsoft_email).join(', ');

        if (uniqueClientRecipients) {
            await sendEmail({
                host: cfg.smtp_host,
                port: cfg.smtp_port,
                secure: cfg.smtp_port === '465',
                user: cfg.smtp_user,
                pass: cfg.smtp_pass,
                from: cfg.formatted_from,
                to: uniqueClientRecipients,
                subject: `Techub POC: Solicitação Aprovada - ${poc.client_name}`,
                html: htmlClient
            });
        }

        logNotification({ to: `Analyst: ${selectedAnalyst.microsoft_email} | Clients: ${uniqueClientRecipients}`, subject: 'Aprovação de POC', success: true });

        res.json({ success: true, message: `Aprovado! Analista: ${selectedAnalyst.name}` });

    } catch (error) {
        logNotification({ to: 'N/A', subject: 'Falha na Aprovação', success: false, error: error.message });
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint: Recusar POC (Notifica o Cliente)
app.post('/reject-poc', async (req, res) => {
    const { poc_id } = req.query;
    if (!poc_id) return res.status(400).json({ success: false, error: 'poc_id ausente.' });

    try {
        const cfg = await getSmtpSettings();

        // 1. Detalhes da POC
        const { data: poc, error: pocError } = await supabase
            .from('pocs')
            .select('*')
            .eq('id', poc_id)
            .single();

        if (pocError || !poc) throw new Error('POC não encontrada.');

        // 2. Persistência
        const now = new Date().toISOString();
        await supabase.from('pocs').update({
            status: 'REJECTED',
            updated_at: now
        }).eq('id', poc_id);

        // 3. Template & Envio
        const vars = {
            poc_code: poc.poc_code,
            client_name: poc.client_name,
        };

        const htmlClient = renderTemplate('REJECT_POC_CLIENT', vars);

        const clientRecipientsRaw = [poc.contact_email, poc.commercial_contact_email, poc.manufacturer_contact_email].filter(Boolean);
        const uniqueClientRecipients = [...new Set(clientRecipientsRaw)].join(', ');

        if (uniqueClientRecipients) {
            await sendEmail({
                host: cfg.smtp_host,
                port: cfg.smtp_port,
                secure: cfg.smtp_port === '465',
                user: cfg.smtp_user,
                pass: cfg.smtp_pass,
                from: cfg.formatted_from,
                to: uniqueClientRecipients,
                subject: `Techub POC: Solicitação Recusada - ${poc.client_name}`,
                html: htmlClient
            });
        }

        logNotification({ to: uniqueClientRecipients || 'N/A', subject: 'Recusa de POC', success: true });

        res.json({ success: true, message: 'POC Recusada e contatos notificados.' });

    } catch (error) {
        logNotification({ to: 'N/A', subject: 'Falha na Recusa', success: false, error: error.message });
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Servidor Techub Pro rodando em http://localhost:${port}`);
    console.log(`Logs sendo gravados em: ${logPath}`);
});
