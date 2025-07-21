import brevo from "@getbrevo/brevo";
import dotenv from "dotenv";
dotenv.config();

const apiInstance = new brevo.TransactionalEmailsApi();
apiInstance.setApiKey(
  brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.APIKEY_BREVO
);

/**
 * Envía un correo de confirmación al usuario.
 * @param {Object} params - Parámetros para el correo.
 * @param {string} params.name - Nombre del destinatario.
 * @param {string} params.email - Correo del destinatario.
 * @param {string} params.token - Token de confirmación.
 */
export const sendVerificationEmail = async ({ name, email, token }) => {
  try {
    const sendSmtpEmail = new brevo.SendSmtpEmail();

    sendSmtpEmail.subject = "Verify your account";
    sendSmtpEmail.to = [{ email, name }];
    sendSmtpEmail.sender = {
      name: "Crete Valley DSS",
      email: "cretevalleydss@ujaen.es", // Debe estar verificado en Brevo
    };
    sendSmtpEmail.htmlContent = `
      <html>
        <body style="font-family: Arial, sans-serif;">
          <h2>Welcome to Crete Valley DSS, ${name}!</h2>
          <p>Thank you for registering with us. We're excited to have you on board!</p>
          <p>To complete your registration, please verify your account by clicking the button below:</p>
          <p>
            <a href="${process.env.ORIGIN_BACK}/auth/accountConfirm/${token}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; font-weight: bold; border-radius: 5px;">Verify Account</a>
          </p>
          <p>If you did not sign up for this account, you can ignore this email.</p>
          <p>Best regards,<br/>Crete Valley DSS Team</p>
        </body>
      </html>
    `;

    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    return { success: true };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error };
  }
};

/**
 * Envía un correo para confirmar el cambio de email del usuario.
 * @param {Object} params - Parámetros del correo.
 * @param {string} params.newEmail - Nueva dirección de correo.
 * @param {string} params.token - Token para confirmar el nuevo correo.
 */
export const sendEmailChangeConfirmation = async ({ newEmail, token }) => {
  try {
    const sendSmtpEmail = new brevo.SendSmtpEmail();

    sendSmtpEmail.subject = "Confirm your email change";
    sendSmtpEmail.to = [{ email: newEmail }];
    sendSmtpEmail.sender = {
      name: "Crete Valley DSS",
      email: "cretevalleydss@ujaen.es", // Debe estar verificado en Brevo
    };
    sendSmtpEmail.htmlContent = `
      <html>
        <body style="font-family: Arial, sans-serif;">
          <h2>Email Change Request</h2>
          <p>Click the button below to confirm your new email address:</p>
          <p>
            <a href="${process.env.ORIGIN_BACK}/auth/confirmEmailChange/${token}"
               style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; font-weight: bold; border-radius: 5px;">
              Confirm Email Change
            </a>
          </p>
          <p>If you did not request this change, please ignore this email.</p>
          <p>Best regards,<br/>Crete Valley DSS Team</p>
        </body>
      </html>
    `;

    // Enviar correo usando Brevo
    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    return { success: true };
  } catch (error) {
    console.error("Error sending email change confirmation:", error);
    return { success: false, error };
  }
};

/**
 * Envía un correo invitando a un experto a un issue.
 * @param {Object} params - Parámetros del correo.
 * @param {string} params.expertEmail - Email del experto invitado.
 * @param {string} params.issueName - Nombre del issue.
 * @param {string} params.issueDescription - Descripción del issue.
 * @param {string} params.adminEmail - Email del administrador que invita.
 */
export const sendExpertInvitationEmail = async ({ expertEmail, issueName, issueDescription, adminEmail }) => {
  try {
    const sendSmtpEmail = new brevo.SendSmtpEmail()

    sendSmtpEmail.subject = `You have been invited to an issue`
    sendSmtpEmail.to = [{ email: expertEmail }]
    sendSmtpEmail.sender = {
      name: "Crete Valley DSS",
      email: "cretevalleydss@ujaen.es", // Debe estar verificado en Brevo
    }
    sendSmtpEmail.htmlContent = `
      <html>
        <body style="font-family: Arial, sans-serif;">
          <h2>You have been invited to the issue "${issueName}"</h2>
          <p>${adminEmail} has invited you as an expert for the issue ${issueName}. The issue description is as follows:</p>
          <p>${issueDescription}</p>
          <p>You will need to accept the invitation to participate in this issue.</p>
          <p>Best regards,<br/>The Service Team</p>
        </body>
      </html>
    `

    // Enviar correo usando Brevo
    await apiInstance.sendTransacEmail(sendSmtpEmail)
    return { success: true }
  } catch (error) {
    console.error("Error sending expert invitation email:", error)
    return { success: false, error }
  }
}
