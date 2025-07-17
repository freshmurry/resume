export async function onRequest(context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  try {
    const response = await fetch('https://api.github.com/users/freshmurry/repos');
    const repos = await response.json();

    // Filter: not forked, public
    const filtered = repos
      .filter(repo => !repo.fork && !repo.private)
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .slice(0, 5); // Show top 5

    const projects = filtered.map(repo => ({
      name: repo.name,
      description: repo.description,
      url: repo.html_url,
      language: repo.language,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      lastUpdated: repo.updated_at
    }));

    return new Response(JSON.stringify({ projects }), { headers });
  } catch (error) {
    return new Response(JSON.stringify({ projects: [], error: error.message }), { headers });
  }
} 