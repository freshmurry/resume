# Stripe Integration Guide for Teams Stay Green eBook

## Overview
This guide explains how to set up Stripe payment processing for the Teams Stay Green eBook on your resume website.

## Prerequisites
- Stripe account (sign up at https://stripe.com)
- Web server with HTTPS enabled
- Basic knowledge of server-side programming

## Step 1: Stripe Account Setup

### 1.1 Create Stripe Account
1. Go to https://stripe.com and sign up
2. Complete account verification
3. Get your API keys from the Dashboard

### 1.2 API Keys
- **Publishable Key:** `pk_test_...` (for frontend)
- **Secret Key:** `sk_test_...` (for backend - keep secret!)

## Step 2: Backend Implementation

### 2.1 Node.js/Express Example
```javascript
const express = require('express');
const stripe = require('stripe')('sk_test_YOUR_SECRET_KEY');

app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Teams Stay Green eBook',
            description: 'How to Make Microsoft Teams Stay Green - Complete Guide',
            images: ['https://teamsstaygreen.com/assets/teamsstaygreen-cover.png'],
          },
          unit_amount: 1899, // $18.99 in cents
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${req.headers.origin}/success.html`,
      cancel_url: `${req.headers.origin}/teamsstaygreen-tailwind.html`,
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### 2.2 PHP Example
```php
<?php
require_once 'vendor/autoload.php';
\Stripe\Stripe::setApiKey('sk_test_YOUR_SECRET_KEY');

if ($_POST) {
  try {
    $session = \Stripe\Checkout\Session::create([
      'payment_method_types' => ['card'],
      'line_items' => [[
        'price_data' => [
          'currency' => 'usd',
          'product_data' => [
            'name' => 'Teams Stay Green eBook',
            'description' => 'How to Make Microsoft Teams Stay Green - Complete Guide',
            'images' => ['https://teamsstaygreen.com/assets/teamsstaygreen-cover.png'],
          ],
          'unit_amount' => 1899,
        ],
        'quantity' => 1,
      ]],
      'mode' => 'payment',
      'success_url' => $_SERVER['HTTP_ORIGIN'] . '/success.html',
      'cancel_url' => $_SERVER['HTTP_ORIGIN'] . '/teamsstaygreen-tailwind.html',
    ]);

    echo json_encode(['sessionId' => $session->id, 'url' => $session->url]);
  } catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
  }
}
?>
```

### 2.3 Python/Flask Example
```python
from flask import Flask, request, jsonify
import stripe

stripe.api_key = 'sk_test_YOUR_SECRET_KEY'
app = Flask(__name__)

@app.route('/api/create-checkout-session', methods=['POST'])
def create_checkout_session():
    try:
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {
                        'name': 'Teams Stay Green eBook',
                        'description': 'How to Make Microsoft Teams Stay Green - Complete Guide',
                        'images': ['https://teamsstaygreen.com/assets/teamsstaygreen-cover.png'],
                    },
                    'unit_amount': 1899,
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=request.headers.get('Origin') + '/success.html',
            cancel_url=request.headers.get('Origin') + '/teamsstaygreen-tailwind.html',
        )
        return jsonify({'sessionId': checkout_session.id, 'url': checkout_session.url})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
```

## Step 3: Frontend Integration

### 3.1 Update the Purchase Button
The button in `teamsstaygreen-tailwind.html` is already configured to call `initiateStripePayment()`.

### 3.2 JavaScript Function
The payment function is already implemented in the HTML file.

## Step 4: Success Page

### 4.1 Create success.html
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Successful - Teams Stay Green eBook</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50">
    <div class="min-h-screen flex items-center justify-center">
        <div class="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
            <div class="text-green-600 text-6xl mb-4">
                <i class="fas fa-check-circle"></i>
            </div>
            <h1 class="text-2xl font-bold text-gray-800 mb-4">Payment Successful!</h1>
            <p class="text-gray-600 mb-6">
                Thank you for your purchase! You will receive your Teams Stay Green eBook download link via email shortly.
            </p>
            <div class="space-y-4">
                <div class="bg-green-50 p-4 rounded-lg">
                    <h3 class="font-semibold text-green-800 mb-2">What's Next?</h3>
                    <ul class="text-sm text-green-700 space-y-1">
                        <li>✓ Check your email for download instructions</li>
                        <li>✓ Download your eBook immediately</li>
                        <li>✓ Start implementing Teams Stay Green today!</li>
                    </ul>
                </div>
                <a href="index-tailwind.html" 
                   class="inline-block bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary-dark transition-colors">
                    Return to Resume
                </a>
            </div>
        </div>
    </div>
</body>
</html>
```

## Step 5: Testing

### 5.1 Test Cards
Use these test card numbers:
- **Success:** 4242 4242 4242 4242
- **Decline:** 4000 0000 0000 0002
- **Expiry:** Any future date
- **CVC:** Any 3 digits

### 5.2 Test Mode vs Live Mode
- **Test Mode:** Use `pk_test_` and `sk_test_` keys
- **Live Mode:** Use `pk_live_` and `sk_live_` keys

## Step 6: Security Considerations

### 6.1 HTTPS Required
- Stripe requires HTTPS in production
- Use Let's Encrypt for free SSL certificates

### 6.2 API Key Security
- Never expose secret keys in frontend code
- Use environment variables for secret keys
- Rotate keys regularly

### 6.3 Webhook Setup (Recommended)
```javascript
// Webhook endpoint for payment confirmation
app.post('/webhook', express.raw({type: 'application/json'}), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, 'whsec_YOUR_WEBHOOK_SECRET');
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    // Handle successful payment
    // Send download email, update database, etc.
  }

  res.json({received: true});
});
```

## Step 7: Analytics Integration

### 7.1 Google Analytics Events
The payment function already includes Google Analytics tracking:
- `purchase_click` event when button is clicked
- Track conversion rates and revenue

### 7.2 Custom Events
Add additional tracking for:
- Payment success/failure
- Download completion
- User engagement

## Step 8: Deployment

### 8.1 Environment Variables
```bash
# .env file
STRIPE_SECRET_KEY=sk_test_YOUR_KEY
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY
WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
```

### 8.2 Production Checklist
- [ ] Switch to live Stripe keys
- [ ] Enable HTTPS
- [ ] Set up webhooks
- [ ] Test payment flow
- [ ] Monitor error logs
- [ ] Set up email delivery for downloads

## Troubleshooting

### Common Issues
1. **CORS Errors:** Ensure your API endpoint allows requests from your domain
2. **HTTPS Required:** Stripe won't work on HTTP in production
3. **API Key Issues:** Double-check your keys are correct
4. **Webhook Failures:** Verify webhook endpoint is accessible

### Support Resources
- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Support](https://support.stripe.com)
- [Stripe Community](https://community.stripe.com)

## Revenue Tracking

### 7.1 Stripe Dashboard
- Monitor payments in real-time
- View conversion rates
- Track customer data

### 7.2 Google Analytics
- Track purchase funnel
- Monitor page performance
- Analyze user behavior

---

**Need Help?** Contact Lawrence at lawrencemurry@yahoo.com for implementation assistance. 