<<<<<<< HEAD
// Project Configuration - Easily customizable settings
const PROJECT_CONFIG = {
  // Time window for "recent" updates (in days)
  RECENT_DAYS: 30,
  
  // Maximum number of projects to display
  MAX_PROJECTS: 5,
  
  // GitHub username
  GITHUB_USERNAME: 'freshmurry',
  
  // Exclude forked repositories
  EXCLUDE_FORKS: true,
  
  // Minimum stars to consider a project "active"
  MIN_STARS: 0,
  
  // Languages to prioritize (optional)
  PRIORITY_LANGUAGES: ['HTML', 'Ruby', 'JavaScript', 'Python', 'TypeScript'],
  
  // Custom project descriptions (fallback)
  FALLBACK_PROJECTS: [
    {
      name: 'murry.ai',
      description: 'RAG AI Chatbot Development on Cloudflare Workers AI',
      url: 'https://github.com/freshmurry/murry-ai',
      language: 'JavaScript',
      stars: 'Active',
      forks: '0',
      daysAgo: 0
    }
  ]
};

// Helper function to format time ago
function formatTimeAgo(days) {
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

// Helper function to check if project is recent
function isRecentProject(updatedAt, daysThreshold = PROJECT_CONFIG.RECENT_DAYS) {
  const lastUpdated = new Date(updatedAt);
  const threshold = new Date(Date.now() - (daysThreshold * 24 * 60 * 60 * 1000));
  return lastUpdated > threshold;
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PROJECT_CONFIG, formatTimeAgo, isRecentProject };
=======
// Project Configuration - Easily customizable settings
const PROJECT_CONFIG = {
  // Time window for "recent" updates (in days)
  RECENT_DAYS: 30,
  
  // Maximum number of projects to display
  MAX_PROJECTS: 5,
  
  // GitHub username
  GITHUB_USERNAME: 'freshmurry',
  
  // Exclude forked repositories
  EXCLUDE_FORKS: true,
  
  // Minimum stars to consider a project "active"
  MIN_STARS: 0,
  
  // Languages to prioritize (optional)
  PRIORITY_LANGUAGES: ['HTML', 'Ruby', 'JavaScript', 'Python', 'TypeScript'],
  
  // Custom project descriptions (fallback)
  FALLBACK_PROJECTS: [
    {
      name: 'murry.ai',
      description: 'RAG AI Chatbot Development on Cloudflare Workers AI',
      url: 'https://github.com/freshmurry/murry-ai',
      language: 'JavaScript',
      stars: 'Active',
      forks: '0',
      daysAgo: 0
    }
  ]
};

// Helper function to format time ago
function formatTimeAgo(days) {
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

// Helper function to check if project is recent
function isRecentProject(updatedAt, daysThreshold = PROJECT_CONFIG.RECENT_DAYS) {
  const lastUpdated = new Date(updatedAt);
  const threshold = new Date(Date.now() - (daysThreshold * 24 * 60 * 60 * 1000));
  return lastUpdated > threshold;
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PROJECT_CONFIG, formatTimeAgo, isRecentProject };
>>>>>>> 2278488c6c3a2b1afca894909a25142cc64155d8
} 