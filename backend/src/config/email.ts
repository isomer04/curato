import sgMail from '@sendgrid/mail';
import { env, EnvConfig } from './env';
import { logger } from './logger';

const envCfg: EnvConfig = env;

/**
 * Email sending via SendGrid Web API.
 * Configure with a single environment variable:
 *   SENDGRID_API_KEY  — your SendGrid API key (starts with SG.)
 *   EMAIL_FROM        — verified sender address in your SendGrid account
 */

interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content?: string | Buffer;
    path?: string;
    contentType?: string;
  }>;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  previewUrl?: string | false;
  error?: string;
}

let initialized = false;

/**
 * Initialise the SendGrid client with the API key.
 * Called once at server startup.
 */
export const initializeEmailTransporter = (): void => {
  if (initialized) return;

  if (!envCfg.sendgridApiKey) {
    logger.warn('⚠️  No SENDGRID_API_KEY found. Email sending is disabled.');
    return;
  }

  sgMail.setApiKey(envCfg.sendgridApiKey);
  initialized = true;
  logger.info(`📧 SendGrid email client initialised (from: ${envCfg.emailFromAddress})`);
};

/**
 * Send an email via SendGrid Web API.
 */
export const sendEmail = async (options: EmailOptions): Promise<EmailResult> => {
  try {
    if (!initialized) {
      initializeEmailTransporter();
    }

    if (!initialized) {
      logger.warn('Email not sent — SendGrid not configured');
      return { success: false, error: 'SENDGRID_API_KEY not configured' };
    }

    const toAddresses = Array.isArray(options.to) ? options.to : [options.to];

    const msg: sgMail.MailDataRequired = {
      to: toAddresses,
      from: options.from || `"Healthcare System" <${envCfg.emailFromAddress}>`,
      subject: options.subject,
      text: options.text ?? options.subject,
      ...(options.html !== undefined && { html: options.html }),
      ...(options.replyTo !== undefined && { replyTo: options.replyTo }),
    };

    const [response] = await sgMail.send(msg);
    const messageId = (response.headers as Record<string, string>)['x-message-id'];

    logger.info(`📧 Email sent successfully to: ${toAddresses.join(', ')}`);

    return { success: true, messageId };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown email error';
    logger.error(`📧 Failed to send email: ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
};

export const isEmailConfigured = (): boolean => initialized;

export type { EmailOptions, EmailResult };
