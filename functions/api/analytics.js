export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const type = url.searchParams.get('type') || 'all';

  try {
    // Get all visitors data
    const visitorsListKey = 'visitors_list';
    const visitorsListData = await env.KV.get(visitorsListKey);
    const visitors = visitorsListData ? JSON.parse(visitorsListData) : [];

    // Get persistent total visitor count
    const totalKey = 'visitor_count';
    const totalVisitorCount = parseInt(await env.KV.get(totalKey)) || 0;

    // Get SEO keywords
    let seoKeywords = [];
    try {
      const seoRaw = await env.KV.get('seo_keywords');
      seoKeywords = seoRaw ? JSON.parse(seoRaw) : [];
    } catch (e) { seoKeywords = []; }

    // Unique visitors by day/hour/month
    async function getUniqueCounts(prefix, periods) {
      const results = [];
      for (const period of periods) {
        const key = `${prefix}:${period}`;
        let count = 0;
        try {
          const set = await env.KV.get(key);
          count = set ? JSON.parse(set).length : 0;
        } catch (e) { count = 0; }
        results.push({ period, count });
      }
      return results;
    }
    // Prepare periods
    const now = new Date();
    const days = Array.from({length: 7}, (_,i) => {
      const d = new Date(now); d.setUTCDate(now.getUTCDate()-i);
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
    }).reverse();
    const hours = Array.from({length: 24}, (_,i) => {
      const d = new Date(now); d.setUTCHours(now.getUTCHours()-i);
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}:${String(d.getUTCHours()).padStart(2,'0')}`;
    }).reverse();
    const months = Array.from({length: 12}, (_,i) => {
      const d = new Date(now); d.setUTCMonth(now.getUTCMonth()-i);
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`;
    }).reverse();
    const uniqueByDay = await getUniqueCounts('unique_visitors:day', days);
    const uniqueByHour = await getUniqueCounts('unique_visitors:hour', hours);
    const uniqueByMonth = await getUniqueCounts('unique_visitors:month', months);

    if (type === 'all' || type === 'geographic') {
      // Geographic Analytics
      const geographicData = analyzeGeographicData(visitors);
      
      if (type === 'geographic') {
        return new Response(JSON.stringify(geographicData), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    if (type === 'all' || type === 'temporal') {
      // Temporal Analytics
      const temporalData = analyzeTemporalData(visitors);
      
      if (type === 'temporal') {
        return new Response(JSON.stringify(temporalData), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    if (type === 'all' || type === 'engagement') {
      // Engagement Analytics
      const engagementData = analyzeEngagementData(visitors);
      
      if (type === 'engagement') {
        return new Response(JSON.stringify(engagementData), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    if (type === 'all' || type === 'technical') {
      // Technical Analytics
      const technicalData = analyzeTechnicalData(visitors);
      
      if (type === 'technical') {
        return new Response(JSON.stringify(technicalData), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    if (type === 'all' || type === 'behavioral') {
      // Behavioral Analytics
      const behavioralData = analyzeBehavioralData(visitors);
      
      if (type === 'behavioral') {
        return new Response(JSON.stringify(behavioralData), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    if (type === 'all' || type === 'realtime') {
      // Real-time Analytics
      const realtimeData = analyzeRealtimeData(visitors, totalVisitorCount);
      
      if (type === 'realtime') {
        return new Response(JSON.stringify(realtimeData), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    if (type === 'all' || type === 'referrer') {
      const referrerData = analyzeReferrerData(visitors);
      if (type === 'referrer') {
        return new Response(JSON.stringify(referrerData), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    if (type === 'all') {
      // Return all analytics data
      const allData = {
        geographic: analyzeGeographicData(visitors),
        temporal: analyzeTemporalData(visitors),
        engagement: analyzeEngagementData(visitors),
        technical: analyzeTechnicalData(visitors),
        behavioral: analyzeBehavioralData(visitors),
        realtime: analyzeRealtimeData(visitors, totalVisitorCount),
        referrer: analyzeReferrerData(visitors),
        uniqueVisitors: {
          byDay: uniqueByDay,
          byHour: uniqueByHour,
          byMonth: uniqueByMonth
        },
        seoKeywords
      };

      return new Response(JSON.stringify(allData), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid analytics type' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error generating analytics:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to generate analytics',
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Geographic Analytics
function analyzeGeographicData(visitors) {
  const countries = {};
  const cities = {};
  const states = {};
  const continents = {};

  visitors.forEach(visitor => {
    const country = visitor.country || 'Unknown';
    const city = visitor.city || 'Unknown';
    const state = visitor.state || 'Unknown';
    const continent = visitor.continent || 'Unknown';

    countries[country] = (countries[country] || 0) + 1;
    cities[city] = (cities[city] || 0) + 1;
    states[state] = (states[state] || 0) + 1;
    continents[continent] = (continents[continent] || 0) + 1;
  });

  return {
    topCountries: Object.entries(countries)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([country, count]) => ({ country, count })),
    topCities: Object.entries(cities)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([city, count]) => ({ city, count })),
    topStates: Object.entries(states)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([state, count]) => ({ state, count })),
    continents: Object.entries(continents)
      .sort(([,a], [,b]) => b - a)
      .map(([continent, count]) => ({ continent, count }))
  };
}

// Temporal Analytics
function analyzeTemporalData(visitors) {
  const hourlyData = new Array(24).fill(0);
  const dailyData = new Array(7).fill(0);
  const monthlyData = new Array(12).fill(0);

  visitors.forEach(visitor => {
    const lastVisit = new Date(visitor.lastVisit);
    const hour = lastVisit.getHours();
    const day = lastVisit.getDay();
    const month = lastVisit.getMonth();

    hourlyData[hour]++;
    dailyData[day]++;
    monthlyData[month]++;
  });

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                     'July', 'August', 'September', 'October', 'November', 'December'];

  return {
    hourly: hourlyData.map((count, hour) => ({ hour, count })),
    daily: dailyData.map((count, day) => ({ day: dayNames[day], count })),
    monthly: monthlyData.map((count, month) => ({ month: monthNames[month], count }))
  };
}

// Engagement Analytics
function analyzeEngagementData(visitors) {
  let totalSessions = 0;
  let totalDuration = 0;
  let returnVisitors = 0;
  let singlePageVisits = 0;
  const sessionDurations = [];

  visitors.forEach(visitor => {
    if (visitor.visitCount > 1) returnVisitors++;
    
    if (visitor.sessions) {
      visitor.sessions.forEach(session => {
        totalSessions++;
        if (session.duration) {
          totalDuration += session.duration;
          sessionDurations.push(session.duration);
        }
      });
    }

    if (visitor.pageViews && visitor.pageViews.length === 1) {
      singlePageVisits++;
    }
  });

  const avgSessionDuration = totalSessions > 0 ? totalDuration / totalSessions : 0;
  const bounceRate = visitors.length > 0 ? (singlePageVisits / visitors.length) * 100 : 0;
  const returnRate = visitors.length > 0 ? (returnVisitors / visitors.length) * 100 : 0;

  return {
    totalSessions,
    avgSessionDuration: Math.round(avgSessionDuration / 1000), // Convert to seconds
    bounceRate: Math.round(bounceRate * 100) / 100,
    returnRate: Math.round(returnRate * 100) / 100,
    sessionDurations: sessionDurations.map(d => Math.round(d / 1000))
  };
}

// Technical Analytics
function analyzeTechnicalData(visitors) {
  const devices = {};
  const browsers = {};
  const operatingSystems = {};

  visitors.forEach(visitor => {
    if (visitor.deviceInfo) {
      const device = visitor.deviceInfo.deviceType || 'unknown';
      const browser = visitor.deviceInfo.browser || 'unknown';
      const os = visitor.deviceInfo.os || 'unknown';

      devices[device] = (devices[device] || 0) + 1;
      browsers[browser] = (browsers[browser] || 0) + 1;
      operatingSystems[os] = (operatingSystems[os] || 0) + 1;
    }
  });

  return {
    devices: Object.entries(devices)
      .sort(([,a], [,b]) => b - a)
      .map(([device, count]) => ({ device, count })),
    browsers: Object.entries(browsers)
      .sort(([,a], [,b]) => b - a)
      .map(([browser, count]) => ({ browser, count })),
    operatingSystems: Object.entries(operatingSystems)
      .sort(([,a], [,b]) => b - a)
      .map(([os, count]) => ({ os, count }))
  };
}

// Behavioral Analytics
function analyzeBehavioralData(visitors) {
  const timeZones = {};
  const visitPatterns = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  let weekendVisits = 0;
  let weekdayVisits = 0;

  visitors.forEach(visitor => {
    const lastVisit = new Date(visitor.lastVisit);
    const hour = lastVisit.getHours();
    const day = lastVisit.getDay();
    const timezone = visitor.timezone || 'Unknown';

    timeZones[timezone] = (timeZones[timezone] || 0) + 1;

    // Categorize by time of day
    if (hour >= 6 && hour < 12) visitPatterns.morning++;
    else if (hour >= 12 && hour < 17) visitPatterns.afternoon++;
    else if (hour >= 17 && hour < 22) visitPatterns.evening++;
    else visitPatterns.night++;

    // Weekend vs weekday
    if (day === 0 || day === 6) weekendVisits++;
    else weekdayVisits++;
  });

  return {
    timeZones: Object.entries(timeZones)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([timezone, count]) => ({ timezone, count })),
    visitPatterns,
    weekendVisits,
    weekdayVisits
  };
}

// Real-time Analytics
function analyzeRealtimeData(visitors, totalVisitorCount) {
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  let currentlyOnline = 0;
  let activeLastHour = 0;
  let activeLastDay = 0;

  visitors.forEach(visitor => {
    const lastVisit = new Date(visitor.lastVisit);
    
    if (lastVisit > fiveMinutesAgo) currentlyOnline++;
    if (lastVisit > oneHourAgo) activeLastHour++;
    if (lastVisit > oneDayAgo) activeLastDay++;
  });

  return {
    currentlyOnline,
    activeLastHour,
    activeLastDay,
    totalVisitors: totalVisitorCount
  };
} 

function analyzeReferrerData(visitors) {
  const referrers = {};
  visitors.forEach(visitor => {
    let ref = visitor.referrer || 'Direct/None';
    // Simplify referrer (strip protocol, path, etc.)
    try {
      if (ref && ref !== 'Direct/None') {
        ref = (new URL(ref)).hostname;
      }
    } catch (e) {}
    referrers[ref] = (referrers[ref] || 0) + 1;
  });
  return Object.entries(referrers)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([referrer, count]) => ({ referrer, count }));
} 