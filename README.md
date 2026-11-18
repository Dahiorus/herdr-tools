# herdr-tools

Ma configuration de [Herdr](https://herdr.dev) et mes mods. La configuration de Claude Code vit à part, dans
[claude-config](https://github.com/Dahiorus/claude-config).

Le dépôt vit directement dans `~/.config/herdr-app`. Le `.gitignore` ne suit que mes fichiers : l'état de la
fenêtre, les mods et layouts fournis par Herdr et les types générés restent hors du dépôt. Un nouveau mod s'ajoute
au `.gitignore` par une ligne `!/mods/<nom>/`.

| Fichier | Rôle |
|---|---|
| `keys.json` | mes raccourcis |
| `settings.json` | mes réglages |

La doc des mods (API, overlays, `exec`, `fetch`) est dans `~/.config/herdr-app/AGENTS.md`, fourni par Herdr.

## Sur une autre machine

`~/.config/herdr-app` existe dès que Herdr a été lancé une fois. On y récupère le dépôt sans cloner par-dessus :

```bash
cd ~/.config/herdr-app
git init -b main && git remote add origin https://github.com/Dahiorus/herdr-tools.git
git fetch origin && git checkout -f main
```
