import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
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

// Helper para buscar configurações de SMTP no banco
async function getSmtpSettings() {
    const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .in('key', ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from']);

    if (error) throw error;

    const settings = {};
    data.forEach(row => { settings[row.key] = row.value; });

    const required = ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from'];
    const missing = required.filter(k => !settings[k]);

    if (missing.length > 0) {
        throw new Error(`Configurações SMTP incompletas: ${missing.join(', ')}`);
    }

    return settings;
}

// Endpoint de saúde
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'Techub SMTP Node Server' });
});

// Endpoint: Testar Conexão
app.post('/test-connection', async (req, res) => {
    try {
        const cfg = await getSmtpSettings();

        // No Nodemailer, o verify() já testa a conexão
        await sendEmail({
            host: cfg.smtp_host,
            port: cfg.smtp_port,
            secure: cfg.smtp_port === '465',
            user: cfg.smtp_user,
            pass: cfg.smtp_pass,
            from: cfg.smtp_from,
            to: cfg.smtp_user, // Envia para o próprio usuário para testar
            subject: 'Teste de Conexão SMTP',
            html: '<p>Teste de conexão bem sucedido!</p>'
        });

        res.json({ success: true, message: '✅ Conexão SMTP estabelecida e email de teste enviado!' });
    } catch (error) {
        console.error('Erro no test-connection:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint: Enviar Email de Teste (UI)
app.post('/send-test-email', async (req, res) => {
    const { to } = req.query;
    if (!to) return res.status(400).json({ success: false, error: 'Destinatário ausente.' });

    try {
        const cfg = await getSmtpSettings();

        await sendEmail({
            host: cfg.smtp_host,
            port: cfg.smtp_port,
            secure: cfg.smtp_port === '465',
            user: cfg.smtp_user,
            pass: cfg.smtp_pass,
            from: cfg.smtp_from,
            to,
            subject: '✅ Techub POC — Teste de Email (Node.js)',
            html: `
                <div style="font-family: Arial, sans-serif; background: #0a0a0a; color: #f4f4f5; padding: 32px;">
                    <div style="max-width: 520px; margin: auto; background: #18181b; padding: 32px; border-radius: 16px; border: 1px solid #27272a;">
                        <h2 style="color: #00D26A; margin-top: 0;">✅ Email de Teste</h2>
                        <p>Este é um email de teste disparado pelo novo backend <strong>Node.js</strong>.</p>
                        <p>Se você recebeu esta mensagem, o roteamento SMTP via Nodemailer está operando corretamente.</p>
                        <hr style="border-color: #27272a; margin: 24px 0;" />
                        <p style="color: #71717a; font-size: 12px;">Techub POC Scheduling System</p>
                    </div>
                </div>
            `
        });

        res.json({ success: true, message: `✅ Email enviado para ${to}` });
    } catch (error) {
        console.error('Erro no send-test-email:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint: Aprovar POC com Sorteio Round Robin
app.post('/approve-poc', async (req, res) => {
    const { poc_id } = req.query;
    if (!poc_id) return res.status(400).json({ success: false, error: 'poc_id ausente.' });

    try {
        const cfg = await getSmtpSettings();

        // 1. Buscar detalhes da POC
        const { data: poc, error: pocError } = await supabase
            .from('pocs')
            .select('*, poc_types(name, duration_hours)')
            .eq('id', poc_id)
            .single();

        if (pocError || !poc) throw new Error('POC não encontrada.');

        // 2. Lógica Round Robin para selecionar Analista
        // Determinamos a tag baseada no tipo da POC
        const isSoftware = (poc.poc_types.name.toUpperCase() || '').includes('SOFTWARE');
        const requiredTag = isSoftware ? 'SOFTWARE' : 'HARDWARE';

        // Buscamos analistas ativos
        let { data: analysts, error: analystsError } = await supabase
            .from('analysts')
            .select('*')
            .eq('active', true)
            .order('last_assigned_at', { ascending: true, nullsFirst: true });

        if (analystsError) throw analystsError;
        if (!analysts || analysts.length === 0) throw new Error('Nenhum analista ativo encontrado no sistema.');

        // Filtramos por tag (se houver analistas com a tag específica, senão pegamos os gerais)
        let selectedAnalyst = analysts.find(a => a.type_tag === requiredTag || a.type_tag === 'HARDWARE_SOFTWARE');

        // Se ainda não achou, pega o primeiro da fila (mais antigo)
        if (!selectedAnalyst) selectedAnalyst = analysts[0];

        console.log(`[Round Robin] Analista selecionado: ${selectedAnalyst.name} para POC ${poc.poc_code}`);

        // 3. Atualizar POC e Analista no Banco (Simulando uma transação lógica)
        const now = new Date().toISOString();

        // Atualiza a POC
        const { error: updatePocError } = await supabase
            .from('pocs')
            .update({
                assigned_analyst_id: selectedAnalyst.id,
                status: 'SCHEDULED',
                updated_at: now
            })
            .eq('id', poc_id);

        if (updatePocError) throw updatePocError;

        // Atualiza o Analista
        await supabase
            .from('analysts')
            .update({ last_assigned_at: now })
            .eq('id', selectedAnalyst.id);

        // 4. Configurar horários para o convite
        // scheduled_date pode vir como ISO string (2026-03-12T00:00:00+00:00) ou apenas data.
        // Pegamos apenas a parte YYYY-MM-DD para garantir consistência.
        const datePart = poc.scheduled_date.split('T')[0];
        const timePart = poc.requested_time || '09:00';

        console.log(`[Debug Date] datePart: ${datePart}, timePart: ${timePart}`);

        const startTime = new Date(`${datePart}T${timePart}:00`);

        if (isNaN(startTime.getTime())) {
            throw new Error(`Data ou hora inválida na POC: ${datePart} ${timePart}`);
        }

        const duration = poc.duration_hours || poc.poc_types.duration_hours || 4;
        const endTime = new Date(startTime.getTime() + duration * 60 * 60 * 1000);

        // 5. Gerar ICS
        const formatDateICS = (date) => {
            if (!date || isNaN(date.getTime())) return new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
            return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        };
        const summary = `Homologação Techub: ${poc.poc_types.name} - ${poc.client_name}`;
        const description = `POC ${poc.poc_code}\nCliente: ${poc.client_name}\nAnalista: ${selectedAnalyst.name}\nTipo: ${poc.poc_types.name}\nLocal: ${poc.address || 'Remoto'}`;

        const icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Techub//Scheduling//PT',
            'METHOD:REQUEST',
            'BEGIN:VEVENT',
            `UID:${poc.id}@techub.com.br`,
            `DTSTAMP:${formatDateICS(new Date())}`,
            `DTSTART:${formatDateICS(startTime)}`,
            `DTEND:${formatDateICS(endTime)}`,
            `SUMMARY:${summary}`,
            `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
            `LOCATION:${poc.address || 'Remoto'}`,
            'STATUS:CONFIRMED',
            'SEQUENCE:0',
            'END:VEVENT',
            'END:VCALENDAR'
        ].join('\r\n');

        // 6. Preparar destinatários
        const recipients = [
            selectedAnalyst.microsoft_email,
            poc.contact_email,
            poc.commercial_contact_email,
            poc.manufacturer_contact_email
        ].filter(Boolean);

        // 7. Enviar Email
        await sendEmail({
            host: cfg.smtp_host,
            port: cfg.smtp_port,
            secure: cfg.smtp_port === '465',
            user: cfg.smtp_user,
            pass: cfg.smtp_pass,
            from: cfg.smtp_from,
            to: recipients.join(', '),
            subject: `📅 Convite: ${summary}`,
            html: `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
                    <div style="background: #00D26A; padding: 24px; color: black; text-align: center;">
                        <h2 style="margin: 0;">Homologação Aprovada</h2>
                    </div>
                    <div style="padding: 32px; background: white;">
                        <p>Olá, uma nova homologação foi agendada e você é o analista responsável.</p>
                        <div style="background: #f8f9fa; padding: 24px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #00D26A;">
                            <p style="margin: 0 0 8px 0;"><strong>POC:</strong> ${poc.poc_code}</p>
                            <p style="margin: 0 0 8px 0;"><strong>Cliente:</strong> ${poc.client_name}</p>
                            <p style="margin: 0 0 8px 0;"><strong>Analista:</strong> ${selectedAnalyst.name}</p>
                            <p style="margin: 0 0 8px 0;"><strong>Data:</strong> ${poc.scheduled_date} às ${poc.requested_time}</p>
                            <p style="margin: 0;"><strong>Local:</strong> ${poc.address || 'Remoto'}</p>
                        </div>
                        <p>O convite de calendário (ICS) foi anexado a este email para sincronização com seu Outlook/Google.</p>
                        <hr style="border: 0; border-top: 1px solid #eee; margin: 32px 0;" />
                        <p style="font-size: 12px; color: #999; text-align: center;">Sistema Techub POC Automação</p>
                    </div>
                </div>
            `,
            attachments: [{
                filename: 'convite.ics',
                content: icsContent,
                contentType: 'text/calendar; charset=utf-8; method=REQUEST'
            }]
        });

        // 8. Marcar envio do convite
        await supabase.from('pocs').update({ invite_sent_at: new Date().toISOString() }).eq('id', poc_id);

        res.json({
            success: true,
            message: `POC aprovada e analista ${selectedAnalyst.name} sorteado com sucesso!`,
            analyst: selectedAnalyst.name
        });

    } catch (error) {
        console.error('Erro no approve-poc:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Servidor SMTP Node rodando em http://localhost:${port}`);
});
