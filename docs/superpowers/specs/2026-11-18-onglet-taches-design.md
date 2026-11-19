# Onglet Tâches de Start work

## 1. Demande initiale

> « pour les projets qui n'ont pas de Jira (comme GECCO, MtgCollection), en général les projets du profile "perso",
> il y a souvent un fichier "reste-à-faire" associé au skill /todo. Il faudrait ajouter un onglet "Tâches" à la place
> de l'onglet Jira qui liste les todo avec une description du besoin si disponible. Cette description s'afficherait
> à droite de la liste des tâches. Il serait possible de lancer une session claude avec /feature de la tâche à faire »

**But** : dans un repo sans Jira, voir depuis Start work (`ctrl-shift-i`) ce qu'il reste à faire, lire le besoin d'un
point sans ouvrir le fichier, et lancer un agent dessus comme on le fait pour une issue ou un ticket.

## Langage

Termes du glossaire (`docs/domaine.md`, contexte Start work, complété par l'analyse `ddd`) :

- **Repo sans Jira** : repo dont le travail se suit dans son reste à faire, pas dans Jira. L'onglet Tâches y remplace
  l'onglet Jira.
- **Reste à faire** : le fichier versionné du repo tenu par la skill `/todo` (`docs/reste-a-faire.md`, casse
  variable). Start work le lit et ne l'écrit jamais.
- **Tâche** : point ouvert du reste à faire, ni rayé (`~~…~~`) ni coché (`[x]`).
- **Numéro de tâche** : le numéro du point dans le fichier (« 9. »), jamais recalculé.
- **Identifiant de tâche** : ce qui désigne une tâche dans la liste : son numéro de tâche, sinon le `#n` de l'issue
  citée juste après son titre ; peut manquer.
- **Section** : la rubrique `##` du fichier où se range la tâche (Features, Corrections…). Seule Features est listée.
- **Description du besoin** : le texte de la tâche, affiché à droite de la liste pour la tâche sélectionnée.

## Comportement

### Quand l'onglet Tâches remplace l'onglet Jira

Un repo est **sans Jira** dans l'un de ces deux cas (décidé en relecture : « A et C », lu comme l'un ou l'autre) :

- **profil sans Jira** : le profil du repo dans `~/.claude/profiles.json` (celui dont les `owners` contiennent le
  propriétaire GitHub, déjà trouvé pour le compte `gh`) désactive le plugin `atlassian@claude-plugins-official`
  (`false`). Aujourd'hui : `perso`. Le critère dit « pas de Jira » plutôt qu'un nom de profil ;
- **reste à faire sans source Jira** : le repo n'a pas de source Jira dans `.config.json` et a un reste à faire, quel
  que soit son profil (y compris sans profil).


Le second cas exige une section Features dans le fichier (décidé en relecture) : le fichier est lu de toute façon pour
choisir l'onglet, et un fichier sans Features (comme `documentation/todo.md` de `softwarevidal/dsi-docs`, une liste
d'idées) n'a rien à lister ; ce repo garde l'onglet Jira.

Dans le doute, l'onglet Jira (décidé en relecture) : plusieurs fichiers, `git` ou la lecture en échec, `originRepo` en
erreur (aucun terminal, remote hors GitHub) laissent l'onglet Jira et son comportement actuel, sauf profil sans Jira.
Pendant le chargement, l'en-tête ne montre que « PR · Issues » : aucun libellé ne change sous les yeux, et un repo avec
Jira ne perd jamais son onglet sur une erreur passagère.

Les onglets deviennent alors « PR · Issues · Tâches » ; `Tab` les parcourt dans cet ordre. Sinon rien ne change : un
repo sans profil sans Jira et sans reste à faire garde l'onglet Jira et sa saisie de source. Un repo du second cas
dont on veut l'onglet Jira reçoit sa source en éditant `.config.json` (la saisie n'est plus proposée, puisque l'onglet
Jira n'est plus là). `profiles.json` illisible : on ne sait pas si le profil est sans Jira, seul le second cas
s'applique. `.config.json` illisible, profil avec Jira ou sans profil : erreur actuelle de l'onglet Jira, sans chercher de reste
à faire ; profil sans Jira : onglet Tâches, `.config.json` n'est pas lu.

### La liste

À l'ouverture du dialogue, Start work lit le reste à faire **dans l'arbre de travail du terminal focalisé** (sa
branche ou son worktree, sur sa machine), une fois. Le fichier se trouve comme `/todo` le trouve : les fichiers
suivis par git dont le nom est `reste-a-faire.md` ou `todo.md`, sans tenir compte de la casse (`git ls-files` à la
racine du repo). Plusieurs : celui dont le chemin commence par `docs/`. Plusieurs sous `docs/`, ou plusieurs ailleurs sans aucun
sous `docs/` : erreur qui les liste.

Seule la section **Features** est listée (décidé en relecture) : la section `##` dont le titre commence par
« Feature », sans tenir compte de la casse. Les corrections ont leur issue GitHub (onglet Issues) ; les autres
sections (Corrections, Vérifications non faites, Décisions…) restent accessibles par `/todo`.

Chaque tâche est une ligne de liste de cette section : un point numéroté (`12. …`) ou une puce (`- …`) en début de
ligne, suivi de ses lignes de suite indentées. Les lignes d'un bloc de code délimité par ``` ne sont ni titres ni
tâches : elles restent dans la description de la tâche en cours, indentées ou non. Une ligne qui commence par `~~` ou `[x]` (après le numéro ou la puce)
est faite et n'est pas listée, même suivie d'un commentaire hors rature (`~~…~~ (PR #135) Caduc : …`). Une case non
cochée `[ ]` après le numéro ou la puce est retirée, comme eux.

Une ligne qui commence par une rature est faite, même si du texte non rayé suit (décidé en relecture). C'est plus
simple que la règle de `/todo` (« ouvert tant qu'une partie n'est pas rayée »), et c'est écrit dans la définition de
Tâche du glossaire. Nettoyer le fichier des points rayés reste le travail de `/todo`.

Les paragraphes
hors liste ne sont pas des tâches ; les sous-listes indentées font partie de la description de leur tâche.

Une ligne de la liste montre :

| Colonne | Contenu |
|---|---|
| à gauche (accent) | l'identifiant (ci-dessous) |
| au centre | le titre : le gras qui ouvre la tâche (`**…**`) ; sans gras d'ouverture, le début du texte jusqu'au premier « : ». Sans balises markdown (backticks, italiques), coupé à l'affichage |

L'identifiant (décidé en relecture) est le numéro de tâche s'il existe, sinon le `#n` qui ouvre la parenthèse juste
après le titre (« **…** (#293, … ) »), sinon rien. Un `#n` cité ailleurs (« (PR #131) ») n'est pas pris. Il reprend ce
que le fichier écrit, sans numéro inventé que `/todo` ne connaîtrait pas. Comme il n'est pas toujours là ni unique,
chaque tâche a aussi une clé interne, sa position dans le fichier, qui sert aux ids des lignes, au survol et au
lancement en cours.

Le filtre porte, comme ailleurs, sur l'identifiant et le titre. La description n'est pas filtrée. Le compteur de
l'onglet (« Tâches 14 ») compte les tâches listées.

### La description, à droite

Le panneau de droite montre, pour la tâche sélectionnée (`↑`/`↓`, ou ligne cliquée), la description du besoin : le
texte complet de la tâche (titre compris) en markdown (gras, code, liens rendus), lignes de suite comprises, sans le
numéro ni la puce. Il défile si le texte dépasse. Dans l'onglet Tâches, un clic sur une ligne la sélectionne (il n'y a
rien à ouvrir dans le navigateur). Le survol d'une ligne ne change pas le panneau. Liste vide, en chargement ou en
erreur : pas de panneau, le message prend toute la largeur.


La liste de chaque onglet prend toute la hauteur de la fenêtre ; dans l'onglet Tâches, le panneau aussi, et il défile au-delà
(décidé en relecture ; 400 px fixes au départ, étendus à la recette visuelle, la fenêtre restant vide en bas) : le panneau ne saute pas d'une tâche à l'autre et la fenêtre garde la même taille.

La fenêtre passe de 720 à 960 px de large pour tous les onglets (décidé en relecture) : sa taille se fixe à
l'ouverture, pas par onglet, et les titres de PR et d'issues y gagnent aussi.

### Lancer le travail sur une tâche

Lancer (`Ctrl+Entrée`, `Cmd+Entrée` sur macOS, ou le bouton « Lancer » de la ligne survolée ou sélectionnée) sur une
tâche :

1. ouvre un nouvel onglet Herdr dans l'espace du terminal focalisé, dans son dossier, nommé d'après le titre de la
   tâche (coupé à 30 caractères) ;
2. y démarre `claude` avec la première demande
   `/feature <texte complet de la tâche sur une ligne> (<chemin du reste à faire depuis la racine du repo>, point <numéro>)` (`issue #<n>` pour un `#n`), par exemple
   `/feature **Duels en concours Campagne** : les tableaux … (docs/reste-a-faire.md, point 1)` ; sans identifiant,
   la parenthèse ne garde que le chemin (décidé en relecture : l'agent a le besoin entier et peut relire le point) ;

   Pour un `#n`, la parenthèse dit `issue #42` au lieu de `point #42` (décidé en relecture) : l'agent sait qu'il peut
   lire l'issue avec `gh`, et « point » reste réservé au numéro de tâche.

3. ferme le dialogue.

Toujours `/feature` : seule la section Features est listée. Pas de prise en charge : le reste à faire n'est pas
modifié, et la tâche reste listée (on peut la lancer deux fois). Échec de `tab.new` : toast « Agent non lancé » avec
l'erreur, dialogue ouvert, comme pour une issue.

### Entrée

`Entrée` ne fait rien sur une tâche : seul Lancer agit (décidé en relecture). Le pied de l'onglet Tâches dit
« Ctrl+Entrée lancer le travail » (« Cmd+Entrée » sur macOS), masqué quand rien n'est listé.

### Erreurs

Elles ne concernent que le profil sans Jira (dans le second cas, une erreur laisse l'onglet Jira). Toutes s'affichent
à la place de la liste de l'onglet Tâches, comme les erreurs de l'onglet Jira :

| Cas | Message |
|---|---|
| aucun reste à faire suivi par git | « Pas de reste à faire dans owner/repo. `/todo add` le crée dans docs/reste-a-faire.md. » |
| plusieurs dans `docs/`, ou plusieurs hors de `docs/` sans aucun dans `docs/` | « Plusieurs reste à faire : a/todo.md, b/TODO.md. Garde-en un seul, ou mets-le dans docs/. » |
| `git` ou la lecture échoue | « Reste à faire illisible : <première ligne de l'erreur> » |
| fichier sans tâche ouverte, ou sans section Features | « Rien d'ouvert » (message actuel d'une liste vide) |

## 2. Portée de chaque règle

| Endroit | Ce qu'il devient |
|---|---|
| `profile.js` `profileAccount` | inchangée (compte `gh`) ; une fonction voisine dit si le profil du propriétaire désactive le plugin Atlassian (`noJira(profilesText, owner)`), testée dans `profile.test.js` |
| `main.js` `TABS` | dépend du repo : `pr`, `issue`, puis `jira` ou `task`. Lue par `on_key_down` (`Tab`) et `header` |
| `main.js` `init` / `this.lists` | la troisième clé est `jira` ou `task` |
| `main.js` `load` | choisit l'onglet avant de charger : profil sans Jira, ou pas de source dans `.config.json` et un reste à faire trouvé ; `profiles.json` illisible : erreur actuelle sur PR et Issues, puis seul le second cas ; repo sans Jira : charge les tâches au lieu de `loadJira` |
| `main.js` `start` | onglet `task` → lancement de tâche ; l'onglet `issue` garde `/bugfix <url>` (aujourd'hui tout onglet autre que `jira` part en `issue`) |
| `main.js` `submit` | Entrée dans l'onglet `task` : rien ; la saisie de la source Jira ne s'y applique pas |
| `main.js` `render` | onglet `task` avec des tâches : liste à gauche, panneau de description à droite ; clic sur une ligne = sélection (autres onglets : ouvre, inchangé) |
| `main.js` `open` | un élément sans `url` (tâche) n'ouvre rien ; autres onglets inchangés |
| `main.js` `launch`, `start`, `hovered`, `busy` | clé interne de l'élément (`key ?? id`) ; nom d'onglet : le titre coupé pour une tâche, l'id sinon (inchangé) |
| `rows.js` | nouveau panneau de description (`descriptionPanel`) ; `listRow` : les ids d'éléments, le survol et le lancement en cours utilisent la clé interne (`i.key ?? i.id` : PR, issues et tickets inchangés), `meta` vide pour une tâche ; `header` inchangé (lit les onglets reçus) |
| nouveau `tasks.js` (pur, testé par `tasks.test.js`) | `remainingWorkFile(paths)` (choix du fichier ou erreur), `parseTasks(markdown)` (tâches ouvertes de la section Features : clé, identifiant, titre, description) |
| `launch.js` | `fetchTasks(on)` : racine du repo (`git rev-parse --show-toplevel`), `git ls-files`, puis `readTextFile(path, {on: machine})` ; `launchAgent` reçoit le nom d'onglet |
| `start.js` `agentTask` | cas `task` : `/feature <texte> (<chemin>, point <numéro>)`, `issue #<n>` pour un `#n` ; `issue` et `jira` inchangés |
| `start.js` `footerText` | onglet `task` : « Ctrl+Entrée lancer le travail » ; `pr`, `issue`, `jira` inchangés |
| `filter.js` `matches` | inchangé (id, titre, meta, tag) |
| `mod.json` `overlay.width` | 960 au lieu de 720 |
| `fake.js` | `readTextFile` répond par fichier (aujourd'hui `"{}"` pour tout chemin), pour tester `load` |
| `README.md` § Start work | l'onglet Tâches, sa condition, Lancer sur une tâche, `tasks.test.js` dans la liste des tests |
| `docs/domaine.md` | termes ajoutés par `ddd` (Repo sans Jira, Reste à faire, Tâche, Numéro de tâche, Section, Description du besoin) |
| `.config.json` | inchangé ; lu avant de choisir l'onglet (une source Jira garde l'onglet Jira, sauf profil sans Jira) |

## 3. Données existantes

Le mod n'écrit rien de nouveau. Le reste à faire est lu, jamais écrit. Un reste à faire dans un autre format (sans
section `##`, sans liste) donne « Rien d'ouvert » plutôt qu'une erreur ; MtgCollection n'est pas sur cette machine,
son format n'est pas vérifié.

## 4. Critères d'acceptation

**P1 — Voir les tâches et leur besoin**

- Repo `tuonick/GECCO` (profil sans Jira : `perso`, plugin Atlassian désactivé) : onglets « PR · Issues · Tâches », pas d'onglet
  Jira ; `Tab` passe de Tâches à PR, `Shift+Tab` de PR à Tâches.
- Repo d'un owner vidal avec une source Jira : onglets « PR · Issues · Jira », comportement actuel.
- Repo d'un owner vidal sans source Jira, avec un reste à faire : onglet Tâches ; sans reste à faire : onglet Jira et
  sa saisie de source.
- Repo vidal sans source Jira dont le reste à faire n'a pas de section Features (dsi-docs), ou avec deux fichiers hors
  `docs/`, ou dont la lecture échoue : onglet Jira et sa saisie de source.
- Pendant le chargement : l'en-tête montre « PR · Issues » seulement.
- Repo sans profil, sans source Jira : onglet Tâches s'il a un reste à faire avec une section Features, onglet Jira sinon. `profiles.json`
  illisible : même règle, avec l'erreur actuelle sur PR et Issues.
- Repo perso sans reste à faire : onglet Tâches avec « Pas de reste à faire dans owner/repo… ».
- `.config.json` illisible, repo vidal : onglet Jira avec l'erreur actuelle.
- Le fichier de GECCO : chaque point numéroté non rayé de la section Features est listé, avec son identifiant et son
  titre ; aucun point de Corrections, Vérifications non faites ni Décisions n'est listé.
- Un point sur plusieurs lignes : la description contient toutes ses lignes de suite, sous-listes comprises.
- Un point sans gras : titre = début du texte jusqu'au premier « : ».
- Une puce de Features « **Titre** (#42, …) : … » : identifiant `#42` ; « **Titre** : … (PR #131) » : pas d'identifiant.
- `↓` change la tâche sélectionnée et la description à droite ; le survol ne la change pas.
- Filtre « campagne » : seules les tâches dont l'identifiant ou le titre contient « campagne » restent ; la
  description suit la tâche sélectionnée de la liste filtrée.
- Aucun fichier ; deux fichiers hors `docs/` ; deux fichiers dans `docs/` ; `docs/reste-a-faire.md` et
  `notes/todo.md` (celui de `docs/` est pris) ; lecture en échec ; fichier sans section Features : messages de la
  table Erreurs.
- Terminal sur une autre machine : `git` et la lecture se font sur cette machine.
- Deux puces sans identifiant : survoler l'une ne montre « Lancer » que sur elle (P2) et la clé de ligne est unique ;
  clic sur une ligne de Tâches : sélection, aucun navigateur.
- `Entrée` sur une tâche : rien (pas de navigateur, pas d'agent).
- Titre « **`assets/print/scorecards-pdf.js` au-delà de 200 lignes** » : affiché sans backticks.
- Cas combinés : un point rayé suivi d'un commentaire hors rature (`~~…~~ (PR #135) Caduc : …`) n'est pas listé ; un
  point coché `[x]` de Features n'est pas listé ; une puce non rayée de Corrections n'est pas listée ; un point de
  Features après une section Corrections (sections dans un autre ordre) est listé ; filtre sans résultat → pas de
  panneau ; profil sans Jira **et** source Jira dans `.config.json` → onglet Tâches (le profil l'emporte).

Tant que P2 n'est pas livrée : pas de bouton Lancer dans l'onglet Tâches, `Ctrl+Entrée` y est sans effet et le pied
est masqué.

**P2 — Lancer le travail sur une tâche**

- Lancer sur la tâche 1 de GECCO : onglet Herdr nommé « Duels en concours Campagne », `claude` avec
  `/feature **Duels en concours Campagne** : les tableaux … (docs/reste-a-faire.md, point 1)` sur une ligne ; le
  dialogue se ferme ; le reste à faire n'est pas modifié.
- Titre de plus de 30 caractères : nom d'onglet coupé à 30.
- Tâche sans identifiant : la parenthèse ne garde que le chemin.
- `tab.new` en erreur : toast « Agent non lancé », dialogue ouvert, liste inchangée.
- Lancer sur une issue après ce changement : toujours `/bugfix <url>`, onglet nommé `#12`.
- Pendant un lancement : Entrée, Échap, `×`, clic sur une ligne et second Lancer ignorés (garde actuelle).
- Pied « Ctrl+Entrée lancer le travail » (« Cmd+Entrée » sur macOS), masqué liste vide ou filtre sans résultat.

## 5. Filet sur l'existant

Déjà testés et inchangés : `profileAccount`, `matches`, `agentTask` (`issue`, `jira`), `footerText` (`pr`, `issue`,
`jira`), `launchAgent`, le parcours Lancer des onglets Issues et Jira (`main.test.js`).
Sans test aujourd'hui et touché : `main.js` `load` (choix des listes chargées) et `on_key_down` sur `Tab` (cycle des
onglets). Avant de les modifier, caractérisation dans `main.test.js` : `load` d'un repo vidal charge PR, Issues et
Jira ; `Tab` depuis Jira revient à PR et `Shift+Tab` depuis PR va à Jira. Vert sur `main`.

## 6. Origine

Demande nouvelle de l'utilisateur, après `db40ab0` (lancer le travail). Hors périmètre : écrire dans le reste à faire
(marquer une tâche lancée, la rayer), lister les autres sections (Corrections, Vérifications non faites : décidé en relecture), relire le fichier quand il change pendant que le dialogue est ouvert, garder
l'onglet Jira à côté de Tâches, un reste à faire dans un repo avec Jira, lancer dans un worktree.

## 7. Dette du code touché

- `main.js` fait 200 lignes : toute ligne ajoutée passe le seuil. Proposé : **corrigé dans cette PR**. La lecture et
  l'enregistrement de la source Jira (`loadJira`, `saveJira`, 37 lignes à elles deux, qui gèrent l'état de
  l'onglet) sortent dans un module `jiraTab.js`, sans changement de comportement, avant la feature ; la logique
  nouvelle va dans `tasks.js`, `launch.js` et `rows.js`.
- `render` (32 lignes, au-delà de 20 ; un composant d'interface en tolère 40) : touchée (panneau). Proposé :
  **corrigé dans cette PR**, le corps de la liste sort dans `rows.js` (`listBody`).
- `on_key_down` (lambda de 15 lignes avec une chaîne de `if`) : touchée seulement par la liste des onglets.
  **Extraite en `onKey` dans cette PR** (relecture finale). Sa chaîne de `if`, d'abord reportée en issue, est aussi corrigée dans cette PR (`/pr push`) : `nextTab` (rows.js) calcule l'onglet suivant, `showTab` porte le garde de confirmation partagé avec le clic sur l'en-tête ; il reste un `if`/`else` sur trois touches.
