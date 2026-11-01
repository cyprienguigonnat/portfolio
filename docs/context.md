# Contexte du portfolio

## Objectif

Présenter le parcours et quatre projets de Product Design de Cyprien Guigonnat, et permettre de consulter ses informations et de le contacter.

## Périmètre

- Inclus : accueil, Informations, Données du site, quatre études de cas, page 404, navigation, médias et interactions accessibles.
- Exclus sauf demande explicite : refonte de l’identité, modification des textes ou images des projets.

## Personnes et sources

- Propriétaire et validation éditoriale : Cyprien Guigonnat.
- [README.md](../README.md) : architecture, commandes, médias et publication.
- [DESIGN.md](../DESIGN.md) : identité et composants existants.
- [Décisions](decisions.md) et [prochaines étapes](next-steps.md) : mémoire courante.
- [Audit de septembre](archive/2026-09-16-audit.md) : historique, à ne pas utiliser comme description actuelle de la stack ou preuve de conformité.
- [Images haute résolution](images-haute-resolution.md) : sélection des sources et vérifications du 23 octobre 2026.

## Contraintes

Respecter [AGENTS.md](../AGENTS.md) et la [règle des retouches ciblées](../.agents/rules/retouches-ciblees.md). Préserver l’identité SVG, la typographie, les textes, les médias et les compositions hors périmètre. Distinguer les tests locaux, le site publié, l’émulation et le matériel physique. Ne pas présenter un résultat axe sans violation comme une certification d’accessibilité.

## Critères de réussite

- Navigation, contenus et commandes utilisables au clavier et sur écran étroit ou bas.
- Aucun recouvrement entre le bouton du mot-symbole et les liens des projets ; défilement possible lorsque la hauteur manque.
- Contrôles du projet réussis, vérification visuelle des retouches et documentation fidèle au rendu.
- Limites de vérification explicites ; aucun lancement de NVDA sans accord spécifique.

## Faits

### 2026-10-29

- Audit technique local : deux constats confirmés, superposition de l’accueil à faible hauteur et description périmée des menus dans DESIGN.md. Note initiale indicative : 14/20, avant correction ; aucun nouveau score attribué après correction.
- Correction : à 480px de hauteur et moins, accueil défilant et éléments ancrés à une zone de contenu d’au moins 540px. Séparation et ciblage du bouton vérifiés à 568 × 320 et 320 × 256 px.
- Test de non-régression ajouté dans `scripts/check-browser.cjs` pour 568 × 320, 320 × 256, 700 × 440 et 1440 × 320 px.
- `npm run build`, `npm run check`, `npm run test:browser` et `npm run test:animations` réussis. La dernière suite navigateur comprend les quatre nouveaux cas et les 21 combinaisons page/largeur existantes ; sortie : aucune erreur ni violation automatisée, aucune mutation au repos.
- Zoom réel 200 % constaté dans la barre de Zen Browser (Firefox), sur l’accueil local. Mot-symbole, bouton et quatre projets accessibles après défilement, sans superposition visible. Les autres pages n’ont pas fait l’objet de ce test de zoom réel.
- NVDA a été lancé puis arrêté à la demande de l’utilisateur. Le test de ses annonces n’a pas abouti : lecteur d’écran non validé. Règle d’accord explicite ajoutée au skill personnel Impeccable ; ce fichier est hors du dépôt du portfolio.
- L’utilisateur a confirmé qu’aucun appareil mobile physique n’était connecté. Aucun test sur téléphone réel effectué.
- Vérification publique CrUX : aucune donnée disponible pour l’origine HTTPS du portfolio ni l’URL d’accueil, sur mobile ou ordinateur ; appels actuels et historiques en 404 NOT_FOUND. Aucun LCP, INP, CLS terrain ni période de collecte à rapporter. L’API PageSpeed sans clé a également refusé la requête pour quota ; cela ne démontre aucune lenteur du site.
- Commit `88f183f` : `fix(accueil): éviter les superpositions sur écran bas`. Fichiers : CSS, DESIGN.md et suite navigateur.
- Preuves locales de l’audit et captures avant/après : `C:/Users/cypgu/.codex/visualizations/2026/10/29/01a188e5-50f3-7fa3-9aa0-50bdf8b9acc9/`. Le rapport `audit-impeccable.md` décrit l’état avant correction ; les captures `correction-paysage.png`, `correction-320x256.png` et `correction-portrait.png` documentent la retouche.

Sources publiques : [CrUX API](https://developer.chrome.com/docs/crux/api), [méthodologie CrUX](https://developer.chrome.com/docs/crux/methodology). L’absence de données ne permet pas d’en établir la cause.

### 2026-10-30

- Merge `887b1c5` sur main (corrections du portfolio, consignes GSAP, mémoire) et poussé sur `origin/main`. Workflow « Build and deploy to Cloudflare Workers » réussi (constat GitHub du 31 octobre 2026). La règle `max-height: 480px` figure dans la feuille de style servie par le site public ; rendu en production non inspecté.

### 2026-11-01

- Contrôle en ligne : workflows de `887b1c5` et `0607543` réussis ; `cyprienguigonnat.fr` et `www` répondent 200 ; la feuille servie contient `max-height:480px` ; le nouveau lien du CV est publié.
- Adresse workers.dev désactivée dans Cloudflare, selon l’utilisateur.
- CrUX non recontrôlé : l’API exige désormais une clé (403 sans clé). Le constat du 29 octobre reste le dernier disponible.
