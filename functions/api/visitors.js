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

    // Exclude owner IPs
    const ownerIps = ['YOUR_IP_ADDRESS']; // Replace with your real IP(s)
    if (ip && ownerIps.includes(ip)) {
      const count = await kv.get('visitor_count') || '0';
      return new Response(JSON.stringify({ count }), { headers: corsHeaders });
    }

    // Get geolocation info from Cloudflare headers
    const city = context.request.headers.get('CF-IPCity') || '';
    const region = context.request.headers.get('CF-IPRegion') || '';
    const country = context.request.headers.get('CF-IPCountry') || '';
    const zip = context.request.headers.get('CF-IPPostalCode') || '';

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
        
        // Store visitor data with timestamp
        const visitorData = {
          ip: ip,
          city: city,
          region: region,
          country: country,
          zip: zip,
          firstVisit: new Date().toISOString(),
          lastVisit: new Date().toISOString()
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