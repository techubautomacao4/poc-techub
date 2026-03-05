import nodemailer from "nodemailer";

/**
 * Envia um email utilizando as configurações de SMTP fornecidas.
 * @param {Object} params - Parâmetros para o envio de email.
 */
export async function sendEmail({
    host,
    port,
    secure,
    user,
    pass,
    from,
    to,
    subject,
    html,
    attachments = []
}) {
    const transporter = nodemailer.createTransport({
        host,
        port: Number(port),
        secure: secure === true || secure === "true", // 465 true, 587 false
        auth: {
            user,
            pass,
        },
        tls: {
            // Necessário para alguns provedores que usam certificados auto-assinados ou STARTTLS
            rejectUnauthorized: false
        }
    });

    // Verifica a conexão antes de tentar enviar
    try {
        await transporter.verify();
    } catch (error) {
        console.error("Erro na verificação do transportador SMTP:", error);
        throw new Error(`Falha na conexão SMTP: ${error.message}`);
    }

    const mailOptions = {
        from,
        to,
        subject,
        html,
        attachments
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email enviado: %s", info.messageId);
    return info;
}
