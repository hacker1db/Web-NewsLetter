import { beforeEach, expect, it, vi } from 'vitest';
import { env } from './env';

const { send } = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock('resend', () => ({ Resend: class { emails = { send }; } }));
import { sendNewsletterEmail, sendWelcomeEmail } from '../src/lib/server/resend';

beforeEach(() => {
	env.RESEND_API_KEY = 'test-only';
	send.mockReset();
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

it('throws on a returned welcome-email error', async () => {
	send.mockResolvedValue({ data: null, error: { message: 'Rejected', name: 'validation_error' } });
	await expect(sendWelcomeEmail('test@example.com', 'confirm-token', 'unsubscribe-token')).rejects.toThrow('not accepted');
});

it('requires a provider email ID before reporting welcome-email success', async () => {
	send.mockResolvedValue({ data: null, error: null });
	await expect(sendWelcomeEmail('test@example.com', 'confirm-token', 'unsubscribe-token')).rejects.toThrow('not accepted');
	send.mockResolvedValue({ data: { id: 'email_test' }, error: null });
	await expect(sendWelcomeEmail('test@example.com', 'confirm-token', 'unsubscribe-token')).resolves.toBeUndefined();
});

it('counts returned errors, thrown errors, and absent IDs as failures and continues', async () => {
	send.mockResolvedValueOnce({ data: { id: 'email_test' }, error: null })
		.mockResolvedValueOnce({ data: null, error: { message: 'Rejected' } })
		.mockRejectedValueOnce(new Error('Transport failure'))
		.mockResolvedValueOnce({ data: {}, error: null });
	const subscribers = Array.from({ length: 4 }, (_, i) => ({ email: `test${i}@example.com`, unsubscribeToken: `token${i}` }));
	expect(await sendNewsletterEmail(subscribers, 'Test', '<p>Test</p>')).toEqual({ sent: 1, failed: 3 });
	expect(send).toHaveBeenCalledTimes(4);
});
