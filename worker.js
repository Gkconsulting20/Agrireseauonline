/**
 * Worker « agrireseauonline » — frontal Cloudflare d'AgriRéseau.
 *
 * - Sert le frontend statique (dossier public/) via la liaison ASSETS.
 * - Renvoie toutes les requêtes /api/* vers le service Render
 *   « agrireseau-pro », qui héberge l'application Express + la base Neon.
 *   Les cookies de session (express-session) sont transmis dans les deux
 *   sens, donc la connexion fonctionne à travers le proxy.
 * - Toute autre adresse inconnue renvoie index.html (application
 *   monopage), comme le faisait app.get('*') dans server.js.
 */

const RENDER_ORIGIN = "https://agrireseau-pro.onrender.com";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      const upstream = new URL(url.pathname + url.search, RENDER_ORIGIN);
      const headers = new Headers(request.headers);
      headers.set("host", upstream.host);

      const response = await fetch(upstream, {
        method: request.method,
        headers,
        body:
          request.method === "GET" || request.method === "HEAD"
            ? undefined
            : request.body,
        redirect: "manual",
      });

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    }

    return env.ASSETS.fetch(request);
  },
};
