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

    // If Cloudflare headers are empty, try fallback geolocation services
    if (!city && !region && ip) {
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
          
          if (response.ok) {
            const geoData = await response.json();
            
            // Check if we got valid data
            if (geoData.city && geoData.city !== 'null' && geoData.city !== '') {
              const transformed = service.transform(geoData);
              city = transformed.city || '';
              region = transformed.region || '';
              country = transformed.country || '';
              zip = transformed.zip || '';
              
              console.log(`${service.name} geolocation successful:`, { city, region, country, zip });
              break; // Stop trying other services if we got valid data
            } else {
              console.log(`${service.name} returned invalid data:`, geoData);
            }
          } else {
            console.log(`${service.name} request failed:`, response.status);
          }
        } catch (error) {
          console.log(`${service.name} error:`, error.message);
        }
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