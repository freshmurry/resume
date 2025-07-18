// Cloudflare Function for visitor counter
export async function onRequest(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (context.request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const kv = context.env.VISITOR_COUNTER;
    const url = new URL(context.request.url);
    const ip = context.request.headers.get('CF-Connecting-IP');

    // Add endpoint to view all visitor data (for debugging)
    if (url.searchParams.get('debug') === 'true') {
      const allKeys = await kv.list();
      const visitorData = {};
      
      for (const key of allKeys.keys) {
        const value = await kv.get(key.name);
        visitorData[key.name] = value;
      }
      
      return new Response(JSON.stringify(visitorData, null, 2), { headers: corsHeaders });
    }

    // Add endpoint to view all headers (for debugging geolocation)
    if (url.searchParams.get('headers') === 'true') {
      const allHeaders = {};
      for (const [key, value] of context.request.headers.entries()) {
        allHeaders[key] = value;
      }
      return new Response(JSON.stringify(allHeaders, null, 2), { headers: corsHeaders });
    }

    // Exclude owner IPs
    const ownerIps = ['YOUR_IP_ADDRESS']; // Replace with your real IP(s)
    if (ip && ownerIps.includes(ip)) {
      const count = await kv.get('visitor_count') || '0';
      return new Response(JSON.stringify({ count }), { headers: corsHeaders });
    }

    // Get geolocation info from Cloudflare headers
    let city = context.request.headers.get('CF-IPCity') || '';
    let region = context.request.headers.get('CF-IPRegion') || '';
    let country = context.request.headers.get('CF-IPCountry') || '';
    let zip = context.request.headers.get('CF-IPPostalCode') || '';
    
    // Additional geolocation headers that might be available
    const latitude = context.request.headers.get('CF-IPLatitude') || '';
    const longitude = context.request.headers.get('CF-IPLongitude') || '';
    const timezone = context.request.headers.get('CF-IPTimezone') || '';
    const continent = context.request.headers.get('CF-IPContinent') || '';

    // If Cloudflare headers are empty, try fallback geolocation service
    if (!city && !region && ip) {
      try {
        console.log('Cloudflare headers empty, trying fallback geolocation for IP:', ip);
        
        // Use ipapi.co as fallback (free tier: 1000 requests/day)
        const geoResponse = await fetch(`https://ipapi.co/${ip}/json/`);
        if (geoResponse.ok) {
          const geoData = await geoResponse.json();
          
          // Only use fallback data if we got valid results
          if (geoData.city && geoData.city !== 'null') {
            city = geoData.city || '';
            region = geoData.region || geoData.region_code || '';
            country = geoData.country || geoData.country_code || '';
            zip = geoData.postal || '';
            
            console.log('Fallback geolocation successful:', { city, region, country, zip });
          } else {
            console.log('Fallback geolocation returned invalid data:', geoData);
          }
        } else {
          console.log('Fallback geolocation request failed:', geoResponse.status);
        }
      } catch (error) {
        console.log('Fallback geolocation error:', error.message);
      }
    }

    if (kv && ip) {
      // Check if this IP has already visited
      const ipKey = `visitor:${ip}`;
      const alreadyVisited = await kv.get(ipKey);

      let count;
      if (!alreadyVisited) {
        // New unique visitor
        const currentCount = await kv.get('visitor_count') || '0';
        count = parseInt(currentCount) + 1;
        await kv.put('visitor_count', count.toString());
        
        // Store visitor data with timestamp and all available geolocation info
        const visitorData = {
          ip: ip,
          city: city,
          region: region,
          country: country,
          zip: zip,
          latitude: latitude,
          longitude: longitude,
          timezone: timezone,
          continent: continent,
          firstVisit: new Date().toISOString(),
          lastVisit: new Date().toISOString(),
          // Store all headers for debugging
          allHeaders: Object.fromEntries(context.request.headers.entries())
        };
        
        await kv.put(ipKey, JSON.stringify(visitorData));
        
        // Also store in a visitors list for easy access
        const visitorsListKey = 'visitors_list';
        let visitorsList = await kv.get(visitorsListKey);
        if (!visitorsList) {
          visitorsList = [];
        } else {
          visitorsList = JSON.parse(visitorsList);
        }
        visitorsList.push(visitorData);
        await kv.put(visitorsListKey, JSON.stringify(visitorsList));
        
      } else {
        // Not a new visitor, but update last visit time
        const visitorData = JSON.parse(alreadyVisited);
        visitorData.lastVisit = new Date().toISOString();
        await kv.put(ipKey, JSON.stringify(visitorData));
        
        count = await kv.get('visitor_count') || '0';
      }

      return new Response(JSON.stringify({ count }), { headers: corsHeaders });
    }

    // Fallback if KV not set up
    return new Response(JSON.stringify({ count: Math.floor(Date.now() / 100000) + 500 }), { headers: corsHeaders });
  } catch (error) {
    return new Response(JSON.stringify({
      count: Math.floor(Math.random() * 1000) + 500,
      error: 'Using fallback counter'
    }), { headers: corsHeaders });
  }
} 