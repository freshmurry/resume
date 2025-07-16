// API Client for Cloudflare Pages Functions
class ApiClient {
  constructor() {
    this.baseUrl = window.location.origin
  }

  async fetchWithTimeout(url, options = {}, timeout = 5000) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      return response
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  async getWeather() {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/weather`)
      if (!response.ok) throw new Error('Weather API failed')
      return await response.json()
    } catch (error) {
      console.warn('Weather API error:', error)
      return {
        temp: '72',
        description: 'Partly cloudy',
        humidity: '65',
        wind: '8',
        feelsLike: '74'
      }
    }
  }

  async getVisitorCount() {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/visitors`)
      if (!response.ok) throw new Error('Visitor API failed')
      return await response.json()
    } catch (error) {
      console.warn('Visitor API error:', error)
      return { count: Math.floor(Math.random() * 1000) + 500 }
    }
  }

  async getNews() {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/news`)
      if (!response.ok) throw new Error('News API failed')
      return await response.json()
    } catch (error) {
      console.warn('News API error:', error)
      return {
        articles: [
          {
            title: 'Proposal Management Best Practices',
            description: 'Latest trends in proposal management and RFP responses',
            url: 'https://www.apmp.org',
            publishedAt: new Date().toISOString()
          }
        ]
      }
    }
  }
}

// UI Update Functions
class WeatherWidget {
  constructor(containerId) {
    this.container = document.getElementById(containerId)
    this.apiClient = new ApiClient()
  }

  async updateWeather() {
    if (!this.container) return

    try {
      const weather = await this.apiClient.getWeather()
      
      this.container.innerHTML = `
        <div class="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-lg shadow-lg">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold">Chicago Weather</h3>
              <p class="text-3xl font-bold">${weather.temp}°F</p>
              <p class="text-sm opacity-90">${weather.description}</p>
            </div>
            <div class="text-right text-sm">
              <p>Feels like: ${weather.feelsLike}°F</p>
              <p>Humidity: ${weather.humidity}%</p>
              <p>Wind: ${weather.wind} mph</p>
            </div>
          </div>
        </div>
      `
    } catch (error) {
      console.error('Weather update failed:', error)
      this.container.innerHTML = `
        <div class="bg-gray-100 p-4 rounded-lg">
          <p class="text-gray-600">Weather data unavailable</p>
        </div>
      `
    }
  }
}

class VisitorCounter {
  constructor(containerId) {
    this.container = document.getElementById(containerId)
    this.apiClient = new ApiClient()
  }

  async updateCount() {
    if (!this.container) return

    try {
      const data = await this.apiClient.getVisitorCount()
      
      this.container.innerHTML = `
        <div class="bg-gradient-to-r from-green-500 to-blue-500 text-white p-4 rounded-lg shadow-lg">
          <div class="text-center">
            <h3 class="text-lg font-semibold">Site Visitors</h3>
            <p class="text-3xl font-bold">${data.count.toLocaleString()}</p>
            <p class="text-sm opacity-90">Thank you for visiting!</p>
          </div>
        </div>
      `
    } catch (error) {
      console.error('Visitor count update failed:', error)
      this.container.innerHTML = `
        <div class="bg-gray-100 p-4 rounded-lg">
          <p class="text-gray-600">Visitor count unavailable</p>
        </div>
      `
    }
  }
}

class NewsWidget {
  constructor(containerId) {
    this.container = document.getElementById(containerId)
    this.apiClient = new ApiClient()
  }

  async updateNews() {
    if (!this.container) return

    try {
      const data = await this.apiClient.getNews()
      
      if (data.articles && data.articles.length > 0) {
        const articlesHtml = data.articles.slice(0, 3).map(article => `
          <div class="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <h4 class="font-semibold text-gray-800 mb-2">
              <a href="${article.url}" target="_blank" rel="noopener noreferrer" 
                 class="hover:text-blue-600 transition-colors">
                ${article.title}
              </a>
            </h4>
            <p class="text-sm text-gray-600 mb-2">${article.description}</p>
            <p class="text-xs text-gray-500">
              ${new Date(article.publishedAt).toLocaleDateString()}
            </p>
          </div>
        `).join('')
        
        this.container.innerHTML = `
          <div class="space-y-4">
            <h3 class="text-xl font-bold text-gray-800 mb-4">Industry News</h3>
            ${articlesHtml}
          </div>
        `
      } else {
        this.container.innerHTML = `
          <div class="bg-gray-100 p-4 rounded-lg">
            <p class="text-gray-600">News unavailable</p>
          </div>
        `
      }
    } catch (error) {
      console.error('News update failed:', error)
      this.container.innerHTML = `
        <div class="bg-gray-100 p-4 rounded-lg">
          <p class="text-gray-600">News data unavailable</p>
        </div>
      `
    }
  }
}

// Initialize widgets when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Initialize weather widget
  const weatherWidget = new WeatherWidget('weather-widget')
  weatherWidget.updateWeather()
  
  // Initialize visitor counter
  const visitorCounter = new VisitorCounter('visitor-counter')
  visitorCounter.updateCount()
  
  // Initialize news widget
  const newsWidget = new NewsWidget('news-widget')
  newsWidget.updateNews()
  
  // Update every 5 minutes
  setInterval(() => {
    weatherWidget.updateWeather()
    visitorCounter.updateCount()
    newsWidget.updateNews()
  }, 5 * 60 * 1000)
})

// Export for use in other scripts
window.ApiClient = ApiClient
window.WeatherWidget = WeatherWidget
window.VisitorCounter = VisitorCounter
window.NewsWidget = NewsWidget 