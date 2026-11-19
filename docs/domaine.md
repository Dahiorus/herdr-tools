# Glossaire

## Contexte : Start work

Responsabilité : montrer, pour le repo GitHub du terminal focalisé, le travail ouvert sur lequel se lancer (PR,
issues, tickets Jira, ou tâches du reste à faire pour un repo sans Jira), l'ouvrir dans le navigateur ou lancer le
travail dessus · Dans le code : `mods/start-work/` ·
Dépend de : GitHub (en aval, via `gh`), Jira (en aval, via `acli`), profils Claude (en aval, `~/.claude/profiles.json`,
pour le compte `gh` et pour savoir si le repo est sans Jira), Reste à faire (en aval, fichier du repo tenu par la
skill `/todo`, lu seulement : ses conventions sont traduites en tâches à la frontière), Herdr (en aval, commande
`tab.new`, pour l'onglet de l'agent)

| Terme | Définition métier | Dans le code | À ne pas dire |
|---|---|---|---|
| Repo | Le repo GitHub du remote `origin` du terminal focalisé | `this.repo` (`owner/repo`) | projet |
| PR ouverte | Pull request ni fusionnée ni fermée ; seules celles-ci sont listées | onglet `pr`, `gh pr list` (état `open` par défaut) | PR active |
| Statut de PR | Où en est une PR ouverte : brouillon ou prête pour la revue | `isDraft` de `gh pr list`, affiché en tag coloré (`prStatus`, `github.js`) | état (réservé à ouvert / fermé / fusionnée) |
| Brouillon | PR ouverte que son auteur ne propose pas encore à la revue (« Draft » sur GitHub) | `isDraft: true` | — |
| Prête | PR ouverte proposée à la revue | `isDraft: false` | open, ouverte (une PR brouillon est ouverte aussi) |
| Source Jira | Ce qui désigne les tickets Jira du repo : clé de projet, filtre ou JQL | `jiraSource`, `.config.json` | board |
| Ticket | Élément Jira de la source Jira du repo | onglet `jira`, `workitem` côté `acli` | issue (réservé à GitHub) |
| Issue | Issue GitHub ouverte du repo | onglet `issue` | ticket |
| Ouvrir | Afficher une PR, une issue ou un ticket dans le navigateur | `open(item)` | lancer |
| Lancer le travail | Depuis une issue, un ticket ou une tâche, démarrer un agent sur la skill qui convient (`/bugfix`, `/feature`) | `start(item)` | ouvrir (réservé au navigateur) |
| Agent | Session Claude démarrée dans un nouvel onglet Herdr du repo, la skill et l'élément en première demande | `tab.new {argv, task}` | — |
| Type de ticket | Catégorie Jira d'un ticket (Bug, Story, Tâche…) ; décide de la skill lancée | champ `issuetype` de `acli` | type d'issue ; « tâche » seul (réservé au reste à faire) |
| Prise en charge | Pour un ticket : me l'attribuer et le passer au statut « En cours », avant de lancer l'agent | `takeTicket` ; `acli jira workitem assign --assignee @me`, `transition --status` | — |
| Repo sans Jira | Repo dont le travail ne se suit pas dans Jira mais dans son reste à faire ; l'onglet Tâches y remplace l'onglet Jira | `repoWithoutJira` | projet perso |
| Profil sans Jira | Profil `/profile` dont `enabledPlugins` désactive `atlassian@claude-plugins-official` (aujourd'hui `perso`) | `noJira`, `noJiraProfile` | profil perso |
| Reste à faire | Fichier versionné du repo qui fait foi pour ce qu'il reste à faire (features, corrections…), tenu par la skill `/todo` | `docs/reste-a-faire.md` (casse variable), trouvé comme `/todo` le trouve ; `remainingWorkFile` | todo, TODO, backlog |
| Tâche | Point ouvert du reste à faire de la section Features : ni rayé (ligne qui commence par `~~`, même suivie de texte non rayé) ni coché (`[x]`) | onglet `task` | ticket, issue, point (dans l'interface) |
| Numéro de tâche | Numéro d'origine du point dans le reste à faire, cité ailleurs (« point 9 ») ; jamais recalculé | — | rang, index |
| Identifiant de tâche | Ce qui désigne une tâche dans la liste : son numéro de tâche, sinon le `#n` de l'issue citée juste après son titre ; peut manquer | `id` d'un élément `task` (distinct de sa clé interne `key`, position dans le fichier) | index, rang |
| Section | Rubrique du reste à faire où se range une tâche (Features, Corrections…) | titre `##` du fichier | catégorie, type |
| Description du besoin | Texte complet d'une tâche (titre compris), affiché à droite de la liste pour la tâche sélectionnée | `descriptionPanel` | détail, résumé |

Invariants : la liste ne montre que du travail ouvert ; une PR brouillon est une PR ouverte ; Start work ne modifie
jamais le reste à faire (seule la skill `/todo` le tient) ; un numéro de tâche est celui du fichier, jamais renuméroté.
