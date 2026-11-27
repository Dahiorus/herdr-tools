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
| Ticket | Élément Jira de la source Jira du repo ; l'onglet Jira n'en liste que les tickets lançables | onglet `jira`, `workitem` côté `acli` | issue (réservé à GitHub) |
| Issue | Issue GitHub ouverte du repo | onglet `issue` | ticket |
| PR de correction | PR ouverte (brouillon ou prête) qui fermera une issue à sa fusion, parce que sa description le dit (« Fixes #n », « Closes #n »…) ou qu'on l'a liée à la main dans « Development » sur GitHub ; une simple mention « #n » n'en fait pas une | `closingIssuesReferences` de `gh pr list` (PR ouvertes seulement), issue comparée au repo | PR liée, PR associée (une mention suffit à « lier ») |
| Issue en cours de correction | Issue qui a au moins une PR de correction ; rangée dans le groupe d'issues « En cours de correction » | groupe `fixing` | issue « En cours » (statut réservé aux tickets Jira), issue prise |
| Groupe d'issues | Partie de l'onglet Issues : « À corriger » (issues sans PR de correction), puis « En cours de correction » ; aucun groupe si la détection des PR de correction a échoué | groupes `toFix`, `fixing` (`GROUPS`) | section, catégorie |
| Ouvrir | Afficher une PR, une issue ou un ticket dans le navigateur | `open(item)` | lancer |
| Lancer le travail | Depuis une issue à corriger (toutes, si la détection des PR de correction a échoué), un ticket, une tâche, une PR à relire, ou une de mes PR qui a des retours (toutes, si la détection a échoué), démarrer un agent sur la skill qui convient (`/bugfix`, `/feature`, `/pr <n> comments`, `/pr <n> review`) | `start(item)` | ouvrir (réservé au navigateur) |
| Moi | Le compte GitHub du profil du repo, sinon le compte `gh` actif ; côté Jira : le compte connecté à `acli` (`currentUser()`, `--assignee @me`) | `account` (`profileAccount`), `@me` sous son jeton | l'utilisateur |
| Groupe de PR | Partie de l'onglet PR qui rassemble les PR ouvertes selon mon rôle : à relire, puis retours sur mes PR, puis mes PR ; les PR des autres qui ne me demandent pas de relecture ne sont pas affichées | `group`, `GROUPS` (`github.js`) | section (réservé au reste à faire), catégorie |
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
| Retours sur mes PR | Groupe de PR de celles de mes PR qui ont au moins un fil en attente ; elles n'apparaissent plus dans le groupe Mes PR | groupe `feedback` (`GROUPS`), `feedbackNumbers` | Retour sur mes PR (singulier) |
| Traiter les retours | Lancer le travail sur une de mes PR qui a des retours (toutes, si la détection a échoué) : agent sur `/pr <n> comments` (corrige, pousse, répond, redemande la relecture) | kind `comments` (`GROUPS`, `github.js`) | répondre (l'agent fait plus) |
| Relire | Lancer le travail sur une PR à relire : agent sur `/pr <n> review` (relit et publie l'avis, ou approuve) | kind `review` | reviewer, faire une review |
| Agent | Session Claude démarrée dans un nouvel onglet Herdr du repo, la skill et l'élément en première demande | `tab.new {argv, task}` | — |
| Type de ticket | Catégorie Jira d'un ticket (Bug, Story, Tâche…) ; décide de la skill lancée | champ `issuetype` de `acli` | type d'issue ; « tâche » seul (réservé au reste à faire) |
| Prise en charge | Pour un ticket : me l'attribuer et le passer au statut « En cours », avant de lancer l'agent | `takeTicket` ; `acli jira workitem assign --assignee @me`, `transition --status` | — |
| Catégorie de statut | Regroupement Jira des statuts d'un workflow en À faire, En cours, Terminé ; chaque projet range ses statuts (« À faire », « Backlog », « Selected for Development »…) dans l'une des trois | `statusCategory` (clé `new`, `indeterminate`, `done` ; en JQL `"To Do"`, `"In Progress"`, `Done`) | statut (un statut est le nom précis : « À faire », « En cours ») |
| Sprint actif | Sprint démarré et non clos d'un board Scrum ; un ticket hors sprint ou dans un sprint futur n'y est pas | JQL `sprint in openSprints()` | sprint en cours (« en cours » est un statut), itération |
| Bloqueur | Pour un ticket, autre ticket qui le bloque par un lien Jira « Blocks » (vu du ticket bloqué : « is blocked by ») | JQL `issueLinkType = "is blocked by"`, `linkedIssues(<clé>, "is blocked by")` (`linksJql`, `openBlockersJql`) | dépendance, prérequis |
| Ticket bloqué | Ticket qui a au moins un bloqueur non terminé (catégorie de statut autre que Terminé) ; un bloqueur terminé ne bloque plus | `hasOpenBlocker`, retiré par `withoutBlocked` | ticket flaggé (le drapeau « Flagged » de Jira est une autre notion) |
| Ticket lançable | Ticket sur lequel on peut lancer le travail tout de suite ; pour une source clé de projet : du sprint actif, au statut « À faire », ou « En cours » et attribué à moi, et non bloqué ; seuls ceux-ci sont listés dans l'onglet Jira | `toJql`, `fetchTickets` | ticket disponible, ticket prêt |
| Repo sans Jira | Repo dont le travail ne se suit pas dans Jira mais dans son reste à faire ; l'onglet Tâches y remplace l'onglet Jira | `repoWithoutJira` | projet perso |
| Profil sans Jira | Profil `/profile` dont `enabledPlugins` désactive `atlassian@claude-plugins-official` (aujourd'hui `perso`) | `noJira`, `noJiraProfile` | profil perso |
| Reste à faire | Fichier versionné du repo qui fait foi pour ce qu'il reste à faire (features, corrections…), tenu par la skill `/todo` | `docs/reste-a-faire.md` (casse variable), trouvé comme `/todo` le trouve ; `remainingWorkFile` | todo, TODO, backlog |
| Tâche | Point ouvert du reste à faire de la section Features : ni rayé (ligne qui commence par `~~`, même suivie de texte non rayé) ni coché (`[x]`) | onglet `task` | ticket, issue, point (dans l'interface) |
| Numéro de tâche | Numéro d'origine du point dans le reste à faire, cité ailleurs (« point 9 ») ; jamais recalculé | — | rang, index |
| Identifiant de tâche | Ce qui désigne une tâche dans la liste : son numéro de tâche, sinon le `#n` de l'issue citée juste après son titre ; peut manquer | `id` d'un élément `task` (distinct de sa clé interne `key`, position dans le fichier) | index, rang |
| Section | Rubrique du reste à faire où se range une tâche (Features, Corrections…) | titre `##` du fichier | catégorie, type |
| Description du besoin | Texte complet d'une tâche (titre compris), affiché à droite de la liste pour la tâche sélectionnée | `descriptionPanel` | détail, résumé |

Invariants : la liste ne montre que du travail ouvert ; une PR brouillon est une PR ouverte ; une PR est dans un seul
groupe de PR (une de mes PR est dans Retours sur mes PR ou dans Mes PR, jamais les deux) ; une issue est dans un seul groupe d'issues ; les approbations se comptent une par relecteur, sur son dernier avis décisif ; Start work ne modifie
jamais le reste à faire (seule la skill `/todo` le tient) ; un numéro de tâche est celui du fichier, jamais renuméroté ; une PR fusionnée ou fermée n'est jamais une PR de correction.

## Contexte : Panneau PR

Responsabilité : montrer en continu, à droite de la fenêtre, où en est la PR courante (statut, approbations, ma
relecture demandée, CI, Sonar, fils et commentaires, description), l'ouvrir dans le navigateur ou lancer le travail
dessus (relire, traiter les retours) · Dans le code : `mods/pr-panel/` · Dépend de : Start work (noyau partagé : les
règles de PR de `github.js`, `profile.js`, `run.js`, `launch.js` ; mêmes termes, mêmes sens), GitHub (en aval, via `gh`),
profils Claude (en aval, `~/.claude/profiles.json`, pour le compte `gh`), Herdr (en aval : `focused()` pour le terminal
suivi, `tab.new` pour l'onglet de l'agent)

Les termes de Start work (PR ouverte, Statut de PR, Moi, PR à relire, Approbation, Relecteur, Fil de relecture, Fil en
attente, Commentaire hors fil, Retours, Relire, Traiter les retours, Ouvrir, Lancer le travail) gardent ici leur sens.

| Terme | Définition métier | Dans le code | À ne pas dire |
|---|---|---|---|
| Branche courante | Branche git extraite dans le dossier du terminal focalisé ; aucune en HEAD détaché | `branch` du pane focalisé (`panes()`), tenue à jour par Herdr | branche active |
| PR courante | PR ouverte du repo dont la branche source est la branche courante ; plusieurs (une par base) : le panneau les montre toutes, l'une sous l'autre ; les PR venant d'un fork sont écartées | `gh pr list --head <branche> --state open` | PR active, PR en cours |
| Ma relecture demandée | La PR courante est une PR à relire (d'un autre, relecture demandée à moi ou à une de mes équipes, pas encore rendue) | `reviewAsked` | review en attente |
| Check | Vérification automatique rapportée par GitHub sur le dernier commit de la PR (job de CI, analyse) : en échec, en cours ou réussie | élément de `statusCheckRollup` (`CheckRun` ou `StatusContext`) | job, build (un check n'est pas forcément un build) |
| CI | Ensemble des checks de la PR courante hors Sonar, résumé en nombres d'échecs, en cours et réussis | `checksOf(...).ci` | pipeline, build |
| Analyse Sonar | Check de la PR dont le nom contient « sonar » (casse ignorée) ; montrée à part de la CI, absente si le repo n'en a pas | `checksOf(...).sonar` | quality gate (Sonar peut rapporter une analyse sans porte qualité) |
| Description de PR | Texte (markdown) que l'auteur a écrit dans le corps de la PR | `body` | résumé, détail |

Invariants : le panneau ne modifie rien sur GitHub (ni avis, ni réponse, ni fusion) ; il suit le dernier terminal
focalisé ; un check est compté une fois, dans la CI ou en Analyse Sonar, jamais les deux ; Ma relecture demandée est
toujours fausse sur une de mes PR.
