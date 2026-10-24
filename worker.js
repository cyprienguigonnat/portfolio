// Appelé seulement quand aucun fichier de dist/ ne correspond à l’adresse demandée.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // html_handling "none" conserve les adresses en .html ; seule la racine doit servir l’accueil.
    if (url.pathname === '/') return env.ASSETS.fetch(new URL('/index.html', url), request);
    const page = await env.ASSETS.fetch(new URL('/404.html', url), request);
    return new Response(page.body, {status: 404, headers: page.headers});
  }
};
