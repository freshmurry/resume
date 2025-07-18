// Test function for geolocation
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
    const ip = context.request.headers.get('CF-Connecting-IP');
    
    // Get Cloudflare headers
    const cfCity = context.request.headers.get('CF-IPCity') || '';
    const cfRegion = context.request.headers.get('CF-IPRegion') || '';
    const cfCountry = context.request.headers.get('CF-IPCountry') || '';
    const cfZip = context.request.headers.get('CF-IPPostalCode') || '';

    let fallbackData = null;
    let fallbackUsed = false;

    // If Cloudflare headers are empty, try fallback
    if (!cfCity && !cfRegion && ip) {
      try {
        fallbackUsed = true;
        const geoResponse = await fetch(`https://ipapi.co/${ip}/json/`);
        if (geoResponse.ok) {
          fallbackData = await geoResponse.json();
        }
      } catch (error) {
        console.error('Fallback geolocation error:', error);
      }
    }

    const result = {
      ip: ip,
      cloudflare: {
        city: cfCity,
        region: cfRegion,
        country: cfCountry,
        zip: cfZip,
        hasData: !!(cfCity || cfRegion || cfCountry)
      },
      fallback: fallbackData,
      fallbackUsed: fallbackUsed,
      final: {
        city: fallbackData?.city || cfCity,
        region: fallbackData?.region || fallbackData?.region_code || cfRegion,
        country: fallbackData?.country || fallbackData?.country_code || cfCountry,
        zip: fallbackData?.postal || cfZip
      }
    };

    return new Response(JSON.stringify(result, null, 2), { headers: corsHeaders });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message,
      ip: context.request.headers.get('CF-Connecting-IP')
    }), { headers: corsHeaders });
  }
} 