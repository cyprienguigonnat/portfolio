# Portfolio de Cyprien Guigonnat

Site statique en français, sans framework ni dépendance JavaScript à installer sur le serveur. Les huit pages (dont la 404) fonctionnent aussi sans JavaScript. Les scripts améliorent la navigation et animent les lettres de l’accueil.

## Sources et fichiers générés

- `content/projects.json` : textes, ordre et images des quatre projets.
- `content/*.html` : fragments communs et contenus des pages Informations et Données du site.
- `content/wordmark.svg` : tracés des lettres.
- `content/headers.conf` : en-têtes Cloudflare (CSP, cache) ; l’empreinte du script de chargement est ajoutée automatiquement.
- `js/` et `css/` : sources lisibles. `css/reset.css` conserve seulement les règles de normalisation utiles au site.
- `js/vendor/lenis-1.1.13.min.js` : Lenis, pour le défilement amorti hors accueil, licence MIT conservée dans le bundle et `js/vendor/LICENSE-lenis.txt`.
- GSAP 3.13 (cœur et CustomEase, licence standard GSAP) est copié depuis `node_modules` dans le bundle, pour les transitions entre projets et le parallaxe de la couverture.
- `img/projets/*.png` : originaux et repli des images ; ne pas les supprimer lorsque le HTML ou le catalogue les référence.
- `content/images.json` : manifeste généré des variantes WebP.
- `dist/` : site compilé complet, généré par la construction et ignoré par Git. Modifier les sources puis reconstruire.
- `fonts/` : BDO Grotesk Regular et Bold, au format WOFF2 (police active du site) ; `fonts/OFL.txt` est la licence de l’ancienne police Hanken Grotesk, conservée par prudence.
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

Le build supprime puis recrée `dist/` afin qu’aucun ancien fichier compilé ne subsiste. Les tests navigateur servent ce dossier et ne créent aucun fichier par défaut. Définir `AUDIT_OUTPUT` uniquement lorsqu’un rapport JSON et des captures sont nécessaires. Ils ne contactent pas les liens externes du portfolio. La politique CSP est reproduite dans ce serveur de test depuis `_headers`.

## Mise en ligne

Chaque push sur `main` déclenche le workflow GitHub Actions qui installe les dépendances, construit `dist/`, exécute les tests puis exécute `wrangler deploy` (secret `CLOUDFLARE_API_TOKEN`, modèle « Modifier les Workers Cloudflare »).

Cloudflare Workers (ressources statiques) : `npm run build` puis `wrangler deploy`, configuré par `wrangler.jsonc`. Les adresses en `.html` sont conservées (`html_handling: "none"`) ; `worker.mjs` sert l’accueil sur `/` et `404.html` avec le statut 404 pour toute autre adresse inconnue. Les en-têtes (CSP, cache) viennent de `_headers`, généré depuis `content/headers.conf`. Le Worker répond sur `cyprienguigonnat.fr` et `www` (domaines personnalisés déclarés dans `routes`) ; l’adresse workers.dev est désactivée.

## Audit

Voir [l’audit de septembre 2026](docs/archive/2026-09-16-audit.md) pour l’historique des gains mesurés, des suppressions et des vérifications.

Les quelques règles adaptées de normalize.css conservent leur licence dans `css/normalize-LICENSE.txt`.

## Inclinaison du téléphone

Sur l’accueil, « Bousculez-moi » active aussi les capteurs du téléphone en contexte sécurisé (HTTPS), avec demande d’autorisation si le navigateur l’exige. Les changements d’inclinaison et les secousses donnent des impulsions immédiates aux lettres libres ; les axes s’adaptent au portrait/paysage. L’inclinaison ne maintient aucune force quand le téléphone reste immobile ou est posé à plat : la physique libre d’origine reste toujours active. Les petits tremblements sont filtrés et les impulsions plafonnées. Sans accélération disponible, les changements d’inclinaison restent utilisables. « Ramenez-moi », la mise en arrière-plan, la réduction des animations et la sortie de l’accueil coupent l’écoute des capteurs. Sans autorisation ou données disponibles, les interactions habituelles restent utilisables. Aucune bibliothèque ni boucle d’animation supplémentaire n’est ajoutée.

Les cas simulés sont couverts par `npm run check`. Le ressenti et la fenêtre d’autorisation doivent encore être vérifiés sur de vrais téléphones iOS et Android ; la simulation ne valide pas le matériel.
