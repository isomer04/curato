// email.ts has module-level state (`initialized`). We use jest.isolateModules()
// per test so each test starts with a fresh module where initialized === false.

const TEST_API_KEY = 'SG.test-api-key';
const TEST_FROM_EMAIL = 'noreply@test.com';

type EmailModule = typeof import('../../config/email');
type EmailOptions = import('../../config/email').EmailOptions;

interface ModuleContext {
  mod: EmailModule;
  mockSetApiKey: jest.Mock;
  mockSend: jest.Mock;
  mockInfo: jest.Mock;
  mockWarn: jest.Mock;
  mockError: jest.Mock;
}

/**
 * Returns a fresh, isolated instance of email.ts with controllable dependencies.
 * Every call resets the `initialized` flag to false because isolateModules
 * gives us a brand-new module registry.
 */
function loadModule(config: { apiKey?: string; fromEmail?: string } = {}): ModuleContext {
  const mockSetApiKey = jest.fn();
  const mockSend = jest.fn().mockResolvedValue([{ headers: { 'x-message-id': 'test-msg-id' } }]);
  const mockInfo = jest.fn();
  const mockWarn = jest.fn();
  const mockError = jest.fn();

  let mod!: EmailModule;
  jest.isolateModules(() => {
    jest.mock('@sendgrid/mail', () => ({
      setApiKey: mockSetApiKey,
      send: mockSend,
    }));
    jest.mock('../../config/env', () => ({
      env: {
        sendgridApiKey: config.apiKey ?? TEST_API_KEY,
        emailFromAddress: config.fromEmail ?? TEST_FROM_EMAIL,
      },
    }));
    jest.mock('../../config/logger', () => ({
      logger: { info: mockInfo, warn: mockWarn, error: mockError },
    }));

    mod = require('../../config/email') as EmailModule;
  });

  return { mod, mockSetApiKey, mockSend, mockInfo, mockWarn, mockError };
}


describe('config/email', () => {

  describe('initializeEmailTransporter', () => {
    it('sets the SendGrid API key', () => {
      const { mod, mockSetApiKey } = loadModule();

      mod.initializeEmailTransporter();

      expect(mockSetApiKey).toHaveBeenCalledTimes(1);
      expect(mockSetApiKey).toHaveBeenCalledWith(TEST_API_KEY);
    });

    it('marks the client as initialized', () => {
      const { mod } = loadModule();

      expect(mod.isEmailConfigured()).toBe(false);
      mod.initializeEmailTransporter();
      expect(mod.isEmailConfigured()).toBe(true);
    });

    it('logs a success message that includes the from address', () => {
      const { mod, mockInfo } = loadModule();

      mod.initializeEmailTransporter();

      expect(mockInfo).toHaveBeenCalledWith(expect.stringContaining(TEST_FROM_EMAIL));
    });

    it('is idempotent — calling twice only invokes setApiKey once', () => {
      const { mod, mockSetApiKey } = loadModule();

      mod.initializeEmailTransporter();
      mod.initializeEmailTransporter();

      expect(mockSetApiKey).toHaveBeenCalledTimes(1);
    });

    it('logs a warning and skips setApiKey when SENDGRID_API_KEY is empty', () => {
      const { mod, mockSetApiKey, mockWarn } = loadModule({ apiKey: '' });

      mod.initializeEmailTransporter();

      expect(mockSetApiKey).not.toHaveBeenCalled();
      expect(mod.isEmailConfigured()).toBe(false);
      expect(mockWarn).toHaveBeenCalledWith(expect.stringContaining('SENDGRID_API_KEY'));
    });
  });


  describe('isEmailConfigured', () => {
    it('returns false before initialization', () => {
      const { mod } = loadModule();
      expect(mod.isEmailConfigured()).toBe(false);
    });

    it('returns true after initialization', () => {
      const { mod } = loadModule();
      mod.initializeEmailTransporter();
      expect(mod.isEmailConfigured()).toBe(true);
    });
  });


  describe('sendEmail', () => {
    const baseOptions: EmailOptions = {
      to: 'patient@example.com',
      subject: 'Test subject',
      html: '<p>Hello</p>',
      text: 'Hello',
    };

    it('sends an email and returns success with messageId', async () => {
      const { mod } = loadModule();
      mod.initializeEmailTransporter();

      const result = await mod.sendEmail(baseOptions);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('test-msg-id');
    });

    it('uses emailFromAddress as the from field when none is specified', async () => {
      const { mod, mockSend } = loadModule();
      mod.initializeEmailTransporter();

      await mod.sendEmail(baseOptions);

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({ from: expect.stringContaining(TEST_FROM_EMAIL) })
      );
    });

    it('allows overriding the from address', async () => {
      const { mod, mockSend } = loadModule();
      mod.initializeEmailTransporter();

      await mod.sendEmail({ ...baseOptions, from: 'custom@example.com' });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({ from: 'custom@example.com' })
      );
    });

    it('wraps a single recipient string in an array', async () => {
      const { mod, mockSend } = loadModule();
      mod.initializeEmailTransporter();

      await mod.sendEmail({ ...baseOptions, to: 'single@example.com' });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({ to: ['single@example.com'] })
      );
    });

    it('passes an array of recipients directly to sgMail.send', async () => {
      const { mod, mockSend } = loadModule();
      mod.initializeEmailTransporter();

      await mod.sendEmail({ ...baseOptions, to: ['a@test.com', 'b@test.com'] });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({ to: ['a@test.com', 'b@test.com'] })
      );
    });

    it('auto-initializes when sendEmail is called before explicit init', async () => {
      const { mod, mockSend } = loadModule();
      // No explicit initializeEmailTransporter() call

      const result = await mod.sendEmail(baseOptions);

      expect(result.success).toBe(true);
      expect(mockSend).toHaveBeenCalled();
    });

    it('falls back to subject as text when text is not provided', async () => {
      const { mod, mockSend } = loadModule();
      mod.initializeEmailTransporter();

      await mod.sendEmail({ to: 'x@x.com', subject: 'Subject as fallback' });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({ text: 'Subject as fallback' })
      );
    });

    it('includes html in the payload when provided', async () => {
      const { mod, mockSend } = loadModule();
      mod.initializeEmailTransporter();

      await mod.sendEmail({ ...baseOptions, html: '<b>bold</b>' });

      expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({ html: '<b>bold</b>' }));
    });

    it('omits html from the payload when not provided', async () => {
      const { mod, mockSend } = loadModule();
      mod.initializeEmailTransporter();

      await mod.sendEmail({ to: 'x@x.com', subject: 'No html', text: 'plain' });

      const call = mockSend.mock.calls[0][0] as Record<string, unknown>;
      expect(call).not.toHaveProperty('html');
    });

    it('passes replyTo through to sgMail.send when provided', async () => {
      const { mod, mockSend } = loadModule();
      mod.initializeEmailTransporter();

      await mod.sendEmail({ ...baseOptions, replyTo: 'reply@example.com' });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({ replyTo: 'reply@example.com' })
      );
    });

    it('omits replyTo from the payload when not provided', async () => {
      const { mod, mockSend } = loadModule();
      mod.initializeEmailTransporter();

      await mod.sendEmail({ to: 'x@x.com', subject: 'No reply' });

      const call = mockSend.mock.calls[0][0] as Record<string, unknown>;
      expect(call).not.toHaveProperty('replyTo');
    });

    it('returns success:false with the error message when sgMail.send throws an Error', async () => {
      const { mod, mockSend } = loadModule();
      mockSend.mockRejectedValue(new Error('SendGrid API unreachable'));
      mod.initializeEmailTransporter();

      const result = await mod.sendEmail(baseOptions);

      expect(result.success).toBe(false);
      expect(result.error).toBe('SendGrid API unreachable');
    });

    it('returns "Unknown email error" when a non-Error value is thrown', async () => {
      const { mod, mockSend } = loadModule();
      mockSend.mockRejectedValue('plain string error');
      mod.initializeEmailTransporter();

      const result = await mod.sendEmail(baseOptions);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown email error');
    });

    it('returns success:false when SENDGRID_API_KEY is not configured', async () => {
      const { mod } = loadModule({ apiKey: '' });
      mod.initializeEmailTransporter(); // no-op — no key present

      const result = await mod.sendEmail(baseOptions);

      expect(result.success).toBe(false);
      expect(result.error).toContain('SENDGRID_API_KEY');
    });
  });
});
