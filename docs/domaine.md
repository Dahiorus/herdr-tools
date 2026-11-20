# Glossaire

## Contexte : Start work

Responsabilité : montrer, pour le repo GitHub du terminal focalisé, le travail ouvert sur lequel se lancer (PR,
issues, tickets Jira, ou tâches du reste à faire pour un repo sans Jira), l'ouvrir dans le navigateur ou lancer le
travail dessus (pour une PR : relire, ou traiter les retours) · Dans le code : `mods/start-work/` ·
Dépend de : GitHub (en aval, via `gh`), Jira (en aval, via `acli`), profils Claude (en aval, `~/.claude/profiles.json`,
pour le compte `gh` et pour savoir si le repo est sans Jira), Reste à faire (en aval, fichier du repo tenu par la
skill `/todo`, lu seulement : ses conventions sont traduites en tâches à la frontière), Herdr (en aval, commande
`tab.new`, pour l'onglet de l'agent)

« À ne pas dire » vaut pour le texte français (interface, docs), pas pour les noms anglais du code.

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
| Lancer le travail | Depuis une issue, un ticket, une tâche, une PR à relire, ou une de mes PR qui a des retours (toutes, si la détection a échoué), démarrer un agent sur la skill qui convient (`/bugfix`, `/feature`, `/pr <n> comments`, `/pr <n> review`) | `start(item)` | ouvrir (réservé au navigateur) |
| Moi | Le compte GitHub du profil du repo, sinon le compte `gh` actif | `account` (`profileAccount`), `@me` sous son jeton | l'utilisateur |
| Groupe de PR | Partie de l'onglet PR qui rassemble les PR ouvertes selon mon rôle : à relire, puis retours sur mes PR, puis mes PR ; les PR des autres qui ne me demandent pas de relecture ne sont pas affichées | `group`, `PR_GROUPS` (`github.js`) | section (réservé au reste à faire), catégorie |
| Mes PR | PR ouvertes du repo dont je suis l'auteur. Le groupe Mes PR ne garde que celles sans fil en attente (toutes si la détection des retours a échoué) | `--author @me` ; groupes `mine`, `mineAll` | les miennes (dans l'interface) |
| PR à relire | PR ouverte d'un autre dont la relecture m'est demandée, à moi ou à une de mes équipes, et pas encore rendue (GitHub retire la demande quand je publie un avis, l'auteur peut la redemander) | `--search "review-requested:@me"` | PR en review, review en attente |
| Relecteur | Personne qui a publié un avis sur une PR, autre que son auteur | `reviews[].author.login` | reviewer |
| Approbation | Pour un relecteur, son dernier avis décisif quand c'est « Approuvé » ; un simple commentaire ne l'annule pas, une demande de changements oui | `myPrMeta` (`reviews`, `state` `APPROVED`, hors `COMMENTED` et `PENDING`) | approval, validation |
| Prête pour la QA | Une de mes PR qui a 2 approbations ou plus | `APPROVALS_FOR_QA` | « Prête » seul (statut de PR), validée |
| Retours | Fils et commentaires de relecture en attente de ma réponse sur une de mes PR, tels que `/pr comments` les trouve | — | remarques |
| Fil de relecture | Discussion ouverte par un commentaire de relecture sur une ligne du diff d'une PR, avec ses réponses ; le relecteur ou l'auteur peut la marquer résolue | `reviewThreads` (GraphQL) | thread ; conversation (réservé aux commentaires hors fil) |
| Fil résolu | Fil de relecture marqué résolu sur GitHub ; il n'attend plus rien | `isResolved: true` | fermé, clos |
| Commentaire hors fil | Retour publié hors d'un fil de relecture : commentaire de la conversation de la PR, ou texte d'un avis | `issues/<n>/comments`, `body` des `reviews` | commentaire de fil |
| Fil en attente | Fil de relecture d'une de mes PR qui attend ma réponse : non résolu, pas ouvert par un bot, dont le dernier commentaire n'est pas de moi, ou mon propre fil seul, sans réponse ; mêmes fils que `/pr comments` | `isPending` (`github.js`) ; `reviewThreads` (`isResolved`, `first`, `last`, `totalCount`) | retour (un retour peut aussi être hors fil) |
| Retours sur mes PR | Groupe de PR de celles de mes PR qui ont au moins un fil en attente ; elles n'apparaissent plus dans le groupe Mes PR | groupe `feedback` (`PR_GROUPS`), `feedbackNumbers` | Retour sur mes PR (singulier) |
| Traiter les retours | Lancer le travail sur une de mes PR qui a des retours (toutes, si la détection a échoué) : agent sur `/pr <n> comments` (corrige, pousse, répond, redemande la relecture) | kind `comments` (`PR_GROUPS`, `github.js`) | répondre (l'agent fait plus) |
| Relire | Lancer le travail sur une PR à relire : agent sur `/pr <n> review` (relit et publie l'avis, ou approuve) | kind `review` | reviewer, faire une review |
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

Invariants : la liste ne montre que du travail ouvert ; une PR brouillon est une PR ouverte ; une PR est dans un seul
groupe de PR (une de mes PR est dans Retours sur mes PR ou dans Mes PR, jamais les deux) ; les approbations se comptent une par relecteur, sur son dernier avis décisif ; Start work ne modifie
jamais le reste à faire (seule la skill `/todo` le tient) ; un numéro de tâche est celui du fichier, jamais renuméroté.
