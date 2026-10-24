// Appelé seulement quand aucun fichier de dist/ ne correspond à l’adresse demandée.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // html_handling "none" conserve les adresses en .html ; seule la racine doit servir l’accueil.
    if (url.pathname === '/') return env.ASSETS.fetch(new URL('/index.html', url), request);
    // Les adresses sans .html servies par GitHub Pages restent valides par redirection.
    const page = new URL(url);
    page.pathname += '.html';
    if (!url.pathname.endsWith('.html') && (await env.ASSETS.fetch(page, {method: 'HEAD'})).ok) return Response.redirect(page, 301);
    const notFound = await env.ASSETS.fetch(new URL('/404.html', url), request);
    return new Response(notFound.body, {status: 404, headers: notFound.headers});
  }
};
