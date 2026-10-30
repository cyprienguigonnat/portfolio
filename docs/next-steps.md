# Prochaines étapes

## À faire

- Étendre le test au zoom navigateur réel de 200 % aux pages Informations, Données du site et aux études de cas ; seul l’accueil local a été vérifié à ce niveau.
- Si demandé, préparer l’intégration de `feat/gsap-transitions` dans main et la publication, puis contrôler la correction sur le site déployé. Ne pas fusionner ou pousser main sans instruction.
- Réexaminer les anciens points « Décisions restantes » de [l’audit de septembre](AUDIT.md) contre les sources actuelles avant toute reprise : ils ne sont pas des défauts confirmés à ce jour.

## En attente

- Test lecteur d’écran : interrompu ; attendre un accord explicite de lancement de NVDA pour ce test. Ne pas le relancer automatiquement.
- Test sur téléphone physique : aucun appareil connecté, selon l’utilisateur le 29 octobre 2026. Émulation et gestes synthétisés ne remplacent pas cette vérification.
- Performances terrain : aucune donnée CrUX publique disponible au contrôle du 29 octobre 2026. Une mesure de laboratoire éventuelle devra être identifiée comme telle ; aucun score réel ne peut être déduit des tests locaux.
- Synchronisation de `theme-color` lors de la navigation : suspicion issue de la lecture des sources, non confirmée dans le navigateur. Ne pas la présenter comme un défaut établi.

## Terminé récemment

### 2026-10-29

- Audit technique du portfolio local et conservation des captures dans le dossier de preuves indiqué dans [le contexte](context.md).
- Correction de la superposition de l’accueil sur écran bas et ajout de quatre tests de non-régression.
- Mise à jour de DESIGN.md sur le dialogue mobile et le comportement de faible hauteur.
- Contrôles de construction, cohérence, navigateur et animations réussis ; zoom réel 200 % sur l’accueil inspecté.
- Vérification de la disponibilité des données CrUX : aucun résultat pour l’origine et l’accueil sur mobile ou ordinateur.
- Arrêt de NVDA à la demande de l’utilisateur et ajout de l’exigence d’accord explicite au skill Impeccable.
- Commit et push de `88f183f` sur `origin/feat/gsap-transitions`, sans déploiement.
- Création de la mémoire commune `context.md`, `decisions.md`, `next-steps.md` et liens depuis AGENTS.md. Cette mise à jour documentaire n’est pas commitée.
