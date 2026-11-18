# Glossaire

## Contexte : Start work

Responsabilité : montrer, pour le repo GitHub du terminal focalisé, le travail ouvert sur lequel se lancer (PR,
issues, tickets Jira) et l'ouvrir dans le navigateur · Dans le code : `mods/start-work/` · Dépend de : GitHub (en
aval, via `gh`), Jira (en aval, via `acli`), profils Claude (en aval, `~/.claude/profiles.json`, pour le compte `gh`)

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

Invariants : la liste ne montre que du travail ouvert ; une PR brouillon est une PR ouverte.
