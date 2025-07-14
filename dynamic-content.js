// Dynamic Content Loading System
class DynamicContentManager {
  constructor() {
    this.cache = new Map();
    this.apiEndpoints = {
      github: 'https://api.github.com/users/freshmurry/repos',
      weather: '/api/weather',
      news: '/api/news',
      visitors: '/api/visitors'
    };
  }

  // Helper function to format time ago
  formatTimeAgo(days) {
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
  }

  // Load GitHub repositories dynamically - Only recent updates
  async loadGitHubProjects() {
    try {
      const response = await fetch('/api/projects');
      const data = await response.json();
      
      const projectsContainer = document.getElementById('github-projects');
      if (projectsContainer) {
        if (data.projects && data.projects.length > 0) {
          projectsContainer.innerHTML = data.projects
            .map(project => `
              <div class="project-card">
                                 <div class="project-header">
                   <h4><a href="${project.url}" target="_blank">${project.name}</a></h4>
                   <span class="update-badge">Updated ${this.formatTimeAgo(project.daysAgo)}</span>
                 </div>
                <p>${project.description || 'No description available'}</p>
                <div class="project-meta">
                  <span class="language">${project.language || 'Unknown'}</span>
                  <span class="stars">⭐ ${project.stars}</span>
                  <span class="forks">🍴 ${project.forks}</span>
                </div>
              </div>
            `).join('');
        } else {
          projectsContainer.innerHTML = `
            <div class="no-projects">
              <p>No recently updated projects to display.</p>
              <p>Check back soon for new updates!</p>
            </div>
          `;
        }
      }
    } catch (error) {
      console.log('GitHub API not available, using fallback content');
      const projectsContainer = document.getElementById('github-projects');
      if (projectsContainer) {
        projectsContainer.innerHTML = `
          <div class="fallback-projects">
            <div class="project-card">
              <h4><a href="https://github.com/freshmurry" target="_blank">murry.ai</a></h4>
              <p>RAG AI Chatbot Development on Cloudflare Workers AI</p>
              <div class="project-meta">
                <span class="language">JavaScript</span>
                <span class="stars">⭐ Active</span>
              </div>
            </div>
          </div>
        `;
      }
    }
  }

  // Load real-time weather for Chicago
  async loadWeather() {
    try {
      const response = await fetch('/api/weather');
      const weather = await response.json();
      
      const weatherContainer = document.getElementById('weather-widget');
      if (weatherContainer) {
        weatherContainer.innerHTML = `
          <div class="weather-card">
            <h4>🌤️ Chicago Weather</h4>
            <p>${Math.round(weather.main.temp)}°F</p>
            <p>${weather.weather[0].description}</p>
          </div>
        `;
      }
    } catch (error) {
      console.log('Weather API not available');
    }
  }

  // Load proposal management news
  async loadNews() {
    try {
      const response = await fetch('/api/news');
      const news = await response.json();
      
      const newsContainer = document.getElementById('news-feed');
      if (newsContainer) {
        newsContainer.innerHTML = news.articles
          .slice(0, 3)
          .map(article => `
            <div class="news-card">
              <h5><a href="${article.url}" target="_blank">${article.title}</a></h5>
              <p>${article.description}</p>
              <small>${new Date(article.publishedAt).toLocaleDateString()}</small>
            </div>
          `).join('');
      }
    } catch (error) {
      console.log('News API not available');
    }
  }

  // Real-time visitor counter
  async updateVisitorCount() {
    try {
      const response = await fetch('/api/visitors');
      const data = await response.json();
      
      const counterElement = document.getElementById('visitor-counter');
      if (counterElement) {
        counterElement.textContent = data.count;
      }
    } catch (error) {
      console.log('Visitor counter not available');
    }
  }

  // Initialize all dynamic content
  async init() {
    await Promise.all([
      this.loadGitHubProjects(),
      this.loadWeather(),
      this.loadNews(),
      this.updateVisitorCount()
    ]);

    // Update content every 5 minutes
    setInterval(() => {
      this.loadWeather();
      this.updateVisitorCount();
    }, 300000);
  }
}

// Initialize dynamic content
document.addEventListener('DOMContentLoaded', () => {
  const dynamicContent = new DynamicContentManager();
  dynamicContent.init();
}); 