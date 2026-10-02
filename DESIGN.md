# Design System Inspiration of Cyprien GUIGONNAT Portfolio

## 1. Visual Theme & Atmosphere

Ce portfolio de Product Designer repose sur une vitrine éditoriale compacte. Le bleu saturé donne une présence immédiate à l’accueil et aux pages de parcours ; les pages projet passent au blanc pour laisser la place aux images et aux études de cas. La typographie reste volontairement uniforme : la hiérarchie vient surtout du gras, de la position, de l’espacement et des images, pas d’une échelle de tailles étendue.

Le mot-symbole central est un dessin SVG animé et manipulable, pas un titre typographique à remplacer par une police de display. Les pages projet privilégient une grande image de couverture, une introduction en trois colonnes puis une galerie éditoriale. Les surfaces restent plates : pas de cartes génériques, d’ombres décoratives ni d’arrondis visibles.

Key characteristics:

- Accueil et pages Informations / Données : fond bleu `#0355a1`, texte blanc.
- Pages projet : fond blanc, texte bleu `#0355a1`.
- Accent secondaire : bleu clair `#bfe3fb`, réservé aux liens d’évitement.
- Police du site : BDO Grotesk auto-hébergée, Regular 400 et Bold 700.
- Corps de texte unique : `16px / 1.4` (environ `22.4px` de hauteur de ligne).
- Titres `h1` et `h2` : même taille héritée que le texte courant, poids 700.
- Grille d’informations et introduction projet : trois colonnes égales sur grand écran.
- Galerie projet : grille de six colonnes avec des images pleine largeur ou sur 2, 3 ou 4 colonnes.
- Gouttière générale : `16px`; espace de grille fluide de `20px` à `40px`.
- Liens soulignés à l’interaction ; focus clavier visible avec contour de `2px`.

## 2. Color Palette & Roles

Les couleurs ci-dessous proviennent des styles du site. Les images de projets conservent leur propre palette et ne constituent pas des tokens d’interface.

### Primary

- **Bleu portfolio** (`#0355a1`, `--blue`): fond principal de l’accueil et des pages Informations / Données ; couleur du texte et des liens sur les pages projet blanches.
- **Blanc** (`#ffffff`, `--white`): texte sur le fond bleu, fond des pages projet et couleur de texte du préchargeur.

### Interactive and text hierarchy

- **Texte secondaire sur bleu** (`rgba(255,255,255,.72)`, `--secondary`): indication sous le mot-symbole d’accueil.
- **Bleu clair de navigation clavier** (`#bfe3fb`): fond des liens d’évitement lorsqu’ils reçoivent le focus.
- **Couleur courante** (`currentColor`): liens, soulignement au survol et contour de focus ; elle s’adapte au thème bleu ou blanc de la page.
- **Texte de remplacement à l’impression** (`#000000`): texte noir sur fond blanc en mode impression.

### Surface, borders and shadows

- Les séparateurs, bordures de cartes et surfaces secondaires ne forment pas de palette dédiée.
- Les composants restent plats ; aucune ombre d’élévation n’est définie.
- Aucun état de succès, d’avertissement ou d’erreur n’est présent dans l’interface du portfolio.

## 3. Typography Rules

### Font families

- **BDO Grotesk** : fichiers locaux `fonts/BDOGrotesk-Regular.woff2` (400) et `fonts/BDOGrotesk-Bold.woff2` (700), avec `font-display: swap`.
- **Repli** : `"BDO Grotesk", "Helvetica Neue", Arial, sans-serif`.
- Le mot-symbole est dessiné en SVG. Ne pas le remplacer par du texte composé dans une police similaire.
- Les styles du site ne définissent ni axe variable, ni petite capitale, ni règle OpenType spécifique.

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Mot-symbole d’accueil | Tracés SVG propriétaires | SVG adaptatif | N/A | N/A | N/A | Conserver le dessin et son interaction ; ce n’est pas un style de texte. |
| Display / h1 | BDO Grotesk | 16px hérité | 700 | 1.4 | Normal | Aucun agrandissement typographique n’est défini actuellement. |
| Heading / h2 | BDO Grotesk | 16px hérité | 700 | 1.4 | Normal | Les titres de sections d’informations sont en capitales via `text-transform`. |
| Sub-heading / h3 | BDO Grotesk | 16px hérité | 400 par défaut | 1.4 | Normal | N’ajouter du gras que si le contenu le demande. |
| Body / project story | BDO Grotesk | 16px | 400 | 1.4 | Normal | Texte courant, description et informations projet. |
| Navigation / links | BDO Grotesk | 16px | 400 | 1.4 | Normal | État courant et survol signalés par soulignement. |
| Button / control | BDO Grotesk | 16px hérité | 400 hérité | 1.4 | Normal | La commande d’accueil est un bouton textuel sans habillage de CTA. |
| Caption / metadata | BDO Grotesk | 16px hérité | Selon balisage | 1.4 | Normal | Date et détails projet gardent la taille du corps. |
| Micro | BDO Grotesk | 16px hérité | Selon balisage | 1.4 | Normal | Aucun style micro ou légende réduite n’est défini. |

La hiérarchie observée est surtout structurelle. Ne pas inventer une grande échelle de titres pour les pages existantes ; si une nouvelle expérience nécessite d’autres tailles, les définir explicitement et vérifier le rendu responsive.

## 4. Component Stylings

### Links and navigation

- Les liens héritent de la couleur du texte et n’ont pas de décoration permanente par défaut.
- Au survol, souligner avec un décalage de `.2em`. Les liens actifs de navigation principale sont également soulignés.
- Sur les liens ou boutons portant une icône seule, le soulignement peut prendre la forme d’un trait de `1px` en bas de l’élément.
- Le menu supérieur est une ligne flexible avec `16px` entre les éléments ; il se replie quand l’espace manque.
- L’index des projets est centré et disposé en liste flexible sur deux lignes possibles, au bas de l’accueil.

### Controls

- **Commande de l’accueil** : bouton inline sans fond, bordure ni padding supplémentaire. Typographie héritée ; fond transparent. Le style visuel ressemble à un lien textuel.
- **Focus clavier** : `2px solid currentColor`, décalé de `5px`; sur les liens d’évitement, le contour est rentré de `2px`.
- Aucun système de variantes primaire / secondaire / destructive, aucune taille de CTA, et aucun état désactivé ne sont définis.
- Aucun formulaire ou champ de saisie n’est présent dans le portfolio.

### Project media and page layout

- Les pages projet s’ouvrent sur une image de couverture pleine largeur, suivie d’un bloc d’introduction en trois colonnes.
- Les images et vidéos gardent leur ratio intrinsèque (`width: 100%; height: auto`). Les colonnes de galerie sont définies par le contenu via des portées de 2, 3, 4 ou 6 colonnes.
- Les pages projet n’utilisent pas de conteneurs « card » : médias et textes reposent directement sur la page blanche.
- Les liens vers le projet suivant/précédent forment une navigation textuelle ; conserver leur faible niveau d’habillage.

### Skip links

- Masqués visuellement au repos avec une hauteur maximale nulle.
- Au focus, ils s’affichent sur un fond bleu clair, avec `8px 12px` de padding et `8px` d’écart.
- Les cibles reçoivent `4px 8px` de padding pour faciliter l’activation clavier.

## 5. Layout Principles

### Spacing system

Le site utilise une échelle pragmatique, et non une grille complète de tokens :

- `4px`: marge supérieure de la page Informations ;
- `5px`, `6px`, `8px`: petits écarts de listes et d’interactions ;
- `12px`: espacement entre éléments de listes imbriquées ;
- `16px`: gouttière générale (`--gutter`), espace courant du header ;
- `20px` à `40px`: écart fluide principal (`--gap: clamp(20px, 1.7vw, 40px)`);
- `24px`: respirations de sections, footer et colonnes sur mobile ;
- `32px`: padding bas des pages Informations ;
- `76px`: hauteur de référence du header (`--header-height`).

### Grid and whitespace

- Pas de largeur maximale globale fixe : les pages utilisent la largeur disponible avec `16px` de marge intérieure.
- Header réparti entre navigation et contacts ; à `1050px` et moins, ses éléments peuvent passer sur plusieurs lignes.
- Informations et résumé projet : trois colonnes égales, alignées en haut, avec espacement fluide.
- Galerie : six colonnes égales ; attribuer les largeurs aux médias par portées sémantiques.
- Accueil : le mot-symbole occupe le centre de l’écran ; l’index des projets reste en bas avec des marges de `16px`.
- Préférer le vide de page et l’image comme séparation aux encadrés, ombres ou lignes décoratives.

### Border radius

- Aucun rayon de bordure n’est défini dans la feuille de style. Garder les surfaces et médias à angles droits.

## 6. Depth & Elevation

- **Niveau 0 — page** : bleu sur les pages de parcours et blanc sur les pages projet.
- **Niveau 1 — contenu** : texte et médias posés directement sur le fond, sans carte, bordure ou ombre.
- **Niveau interaction — superpositions** : le préchargeur et la couche de transition sont positionnés au-dessus du contenu pour les états de chargement et de navigation. Ils ne justifient pas l’ajout d’ombres aux composants.
- Aucune ombre faible, moyenne ou élevée n’est définie.
- Le contraste entre fonds de page, grands médias et typographie assure la profondeur visuelle ; ne pas ajouter de verre dépoli, dégradé ou effet de relief sans demande explicite.

## 7. Do's and Don'ts

### Do

- Conserver le couple de surfaces bleu `#0355a1` / blanc comme principe de thème principal.
- Laisser les images de projets apporter leurs couleurs et leur contraste propres.
- Utiliser la graisse, la position, l’alignement et l’espacement pour structurer les textes avant d’ajouter de nouvelles tailles.
- Garder les galeries éditoriales, les images sans cadre et les grilles ouvertes.
- Préserver un contour de focus visible et des liens clairement repérables au clavier.
- Respecter les requêtes `prefers-reduced-motion` et l’animation discrète déjà utilisée pour les transitions.
- Garder le SVG du mot-symbole et sa zone d’interaction comme élément distinctif de l’accueil.

### Don't

- Ne pas ajouter de cartes, rayons arrondis, bordures décoratives ou ombres sans raison fonctionnelle.
- Ne pas transformer chaque lien en bouton ou en CTA rempli.
- Ne pas introduire de couleurs d’état ou d’accent concurrentes comme tokens globaux sans composant qui les justifie.
- Ne pas remplacer BDO Grotesk ou le mot-symbole SVG par une identité typographique générique.
- Ne pas créer d’états de formulaire : le site n’a actuellement aucun formulaire.
- Ne pas compacter les marges mobiles au point de supprimer la respiration de `16px`.
- Ne pas rendre les mouvements indispensables à la compréhension ou ignorer la réduction des animations.

## 8. Responsive Behavior

### Breakpoints in the current stylesheet

- **1050px et moins** : le header passe en mode flex-wrap ; l’écart horizontal de l’index projet descend à `20px`.
- **700px et moins** : les contacts s’alignent à gauche et peuvent se couper ; l’accueil conserve une hauteur minimale de `540px` ; les miniatures passent à `76vw` ; les grilles d’information, d’introduction projet et de galerie s’empilent sur une colonne.
- **Mobile gallery** : chaque média occupe toutes les colonnes, indépendamment de sa portée desktop.
- **Mobile project navigation** : les écarts diminuent (`8px`) pour préserver la place.
- **Hauteur courte, largeur supérieure à 700px** : la miniature d’accueil remonte à `35%` de la hauteur et passe à `min(40vw, 550px)`.
- **Reduced motion** : transitions désactivées et animations ramenées à une durée quasi nulle.

### Touch and type

- Aucune hauteur minimale de cible tactile n’est définie dans la CSS actuelle. Pour une nouvelle commande interactive, viser au moins `44 × 44px` tout en conservant l’aspect visuel discret.
- La taille du texte reste `16px` sur mobile ; les contacts peuvent se rompre et les colonnes s’empilent au lieu de réduire la police.
- Ne pas supposer que `700px` est un point de rupture universel : le reprendre seulement si la nouvelle mise en page suit le même comportement que les pages portfolio.

## 9. Agent Prompt Guide

### Quick color reference

- Bleu portfolio: `#0355a1`
- Blanc: `#ffffff`
- Texte secondaire sur bleu: `rgba(255,255,255,.72)`
- Fond des liens d’évitement: `#bfe3fb`
- Focus: `currentColor`, contour `2px`, décalage `5px`
- Palette des médias: fournie par les visuels de projets, ne pas la normaliser en tokens d’interface

### Ready-to-use prompts

- « Crée une section de portfolio dans le style existant : fond blanc, BDO Grotesk 16px/1.4, texte bleu `#0355a1`, grille ouverte et images sans carte. Respecte la gouttière de 16px et empile les colonnes sous 700px. »
- « Ajoute un bloc de parcours sur fond `#0355a1`, texte blanc et liens soulignés au survol. Utilise le poids 700 pour les titres et conserve la taille de texte existante. »
- « Ajoute une navigation textuelle accessible : couleurs héritées, état courant souligné, contour de focus visible `2px solid currentColor` avec décalage de 5px. Ne lui applique pas un style de CTA. »
- « Pour une nouvelle galerie, utilise six colonnes desktop, les portées d’image déjà employées et une seule colonne à 700px et moins. Garde les images sans bordure, ombre ou rayon. »

### Iteration guidance

- Si une section paraît faible, ajuste d’abord sa composition, ses écarts ou le choix et le cadrage des médias.
- Si un nouveau composant exige une taille, un état ou une couleur qui n’existe pas dans le système, explicite cette extension et vérifie son usage clavier et mobile.
- Garde les interactions compréhensibles sans animation ; respecte la préférence de réduction du mouvement.
- Avant d’ajouter un motif décoratif, vérifie qu’il existe déjà dans `css/style.css` ou qu’il est nécessaire à la fonction.
