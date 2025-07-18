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
      
      const debugInfo = {
        ip: ip,
        cloudflareHeaders: {
          city: city,
          region: region,
          country: country,
          zip: zip
        },
        fallbackAttempted: false,
        fallbackResult: null,
        fallbackError: null
      };
      
      // If Cloudflare headers are empty, try fallback geolocation service
      if (!city && !region && ip) {
        try {
          debugInfo.fallbackAttempted = true;
          console.log('Cloudflare headers empty, trying fallback geolocation for IP:', ip);
          
          // Use ipapi.co as fallback (free tier: 1000 requests/day)
          const geoResponse = await fetch(`https://ipapi.co/${ip}/json/`);
          debugInfo.fallbackResponseStatus = geoResponse.status;
          
          if (geoResponse.ok) {
            const geoData = await geoResponse.json();
            debugInfo.fallbackResult = geoData;
            
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
            debugInfo.fallbackError = `HTTP ${geoResponse.status}`;
          }
        } catch (error) {
          console.log('Fallback geolocation error:', error.message);
          debugInfo.fallbackError = error.message;
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
        testData: true,
        debugInfo: debugInfo
      };
      
      await kv.put(ipKey, JSON.stringify(visitorData));
      await kv.put('visitor_count', '1');
      
      return new Response(JSON.stringify({
        message: 'Test visitor data stored',
        visitorData: visitorData,
        storedKey: ipKey,
        debugInfo: debugInfo
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