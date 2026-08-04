import { registerAs } from '@nestjs/config';

export default registerAs('payment', () => ({
  keyId: process.env.RAZORPAY_KEY_ID ?? 'rzp_test_mockkey123',
  keySecret: process.env.RAZORPAY_KEY_SECRET ?? 'mock_secret_key_456',
  webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? 'mock_webhook_secret_789',
  provider: process.env.PAYMENT_GATEWAY_PROVIDER ?? 'razorpay',
  expirationMinutes: parseInt(process.env.PAYMENT_EXPIRATION_MINUTES ?? '15', 10),
}));
