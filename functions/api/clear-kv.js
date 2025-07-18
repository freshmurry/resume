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
        fallbackResults: [],
        successfulService: null
      };
      
      // If Cloudflare headers are empty, try fallback geolocation services
      if (!city && !region && ip) {
        debugInfo.fallbackAttempted = true;
        
        const fallbackServices = [
          {
            name: 'ipapi.co',
            url: `https://ipapi.co/${ip}/json/`,
            transform: (data) => ({
              city: data.city,
              region: data.region || data.region_code,
              country: data.country || data.country_code,
              zip: data.postal
            })
          },
          {
            name: 'ipinfo.io',
            url: `https://ipinfo.io/${ip}/json`,
            transform: (data) => ({
              city: data.city,
              region: data.region,
              country: data.country,
              zip: data.postal
            })
          },
          {
            name: 'ip-api.com',
            url: `http://ip-api.com/json/${ip}`,
            transform: (data) => ({
              city: data.city,
              region: data.regionName,
              country: data.country,
              zip: data.zip
            })
          }
        ];

        for (const service of fallbackServices) {
          try {
            console.log(`Trying ${service.name} for IP:`, ip);
            
            const response = await fetch(service.url, {
              headers: {
                'User-Agent': 'Cloudflare-Worker/1.0'
              }
            });
            
            const serviceResult = {
              service: service.name,
              status: response.status,
              ok: response.ok,
              data: null,
              error: null
            };
            
            if (response.ok) {
              const geoData = await response.json();
              serviceResult.data = geoData;
              
              // Check if we got valid data
              if (geoData.city && geoData.city !== 'null' && geoData.city !== '') {
                const transformed = service.transform(geoData);
                city = transformed.city || '';
                region = transformed.region || '';
                country = transformed.country || '';
                zip = transformed.zip || '';
                
                debugInfo.successfulService = service.name;
                console.log(`${service.name} geolocation successful:`, { city, region, country, zip });
                break; // Stop trying other services if we got valid data
              } else {
                console.log(`${service.name} returned invalid data:`, geoData);
              }
            } else {
              console.log(`${service.name} request failed:`, response.status);
              serviceResult.error = `HTTP ${response.status}`;
            }
            
            debugInfo.fallbackResults.push(serviceResult);
          } catch (error) {
            console.log(`${service.name} error:`, error.message);
            debugInfo.fallbackResults.push({
              service: service.name,
              error: error.message
            });
          }
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