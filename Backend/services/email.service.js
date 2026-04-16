import brevo from "@getbrevo/brevo";
import dotenv from "dotenv";
import { createInternalError } from "../utils/common/errors.js";

dotenv.config();

const apiInstance = new brevo.TransactionalEmailsApi();

const DEFAULT_SENDER = {
  name: "Crete Valley DSS",
  email: "cretevalleydss@ujaen.es",
};

apiInstance.setApiKey(
  brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.APIKEY_BREVO
);

/**
 * Construye un email transaccional de Brevo.
 *
 * @param {Object} params Datos del email.
 * @param {string} params.subject Asunto del correo.
 * @param {Array<Object>} params.to Destinatarios.
 * @param {string} params.htmlContent Contenido HTML del correo.
 * @returns {Object}
 */
const createEmail = ({ subject, to, htmlContent }) => {
  const email = new brevo.SendSmtpEmail();
  email.subject = subject;
  email.to = to;
  email.sender = DEFAULT_SENDER;
  email.htmlContent = htmlContent;

  return email;
};

/**
 * Envía un email transaccional y propaga un error tipado si falla.
 *
 * @param {Object} email Mensaje de Brevo ya construido.
 * @param {string} failureMessage Mensaje interno para el error.
 * @returns {Promise<Object>}
 */
const sendTransactionalEmail = async (email, failureMessage) => {
  try {
    return await apiInstance.sendTransacEmail(email);
  } catch (error) {
    console.error(failureMessage, error);

    throw createInternalError(failureMessage, {
      expose: false,
      cause: error,
    });
  }
};

/**
 * Envía un correo de verificación de cuenta.
 *
 * @param {Object} params Datos del correo.
 * @param {string} params.name Nombre del destinatario.
 * @param {string} params.email Email del destinatario.
 * @param {string} params.token Token de confirmación.
 * @returns {Promise<Object>}
 */
export const sendVerificationEmail = async ({ name, email, token }) => {
  const message = createEmail({
    subject: "Verify your account",
    to: [{ email, name }],
    htmlContent: `
      <html>
        <body style="font-family: Arial, sans-serif;">
          <h2>Welcome to Crete Valley DSS, ${name}!</h2>
          <p>Thank you for registering with us. We're excited to have you on board!</p>
          <p>To complete your registration, please verify your account by clicking the button below:</p>
          <p>
            <a
              href="${process.env.ORIGIN_BACK}/auth/accountConfirm/${token}"
              style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; font-weight: bold; border-radius: 5px;"
            >
              Verify Account
            </a>
          </p>
          <p>If you did not sign up for this account, you can ignore this email.</p>
          <p>Best regards,<br/>Crete Valley DSS Team</p>
        </body>
      </html>
    `,
  });

  return sendTransactionalEmail(
    message,
    "Failed to send verification email."
  );
};

/**
 * Envía un correo para confirmar el cambio de email.
 *
 * @param {Object} params Datos del correo.
 * @param {string} params.newEmail Nuevo email.
 * @param {string} params.token Token de confirmación.
 * @returns {Promise<Object>}
 */
export const sendEmailChangeConfirmation = async ({ newEmail, token }) => {
  const message = createEmail({
    subject: "Confirm your email change",
    to: [{ email: newEmail }],
    htmlContent: `
      <html>
        <body style="font-family: Arial, sans-serif;">
          <h2>Email Change Request</h2>
          <p>Click the button below to confirm your new email address:</p>
          <p>
            <a
              href="${process.env.ORIGIN_BACK}/auth/confirmEmailChange/${token}"
              style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; font-weight: bold; border-radius: 5px;"
            >
              Confirm Email Change
            </a>
          </p>
          <p>If you did not request this change, please ignore this email.</p>
          <p>Best regards,<br/>Crete Valley DSS Team</p>
        </body>
      </html>
    `,
  });

  return sendTransactionalEmail(
    message,
    "Failed to send email change confirmation."
  );
};

/**
 * Envía un correo de invitación a un experto.
 *
 * @param {Object} params Datos del correo.
 * @param {string} params.expertEmail Email del experto.
 * @param {string} params.issueName Nombre del issue.
 * @param {string} params.issueDescription Descripción del issue.
 * @param {string} params.adminEmail Email del administrador.
 * @returns {Promise<Object>}
 */
export const sendExpertInvitationEmail = async ({
  expertEmail,
  issueName,
  issueDescription,
  adminEmail,
}) => {
  const message = createEmail({
    subject: "You have been invited to an issue",
    to: [{ email: expertEmail }],
    htmlContent: `
      <html>
        <body style="font-family: Arial, sans-serif;">
          <h2>You have been invited to the issue "${issueName}"</h2>
          <p>${adminEmail} has invited you as an expert for the issue ${issueName}. The issue description is as follows:</p>
          <p>${issueDescription}</p>
          <p>You will need to accept the invitation to participate in this issue.</p>
          <p>Best regards,<br/>The Service Team</p>
        </body>
      </html>
    `,
  });

  return sendTransactionalEmail(
    message,
    "Failed to send expert invitation email."
  );
};