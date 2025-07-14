<<<<<<< HEAD
// Enhanced Cloudflare Worker with API routes and dynamic functionality
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  const userAgent = request.headers.get('User-Agent') || ''
  
  // List of search engine bots
  const searchEngines = [
    'Googlebot', 'Googlebot-Image', 'Googlebot-Mobile', 'Bingbot', 'Slurp',
    'DuckDuckBot', 'Baiduspider', 'YandexBot', 'facebookexternalhit',
    'Twitterbot', 'LinkedInBot'
  ]
  
  // Check if request is from a search engine
  const isSearchEngine = searchEngines.some(bot => userAgent.includes(bot))
  
  // Handle API routes
  if (url.pathname.startsWith('/api/')) {
    return handleApiRequest(request, url)
  }
  
  // If it's a search engine, ensure access
  if (isSearchEngine) {
    const response = await fetch(request)
    const newResponse = new Response(response.body, response)
    
    newResponse.headers.set('X-Robots-Tag', 'index, follow')
    newResponse.headers.set('Access-Control-Allow-Origin', '*')
    newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type')
    
    return newResponse
  }
  
  // For regular users, serve normally
  return fetch(request)
}

async function handleApiRequest(request, url) {
  const path = url.pathname
  
  // CORS headers for API requests
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  }
  
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  try {
    switch (path) {
      case '/api/weather':
        return await getWeather(corsHeaders)
      
      case '/api/news':
        return await getNews(corsHeaders)
      
      case '/api/visitors':
        return await getVisitorCount(request, corsHeaders)
      
      case '/api/contact':
        return await handleContactForm(request, corsHeaders)
      
      case '/api/projects':
        return await getGitHubProjects(corsHeaders)
      
      default:
        return new Response(JSON.stringify({ error: 'API endpoint not found' }), {
          status: 404,
          headers: corsHeaders
        })
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders
    })
  }
}

// Weather API endpoint - Using free public API
async function getWeather(headers) {
  try {
    // Using wttr.in - a free public weather API
    const response = await fetch(
      'https://wttr.in/Chicago?format=j1'
    )
    const weather = await response.json()
    
    const current = weather.current_condition[0]
    
    return new Response(JSON.stringify({
      temp: current.temp_F,
      description: current.weatherDesc[0].value,
      humidity: current.humidity,
      wind: current.windspeedMiles,
      feelsLike: current.FeelsLikeF
    }), { headers })
  } catch (error) {
    // Fallback weather data
    return new Response(JSON.stringify({
      temp: '72',
      description: 'Partly cloudy',
      humidity: '65',
      wind: '8',
      feelsLike: '74'
    }), { headers })
  }
}

// News API endpoint - Using free public RSS feeds
async function getNews(headers) {
  try {
    // Using RSS feeds from reputable sources
    const rssUrls = [
      'https://www.apmp.org/feed/',
      'https://www.shipleyassociates.com/feed/',
      'https://www.proposalworks.com/feed/'
    ]
    
    const newsPromises = rssUrls.map(async (url) => {
      try {
        const response = await fetch(url)
        const text = await response.text()
        
        // Simple RSS parsing
        const items = []
        const lines = text.split('\n')
        
        let currentItem = {}
        let inItem = false
        
        for (const line of lines) {
          const trimmedLine = line.trim()
          
          if (trimmedLine.startsWith('<item>')) {
            inItem = true
            currentItem = {}
          } else if (trimmedLine.startsWith('</item>')) {
            inItem = false
            if (Object.keys(currentItem).length > 0) {
              items.push(currentItem)
            }
          } else if (inItem) {
            if (trimmedLine.startsWith('<title>')) {
              currentItem.title = extractContent(trimmedLine)
            } else if (trimmedLine.startsWith('<description>')) {
              currentItem.description = cleanDescription(extractContent(trimmedLine))
            } else if (trimmedLine.startsWith('<link>')) {
              currentItem.url = extractContent(trimmedLine)
            } else if (trimmedLine.startsWith('<pubDate>')) {
              currentItem.publishedAt = formatDate(extractContent(trimmedLine))
            }
          }
        }
        
        return items.slice(0, 2)
      } catch (error) {
        return []
      }
    })
    
    const allNews = await Promise.all(newsPromises)
    const flatNews = allNews.flat().slice(0, 5)
    
    return new Response(JSON.stringify({
      articles: flatNews
    }), { headers })
  } catch (error) {
    // Fallback news data
    return new Response(JSON.stringify({
      articles: [
        {
          title: 'Proposal Management Best Practices',
          description: 'Latest trends in proposal management and RFP responses',
          url: 'https://www.apmp.org',
          publishedAt: new Date().toISOString()
        },
        {
          title: 'Digital Transformation in Government Proposals',
          description: 'How technology is changing the proposal landscape',
          url: 'https://www.shipleyassociates.com',
          publishedAt: new Date().toISOString()
        },
        {
          title: 'APMP Certification Benefits',
          description: 'Why getting certified in proposal management matters',
          url: 'https://www.proposalworks.com',
          publishedAt: new Date().toISOString()
        }
      ]
    }), { headers })
  }
}

// Helper functions for RSS parsing
function extractContent(line) {
  const start = line.indexOf('>') + 1
  const end = line.lastIndexOf('<')
  return line.substring(start, end).trim()
}

function cleanDescription(description) {
  return description
    .replace(/<[^>]*>/g, '')
    .substring(0, 150)
    .trim() + '...'
}

function formatDate(dateString) {
  try {
    const date = new Date(dateString)
    return date.toISOString()
  } catch (error) {
    return new Date().toISOString()
  }
}

// Visitor counter using Cloudflare KV
async function getVisitorCount(request, headers) {
  const kv = VISITOR_COUNTER // You'll need to bind this in Cloudflare dashboard
  const ip = request.headers.get('CF-Connecting-IP')
  
  if (kv) {
    const currentCount = await kv.get('visitor_count') || '0'
    const newCount = parseInt(currentCount) + 1
    await kv.put('visitor_count', newCount.toString())
    
    return new Response(JSON.stringify({ count: newCount }), { headers })
  }
  
  // Fallback without KV
  return new Response(JSON.stringify({ count: Math.floor(Math.random() * 1000) + 500 }), { headers })
}

// Contact form handler
async function handleContactForm(request, headers) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers
    })
  }
  
  const formData = await request.json()
  
  // Here you would typically send an email or store the data
  // For now, we'll just return a success response
  
  return new Response(JSON.stringify({
    success: true,
    message: 'Thank you for your message! I\'ll get back to you soon.'
  }), { headers })
}

// GitHub projects API - Only recent updates
async function getGitHubProjects(headers) {
  const response = await fetch('https://api.github.com/users/freshmurry/repos')
  const repos = await response.json()
  
  // Configuration for project filtering
  const RECENT_DAYS = 30
  const MAX_PROJECTS = 5
  
  // Get current date for comparison
  const now = new Date()
  const recentThreshold = new Date(now.getTime() - (RECENT_DAYS * 24 * 60 * 60 * 1000))
  
  const projects = repos
    .filter(repo => !repo.fork) // Exclude forked repositories
    .filter(repo => {
      // Check if repo has been updated in the last 30 days
      const lastUpdated = new Date(repo.updated_at)
      return lastUpdated > recentThreshold
    })
    .sort((a, b) => {
      // Sort by most recently updated first
      return new Date(b.updated_at) - new Date(a.updated_at)
    })
    .slice(0, MAX_PROJECTS) // Limit to configured number
    .map(repo => ({
      name: repo.name,
      description: repo.description,
      url: repo.html_url,
      language: repo.language,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      lastUpdated: repo.updated_at,
      daysAgo: Math.floor((now - new Date(repo.updated_at)) / (1000 * 60 * 60 * 24))
    }))
  
  return new Response(JSON.stringify({ 
    projects,
    totalActive: repos.filter(repo => !repo.fork && new Date(repo.updated_at) > recentThreshold).length,
    recentDays: RECENT_DAYS
  }), { headers })
=======
// Enhanced Cloudflare Worker with API routes and dynamic functionality
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  const userAgent = request.headers.get('User-Agent') || ''
  
  // List of search engine bots
  const searchEngines = [
    'Googlebot', 'Googlebot-Image', 'Googlebot-Mobile', 'Bingbot', 'Slurp',
    'DuckDuckBot', 'Baiduspider', 'YandexBot', 'facebookexternalhit',
    'Twitterbot', 'LinkedInBot'
  ]
  
  // Check if request is from a search engine
  const isSearchEngine = searchEngines.some(bot => userAgent.includes(bot))
  
  // Handle API routes
  if (url.pathname.startsWith('/api/')) {
    return handleApiRequest(request, url)
  }
  
  // If it's a search engine, ensure access
  if (isSearchEngine) {
    const response = await fetch(request)
    const newResponse = new Response(response.body, response)
    
    newResponse.headers.set('X-Robots-Tag', 'index, follow')
    newResponse.headers.set('Access-Control-Allow-Origin', '*')
    newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type')
    
    return newResponse
  }
  
  // For regular users, serve normally
  return fetch(request)
}

async function handleApiRequest(request, url) {
  const path = url.pathname
  
  // CORS headers for API requests
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  }
  
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  try {
    switch (path) {
      case '/api/weather':
        return await getWeather(corsHeaders)
      
      case '/api/news':
        return await getNews(corsHeaders)
      
      case '/api/visitors':
        return await getVisitorCount(request, corsHeaders)
      
      case '/api/contact':
        return await handleContactForm(request, corsHeaders)
      
      case '/api/projects':
        return await getGitHubProjects(corsHeaders)
      
      default:
        return new Response(JSON.stringify({ error: 'API endpoint not found' }), {
          status: 404,
          headers: corsHeaders
        })
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders
    })
  }
}

// Weather API endpoint - Using free public API
async function getWeather(headers) {
  try {
    // Using wttr.in - a free public weather API
    const response = await fetch(
      'https://wttr.in/Chicago?format=j1'
    )
    const weather = await response.json()
    
    const current = weather.current_condition[0]
    
    return new Response(JSON.stringify({
      temp: current.temp_F,
      description: current.weatherDesc[0].value,
      humidity: current.humidity,
      wind: current.windspeedMiles,
      feelsLike: current.FeelsLikeF
    }), { headers })
  } catch (error) {
    // Fallback weather data
    return new Response(JSON.stringify({
      temp: '72',
      description: 'Partly cloudy',
      humidity: '65',
      wind: '8',
      feelsLike: '74'
    }), { headers })
  }
}

// News API endpoint - Using free public RSS feeds
async function getNews(headers) {
  try {
    // Using RSS feeds from reputable sources
    const rssUrls = [
      'https://www.apmp.org/feed/',
      'https://www.shipleyassociates.com/feed/',
      'https://www.proposalworks.com/feed/'
    ]
    
    const newsPromises = rssUrls.map(async (url) => {
      try {
        const response = await fetch(url)
        const text = await response.text()
        
        // Simple RSS parsing
        const items = []
        const lines = text.split('\n')
        
        let currentItem = {}
        let inItem = false
        
        for (const line of lines) {
          const trimmedLine = line.trim()
          
          if (trimmedLine.startsWith('<item>')) {
            inItem = true
            currentItem = {}
          } else if (trimmedLine.startsWith('</item>')) {
            inItem = false
            if (Object.keys(currentItem).length > 0) {
              items.push(currentItem)
            }
          } else if (inItem) {
            if (trimmedLine.startsWith('<title>')) {
              currentItem.title = extractContent(trimmedLine)
            } else if (trimmedLine.startsWith('<description>')) {
              currentItem.description = cleanDescription(extractContent(trimmedLine))
            } else if (trimmedLine.startsWith('<link>')) {
              currentItem.url = extractContent(trimmedLine)
            } else if (trimmedLine.startsWith('<pubDate>')) {
              currentItem.publishedAt = formatDate(extractContent(trimmedLine))
            }
          }
        }
        
        return items.slice(0, 2)
      } catch (error) {
        return []
      }
    })
    
    const allNews = await Promise.all(newsPromises)
    const flatNews = allNews.flat().slice(0, 5)
    
    return new Response(JSON.stringify({
      articles: flatNews
    }), { headers })
  } catch (error) {
    // Fallback news data
    return new Response(JSON.stringify({
      articles: [
        {
          title: 'Proposal Management Best Practices',
          description: 'Latest trends in proposal management and RFP responses',
          url: 'https://www.apmp.org',
          publishedAt: new Date().toISOString()
        },
        {
          title: 'Digital Transformation in Government Proposals',
          description: 'How technology is changing the proposal landscape',
          url: 'https://www.shipleyassociates.com',
          publishedAt: new Date().toISOString()
        },
        {
          title: 'APMP Certification Benefits',
          description: 'Why getting certified in proposal management matters',
          url: 'https://www.proposalworks.com',
          publishedAt: new Date().toISOString()
        }
      ]
    }), { headers })
  }
}

// Helper functions for RSS parsing
function extractContent(line) {
  const start = line.indexOf('>') + 1
  const end = line.lastIndexOf('<')
  return line.substring(start, end).trim()
}

function cleanDescription(description) {
  return description
    .replace(/<[^>]*>/g, '')
    .substring(0, 150)
    .trim() + '...'
}

function formatDate(dateString) {
  try {
    const date = new Date(dateString)
    return date.toISOString()
  } catch (error) {
    return new Date().toISOString()
  }
}

// Visitor counter using Cloudflare KV
async function getVisitorCount(request, headers) {
  const kv = VISITOR_COUNTER // You'll need to bind this in Cloudflare dashboard
  const ip = request.headers.get('CF-Connecting-IP')
  
  if (kv) {
    const currentCount = await kv.get('visitor_count') || '0'
    const newCount = parseInt(currentCount) + 1
    await kv.put('visitor_count', newCount.toString())
    
    return new Response(JSON.stringify({ count: newCount }), { headers })
  }
  
  // Fallback without KV
  return new Response(JSON.stringify({ count: Math.floor(Math.random() * 1000) + 500 }), { headers })
}

// Contact form handler
async function handleContactForm(request, headers) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers
    })
  }
  
  const formData = await request.json()
  
  // Here you would typically send an email or store the data
  // For now, we'll just return a success response
  
  return new Response(JSON.stringify({
    success: true,
    message: 'Thank you for your message! I\'ll get back to you soon.'
  }), { headers })
}

// GitHub projects API - Only recent updates
async function getGitHubProjects(headers) {
  const response = await fetch('https://api.github.com/users/freshmurry/repos')
  const repos = await response.json()
  
  // Configuration for project filtering
  const RECENT_DAYS = 30
  const MAX_PROJECTS = 5
  
  // Get current date for comparison
  const now = new Date()
  const recentThreshold = new Date(now.getTime() - (RECENT_DAYS * 24 * 60 * 60 * 1000))
  
  const projects = repos
    .filter(repo => !repo.fork) // Exclude forked repositories
    .filter(repo => {
      // Check if repo has been updated in the last 30 days
      const lastUpdated = new Date(repo.updated_at)
      return lastUpdated > recentThreshold
    })
    .sort((a, b) => {
      // Sort by most recently updated first
      return new Date(b.updated_at) - new Date(a.updated_at)
    })
    .slice(0, MAX_PROJECTS) // Limit to configured number
    .map(repo => ({
      name: repo.name,
      description: repo.description,
      url: repo.html_url,
      language: repo.language,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      lastUpdated: repo.updated_at,
      daysAgo: Math.floor((now - new Date(repo.updated_at)) / (1000 * 60 * 60 * 24))
    }))
  
  return new Response(JSON.stringify({ 
    projects,
    totalActive: repos.filter(repo => !repo.fork && new Date(repo.updated_at) > recentThreshold).length,
    recentDays: RECENT_DAYS
  }), { headers })
>>>>>>> 2278488c6c3a2b1afca894909a25142cc64155d8
} 