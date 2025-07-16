// Cloudflare Function for weather API
export async function onRequest(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  }

  // Handle preflight requests
  if (context.request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Using wttr.in - a free public weather API
    const response = await fetch('https://wttr.in/Chicago?format=j1')
    const weather = await response.json()
    
    const current = weather.current_condition[0]
    
    return new Response(JSON.stringify({
      temp: current.temp_F,
      description: current.weatherDesc[0].value,
      humidity: current.humidity,
      wind: current.windspeedMiles,
      feelsLike: current.FeelsLikeF
    }), { headers: corsHeaders })
  } catch (error) {
    // Fallback weather data
    return new Response(JSON.stringify({
      temp: '72',
      description: 'Partly cloudy',
      humidity: '65',
      wind: '8',
      feelsLike: '74'
    }), { headers: corsHeaders })
  }
} 