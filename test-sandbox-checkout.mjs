import { payments } from './app/lib/payments.js';
import 'dotenv/config';

(async () => {
  try {
    const result = await payments.charge(
      {
        amount: { amount: 1999, currency: 'USD' },
        customer: { email: 'test-sandbox@example.com', name: 'Test' },
        reference: `test_${Date.now()}`,
        returnUrl: 'https://example.com/success',
        metadata: { user_id: 'test_user', plan: 'pro_annual' },
      },
      { provider: 'bachs' }
    );
    console.log('Checkout ID:', result.id);
    console.log('Redirect URL:', result.redirectUrl);
    console.log('Status:', result.status);
  } catch (err) {
    console.error('Error:', err);
  }
})();
