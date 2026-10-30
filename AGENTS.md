# Règles du projet

Objectif : présenter le travail de Product Designer de Cyprien Guigonnat dans un portfolio accessible, en préservant son identité et ses contenus.

Stack : site statique HTML/CSS/JavaScript, génération Node.js, déploiement Cloudflare Workers. Les commandes et détails techniques restent dans README.md.

## Avant d’agir, lire

- [Contexte](docs/context.md)
- [Décisions à respecter](docs/decisions.md)
- [Prochaines étapes](docs/next-steps.md)

Pour l’architecture, les commandes, la construction et la mise en ligne, consulter [README.md](README.md) afin d’éviter de maintenir des consignes en double.

Lire la règle ciblée avant toute modification éditoriale ou visuelle du site :

- **Retouches ciblées** — [.agents/rules/retouches-ciblees.md](.agents/rules/retouches-ciblees.md) — préserver les éléments hors périmètre lors d’une retouche.

## Vérification

Ne jamais lancer ou redémarrer NVDA sans accord explicite de l’utilisateur pour le test concerné. Une demande générale d’audit d’accessibilité ou de test au lecteur d’écran ne vaut pas cet accord. Si l’utilisateur demande son arrêt, l’arrêter immédiatement et ne pas le relancer sans nouvel accord.

Avant de terminer une modification de code, lancer `npm run check` et corriger toute erreur. Un hook git `pre-commit` (`.githooks/`) la relance à chaque commit ; après un clone : `git config core.hooksPath .githooks`.
