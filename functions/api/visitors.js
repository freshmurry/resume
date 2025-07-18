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
    const ip = context.request.headers.get('CF-Connecting-IP');

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
      const ipKey = `ip:${ip}`;
      const alreadyVisited = await kv.get(ipKey);

      let count;
      if (!alreadyVisited) {
        // New unique visitor
        const currentCount = await kv.get('visitor_count') || '0';
        count = parseInt(currentCount) + 1;
        await kv.put('visitor_count', count.toString());
        // Store IP and geolocation info indefinitely
        const geoData = JSON.stringify({ city, region, country, zip });
        await kv.put(ipKey, geoData);
      } else {
        // Not a new visitor
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