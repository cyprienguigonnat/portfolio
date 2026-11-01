# Prochaines étapes

Mémoire vérifiée jusqu'au commit 0607543 (2026-11-01).

## À faire

- Étendre le test au zoom navigateur réel de 200 % aux pages Informations, Données du site et aux études de cas ; seul l’accueil local a été vérifié à ce niveau.
- Contrôler visuellement la correction de faible hauteur sur le site déployé (568 × 320 et 320 × 256 px) : seules la réussite du workflow et la présence de la règle CSS en ligne sont constatées.
- Décider du sort de la grille d’espacement relevée dans [l’audit de septembre](archive/2026-09-16-audit.md) : les écarts `--gap`, `gap: 6px` et `outline-offset: 5px` existent toujours dans `css/style.css`.

## En attente

- Test lecteur d’écran : interrompu ; attendre un accord explicite de lancement de NVDA pour ce test. Ne pas le relancer automatiquement.
- Test sur téléphone physique : aucun appareil connecté, selon l’utilisateur le 29 octobre 2026. Émulation et gestes synthétisés ne remplacent pas cette vérification.
- Performances terrain : aucune donnée CrUX publique disponible au contrôle du 29 octobre 2026. Une mesure de laboratoire éventuelle devra être identifiée comme telle ; aucun score réel ne peut être déduit des tests locaux.
- Synchronisation de `theme-color` lors de la navigation : suspicion issue de la lecture des sources, non confirmée dans le navigateur. Ne pas la présenter comme un défaut établi.

## Terminé récemment

### 2026-11-01

- Lien du CV remplacé (`0607543`) et déployé.
- Score Ecoindex de Données du site et son lien mis à jour : 86/100 (mesure indiquée par l’utilisateur).

### 2026-10-30

- Merge `887b1c5` sur main, push et déploiement Cloudflare Workers réussi.

### 2026-10-29

- Audit technique du portfolio local et conservation des captures dans le dossier de preuves indiqué dans [le contexte](context.md).
- Correction de la superposition de l’accueil sur écran bas et ajout de quatre tests de non-régression.
- Mise à jour de DESIGN.md sur le dialogue mobile et le comportement de faible hauteur.
- Contrôles de construction, cohérence, navigateur et animations réussis ; zoom réel 200 % sur l’accueil inspecté.
- Vérification CrUX et arrêt de NVDA : voir [le contexte](context.md).
- Commit et push de `88f183f` sur `origin/feat/gsap-transitions`.
- Création de la mémoire commune `context.md`, `decisions.md`, `next-steps.md` et liens depuis AGENTS.md.
