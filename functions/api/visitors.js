// Cloudflare Function for visitor counter
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const debug = url.searchParams.get('debug') === 'true';
  const headers = url.searchParams.get('headers') === 'true';

  // Get visitor IP
  const ip = request.headers.get('CF-Connecting-IP') || 
             request.headers.get('X-Forwarded-For') || 
             request.headers.get('X-Real-IP') || 
             'unknown';

  // Skip tracking for the owner's IP (you can add your IP here)
  const ownerIPs = ['2607:fb90:a197:82c9:5833:ca60:d7ef:3e2b']; // Add your IPs here
  if (ownerIPs.includes(ip)) {
    return new Response(JSON.stringify({ message: 'Owner IP skipped' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Get existing visitor data
    const visitorKey = `visitor:${ip}`;
    const existingData = await env.KV.get(visitorKey);
    let visitorData = existingData ? JSON.parse(existingData) : null;

    // Get geolocation info from Cloudflare headers
    let city = context.request.headers.get('CF-IPCity') || '';
    let state = context.request.headers.get('CF-IPRegion') || '';
    let country = context.request.headers.get('CF-IPCountry') || '';
    let zip = context.request.headers.get('CF-IPPostalCode') || '';
    let latitude = context.request.headers.get('CF-IPLatitude') || '';
    let longitude = context.request.headers.get('CF-IPLongitude') || '';
    let timezone = context.request.headers.get('CF-IPTimezone') || '';
    let continent = context.request.headers.get('CF-IPContinent') || '';

    // If Cloudflare headers are empty, try free geolocation service
    if (!city && !state && ip) {
      try {
        // Use ipinfo.io (free tier: 50,000 requests/month)
        const response = await fetch(`https://ipinfo.io/${ip}/json`);
        if (response.ok) {
          const geoData = await response.json();
          
          if (geoData.city && geoData.city !== 'null') {
            city = geoData.city || '';
            state = geoData.region || '';
            country = geoData.country || '';
            zip = geoData.postal || '';
            // Note: ipinfo.io doesn't provide lat/lng in free tier
          }
        }
      } catch (error) {
        // Silently fail - we'll just use what we have
      }
    }

    // Get device and browser info from User-Agent
    const userAgent = request.headers.get('User-Agent') || '';
    const deviceInfo = parseUserAgent(userAgent);

    // Get current page info from request
    const referer = request.headers.get('Referer') || '';
    const currentPage = url.pathname || '/';
    const timestamp = new Date().toISOString();

    if (visitorData) {
      // Update existing visitor
      visitorData.lastVisit = timestamp;
      visitorData.visitCount = (visitorData.visitCount || 0) + 1;
      
      // Update page views
      if (!visitorData.pageViews) visitorData.pageViews = [];
      visitorData.pageViews.push({
        page: currentPage,
        timestamp: timestamp,
        referer: referer,
        sessionId: visitorData.currentSessionId || generateSessionId()
      });

      // Update session info
      const lastVisit = new Date(visitorData.lastVisit);
      const currentTime = new Date();
      const timeDiff = currentTime - lastVisit;
      
      // If more than 30 minutes have passed, start new session
      if (timeDiff > 30 * 60 * 1000) {
        visitorData.currentSessionId = generateSessionId();
        visitorData.sessionCount = (visitorData.sessionCount || 0) + 1;
        visitorData.sessions = visitorData.sessions || [];
        visitorData.sessions.push({
          sessionId: visitorData.currentSessionId,
          startTime: timestamp,
          endTime: timestamp,
          duration: 0
        });
      } else {
        // Update current session
        if (visitorData.sessions && visitorData.sessions.length > 0) {
          const currentSession = visitorData.sessions[visitorData.sessions.length - 1];
          currentSession.endTime = timestamp;
          currentSession.duration = new Date(timestamp) - new Date(currentSession.startTime);
        }
      }

      // Update device info if changed
      if (deviceInfo) {
        visitorData.deviceInfo = deviceInfo;
      }

    } else {
      // Create new visitor
      visitorData = {
        ip: ip,
        city: city,
        state: state,
        country: country,
        zip: zip,
        latitude: latitude,
        longitude: longitude,
        timezone: timezone,
        continent: continent,
        firstVisit: timestamp,
        lastVisit: timestamp,
        visitCount: 1,
        sessionCount: 1,
        currentSessionId: generateSessionId(),
        deviceInfo: deviceInfo,
        pageViews: [{
          page: currentPage,
          timestamp: timestamp,
          referer: referer,
          sessionId: generateSessionId()
        }],
        sessions: [{
          sessionId: generateSessionId(),
          startTime: timestamp,
          endTime: timestamp,
          duration: 0
        }]
      };
    }

    // Store visitor data
    await env.KV.put(visitorKey, JSON.stringify(visitorData));

    // Update total visitor count
    const totalKey = 'visitor_count';
    const currentTotal = await env.KV.get(totalKey);
    const newTotal = visitorData.visitCount === 1 ? (parseInt(currentTotal) || 0) + 1 : (parseInt(currentTotal) || 0);
    await env.KV.put(totalKey, newTotal.toString());

    // Update visitors list
    const visitorsListKey = 'visitors_list';
    let visitorsList = [];
    try {
      const existingList = await env.KV.get(visitorsListKey);
      visitorsList = existingList ? JSON.parse(existingList) : [];
    } catch (error) {
      visitorsList = [];
    }

    // Update or add visitor to list
    const existingIndex = visitorsList.findIndex(v => v.ip === ip);
    if (existingIndex >= 0) {
      visitorsList[existingIndex] = visitorData;
    } else {
      visitorsList.push(visitorData);
    }

    // Keep only last 1000 visitors to prevent KV size issues
    if (visitorsList.length > 1000) {
      visitorsList = visitorsList.slice(-1000);
    }

    await env.KV.put(visitorsListKey, JSON.stringify(visitorsList));

    // Return response
    const response = {
      visitor_count: newTotal,
      current_visitor: visitorData,
      message: 'Visitor tracked successfully'
    };

    if (debug) {
      response.debug = {
        ip: ip,
        cloudflareHeaders: {
          city: city,
          state: state,
          country: country,
          zip: zip,
          latitude: latitude,
          longitude: longitude,
          timezone: timezone,
          continent: continent
        },
        deviceInfo: deviceInfo,
        currentPage: currentPage,
        timestamp: timestamp
      };
    }

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error tracking visitor:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to track visitor',
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Helper function to parse User-Agent
function parseUserAgent(userAgent) {
  if (!userAgent) return null;

  const ua = userAgent.toLowerCase();
  
  // Device type
  let deviceType = 'desktop';
  if (ua.includes('mobile')) deviceType = 'mobile';
  else if (ua.includes('tablet') || ua.includes('ipad')) deviceType = 'tablet';

  // Browser
  let browser = 'unknown';
  if (ua.includes('chrome')) browser = 'Chrome';
  else if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
  else if (ua.includes('edge')) browser = 'Edge';
  else if (ua.includes('opera')) browser = 'Opera';

  // OS
  let os = 'unknown';
  if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('mac')) os = 'macOS';
  else if (ua.includes('linux')) os = 'Linux';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';

  return {
    deviceType,
    browser,
    os,
    userAgent: userAgent.substring(0, 200) // Truncate for storage
  };
}

// Helper function to generate session ID
function generateSessionId() {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
} 