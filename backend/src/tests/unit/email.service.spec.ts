
jest.mock('../../config/email', () => ({
  sendEmail: jest.fn(),
}));

// Mock fs so template file reads work without real .hbs files on disk
jest.mock('fs', () => ({
  promises: {
    access: jest.fn().mockResolvedValue(undefined),
    readFile: jest.fn().mockImplementation((filePath: string) => {
      if (String(filePath).includes('base')) return Promise.resolve('{{{body}}}');
      return Promise.resolve('<div>{{name}}</div>');
    }),
  },
}));

// Mock Handlebars so templates render to a predictable static string
jest.mock('handlebars', () => ({
  compile: jest.fn().mockReturnValue((_data: unknown) => '<rendered-html>'),
}));

jest.mock('../../config/env', () => ({
  env: { frontendUrl: 'http://localhost:4200' },
}));

jest.mock('../../config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));


import { emailService } from '../../services/email.service';
import { sendEmail } from '../../config/email';
import { logger } from '../../config/logger';

const mockSendEmail = jest.mocked(sendEmail);
const mockLoggerInfo = jest.mocked(logger.info);

const FRONTEND_URL = 'http://localhost:4200';
const SUCCESS_RESULT = { success: true, messageId: 'msg-123' };
const FAILURE_RESULT = { success: false, error: 'SendGrid error' };


describe('EmailService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSendEmail.mockResolvedValue(SUCCESS_RESULT);
  });


  describe('sendWelcomeEmail', () => {
    it('calls sendEmail with the welcome subject and recipient', async () => {
      await emailService.sendWelcomeEmail('user@example.com', 'Alice');

      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: expect.stringContaining('Welcome'),
          html: expect.any(String),
          text: expect.stringContaining('Alice'),
        })
      );
    });

    it('returns the result from sendEmail', async () => {
      const result = await emailService.sendWelcomeEmail('user@example.com', 'Alice');
      expect(result).toEqual(SUCCESS_RESULT);
    });

    it('propagates a sendEmail failure result', async () => {
      mockSendEmail.mockResolvedValue(FAILURE_RESULT);
      const result = await emailService.sendWelcomeEmail('user@example.com', 'Alice');
      expect(result.success).toBe(false);
    });
  });


  describe('sendAppointmentConfirmation', () => {
    const args = ['p@example.com', 'Alice', 'Dr. Smith', '2026-04-01', '10:00', 'appt-99'] as const;

    it('calls sendEmail with a subject containing the date and time', async () => {
      await emailService.sendAppointmentConfirmation(...args);

      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'p@example.com',
          subject: expect.stringMatching(/2026-04-01.*10:00/),
        })
      );
    });

    it('includes patient name, doctor name and appointment id in the text body', async () => {
      await emailService.sendAppointmentConfirmation(...args);

      const call = mockSendEmail.mock.calls[0][0] as { text: string };
      expect(call.text).toContain('Alice');
      expect(call.text).toContain('Dr. Smith');
      expect(call.text).toContain('appt-99');
    });

    it('returns the result from sendEmail', async () => {
      const result = await emailService.sendAppointmentConfirmation(...args);
      expect(result).toEqual(SUCCESS_RESULT);
    });
  });


  describe('sendAppointmentCancellation', () => {
    it('includes the cancellation reason in the text body when provided', async () => {
      await emailService.sendAppointmentCancellation(
        'p@example.com',
        'Alice',
        'Dr. Smith',
        '2026-04-01',
        '10:00',
        'Doctor unavailable'
      );

      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Doctor unavailable'),
        })
      );
    });

    it('does not include a Reason line when reason is omitted', async () => {
      await emailService.sendAppointmentCancellation(
        'p@example.com',
        'Alice',
        'Dr. Smith',
        '2026-04-01',
        '10:00'
      );

      const call = mockSendEmail.mock.calls[0][0] as { text: string };
      expect(call.text).not.toContain('Reason:');
    });

    it('sends with a subject containing the date', async () => {
      await emailService.sendAppointmentCancellation(
        'p@example.com',
        'Alice',
        'Dr. Smith',
        '2026-04-01',
        '10:00'
      );

      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({ subject: expect.stringContaining('2026-04-01') })
      );
    });

    it('returns the result from sendEmail', async () => {
      const result = await emailService.sendAppointmentCancellation(
        'p@example.com',
        'Alice',
        'Dr. Smith',
        '2026-04-01',
        '10:00'
      );
      expect(result).toEqual(SUCCESS_RESULT);
    });
  });


  describe('sendAppointmentReminder', () => {
    it('calls sendEmail with a subject containing date and time and mentions the patient', async () => {
      await emailService.sendAppointmentReminder(
        'p@example.com',
        'Alice',
        'Dr. Smith',
        '2026-04-02',
        '09:00'
      );

      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'p@example.com',
          subject: expect.stringMatching(/2026-04-02.*09:00/),
          text: expect.stringContaining('Alice'),
        })
      );
    });

    it('returns the result from sendEmail', async () => {
      const result = await emailService.sendAppointmentReminder(
        'p@example.com',
        'Alice',
        'Dr. Smith',
        '2026-04-02',
        '09:00'
      );
      expect(result).toEqual(SUCCESS_RESULT);
    });
  });


  describe('sendEmailVerificationEmail', () => {
    it('builds the correct verifyUrl from the frontend URL and token', async () => {
      await emailService.sendEmailVerificationEmail('u@example.com', 'Alice', 'tok123');

      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining(`${FRONTEND_URL}/verify-email?token=tok123`),
        })
      );
    });

    it('sends with a subject containing "Verify"', async () => {
      await emailService.sendEmailVerificationEmail('u@example.com', 'Alice', 'tok123');

      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({ subject: expect.stringContaining('Verify') })
      );
    });

    it('sends to the supplied recipient address', async () => {
      await emailService.sendEmailVerificationEmail('u@example.com', 'Alice', 'tok123');

      expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'u@example.com' }));
    });

    it('returns the result from sendEmail', async () => {
      const result = await emailService.sendEmailVerificationEmail('u@example.com', 'Alice', 'tok');
      expect(result).toEqual(SUCCESS_RESULT);
    });
  });


  describe('sendPasswordResetEmail', () => {
    it('builds the correct resetUrl from the frontend URL and token', async () => {
      await emailService.sendPasswordResetEmail('u@example.com', 'Alice', 'reset-tok');

      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining(`${FRONTEND_URL}/reset-password?token=reset-tok`),
        })
      );
    });

    it('sends with a subject containing "Password Reset"', async () => {
      await emailService.sendPasswordResetEmail('u@example.com', 'Alice', 'reset-tok');

      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({ subject: expect.stringContaining('Password Reset') })
      );
    });

    it('returns the result from sendEmail', async () => {
      const result = await emailService.sendPasswordResetEmail('u@example.com', 'Alice', 'tok');
      expect(result).toEqual(SUCCESS_RESULT);
    });
  });


  describe('sendTemplated', () => {
    it('delegates to sendEmail with the rendered html and supplied options', async () => {
      await emailService.sendTemplated(
        'custom-template',
        { name: 'Alice' },
        { to: 'u@example.com', subject: 'Custom' }
      );

      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'u@example.com',
          subject: 'Custom',
          html: expect.any(String),
        })
      );
    });

    it('returns the result from sendEmail', async () => {
      const result = await emailService.sendTemplated(
        'custom-template',
        {},
        { to: 'u@example.com', subject: 'Custom' }
      );
      expect(result).toEqual(SUCCESS_RESULT);
    });
  });


  describe('send', () => {
    it('passes the options object directly to sendEmail', async () => {
      const options = { to: 'u@example.com', subject: 'Raw', text: 'plain' };
      await emailService.send(options);
      expect(mockSendEmail).toHaveBeenCalledWith(options);
    });

    it('returns the result from sendEmail unchanged', async () => {
      const result = await emailService.send({ to: 'u@example.com', subject: 'Raw' });
      expect(result).toEqual(SUCCESS_RESULT);
    });
  });


  describe('preloadTemplates', () => {
    it('resolves without throwing', async () => {
      await expect(emailService.preloadTemplates()).resolves.toBeUndefined();
    });

    it('logs an info message for each successfully preloaded template', async () => {
      await emailService.preloadTemplates();

      const infoCalls = mockLoggerInfo.mock.calls.map(c => c[0] as unknown as string);
      const preloadLogs = infoCalls.filter(msg => msg.includes('Preloaded'));
      expect(preloadLogs.length).toBeGreaterThanOrEqual(1);
    });
  });
});

// preloadTemplates error path — requires a fresh module instance (empty cache)
// The template cache is a module-level Map inside email.service.ts. The
// singleton is shared across all tests in the describe block above, meaning
// by the time we reach the error case the cache is fully populated and
// fs.promises.access is never called again. We use jest.resetModules() to
// get a virgin instance where every compileTemplate call goes to disk.

describe('EmailService — preloadTemplates error handling', () => {
  let freshService: { preloadTemplates(): Promise<void> };
  let freshWarn: jest.Mock;

  beforeAll(() => {
    jest.resetModules();

    // fs — access always rejects so every template triggers the catch branch
    jest.mock('fs', () => ({
      promises: {
        access: jest.fn().mockRejectedValue(new Error('ENOENT: file not found')),
        readFile: jest.fn(),
      },
    }));
    jest.mock('handlebars', () => ({
      compile: jest.fn().mockReturnValue(() => '<rendered-html>'),
    }));
    jest.mock('../../config/email', () => ({ sendEmail: jest.fn() }));
    jest.mock('../../config/env', () => ({ env: { frontendUrl: 'http://localhost:4200' } }));
    jest.mock('../../config/logger', () => ({
      logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    }));

    const svcModule = require('../../services/email.service') as {
      emailService: { preloadTemplates(): Promise<void> };
    };

    const logModule = require('../../config/logger') as {
      logger: { warn: jest.Mock };
    };

    freshService = svcModule.emailService;
    freshWarn = logModule.logger.warn;
  });

  afterAll(() => {
    jest.resetModules();
  });

  it('resolves without throwing when template files are missing', async () => {
    await expect(freshService.preloadTemplates()).resolves.toBeUndefined();
  });

  it('logs a warning (not an exception) for each missing template', async () => {
    await freshService.preloadTemplates();
    expect(freshWarn).toHaveBeenCalledWith(expect.stringContaining('Could not preload'));
  });
});
