// Cloudflare Function for visitor counter
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const debug = url.searchParams.get('debug') === 'true';
  const headers = url.searchParams.get('headers') === 'true';

  // Add at the top of the onRequest function, after parsing url
  if (url.searchParams.get('migrate_state_country') === 'true') {
    const visitorsListKey = 'visitors_list';
    let visitorsList = [];
    let updated = 0;
    try {
      const existingList = await env.VISITOR_COUNTER.get(visitorsListKey);
      visitorsList = existingList ? JSON.parse(existingList) : [];
      visitorsList = visitorsList.map(v => {
        // Migrate region to state if state is missing
        if (!v.state && v.region) v.state = v.region;
        // Migrate country if missing (should always be present, but just in case)
        if (!v.country && v.countryCode) v.country = v.countryCode;
        // Remove region/countryCode fields if present
        if (v.region) delete v.region;
        if (v.countryCode) delete v.countryCode;
        updated++;
        return v;
      });
      await env.VISITOR_COUNTER.put(visitorsListKey, JSON.stringify(visitorsList));
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Failed to migrate visitors_list', message: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' }});
    }
    return new Response(JSON.stringify({ message: 'Migration complete', updated, visitors: visitorsList }), { headers: { 'Content-Type': 'application/json' }});
  }
  if (url.searchParams.get('raw_visitors_list') === 'true') {
    const visitorsListKey = 'visitors_list';
    let visitorsList = [];
    try {
      const existingList = await env.VISITOR_COUNTER.get(visitorsListKey);
      visitorsList = existingList ? JSON.parse(existingList) : [];
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Failed to fetch visitors_list', message: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' }});
    }
    return new Response(JSON.stringify({ visitors_list: visitorsList }), { headers: { 'Content-Type': 'application/json' }});
  }

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
    const existingData = await env.VISITOR_COUNTER.get(visitorKey);
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

    // Extract SEO keyword from search engine referrer
    function extractSearchKeyword(referer) {
      if (!referer) return null;
      try {
        const url = new URL(referer);
        const host = url.hostname;
        let keyword = null;
        let engine = null;
        if (host.includes('google.')) {
          keyword = url.searchParams.get('q');
          engine = 'Google';
        } else if (host.includes('bing.com')) {
          keyword = url.searchParams.get('q');
          engine = 'Bing';
        } else if (host.includes('yahoo.')) {
          keyword = url.searchParams.get('p');
          engine = 'Yahoo';
        } else if (host.includes('duckduckgo.com')) {
          keyword = url.searchParams.get('q');
          engine = 'DuckDuckGo';
        }
        if (keyword && engine) {
          return { keyword: keyword.toLowerCase(), engine };
        }
      } catch (e) {}
      return null;
    }
    const keywordData = extractSearchKeyword(referer);
    if (keywordData) {
      // Store/update keyword in KV
      const seoKey = 'seo_keywords';
      let seoKeywords = [];
      try {
        const existing = await env.VISITOR_COUNTER.get(seoKey);
        seoKeywords = existing ? JSON.parse(existing) : [];
      } catch (e) { seoKeywords = []; }
      // Find if keyword+engine already exists
      const idx = seoKeywords.findIndex(k => k.keyword === keywordData.keyword && k.engine === keywordData.engine);
      if (idx >= 0) {
        seoKeywords[idx].count = (seoKeywords[idx].count || 1) + 1;
      } else {
        seoKeywords.push({ ...keywordData, count: 1 });
      }
      // Keep only top 100 keywords
      seoKeywords = seoKeywords.sort((a, b) => b.count - a.count).slice(0, 100);
      await env.VISITOR_COUNTER.put(seoKey, JSON.stringify(seoKeywords));
    }

    // After geolocation logic and before creating/updating visitorData
    // Ensure state and country are always set correctly
    // If using geoData, assign to state/country variables
    if (visitorData) {
      visitorData.state = state;
      visitorData.country = country;
      
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

    // After all geolocation logic, always set these fields for visitorData
    // (before storing visitorData)
    if (visitorData) {
      visitorData.state = state;
      visitorData.country = country;
    }

    // Store visitor data
    await env.VISITOR_COUNTER.put(visitorKey, JSON.stringify(visitorData));

    // Persist unique visitor IDs by day, hour, and month
    const now = new Date();
    const dayKey = `unique_visitors:day:${now.getUTCFullYear()}-${String(now.getUTCMonth()+1).padStart(2,'0')}-${String(now.getUTCDate()).padStart(2,'0')}`;
    const hourKey = `unique_visitors:hour:${now.getUTCFullYear()}-${String(now.getUTCMonth()+1).padStart(2,'0')}-${String(now.getUTCDate()).padStart(2,'0')}:${String(now.getUTCHours()).padStart(2,'0')}`;
    const monthKey = `unique_visitors:month:${now.getUTCFullYear()}-${String(now.getUTCMonth()+1).padStart(2,'0')}`;

    // Helper to update a set in KV
    async function addUniqueVisitor(key, ip) {
      let set = [];
      try {
        const existing = await env.VISITOR_COUNTER.get(key);
        set = existing ? JSON.parse(existing) : [];
      } catch (e) { set = []; }
      if (!set.includes(ip)) {
        set.push(ip);
        // Keep set size reasonable (e.g., 10k per period)
        if (set.length > 10000) set = set.slice(-10000);
        await env.VISITOR_COUNTER.put(key, JSON.stringify(set));
      }
    }
    await addUniqueVisitor(dayKey, ip);
    await addUniqueVisitor(hourKey, ip);
    await addUniqueVisitor(monthKey, ip);

    // Update total visitor count
    const totalKey = 'visitor_count';
    const currentTotal = await env.VISITOR_COUNTER.get(totalKey);
    const newTotal = visitorData.visitCount === 1 ? (parseInt(currentTotal) || 0) + 1 : (parseInt(currentTotal) || 0);
    await env.VISITOR_COUNTER.put(totalKey, newTotal.toString());

    // Update visitors list
    const visitorsListKey = 'visitors_list';
    let visitorsList = [];
    try {
      const existingList = await env.VISITOR_COUNTER.get(visitorsListKey);
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

    await env.VISITOR_COUNTER.put(visitorsListKey, JSON.stringify(visitorsList));

    // After updating visitorsList and before returning the response
    let debugVisitorsList = undefined;
    if (debug) {
      try {
        debugVisitorsList = await env.VISITOR_COUNTER.get(visitorsListKey);
      } catch (e) {
        debugVisitorsList = 'Error fetching visitors_list: ' + e.message;
      }
    }

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
        timestamp: timestamp,
        visitors_list: debugVisitorsList // Always include this line
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