// Cloudflare Function for news API
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
    }), { headers: corsHeaders })
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
    }), { headers: corsHeaders })
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