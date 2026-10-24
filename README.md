# Portfolio de Cyprien Guigonnat

Site statique en français, sans framework ni dépendance JavaScript à installer sur le serveur. Les sept pages fonctionnent aussi sans JavaScript. Les scripts améliorent la navigation et animent les lettres de l’accueil.

## Sources et fichiers générés

- `content/projects.json` : textes, ordre et images des quatre projets.
- `content/*.html` : fragments communs et contenus des pages Informations et Données du site.
- `content/wordmark.svg` : tracés des lettres.
- `content/htaccess.conf` : configuration Apache source ; l’empreinte du script de chargement est ajoutée automatiquement.
- `js/` et `css/` : sources lisibles. `css/reset.css` conserve seulement les règles de normalisation utiles au site.
- `js/vendor/lenis-1.1.13.min.js` : Lenis fourni dans la référence de défilement, licence MIT conservée dans le bundle et `js/vendor/LICENSE-lenis.txt`. Molette amortie (`lerp: 0.2`, multiplicateur `1`) hors accueil, défilement tactile natif ; amorti atténué avec la réduction du mouvement. La boucle s'arrête au repos et le contrôleur est recréé après chaque navigation. Les images de galerie apparaissent une fois en descendant de 18 px, avec un fondu et un flou léger de 4 px qui disparaît (600 ms, fondu bref en réduction du mouvement), après décodage ; la couverture conserve sa transition existante.
- GSAP 3.13 (cœur et CustomEase, licence standard GSAP) est copié depuis `node_modules` dans le bundle. Il anime le trajet de l’image vers une couverture, le fondu entre projets et le parallaxe de la couverture (10 % de sa hauteur au défilement, écrit directement sans tween pour qu’aucune boucle ne tourne au repos). La courbe reprend `--ease` ; rien de cela ne s’exécute en réduction du mouvement.
- `img/projets/*.png` : originaux et repli des images ; ne pas les supprimer lorsque le HTML ou le catalogue les référence.
- `content/images.json` : manifeste généré des variantes WebP.
- `dist/` : site compilé complet, généré par la construction et ignoré par Git. Modifier les sources puis reconstruire.
- `fonts/` : BDO Grotesk Regular et Bold, au format WOFF2 (police active du site), ainsi que les anciens fichiers Hanken Grotesk et leur licence OFL.
- `scripts/check-*.cjs` : contrôles du chargement, de la physique, des interactions et des pages.

## Construire et vérifier

Utiliser Node.js 22 ou une version ultérieure. Les cinq dépendances sont réservées à la construction ou aux tests : esbuild, sharp, GSAP, Playwright et axe-core/Playwright. Le fichier de verrouillage fixe leurs versions.

```sh
npm ci
npm run images
npm run build
npm test
npx playwright install chromium --only-shell
npm run test:browser
npm run test:animations
npm audit
```

Les WebP déjà à jour ne sont pas recalculés. Après modification d’un PNG ou du catalogue, exécuter `npm run images` avant `npm run build`. La construction regroupe et minifie les styles ainsi que les scripts du site dans un bundle classique unique. Ce format conserve les animations lors d’une ouverture locale du site et réduit les requêtes sans introduire de chargeur de modules.

Les images WebP utilisent une compression avec perte de qualité 92 pour préserver les interfaces et leurs textes, ou 86 pour les photographies signalées par `webpQuality` dans le catalogue. Les variantes de 640, 960, 1280, 1920 et 2560 px sont produites dans la limite de la source, avec une variante à sa résolution maximale. Les exports Figma haute résolution sont conservés en PNG ; aucun agrandissement n’est effectué pendant la compression. Lorsqu’un WebP pèserait plus lourd que le PNG, le candidat PNG est conservé dans le jeu de sources. Les images, scripts et styles générés portent une empreinte dans leur nom pour éviter les problèmes de cache.

Le build supprime puis recrée `dist/` afin qu’aucun ancien fichier compilé ne subsiste. Les tests navigateur servent ce dossier et ne créent aucun fichier par défaut. Définir `AUDIT_OUTPUT` uniquement lorsqu’un rapport JSON et des captures sont nécessaires. Ils ne contactent pas les liens externes du portfolio. La politique CSP est reproduite dans ce serveur de test ; la compression et les autres directives Apache doivent être vérifiées sur l’hébergement réel.

## Mise en ligne

Chaque push sur `main` déclenche le workflow GitHub Actions qui installe les dépendances, construit `dist/`, exécute les tests puis exécute `wrangler deploy` (secret `CLOUDFLARE_API_TOKEN`, modèle « Modifier les Workers Cloudflare »).

Cloudflare Workers (ressources statiques) : `npm run build` puis `wrangler deploy`, configuré par `wrangler.jsonc`. Les adresses en `.html` sont conservées (`html_handling: "none"`) ; `worker.js` sert l’accueil sur `/` et `404.html` avec le statut 404 pour toute autre adresse inconnue. Les en-têtes (CSP, cache) viennent de `_headers`, généré depuis `content/headers.conf` ; `.htaccess` est exclu par `.assetsignore`. Le Worker répond sur `cyprienguigonnat.fr` et `www` (domaines personnalisés déclarés dans `routes`) ; l’adresse workers.dev est désactivée.

Pour une mise en ligne FTP, exécuter `npm run build` puis transférer tout le contenu de `dist/` à la racine du site. Aucun lancement de Node.js n’est nécessaire en production.

Ne pas téléverser le dossier `dist/` lui-même : transférer son contenu. Ne pas téléverser `node_modules/`, `scripts/`, `content/`, les rapports ni les résultats de tests.

Transférer les nouveaux assets avant les pages qui les référencent. Sur le serveur, conserver les anciennes versions d’assets pendant au moins la durée de vie des pages mises en cache, puis les retirer.

## Audit

Voir [AUDIT.md](AUDIT.md) pour les gains mesurés, les suppressions, les vérifications et les décisions restantes. L’absence de dépôt Git a conduit à créer une sauvegarde complète externe avant les modifications.

La licence des polices figure dans `fonts/OFL.txt`. Les quelques règles adaptées de normalize.css conservent leur licence dans `css/normalize-LICENSE.txt`.
