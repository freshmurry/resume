// functions/api/visitors.js

export async function onRequest(context) {
  const { request, env } = context;

  try {
    // Get visitor IP
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

    // Skip owner IPs (optional)
    const ownerIPs = ['2607:fb90:a197:82c9:5833:ca60:d7ef:3e2b'];
    if (ownerIPs.includes(ip)) {
      return new Response(JSON.stringify({ message: 'Owner IP skipped' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if visitor already counted
    const visitorKey = `visitor:${ip}`;
    const existing = await env.VISITOR_COUNTER.get(visitorKey);
    let total = parseInt(await env.VISITOR_COUNTER.get('visitor_count')) || 0;

    if (!existing) {
      // New visitor: increment total
      total += 1;
      await env.VISITOR_COUNTER.put(visitorKey, '1'); // Mark visitor as counted
      await env.VISITOR_COUNTER.put('visitor_count', total.toString());
    }

    // Return total count
    return new Response(JSON.stringify({ visitor_count: total }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to track visitor', message: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
