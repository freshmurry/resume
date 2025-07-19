// Function to clear old KV data and test new system
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
    
    // Clear all KV data
    if (url.searchParams.get('clear') === 'true') {
      const allKeys = await kv.list();
      const deletedKeys = [];
      
      for (const key of allKeys.keys) {
        await kv.delete(key.name);
        deletedKeys.push(key.name);
      }
      
      return new Response(JSON.stringify({
        message: 'All KV data cleared',
        deletedKeys: deletedKeys
      }, null, 2), { headers: corsHeaders });
    }
    
    // Test new visitor tracking
    if (url.searchParams.get('test') === 'true') {
      const ip = context.request.headers.get('CF-Connecting-IP');
      
      // Get geolocation info from Cloudflare headers
      let city = context.request.headers.get('CF-IPCity') || '';
      let region = context.request.headers.get('CF-IPRegion') || '';
      let country = context.request.headers.get('CF-IPCountry') || '';
      let zip = context.request.headers.get('CF-IPPostalCode') || '';

      // If Cloudflare headers are empty, try free geolocation service
      if (!city && !region && ip) {
        try {
          // Use ipinfo.io (free tier: 50,000 requests/month)
          const response = await fetch(`https://ipinfo.io/${ip}/json`);
          if (response.ok) {
            const geoData = await response.json();
            
            if (geoData.city && geoData.city !== 'null') {
              city = geoData.city || '';
              region = geoData.region || '';
              country = geoData.country || '';
              zip = geoData.postal || '';
            }
          }
        } catch (error) {
          // Silently fail - we'll just use what we have
        }
      }
      
      // Store new visitor data
      const ipKey = `visitor:${ip}`;
      const visitorData = {
        ip: ip,
        city: city,
        region: region,
        country: country,
        zip: zip,
        firstVisit: new Date().toISOString(),
        lastVisit: new Date().toISOString(),
        testData: true
      };
      
      await kv.put(ipKey, JSON.stringify(visitorData));
      await kv.put('visitor_count', '1');
      
      return new Response(JSON.stringify({
        message: 'Test visitor data stored',
        visitorData: visitorData,
        storedKey: ipKey
      }, null, 2), { headers: corsHeaders });
    }
    
    // Show current KV data
    const allKeys = await kv.list();
    const kvData = {};
    
    for (const key of allKeys.keys) {
      const value = await kv.get(key.name);
      kvData[key.name] = value;
    }
    
    return new Response(JSON.stringify({
      message: 'Current KV data',
      data: kvData
    }, null, 2), { headers: corsHeaders });
    
  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message
    }), { headers: corsHeaders });
  }
} 