# Décisions

## 2026-10-29 — Accueil utilisable à faible hauteur

- **Choix** : sous 480px de hauteur inclus, autoriser le défilement de l’accueil et positionner le mot-symbole et les projets dans une zone de contenu d’au moins 540px.
- **Raison** : le bouton « Bousculez-moi » et les projets se recouvraient, avec interception du clic par un lien projet.
- **Conséquences** : conserver le rendu des fenêtres plus hautes ; maintenir les quatre tests de faible hauteur dans la suite navigateur. Voir commit `88f183f`.
- **Alternatives écartées** : masquer des commandes ou réduire globalement les textes ; la correction garde les contenus et l’identité.

## 2026-10-29 — Documenter le menu mobile existant

- **Choix** : aligner DESIGN.md sur le dialogue blanc existant, fixé en bas d’écran, avec angles supérieurs de 16px, texte bleu et liens de 48px minimum.
- **Raison** : les descriptions des anciens panneaux bleu foncé ne correspondaient plus aux styles et au rendu.
- **Conséquences** : prendre le composant actuel comme référence lors des retouches ; ne pas réintroduire l’ancien panneau à partir de la documentation historique.
- **Alternatives écartées** : modifier le composant pour le conformer à l’ancienne description.

## 2026-10-29 — Accord spécifique avant NVDA

- **Choix** : ne lancer ni redémarrer NVDA sans accord explicite pour le test concerné. Une demande générale de test d’accessibilité ou de lecteur d’écran ne suffit pas. Respecter immédiatement toute demande d’arrêt.
- **Raison** : instruction explicite de l’utilisateur après interruption du lancement pendant cette session.
- **Conséquences** : règle inscrite dans AGENTS.md et dans le skill personnel Impeccable ; signaler le test comme non vérifié en l’absence d’accord. Les contrôles clavier, DOM et automatisés peuvent continuer sans NVDA.
- **Alternatives écartées** : déduire une autorisation de lancement de la simple invocation d’un skill ou d’une demande d’audit.

## 2026-10-29 — Séparer publication et vérification locale

- **Choix** : le commit et le push demandés ont été réalisés sur la branche ouverte `feat/gsap-transitions`, sans fusion ni push sur main.
- **Raison** : conserver le périmètre autorisé et la branche courante.
- **Conséquences** : la correction reste à intégrer et à publier si l’utilisateur le souhaite ; la réussite locale ne prouve pas la version en production.
- **Alternatives écartées** : changer de branche ou fusionner implicitement pour déclencher le déploiement.
