# Images du portfolio, 23 octobre 2026

Source Figma : [Book, page Design](https://www.figma.com/design/kkFV82mwsimZSc2MTZr6C6/Book?node-id=2-2).

Les 27 images de projet ont été comparées aux exports Figma et aux dimensions natives des images intégrées. Le document Figma n'a pas été modifié. Les vidéos et leurs posters restent hors de cette intervention.

## Sources retenues

15 images utilisent un nouvel export Figma. Les compositions comportant des éléments éditables sont exportées en PNG à 2x : jusqu'à 3712 px de large pour les planches et 1824 px pour les compositions portrait. La photographie France Titres 04 est limitée à 2016 px et Font Library 07 à 1920 px, selon leur source native.

12 images conservent leur PNG antérieur :

- Infomaniak 01 : l'image Figma présente Font Library à la place de Calendar.
- Infomaniak 08, France Titres 08, Font Library 08, Fab Manager 07 : les publications Figma ont des éléments d'identité ou des icônes différents des versions du site.
- Infomaniak 07, France Titres 01 et 07, Font Library 01 et 04, Fab Manager 01 et 03 : les images matricielles intégrées sont déjà limitées en résolution. Un grand export ne restitue pas de détails supplémentaires.

La résolution d'un export ne garantit pas celle des photographies ou captures qu'il contient. Aucun filtre de netteté systématique ni génération de détails n'est appliqué.

## Compression et reconstruction

Les PNG restent les sources et le repli. Les WebP utilisent une qualité 92 pour les interfaces, 86 pour sept photographies identifiées par `webpQuality` dans `content/projects.json`. Les largeurs sont 640, 960, 1280, 1920 et 2560 px, plus la largeur maximale de la source, sans agrandissement par Sharp. Les variantes intermédiaires évitent de télécharger un grand export sur un petit écran.

Après un changement de source ou de qualité, exécuter `npm run images`, `npm run build`, puis `npm run check`. Une modification visuelle nécessite aussi une vérification dans le navigateur. Les compositions denses restent des images : la finesse supplémentaire ne rend pas tous leurs petits textes lisibles sur un téléphone sans zoom.

Les anciens générateurs `scripts/medias/generate-infomaniak-gallery.cjs` et `scripts/medias/compose-fontlibrary-mockup.cjs` renvoient à des sources historiques absentes de ce dépôt. Ne pas les exécuter pour rétablir les nouveaux exports Figma.

## Vérifications du 23 octobre 2026

- Construction et `npm run check` réussis.
- Suite `npm run test:browser` : 21 pages/tailles contrôlées, aucune erreur JavaScript ni violation axe remontée, zéro mutation au repos sur l'accueil.
- Contrôle complémentaire avec `agent-browser`, session persistante `cyprien-tests` : quatre projets en 1440 px à densité 2 et en 390 px à densité 3, 27 images décodées à chaque taille, toutes sélectionnées en WebP, aucun débordement horizontal.
- Une origine locale distincte (`localhost` au lieu de `127.0.0.1`) permet de contrôler la sélection mobile sans réutiliser les grandes images du cache desktop : les variantes sélectionnées ne dépassent pas 1280 px. Le total des images de chaque galerie mobile représente 0,54 à 0,69 Mo, hors vidéos, polices et autres ressources.
- Comparaison visuelle des sources et WebP à largeur égale pour les 27 images, et captures des pages réelles. Les petits textes des planches denses demandent toujours un zoom sur mobile.
- Ordre, textes, légendes et vidéos identiques au catalogue initial ; identité binaire vérifiée pour les 12 PNG conservés.

À leur résolution maximale, les 27 WebP totalisent 5,25 Mo (contre 3,67 Mo auparavant), pour 57,39 Mo de PNG sources. Le WebP le plus lourd fait 586 ko. Cette hausse par rapport aux anciens WebP correspond aux nouvelles variantes haute résolution ; elle ne représente pas le téléchargement initial d'une page.

Ces vérifications concernent la version locale reconstruite. Aucun commit ni déploiement n'a été effectué.

## Traces locales

`output/image-quality/before/` conserve les 27 anciens PNG et les anciens catalogues. `output/image-quality/figma/` contient les exports candidats, y compris ceux rejetés ; ces candidats ne doivent pas remplacer automatiquement les sources retenues. `output/image-quality/export-report.json` détaille les dimensions avant/après et les décisions par fichier. Ces éléments locaux ne font pas partie du site compilé.
