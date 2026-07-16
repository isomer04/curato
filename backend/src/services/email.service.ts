import Handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import { sendEmail, EmailOptions, EmailResult } from '../config/email';
import { env } from '../config/env';
import { logger } from '../config/logger';

const frontendUrl: string = env.frontendUrl;

/**
 * Email Service — uses Handlebars templates for rich HTML emails.
 *
 * Template files live in `src/templates/emails/`.
 * The base layout is in `src/templates/emails/layouts/base.hbs`.
 *
 * Templates are compiled once and cached for performance.
 */


const templateCache = new Map<string, Handlebars.TemplateDelegate>();
const TEMPLATES_DIR = path.join(__dirname, '..', 'templates', 'emails');

/**
 * Load and compile a Handlebars template from the templates directory.
 * Results are cached so each `.hbs` file is only read from disk once.
 * Uses async fs calls to avoid blocking the Node.js event loop.
 */
const compileTemplate = async (templateName: string): Promise<Handlebars.TemplateDelegate> => {
  const cachedTemplate = templateCache.get(templateName);
  if (cachedTemplate) {
    return cachedTemplate;
  }

  const filePath = path.join(TEMPLATES_DIR, `${templateName}.hbs`);

  // fs.promises.access is non-blocking; fs.existsSync is synchronous and blocks the event loop
  await fs.promises.access(filePath).catch(() => {
    throw new Error(`Email template not found: ${filePath}`);
  });

  // fs.promises.readFile is non-blocking; fs.readFileSync blocks the event loop
  const source = await fs.promises.readFile(filePath, 'utf-8');
  const compiled = Handlebars.compile(source);
  templateCache.set(templateName, compiled);

  return compiled;
};

/**
 * Render a named template inside the base layout.
 *
 * @param templateName  File name (without `.hbs`) in the templates directory
 * @param data          Variables passed to both the inner template and the layout
 * @returns             Complete HTML string ready to be sent as an email body
 */
const renderEmail = async (
  templateName: string,
  data: Record<string, unknown>
): Promise<string> => {
  // Compile the inner content template
  const contentTemplate = await compileTemplate(templateName);
  const bodyHtml = contentTemplate(data);

  // Compile the base layout and inject the rendered body
  const layoutTemplate = await compileTemplate('layouts/base');
  return layoutTemplate({
    ...data,
    body: bodyHtml,
    year: new Date().getFullYear(),
  });
};


class EmailService {
  /**
   * Send a welcome email after successful registration.
   */
  async sendWelcomeEmail(to: string, name: string): Promise<EmailResult> {
    const html = await renderEmail('welcome', {
      name,
      dashboardUrl: frontendUrl,
    });

    return sendEmail({
      to,
      subject: '🏥 Welcome to Healthcare Appointment System',
      html,
      text: `Welcome, ${name}! Thank you for registering with our Healthcare Appointment System.`,
    });
  }

  /**
   * Send an appointment confirmation email.
   */
  async sendAppointmentConfirmation(
    to: string,
    patientName: string,
    doctorName: string,
    date: string,
    time: string,
    appointmentId: string
  ): Promise<EmailResult> {
    const html = await renderEmail('appointment-confirmation', {
      patientName,
      doctorName,
      date,
      time,
      appointmentId,
      appointmentsUrl: `${frontendUrl}/appointments`,
    });

    return sendEmail({
      to,
      subject: `✅ Appointment Confirmed — ${date} at ${time}`,
      html,
      text: `Hi ${patientName}, your appointment with Dr. ${doctorName} on ${date} at ${time} has been confirmed. Reference: ${appointmentId}`,
    });
  }

  /**
   * Send an appointment cancellation email.
   */
  async sendAppointmentCancellation(
    to: string,
    patientName: string,
    doctorName: string,
    date: string,
    time: string,
    reason?: string
  ): Promise<EmailResult> {
    const html = await renderEmail('appointment-cancellation', {
      patientName,
      doctorName,
      date,
      time,
      reason,
      bookUrl: `${frontendUrl}/appointments/book`,
    });

    return sendEmail({
      to,
      subject: `❌ Appointment Cancelled — ${date}`,
      html,
      text: `Hi ${patientName}, your appointment with Dr. ${doctorName} on ${date} at ${time} has been cancelled.${reason ? ` Reason: ${reason}` : ''}`,
    });
  }

  /**
   * Send an appointment reminder email.
   */
  async sendAppointmentReminder(
    to: string,
    patientName: string,
    doctorName: string,
    date: string,
    time: string
  ): Promise<EmailResult> {
    const html = await renderEmail('appointment-reminder', {
      patientName,
      doctorName,
      date,
      time,
      appointmentsUrl: `${frontendUrl}/appointments`,
    });

    return sendEmail({
      to,
      subject: `🔔 Appointment Reminder — ${date} at ${time}`,
      html,
      text: `Hi ${patientName}, reminder: You have an appointment with Dr. ${doctorName} on ${date} at ${time}.`,
    });
  }

  /**
   * Send an email-verification link after registration.
   */
  async sendEmailVerificationEmail(
    to: string,
    name: string,
    verificationToken: string
  ): Promise<EmailResult> {
    const verifyUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;

    const html = await renderEmail('email-verification', {
      name,
      verifyUrl,
    });

    return sendEmail({
      to,
      subject: '✅ Verify Your Email — Healthcare System',
      html,
      text: `Hi ${name}, verify your email by visiting: ${verifyUrl}. This link expires in 48 hours.`,
    });
  }

  /**
   * Send a password reset email.
   */
  async sendPasswordResetEmail(to: string, name: string, resetToken: string): Promise<EmailResult> {
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    const html = await renderEmail('password-reset', {
      name,
      resetUrl,
    });

    return sendEmail({
      to,
      subject: '🔑 Password Reset — Healthcare System',
      html,
      text: `Hi ${name}, reset your password using this link: ${resetUrl}. This link expires in 1 hour.`,
    });
  }

  /**
   * Send an email change confirmation link to the new address.
   */
  async sendEmailChangeEmail(
    to: string,
    name: string,
    changeToken: string
  ): Promise<EmailResult> {
    const confirmUrl = `${frontendUrl}/confirm-email-change?token=${changeToken}`;

    const html = await renderEmail('email-change', {
      name,
      newEmail: to,
      confirmUrl,
    });

    return sendEmail({
      to,
      subject: '📧 Confirm Your Email Change — Healthcare System',
      html,
      text: `Hi ${name}, confirm your new email address by visiting: ${confirmUrl}. This link expires in 48 hours.`,
    });
  }

  /**
   * Render any template by name with custom data and send it.
   * Useful for ad-hoc or future templates without adding a new method.
   */
  async sendTemplated(
    templateName: string,
    data: Record<string, unknown>,
    options: Omit<EmailOptions, 'html'>
  ): Promise<EmailResult> {
    const html = await renderEmail(templateName, data);
    return sendEmail({ ...options, html });
  }

  /**
   * Send a generic email (no template, raw options).
   */
  async send(options: EmailOptions): Promise<EmailResult> {
    return sendEmail(options);
  }

  /**
   * Pre-warm the template cache by loading all templates on server startup.
   * Now async to avoid blocking the event loop during startup.
   */
  async preloadTemplates(): Promise<void> {
    const templates = [
      'layouts/base',
      'welcome',
      'appointment-confirmation',
      'appointment-cancellation',
      'appointment-reminder',
      'password-reset',
      'email-verification',
      'email-change',
    ];

    for (const name of templates) {
      try {
        await compileTemplate(name);
        logger.info(`📧 Preloaded email template: ${name}`);
      } catch (error: unknown) {
        logger.warn(
          `📧 Could not preload template "${name}": ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }
}

export const emailService = new EmailService();

