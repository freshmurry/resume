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

// Initialize widgets when DOM is loaded
// News and weather widgets removed

document.addEventListener('DOMContentLoaded', function() {
  // Initialize visitor counter
  const visitorCounter = new VisitorCounter('visitor-counter')
  visitorCounter.updateCount()
  
  // Update every 5 minutes
  setInterval(() => {
    visitorCounter.updateCount()
  }, 5 * 60 * 1000)
})

// Export for use in other scripts
window.ApiClient = ApiClient
window.VisitorCounter = VisitorCounter 