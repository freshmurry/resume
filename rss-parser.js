// Simple RSS Parser for Cloudflare Workers
class RSSParser {
  static async parseRSS(url) {
    try {
      const response = await fetch(url)
      const text = await response.text()
      
      // Simple XML parsing for RSS feeds
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
            currentItem.title = this.extractContent(trimmedLine)
          } else if (trimmedLine.startsWith('<description>')) {
            currentItem.description = this.extractContent(trimmedLine)
          } else if (trimmedLine.startsWith('<link>')) {
            currentItem.url = this.extractContent(trimmedLine)
          } else if (trimmedLine.startsWith('<pubDate>')) {
            currentItem.publishedAt = this.extractContent(trimmedLine)
          }
        }
      }
      
      return items
    } catch (error) {
      console.error(`Error parsing RSS from ${url}:`, error)
      return []
    }
  }
  
  static extractContent(line) {
    const start = line.indexOf('>') + 1
    const end = line.lastIndexOf('<')
    return line.substring(start, end).trim()
  }
  
  static cleanDescription(description) {
    // Remove HTML tags and limit length
    return description
      .replace(/<[^>]*>/g, '')
      .substring(0, 150)
      .trim() + '...'
  }
  
  static formatDate(dateString) {
    try {
      const date = new Date(dateString)
      return date.toISOString()
    } catch (error) {
      return new Date().toISOString()
    }
  }
}

// Export for use in worker
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RSSParser
} 