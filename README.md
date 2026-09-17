# Portfolio de Cyprien Guigonnat

Site statique en français, sans framework ni dépendance JavaScript à installer sur le serveur. Les sept pages fonctionnent aussi sans JavaScript. Les scripts améliorent la navigation et animent les lettres de l’accueil.

## Sources et fichiers générés

- `content/projects.json` : textes, ordre et images des quatre projets.
- `content/*.html` : fragments communs et contenus des pages Informations et Données du site.
- `content/wordmark.svg` : tracés des lettres.
- `content/htaccess.conf` : configuration Apache source ; l’empreinte du script de chargement est ajoutée automatiquement.
- `js/` et `css/` : sources lisibles. `css/reset.css` conserve seulement les règles de normalisation utiles au site.
- `img/projets/*.png` : originaux et repli des images ; ne pas les supprimer lorsque le HTML ou le catalogue les référence.
- `content/images.json` : manifeste généré des variantes WebP.
- `dist/` : site compilé complet, généré par la construction et ignoré par Git. Modifier les sources puis reconstruire.
- `fonts/` : BDO Grotesk Regular et Bold, au format WOFF2 (police active du site), ainsi que les anciens fichiers Hanken Grotesk et leur licence OFL.
- `scripts/check-*.cjs` : contrôles du chargement, de la physique, des interactions et des pages.

## Construire et vérifier

Utiliser Node.js 22 ou une version ultérieure. Les quatre dépendances sont réservées à la construction ou aux tests : esbuild, sharp, Playwright et axe-core/Playwright. Le fichier de verrouillage fixe leurs versions.

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

Les WebP déjà à jour ne sont pas recalculés. Après modification d’un PNG ou du catalogue, exécuter `npm run images` avant `npm run build`. La construction regroupe et minifie les styles ainsi que les trois scripts dans un bundle classique unique. Ce format conserve les animations lors d’une ouverture locale du site et réduit les requêtes sans introduire de chargeur de modules.

Les images WebP sont compressées sans perte. Les petites variantes sont redimensionnées ; la variante à la résolution d’origine conserve les mêmes pixels. Lorsqu’un WebP pèserait plus lourd que le PNG, le candidat PNG est conservé dans le jeu de sources. Les images, scripts et styles générés portent une empreinte dans leur nom pour éviter les problèmes de cache.

Le build supprime puis recrée `dist/` afin qu’aucun ancien fichier compilé ne subsiste. Les tests navigateur servent ce dossier et ne créent aucun fichier par défaut. Définir `AUDIT_OUTPUT` uniquement lorsqu’un rapport JSON et des captures sont nécessaires. Ils ne contactent pas les liens externes du portfolio. La politique CSP est reproduite dans ce serveur de test ; la compression et les autres directives Apache doivent être vérifiées sur l’hébergement réel.

## Mise en ligne

Chaque push sur `main` déclenche le workflow GitHub Actions qui installe les dépendances, construit `dist/`, exécute les tests puis publie ce dossier sur GitHub Pages.

Pour une mise en ligne FTP, exécuter `npm run build` puis transférer tout le contenu de `dist/` à la racine du site. Aucun lancement de Node.js n’est nécessaire en production.

Ne pas téléverser le dossier `dist/` lui-même : transférer son contenu. Ne pas téléverser `node_modules/`, `scripts/`, `content/`, les rapports ni les résultats de tests.

Transférer les nouveaux assets avant les pages qui les référencent. Sur le serveur, conserver les anciennes versions d’assets pendant au moins la durée de vie des pages mises en cache, puis les retirer.

## Audit

Voir [AUDIT.md](AUDIT.md) pour les gains mesurés, les suppressions, les vérifications et les décisions restantes. L’absence de dépôt Git a conduit à créer une sauvegarde complète externe avant les modifications.

La licence des polices figure dans `fonts/OFL.txt`. Les quelques règles adaptées de normalize.css conservent leur licence dans `css/normalize-LICENSE.txt`.
