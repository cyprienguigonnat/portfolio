# Audit et optimisation — 16 septembre 2026

## Stack et structure constatées

Le site actuel est un portfolio statique multipage : sept pages HTML, quatre projets, CSS maison et JavaScript natif. Il n’utilise ni framework, ni serveur applicatif, ni API, ni formulaire. Un générateur Node.js assemble les fragments de `content/` et le catalogue `content/projects.json`. Apache est visé par `.htaccess`. Les polices sont déjà auto-hébergées.

Les pages générées et leurs fragments sources sont nécessaires à la construction et à la publication : leur contenu commun n’est pas un doublon à supprimer. Aucun dépôt Git n’est présent dans ce dossier. Aucun fichier AGENTS.md applicable n’a été trouvé. Les anciennes notes du portfolio décrivaient des carrousels ; le code actuel a été examiné directement et sa structure multipage est conservée.

Une sauvegarde complète avant intervention et les preuves des contrôles sont conservées hors du dossier du site :

`C:/Users/cypgu/.codex/visualizations/2026/09/16/01a0a9c0-7926-7871-8341-cffa74b77624/audit-portfolio/`

Le sous-dossier `before/` est la sauvegarde ; `baseline/`, `after/` et `final/` contiennent les captures et mesures. `visual-evidence.json` contient la comparaison des pixels et des contrastes. `npm-audit.json` contient le contrôle des dépendances.

## Suppressions effectuées

- **35 fichiers de polices non référencés** : variantes WOFF, sous-ensembles linguistiques et styles inutilisés par les déclarations CSS. Les deux WOFF2 Latin 400 et 700 réellement chargés sont conservés. Les italiques du texte continuent d’être rendues comme auparavant.
- Le fichier système `.DS_Store`.
- L’ancien `css/normalize.css`, remplacé par un reset réduit couvrant les éléments réellement employés : suppression des règles mortes pour formulaires, tableaux, médias et éléments absents. La licence utile est conservée.
- La branche inutilisée `impulse` de la fonction de mise en mouvement des lettres.
- Les 16 propriétés `--letter-index` sans consommateur dans le SVG.
- La correction répétée de tous les liens externes au runtime : les attributs `rel` sont désormais produits à la construction, y compris sans JavaScript.
- La métadonnée obsolète `X-UA-Compatible`, les versions manuelles de fichiers, quelques commentaires de classement superflus et des déclarations CSS répétées.
- Tous les `console.log`, y compris dans les scripts de construction et de test. Les résultats de ces scripts restent affichés sur la sortie standard ; les erreurs de test restent diagnostiquées.
- Les variantes et bundles temporaires produits pendant l’intervention puis remplacés.

La première passe a retiré 37 fichiers existants représentant **278 948 octets**, avant ajout de leurs petits remplacements. Aucun doublon binaire n’a été trouvé dans l’inventaire initial. Il n’existait aucune dépendance npm ni import de bibliothèque applicative à retirer.

## Optimisations de performances et de sobriété

- Suppression du téléchargement anticipé des quatre couvertures depuis l’accueil. Leur aperçu est chargé au survol, au focus ou à l’ouverture du projet.
- La simulation des lettres s’arrête lorsque toutes les lettres sont au repos et redémarre à l’interaction. Le mouvement volontaire et les collisions sont conservés ; les pauses lorsque la fenêtre est masquée restent actives.
- Un bundle JavaScript classique unique conserve l’ordre d’exécution historique des animations, fonctionne aussi lors d’une ouverture locale et évite la fragilité introduite par le fractionnement en modules.
- Une feuille CSS construite et minifiée remplace les deux requêtes CSS. Scripts et script de chargement intégré minifiés, noms de fichiers avec empreinte.
- 36 variantes WebP sans perte couvrent les 13 images utilisées, avec plusieurs largeurs et des attributs `srcset`/`sizes`. Les PNG restent disponibles comme originaux et repli. La couverture Font Library garde son PNG à pleine résolution car son WebP serait plus lourd.
- Les douze variantes WebP à pleine résolution ont été comparées aux PNG décodés : pixels identiques. Les variantes plus petites sont adaptées à la taille d’affichage et à la densité d’écran.
- `loading="lazy"`, dimensions réservées et décodage asynchrone conservés pour les galeries ; couverture prioritaire et préchargement de la bonne taille pendant les transitions.
- Le préchargement HTML au survol respecte l’option d’économie de données lorsqu’elle est exposée par le navigateur.
- Cache des images WebP et des polices, cache long des bundles avec empreinte, compression des textes configurée pour Apache. Retrait du cache `immutable` sur les anciens fichiers modifiables sous un nom constant.

Les treize images à leur taille maximale passent collectivement de **9,36 Mo à 6,99 Mo**, soit **−25,3 %** sans perte de pixels. Les gains à l’affichage sont plus importants sur mobile grâce aux tailles adaptées. Les variantes augmentent le volume stocké sur disque ; le gain mesuré concerne les ressources chargées par le navigateur, pas la taille totale du dossier de travail.

### Mesures comparables avant/après

Chromium, viewport 1440 × 900 ou 390 × 900, densité 1. Mesure après stabilisation du chargement, avant interaction. Somme des corps de ressources décodés, HTML compris, sans compression serveur ; ce n’est ni un temps de chargement en réseau réel ni une mesure EcoIndex. Mo et Ko sont décimaux. Les requêtes de favicon ne sont pas incluses dans ce relevé automatisé.

| Page | Avant | Après, 1440 px | Gain | Après, 390 px | Gain mobile |
| --- | ---: | ---: | ---: | ---: | ---: |
| Accueil | 4,23 Mo | 68 Ko | 98,4 % | 68 Ko | 98,4 % |
| Informations | 82 Ko | 54 Ko | 34,0 % | 54 Ko | 34,0 % |
| Données du site | 83 Ko | 55 Ko | 33,6 % | 55 Ko | 33,6 % |
| Infomaniak | 3,93 Mo | 1,87 Mo | 52,5 % | 573 Ko | 85,4 % |
| France Titres | 3,85 Mo | 1,79 Mo | 53,4 % | 541 Ko | 85,9 % |
| Font Library | 584 Ko | 547 Ko | 6,3 % | 367 Ko | 37,2 % |
| Fab Manager | 1,31 Mo | 741 Ko | 43,6 % | 409 Ko | 68,8 % |

L’accueil passe de **12 à 5 requêtes**. Informations et Données passent de 8 à 5 ; les pages de projet économisent trois requêtes chacune. Le bundle JavaScript complet pèse environ 19,9 Ko minifié contre 32,5 Ko pour les trois sources chargées auparavant.

Au repos, l’observation des attributs du nom animé passe de **960 mutations en 500 ms à zéro**. Il s’agit d’une mesure de travail évité dans le navigateur, pas d’une estimation de CO₂.

## Accessibilité et design

- Ajout d’un `h1` sur Informations et Données du site ; leurs rubriques deviennent des `h2`, sans modification de leur apparence.
- Identification sémantique des groupes de galeries.
- Chaque lettre interactive est accessible au clavier et possède un nom : Entrée/Espace pour bousculer ou ramener, flèches pour déplacer. Le glisser-déposer et le tap sont conservés.
- Liens d’évitement, focus après navigation, retour au lien de projet, touche Échap, historique, alternatives d’images et préférence de mouvement réduit vérifiés.
- Contraste du bleu `#0355a1` sur blanc et inversement : **7,45:1**.
- Le texte d’aide blanc à 70 % d’opacité était à **4,496:1**, juste sous le minimum de 4,5:1. Son opacité passe à 72 %, soit **4,66:1**. C’est la seule correction visuelle intentionnelle hors états de focus et interactions clavier ajoutés.
- Tous les textes HTML relevés sur les sept pages utilisent **16 px**, avec des graisses **400 ou 700**. Le nom en SVG est une identité graphique, pas une taille de corps typographique.
- Aucun débordement horizontal constaté à 320, 390 et 1440 px.

Les captures de l’accueil, d’Informations et de Données aux trois largeurs étaient **identiques pixel par pixel avant la correction du contraste de l’aide**. Les pages de projet ont été inspectées visuellement ; les variantes d’images conservent les proportions et la mise en page.

L’exigence de multiples de 4/8 entre en conflit avec la conservation stricte de certains espacements existants. Les écarts suivants sont donc signalés et conservés :

| Règle actuelle | Écart | Option à décider |
| --- | --- | --- |
| `--gap: clamp(20px, 1.7vw, 40px)` | Valeurs intermédiaires fractionnaires, par exemple 24,48 px à 1440 px | Paliers 20/24/32/40 px aux points de rupture |
| `.description-content ul ul` : `gap: 6px` | Hors grille de 4 px | Passer à 8 px |
| `.project-index ul` sur mobile : `gap: 5px 16px` | Écart vertical de 5 px | Passer à 4 ou 8 px |
| Focus : `outline-offset: 5px` | Écart au contour de 5 px | Passer à 4 px |

Les interlignes 1,4 et 1,2 produisent respectivement 22,4 et 19,2 px avec un corps de 16 px. Les passer à 24/20 px changerait la hauteur des blocs. Les coordonnées du SVG, les bordures de focus, les dimensions de masquage accessible et les déplacements de l’animation ne sont pas des espacements de grille à arrondir.

Le contrôle automatisé axe-core couvre les règles WCAG 2 A/AA et 2.1 A/AA, complétées par ses bonnes pratiques. Il est complété par les essais clavier et fonctionnels décrits ci-dessous. Cela ne constitue pas une certification exhaustive WCAG/RGAA : une validation avec lecteurs d’écran, Safari/Firefox, zoom réel et aides techniques reste à réaliser.

Référence : [W3C, contraste minimal](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum).

## Sécurité

- Aucun secret, clé privée ou jeton d’API identifié par la recherche dans les sources et la lecture du code. Le jeton de vérification Google et le lien public de CV sont des données de publication, pas des secrets d’authentification.
- Aucune dépendance de production. Quatre outils de développement ont été ajoutés pour rendre les optimisations et contrôles reproductibles, avec versions exactes et verrouillage. `npm audit` : **zéro vulnérabilité connue** au moment de l’intervention, y compris pour l’outillage.
- Tous les liens ouvrant un nouvel onglet reçoivent `noopener noreferrer` à la construction.
- Identifiants de projets, noms de fichiers d’images et dimensions contrôlés avant génération ; titres, sous-titres et dates échappés. Les descriptions riches restent du HTML local de confiance, pas une entrée utilisateur distante.
- Aucune saisie utilisateur, API ou formulaire à valider côté serveur dans ce projet.
- CSP avec script intégré autorisé par empreinte, ressources locales, blocage des objets embarqués et des soumissions de formulaires. Pas d’autorisation globale de scripts intégrés ni d’`eval`. Les styles intégrés restent autorisés pour les transformations animées.
- `X-Content-Type-Options: nosniff`, politique de référent et protection des dossiers de construction ajoutés.

La CSP a été exercée dans le navigateur via le serveur de test. Les modules Apache, les en-têtes effectivement servis, TLS et les réglages de l’hébergeur ne sont pas validables depuis ce seul dossier et restent à vérifier à la mise en ligne. Aucune publication n’a été effectuée.

Référence : [MDN, Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP).

## Vérifications exécutées

- Construction des sept pages et vérification de syntaxe JavaScript.
- Tests existants du chargement rapide/lent/bloqué et du mouvement réduit.
- Tests de physique : rebonds, collisions, survol, repos, mouvement persistant et retour explicite.
- Tests d’entrées Pointer Events et fallback tactile.
- Contrôle statique des chemins, variantes d’images, ancres, identifiants uniques, titres, liens externes et empreinte CSP.
- **21 visites navigateur** : sept pages à 320, 390 et 1440 px ; aucune violation axe-core et aucune erreur JavaScript ou ressource en échec dans le contrôle final.
- Essais de navigation clavier, liens d’évitement, ouverture et enchaînement des projets, fermeture par Échap, précédent/suivant navigateur, accès sans JavaScript, mouvement réduit, drag réel d’une lettre et commandes clavier.
- Contrôle dédié des animations : entrée du nom, aperçu au survol, déformation et glisser-déposer des lettres, transition accueil-projet avec vol d’image, transition entre projets, retour projet-accueil et fondus entre pages. Le même contrôle vérifie que le nom reste animé lors d’une ouverture directe de `index.html` comme fichier local.
- Le contrôle du vol d’image exige une ressource déjà décodée et deux positions distinctes. Les parcours de fermeture vérifient également `Accueil → Projet → Suivant/Précédent → Accueil` et `Données du site → Projet → Données du site`.
- Mesures du poids des ressources, de l’activité au repos, comparaison des captures et égalité des pixels des WebP de pleine résolution.
- Audit npm sans vulnérabilité connue.

## Décisions restantes

1. **Grille stricte d’espacement** : choisir les remplacements du tableau ci-dessus. Aucun réajustement global n’a été fait pour éviter une modification visuelle non souhaitée.
2. **Contenus contradictoires** : les métadonnées et le projet Infomaniak évoquent encore un poste en cours, alors que la page Informations indique une recherche d’emploi et une fin en août 2026. Le score EcoIndex 85/100 affiché correspond à un résultat antérieur, pas à cet audit. Ces informations ont été conservées et nécessitent votre validation éditoriale.

Les 14 images des anciennes séries `g1_*`, `g2_*` et `g8_*` ont ensuite été supprimées à la demande du propriétaire : elles n’étaient référencées par aucune page ni aucune source active. Les PNG actifs, leurs variantes responsives, le SVG source, les fragments HTML, la vérification Google et l’image de partage social sont conservés.
