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
| `mods/start-work/` | PR, issues et tickets Jira (ou tâches du reste à faire) du repo courant (`ctrl-shift-i`) |

## Start work

`ctrl-shift-i` ouvre une fenêtre sur le repo GitHub du terminal focalisé, avec trois onglets : PR, Issues, puis Jira ou Tâches (voir plus bas).
Un clic à côté ne la ferme pas : le bouton `×` en haut à droite ou `Échap` la ferment (ou `ctrl-shift-i` à nouveau).
`Tab` change d'onglet, la saisie filtre, `↑`/`↓` puis `Entrée` ouvre l'élément dans le navigateur, `Échap` ferme.
Chaque PR affiche son statut à droite, en tag coloré : Prête en vert, Brouillon en gris.
L'onglet PR ne montre que trois groupes : À relire, Retours sur mes PR, puis Mes PR. Une de mes PR passe dans Retours sur mes PR quand un de ses fils de relecture est en attente (non résolu, pas ouvert par un bot, dernier commentaire pas de moi, ou mon fil seul) ; les commentaires hors fil ne comptent pas. Si la détection échoue, un toast « Retours non détectés » s'affiche et toutes mes PR restent dans Mes PR, comme avant. Mes PR affichent leurs approbations (`1/2`, `Prête pour la QA`, `Changements demandés`).

`Ctrl+Entrée` (`Cmd+Entrée` sur macOS) ou le bouton « Lancer » (ligne survolée ou sélectionnée) lance le travail dans
un nouvel onglet Herdr du repo. Une PR à relire démarre `/pr <n> review` (bouton « Relire »), une de mes PR du groupe Retours sur mes PR `/pr <n> comments` (bouton « Retours ») ; Mes PR n'a pas de bouton (sauf si la détection a échoué : « Retours » sur toutes mes PR). Une issue démarre `/bugfix <url>`. Un ticket Jira m'est d'abord attribué et passe
« En cours », puis l'agent démarre `/bugfix` (type Bug ou Bogue) ou `/feature`. Les Epic, les Initiative et les tickets
déjà avancés sont refusés. Si le ticket est attribué à un autre, une confirmation s'affiche : `Entrée` le prend,
`Échap` annule sans fermer ; Lancer, le changement d'onglet (`Tab`, clic sur un onglet) et le clic sur une ligne sont ignorés pendant ce temps.
Pendant la prise en charge (« Prise en charge… » sur la ligne), `Entrée`, `Échap` et le clic sur une ligne sont ignorés jusqu'à l'agent ou
au message d'erreur.

Prérequis : `herdr-app` dans le PATH (pour lancer l'agent), [`gh`](https://cli.github.com) connecté au compte qui voit le repo, et
[`acli`](https://developer.atlassian.com/cloud/acli/) connecté à Jira (`acli jira auth login`) pour l'onglet Jira.
Le compte `gh` est celui du profil `/profile` dont les `owners` contiennent le propriétaire du repo
(`~/.claude/profiles.json`), sinon le compte actif. Il doit être connecté (`gh auth login`) sur la machine du
terminal.

La source Jira se donne une fois par repo, dans l'onglet Jira : une clé de projet (`ABC`), un filtre (`filter=12345`
ou l'URL du filtre) ou du JQL. Elle est gardée dans `mods/start-work/.config.json`, hors du dépôt. Un board n'est pas
accepté tel quel : prendre le filtre du board.
Pour la changer ensuite, éditer ou supprimer l'entrée du repo dans ce fichier :
`{"jira": {"owner/repo": "ABC"}}`. `node mods/start-work/jira.test.js`, `node mods/start-work/tasks.test.js`, `node mods/start-work/profile.test.js`, `node mods/start-work/github.test.js`, `node mods/start-work/filter.test.js`, `node mods/start-work/start.test.js`, `node mods/start-work/launch.test.js` et `node mods/start-work/main.test.js` vérifient la source, .config.json, la lecture du reste à faire, le choix du compte, le statut des PR, les groupes de PR et les approbations, le filtre, les règles de lancement, les appels `acli` et `herdr-app`, et le parcours du dialogue (Lancer, confirmation, prise en charge, échecs).

### Onglet Tâches

Le troisième onglet s'appelle « Tâches » et remplace Jira dans deux cas : le profil `/profile` du propriétaire a
`atlassian@claude-plugins-official` à `false` dans `enabledPlugins` (profil sans Jira), ou le repo n'a pas de source Jira
et son reste à faire a une section Features. Il lit le fichier `reste-a-faire.md` ou `todo.md` du repo (le dossier `docs/`
est prioritaire) sur la machine du terminal, sans jamais l'écrire ni appeler `acli`. Seule la section Features est
listée ; les tâches rayées (`~~`) ou cochées (`[x]`) sont cachées. La description de la tâche sélectionnée s'affiche à
droite. Sans fichier, avec plusieurs fichiers ou illisible, l'onglet affiche le message d'erreur correspondant (profil sans Jira ; sinon l'onglet Jira reste).
`Ctrl+Entrée` (`Cmd+Entrée` sur macOS) ou « Lancer » ouvre un nouvel onglet Herdr nommé d'après le titre de la tâche
(30 caractères au plus) et y démarre `/feature <description> (<chemin>, point N)`, où `N` est le numéro du point dans le
reste à faire (« 9. »), ou `(<chemin>, issue #n)` quand la tâche cite une issue ; sans identifiant, seul le chemin est donné. Le
reste à faire n'est pas modifié. `Entrée` n'ouvre rien sur une tâche (pas de page) et le pied de fenêtre ne l'annonce pas.

Un repo du second cas qui veut l'onglet Jira reçoit sa source en éditant `mods/start-work/.config.json`
(`{"jira": {"owner/repo": "ABC"}}`) : la saisie de la source n'est plus proposée.

Écrire un mod : sa logique testable va dans un module sans import `gpui-kit` ni `herdr`, avec son `*.test.js` à côté. Les appels extérieurs et le parcours de `main.js` se testent en important d'abord `fake.js`, qui remplace `herdr`, `gpui-kit` et `gpui-base` sous node et note chaque `exec`, toast et fermeture (`launch.test.js`, `main.test.js`). Cela vaut aussi pour les tables de branchement (champs `gh`, couleurs de statut, libellés) et pour le filtre de liste : `main.js` ne garde que l'affichage, ce qu'il décide ou choisit n'y reste pas, sinon aucun test ne le voit. Une garde « ignoré pendant X » (lancement, confirmation) commence par lister tous les chemins qui ferment ou quittent le dialogue (touche, clic sur une ligne ou un onglet, bouton `×`, second raccourci Herdr), et chacun reçoit son test dans `main.test.js`. `fake.js` ne propage pas les clics : appeler le gestionnaire de la racine ne prouve pas que ceux des enfants y arrivent, il faut aussi vérifier qu'aucun enfant (onglet, ligne, `×`) n'arrête le sien. `fake.js` refuse ce que le vrai runtime refuse : `.child(null)` et `.child(undefined)` lèvent une erreur (un bouton sans libellé avait passé les tests et `herdr-app check`, qui ne rend aucune donnée). Un champ optionnel affiché passe par `?? ""`, et chaque écart trouvé au runtime se reporte dans `fake.js` avec son test. Un fichier d'état qu'il écrit dans son dossier porte un nom caché (`.config.json`) : Herdr ignore les fichiers cachés, sinon chaque écriture recharge le mod et le ramène à son premier onglet. Un test de tri ou de filtre échoue sans le code qu'il couvre : son jeu de données n'est pas déjà dans l'ordre voulu et n'a pas de valeur neutre (`null`, vide) qui laisse le filtre sans effet ; on le vérifie en retirant le tri ou le filtre. Une règle limitée à un onglet ou à un groupe (couleur, action) a aussi un test sur un cas hors de sa portée : même texte, autre onglet, résultat inchangé. Le `console.log("<nom> ok")` d'un `*.test.js` est sa dernière ligne, après toutes les assertions.

La doc des mods (API, overlays, `exec`, `fetch`) est dans `~/.config/herdr-app/AGENTS.md`, fourni par Herdr.

## Sur une autre machine

`~/.config/herdr-app` existe dès que Herdr a été lancé une fois. On y récupère le dépôt sans cloner par-dessus :

```bash
cd ~/.config/herdr-app
git init -b main && git remote add origin https://github.com/Dahiorus/herdr-tools.git
git fetch origin && git checkout -f main
```
