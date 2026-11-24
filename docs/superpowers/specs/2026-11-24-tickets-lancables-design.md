# Tickets lançables dans l'onglet Jira de Start work

## 1. Demande initiale

> « j'ai besoin d'une évolution du listing des tickets Jira d'un projet. Actuellement, on liste tous les tickets à
> faire, sans distinction. Il faudrait en fait lister les tickets avec les critères suivants :
> 1. statut "à faire"
> 2. dans le sprint actif
> 3. n'est pas bloqué par un autre ticket non terminé »

**But** : l'onglet Jira ne montre que les tickets sur lesquels on peut lancer le travail tout de suite.

## Langage

Termes du glossaire (`docs/domaine.md`, contexte Start work), ajoutés par l'analyse :

- **Catégorie de statut** : regroupement Jira des statuts en À faire, En cours, Terminé (`statusCategory`).
- **Sprint actif** : sprint démarré et non clos (`sprint in openSprints()`).
- **Bloqueur** : ticket qui en bloque un autre par un lien Jira « Blocks » (vu du ticket bloqué : « is blocked by »).
- **Ticket bloqué** : ticket qui a au moins un bloqueur non terminé (catégorie de statut autre que Terminé).
- **Ticket lançable** : ticket sur lequel on peut lancer le travail tout de suite ; pour une source clé de projet : du
  sprint actif, au statut « À faire », ou « En cours » et attribué à moi, et non bloqué ; seuls ceux-ci sont listés dans l'onglet Jira.

« Bloqué » ne désigne ni le drapeau « Flagged » de Jira ni un statut : la demande parle d'un ticket « bloqué par un
autre ticket », donc d'un lien.

## Existant

`toJql` (`mods/start-work/jira.js`) traduit la source Jira du repo : une clé de projet donne
`project = X AND statusCategory != Done ORDER BY updated DESC` ; un filtre (`filter=123`, son id ou son URL) donne
`filter = 123` ; tout autre texte est pris comme JQL tel quel. `fetchTickets` (`launch.js`) lance
`acli jira workitem search --jql … --limit 50 --json`, puis `ticketRow` (`start.js`) fait chaque ligne.

Faits vérifiés le 2026-11-24 (Atlassian MCP, même API que `acli`) :

- Les trois projets configurés (POSO, MM, KC) ont un statut nommé « À faire ». Leur catégorie À faire contient aussi
  « Backlog », « Selected for Development » et « PR OK » (MM-1293, KC-1337 : PR déjà validée).
- `project = POSO AND status = "À faire" AND sprint in openSprints()` rend les tickets attendus (POSO-143, -142…).
- `project = POSO AND sprint in openSprints() AND (status = "À faire" OR (status = "En cours" AND assignee =
  currentUser())) ORDER BY updated DESC` est acceptée et rend les mêmes quatre tickets (aucun ticket « En cours » à
  moi dans ce sprint).
- `key in (POSO-111, POSO-121, POSO-143) AND issueLinkType = "is blocked by"` rend POSO-111 et POSO-121 (les deux qui
  ont un lien « is blocked by »), quel que soit l'état du bloqueur.
- `issue in linkedIssues(POSO-139, "is blocked by") AND statusCategory != Done` rend POSO-131 (en revue) ; la même
  requête sur POSO-111, dont les bloqueurs sont terminés, ne rend rien.
- `acli jira workitem search --fields issuelinks` est refusé (« field 'issuelinks' is not allowed »).

Non vérifié : ces requêtes passées par `acli` (non authentifié sur cette machine au moment de la spec). À rejouer à
l'étape 1b.

## Approches

| Approche | Pour | Contre |
|---|---|---|
| **A. JQL en deux temps** : la recherche actuelle, puis une recherche `key in (<clés>) AND issueLinkType = "is blocked by"` pour savoir quels tickets ont un lien, puis pour chacun d'eux `issue in linkedIssues(<clé>, "is blocked by") AND statusCategory != Done` | tout passe par `acli search`, déjà utilisé ; requêtes vérifiées ; la deuxième recherche ne dépend pas du texte de la source (pas d'`ORDER BY` à retirer) | une recherche de plus par ticket qui a un lien « is blocked by » (souvent peu nombreux), en parallèle |
| B. `acli jira workitem view <clé> --fields issuelinks` par ticket | lit directement l'état des bloqueurs | une commande par ticket listé (jusqu'à 50) ; champ non vérifié via `acli` |
| C. Retirer tout ticket qui a un lien « is blocked by » | une seule recherche de plus | retire aussi les tickets dont les bloqueurs sont terminés : contraire au critère 3 |

Retenue : **A**.

## Comportement

### Critères 1 et 2 : à faire, sprint actif

Les trois critères ne valent que pour une source clé de projet (décidé en relecture) : la demande parle des tickets
« d'un projet », et un filtre ou un JQL dit déjà ce qu'on veut voir. Les branches filtre et JQL de `toJql` et
`fetchTickets` restent inchangées, sans tri des tickets bloqués.

Mes tickets « En cours » du sprint actif restent listés (décidé en relecture) : on peut toujours relancer un agent sur
un ticket déjà pris. Pour une source clé de projet, `toJql` rend :

```text
project = X AND sprint in openSprints() AND (status = "À faire" OR (status = "En cours" AND assignee = currentUser())) ORDER BY updated DESC
```

Le critère 3 s'applique à tous les tickets listés, « En cours » compris.

« À faire » est le statut nommé « À faire » (décidé en relecture), pas toute la catégorie : sur MM et KC, la
catégorie « A faire » contient aussi « Selected for Development », « PR OK » (PR déjà validée) et « Backlog ». Un
projet sans statut « À faire » afficherait l'erreur de Jira à la place de la liste.

### Critère 3 : non bloqué

Après la recherche, si elle rend au moins un ticket :

1. une recherche `key in (<clés rendues>) AND issueLinkType = "is blocked by"` donne les tickets qui ont un lien
   « is blocked by » ;
2. pour chacun, en parallèle, une recherche `issue in linkedIssues(<clé>, "is blocked by") AND statusCategory != Done`
   (`--limit 1`) : si elle rend un ticket, le ticket est bloqué et sort de la liste.

L'ordre de la liste ne change pas. Aucune recherche de plus quand la première ne rend rien, ni d'étape 2 quand
l'étape 1 ne rend rien.

Un ticket débloqué entre deux chargements apparaît au chargement suivant de l'onglet.

Si une recherche de bloqueurs échoue (réseau, droits), l'onglet Jira affiche l'erreur à la place de la liste,
comme pour un échec de la recherche des tickets (décidé en relecture) : rien n'est lancé sur un ticket peut-être
bloqué.

### Liste vide

Pas de sprint actif (board Kanban, entre deux sprints) ou tous les tickets bloqués : l'onglet affiche « Rien
d'ouvert », inchangé (décidé en relecture).

Pas de repli sur tout le projet quand il n'y a pas de sprint actif.

## 2. Portée de chaque règle

| Endroit | Ce qu'il devient |
|---|---|
| `toJql` (`jira.js`), branche clé de projet | nouvelle JQL (critères 1 et 2) |
| `toJql`, branches filtre et JQL | inchangées : la source dit ce qu'elle veut |
| `fetchTickets` (`launch.js`) | pour une source clé de projet seulement, retire les tickets bloqués après la recherche (critère 3) |
| nouvelles fonctions pures dans `jira.js` | les deux requêtes de bloqueurs et le tri des tickets bloqués, l'appel `acli` passé en paramètre pour être testé sans `acli` |
| `ticketRow` (`start.js`), champs `--fields` | inchangés : aucun champ de plus |
| `refusal`, `decide`, `takeSteps` (`start.js`) | inchangés : un ticket « À faire » est accepté (catégorie `new`) comme avant ; la branche « En cours et à moi » sert toujours : mes tickets « En cours » restent listés |
| `assess`, `takeTicket`, `isMine` (`launch.js`) | inchangés : ils travaillent sur un ticket déjà listé |
| `loadJira` (`jiraTab.js`) | inchangé : l'erreur de `fetchTickets` s'affiche comme aujourd'hui |
| message de liste vide (`main.js`, `"Rien d'ouvert"`) | inchangé |
| `jira.test.js` | les deux assertions sur la JQL d'une clé de projet changent |
| `README.md` (section Start work), `docs/domaine.md` | disent quels tickets l'onglet Jira liste |

## 3. Données existantes

Aucune donnée stockée : `.config.json` garde ses sources telles quelles. Une source clé de projet déjà enregistrée
liste moins de tickets au prochain chargement.

## 4. Critères d'acceptation

### P1 — Tickets lançables (story unique)

Nominaux :

- source `POSO` : les tickets « À faire » du sprint actif apparaissent, et mes tickets « En cours » du sprint actif ;
- un ticket « À faire » du sprint actif sans lien « is blocked by » apparaît ;
- un ticket dont tous les bloqueurs sont terminés apparaît ;
- un ticket qui a un bloqueur non terminé n'apparaît pas.

Refus et limites :

- un ticket « En cours » attribué à un autre, « PR OK », « Selected for Development », « Backlog » ou hors sprint
  n'apparaît pas ;
- pas de sprint actif : liste vide, « Rien d'ouvert » ;
- une recherche de bloqueurs échoue : l'onglet affiche son erreur à la place de la liste ;
- source filtre ou JQL : la liste est celle d'aujourd'hui, sans tri des tickets bloqués.

Combinés :

- mon ticket « En cours » du sprint actif, bloqué par un ticket non terminé : il n'apparaît pas ;
- ticket « À faire » dans le sprint actif et attribué à un autre : il apparaît ;
- deux bloqueurs, l'un terminé, l'autre non : le ticket n'apparaît pas ;
- trois tickets, le deuxième seul bloqué : les deux autres restent, dans l'ordre ;
- première recherche vide : aucune recherche de bloqueurs ;
- aucun ticket avec un lien : aucune recherche `linkedIssues`.

## 5. Filet sur l'existant

`fetchTickets` n'a aucun test. Avant de le modifier, dans `launch.test.js` : la recherche et `auth status` lancés sur
la machine du repo, le site pris dans `auth status`, l'erreur quand le site manque et quand `auth status` échoue.

## 6. Origine

Demande nouvelle, pas de régression. Hors périmètre : le drapeau « Flagged » de Jira et tout statut « Bloqué ».

## 7. Dette du code touché

| Méthode | Écart | Décision |
|---|---|---|
| `toJql` (`jira.js`, 8 lignes) | aucun | — |
| `fetchTickets` (`launch.js`, 9 lignes) | aucun test (voir §5) ; avec le critère 3 elle passerait 20 lignes et deux niveaux | le tri des tickets bloqués sort dans `jira.js`, testé seul (corrigé dans cette PR) |
