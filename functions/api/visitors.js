// functions/api/visitors.js

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // Skip owner IPs
  const ownerIPs = ['2607:fb90:a197:82c9:5833:ca60:d7ef:3e2b']; // Add your IPs here
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (ownerIPs.includes(ip)) {
    return new Response(JSON.stringify({ message: 'Owner IP skipped' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // --- Visitor Data ---
    const visitorKey = `visitor:${ip}`;
    let visitorDataRaw = await env.VISITOR_COUNTER.get(visitorKey);
    let visitorData = visitorDataRaw ? JSON.parse(visitorDataRaw) : null;

    const timestamp = new Date().toISOString();
    const currentPage = url.pathname || '/';

    // --- Geo info from Cloudflare headers ---
    const city = request.headers.get('CF-IPCity') || '';
    const state = request.headers.get('CF-IPRegion') || '';
    const country = request.headers.get('CF-IPCountry') || '';

    // --- Session & Page Views ---
    let sessionId;
    if (visitorData) {
      // Check if session expired (>30 min)
      const lastVisit = new Date(visitorData.lastVisit);
      const diff = new Date() - lastVisit;
      if (diff > 30 * 60 * 1000) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        visitorData.sessionCount = (visitorData.sessionCount || 0) + 1;
      } else {
        sessionId = visitorData.currentSessionId;
      }
      visitorData.lastVisit = timestamp;
      visitorData.currentSessionId = sessionId;
      visitorData.visitCount = (visitorData.visitCount || 0) + 1;
      visitorData.pageViews.push({ page: currentPage, timestamp, sessionId });
    } else {
      // New visitor
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      visitorData = {
        ip,
        city,
        state,
        country,
        firstVisit: timestamp,
        lastVisit: timestamp,
        visitCount: 1,
        sessionCount: 1,
        currentSessionId: sessionId,
        pageViews: [{ page: currentPage, timestamp, sessionId }],
      };
    }

    // Store visitor data in KV
    await env.VISITOR_COUNTER.put(visitorKey, JSON.stringify(visitorData));

    // --- Update total visitor count ---
    const totalKey = 'visitor_count';
    let total = parseInt(await env.VISITOR_COUNTER.get(totalKey)) || 0;
    if (visitorData.visitCount === 1) total += 1; // Count unique visitor only once
    await env.VISITOR_COUNTER.put(totalKey, total.toString());

    // Return JSON for front-end
    return new Response(JSON.stringify({ visitor_count: total, visitorData }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to track visitor', message: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
