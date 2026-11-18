# Glossaire

## Contexte : Start work

Responsabilité : montrer, pour le repo GitHub du terminal focalisé, le travail ouvert sur lequel se lancer (PR,
issues, tickets Jira), l'ouvrir dans le navigateur ou lancer le travail dessus · Dans le code : `mods/start-work/` ·
Dépend de : GitHub (en aval, via `gh`), Jira (en aval, via `acli`), profils Claude (en aval, `~/.claude/profiles.json`,
pour le compte `gh`), Herdr (en aval, commande `tab.new`, pour l'onglet de l'agent)

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
| Lancer le travail | Depuis une issue ou un ticket, démarrer un agent sur la skill qui convient (`/bugfix`, `/feature`) | `start(item)` | ouvrir (réservé au navigateur) |
| Agent | Session Claude démarrée dans un nouvel onglet Herdr du repo, la skill et l'élément en première demande | `tab.new {argv, task}` | — |
| Type de ticket | Catégorie Jira d'un ticket (Bug, Story, Tâche…) ; décide de la skill lancée | champ `issuetype` de `acli` | type d'issue |
| Prise en charge | Pour un ticket : me l'attribuer et le passer au statut « En cours », avant de lancer l'agent | `takeTicket` ; `acli jira workitem assign --assignee @me`, `transition --status` | — |

Invariants : la liste ne montre que du travail ouvert ; une PR brouillon est une PR ouverte.
