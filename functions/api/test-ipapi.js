// Test function for ipapi.co with IPv6
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
    const url = new URL(context.request.url);
    
    // Test with your specific IPv6
    const testIP = url.searchParams.get('ip') || ip;
    
    const results = {
      testIP: testIP,
      isIPv6: testIP.includes(':'),
      tests: {}
    };
    
    // Test 1: Direct ipapi.co call
    try {
      console.log('Testing ipapi.co with IP:', testIP);
      const response = await fetch(`https://ipapi.co/${testIP}/json/`);
      results.tests.ipapi = {
        status: response.status,
        ok: response.ok,
        data: response.ok ? await response.json() : null
      };
    } catch (error) {
      results.tests.ipapi = {
        error: error.message
      };
    }
    
    // Test 2: Alternative geolocation service (ipinfo.io)
    try {
      console.log('Testing ipinfo.io with IP:', testIP);
      const response2 = await fetch(`https://ipinfo.io/${testIP}/json`);
      results.tests.ipinfo = {
        status: response2.status,
        ok: response2.ok,
        data: response2.ok ? await response2.json() : null
      };
    } catch (error) {
      results.tests.ipinfo = {
        error: error.message
      };
    }
    
    // Test 3: Another alternative (ip-api.com)
    try {
      console.log('Testing ip-api.com with IP:', testIP);
      const response3 = await fetch(`http://ip-api.com/json/${testIP}`);
      results.tests.ipApi = {
        status: response3.status,
        ok: response3.ok,
        data: response3.ok ? await response3.json() : null
      };
    } catch (error) {
      results.tests.ipApi = {
        error: error.message
      };
    }
    
    return new Response(JSON.stringify(results, null, 2), { headers: corsHeaders });
    
  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message,
      ip: context.request.headers.get('CF-Connecting-IP')
    }), { headers: corsHeaders });
  }
} 