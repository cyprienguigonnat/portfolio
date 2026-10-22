# Règles du projet

Pour l’architecture, les commandes, la construction et la mise en ligne, consulter [README.md](README.md) afin d’éviter de maintenir des consignes en double.

Lire la règle ciblée avant toute modification éditoriale ou visuelle du site :

- **Retouches ciblées** — [.agents/rules/retouches-ciblees.md](.agents/rules/retouches-ciblees.md) — préserver les éléments hors périmètre lors d’une retouche.

## Vérification

Avant de terminer une modification de code, lancer `npm run check` et corriger toute erreur. Un hook git `pre-commit` (`.githooks/`) la relance à chaque commit ; après un clone : `git config core.hooksPath .githooks`.
