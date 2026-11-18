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
| `mods/start-work/` | PR, issues et tickets Jira du repo courant (`ctrl-shift-i`) |

## Start work

`ctrl-shift-i` ouvre une fenêtre sur le repo GitHub du terminal focalisé, avec trois onglets : PR, Issues et Jira.
`Tab` change d'onglet, la saisie filtre, `↑`/`↓` puis `Entrée` ouvre l'élément dans le navigateur, `Échap` ferme.
Chaque PR affiche son statut à droite, en tag coloré : Prête en vert, Brouillon en gris.

Prérequis : [`gh`](https://cli.github.com) connecté au compte qui voit le repo, et
[`acli`](https://developer.atlassian.com/cloud/acli/) connecté à Jira (`acli jira auth login`) pour l'onglet Jira.
Le compte `gh` est celui du profil `/profile` dont les `owners` contiennent le propriétaire du repo
(`~/.claude/profiles.json`), sinon le compte actif. Il doit être connecté (`gh auth login`) sur la machine du
terminal.

La source Jira se donne une fois par repo, dans l'onglet Jira : une clé de projet (`ABC`), un filtre (`filter=12345`
ou l'URL du filtre) ou du JQL. Elle est gardée dans `mods/start-work/.config.json`, hors du dépôt. Un board n'est pas
accepté tel quel : prendre le filtre du board.
Pour la changer ensuite, éditer ou supprimer l'entrée du repo dans ce fichier :
`{"jira": {"owner/repo": "ABC"}}`. `node mods/start-work/jira.test.js`, `node mods/start-work/profile.test.js`, `node mods/start-work/github.test.js` et `node mods/start-work/filter.test.js` vérifient la source, .config.json, le choix du compte, le statut des PR et le filtre.

Écrire un mod : sa logique testable va dans un module sans import `gpui-kit` ni `herdr` (node ne charge pas `main.js`), avec son `*.test.js` à côté. Cela vaut aussi pour les tables de branchement (champs `gh`, couleurs de statut, libellés) et pour le filtre de liste : `main.js` ne garde que l'affichage, ce qu'il décide ou choisit n'y reste pas, sinon aucun test ne le voit. Un fichier d'état qu'il écrit dans son dossier porte un nom caché (`.config.json`) : Herdr ignore les fichiers cachés, sinon chaque écriture recharge le mod et le ramène à son premier onglet.

La doc des mods (API, overlays, `exec`, `fetch`) est dans `~/.config/herdr-app/AGENTS.md`, fourni par Herdr.

## Sur une autre machine

`~/.config/herdr-app` existe dès que Herdr a été lancé une fois. On y récupère le dépôt sans cloner par-dessus :

```bash
cd ~/.config/herdr-app
git init -b main && git remote add origin https://github.com/Dahiorus/herdr-tools.git
git fetch origin && git checkout -f main
```
