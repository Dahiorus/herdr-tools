# Retours sur mes PR dans Start work

## 1. Demande initiale

Issue [#8](https://github.com/Dahiorus/herdr-tools/issues/8), lancée par `/feature issue 8` :

> « Dans « Mes PR », on ne voit pas quelles PR ont des retours à traiter.
>
> Constat : `mods/start-work/github.js` a deux groupes, `toReview` et `mine`. `myPrMeta` ne lit que les avis
> (`reviews`), pas les fils de commentaires non résolus.
>
> Impact : « Retours » (`/pr <n> comments`) est proposé sur toutes mes PR, même sans retour en attente. Dans ce cas,
> le skill le dit et s'arrête.
>
> Piste : un groupe « Retour sur mes PR » pour les PR qui ont des fils non résolus dont le dernier commentaire n'est
> pas de moi. Il faut une requête GraphQL `reviewThreads` par PR, ou une seule requête groupée.
>
> Origine : hors périmètre de la PR #6, spec `docs/superpowers/specs/2026-11-19-groupes-pr-design.md` §4 (fin) et §6. »

**But** : à l'ouverture de l'onglet PR, voir tout de suite lesquelles de mes PR attendent ma réponse, et ne lancer
« Traiter les retours » que là où il y a quelque chose à traiter.

## Langage

Termes du glossaire (`docs/domaine.md`, contexte Start work), ajoutés par l'analyse :

- **Fil de relecture** : discussion ouverte par un commentaire de relecture sur une ligne du diff, avec ses réponses
  (`reviewThreads`). **Fil résolu** : marqué résolu sur GitHub (`isResolved`), il n'attend plus rien.
- **Commentaire hors fil** : commentaire de la conversation de la PR, ou texte d'un avis.
- **Retours sur mes PR** (groupe de PR, au pluriel comme « Retours ») : celles de mes PR qui ont des retours. Une de
  mes PR est dans Retours sur mes PR ou dans Mes PR, jamais les deux.
- **Retours** : inchangé, « tels que `/pr comments` les trouve », hors fil compris (décidé en relecture).
- **Fil en attente** (ajouté, décidé en relecture) : fil de relecture non résolu, pas ouvert par un bot, dont le
  dernier commentaire n'est pas de moi, ou mon propre fil seul, sans réponse. Le groupe Retours sur mes PR rassemble
  mes PR qui ont au moins un fil en attente ; une PR qui n'a que des commentaires hors fil reste dans Mes PR.

## Approches

| Approche | Pour | Contre |
|---|---|---|
| **A. Une requête GraphQL groupée**, en parallèle des deux `gh pr list` : `search(query: "repo:<o/r> is:pr is:open author:@me")` qui rend, pour chacune de mes PR ouvertes, ses fils (`reviewThreads`), plus `viewer { login }` | un appel de plus, quel que soit le nombre de PR ; `@me` et `viewer` résolus sous le jeton du profil (`ghCommand`) ; les deux listes existantes ne changent pas | une requête GraphQL à maintenir ; une PR toute neuve peut manquer à l'index de recherche quelques secondes (elle reste alors dans Mes PR) |
| B. Une requête par PR (`pullRequest(number:)`), après la liste Mes PR | ciblée, pas d'index de recherche | N appels, et en série après la liste : l'onglet s'affiche plus tard |
| C. Remplacer `gh pr list --author @me` par une requête GraphQL qui rend tout (avis et fils) | deux appels au lieu de trois | réécrit la lecture des avis (`reviews`) que `myPrMeta` attend de `gh pr list`, pour gagner un appel |

Retenue : **A**. Requête lancée à la main sur ce repo (PR fermées, `is:open` retiré) : la forme ci-dessous répond.

```graphql
query($q: String!) {
  viewer { login }
  search(query: $q, type: ISSUE, first: 50) {
    nodes { ... on PullRequest { number reviewThreads(first: 100) { nodes {
      isResolved
      all: comments { totalCount }
      first: comments(first: 1) { nodes { author { __typename login } } }
      last: comments(last: 1) { nodes { author { login } } }
    } } } }
  }
}
```

## Comportement

### Groupes

L'onglet PR montre trois groupes titrés, dans cet ordre (celui de l'image de la spec des groupes) : **À relire**,
**Retours sur mes PR**, **Mes PR**. Une de mes PR qui a des retours est dans Retours sur mes PR, les autres restent
dans Mes PR. Titre, compteur après filtre, groupe vide sans titre, ordre de GitHub dans un groupe : comme aujourd'hui.
Le compteur de l'onglet (`PR 3`) compte toujours toutes les PR affichées.

### Détection

Une de mes PR va dans Retours sur mes PR quand au moins un de ses fils de relecture (n'importe lequel, pas seulement
le premier) est un fil en attente. Les fils comptés sont ceux de `/pr comments` (`~/.claude/skills/pr/comments.md`,
étape 1, « Fils »), décidé en relecture :

- non résolu (`isResolved: false`) ;
- et dernier commentaire (`last`) pas de moi, ou fil de moi seul, sans réponse (`totalCount` 1, auteur moi) ;
- et premier commentaire (`first`) pas d'un auteur de type `Bot`.

Les commentaires hors fil ne sont pas lus (deux appels de plus par PR).

Limites (notées `shortcut:` dans le code) : 50 de mes PR, 100 fils par PR ; au-delà, une PR peut rester dans Mes PR
alors qu'elle a des retours. Un « Changements demandés » écrit seulement dans le texte d'un avis, sans fil, ne fait pas
passer la PR dans Retours sur mes PR (elle garde son `meta` « Changements demandés » dans Mes PR).

### Ligne et actions

La ligne d'une PR de Retours sur mes PR est celle d'une de mes PR : approbations en `meta` (`0/2`, `Prête pour la QA`
en vert, `Changements demandés` en rouge), tag de statut. Entrée ouvre la PR dans le navigateur, dans tous les groupes.

| Groupe | Ctrl+Entrée (Cmd+Entrée sur macOS) ou bouton | Agent | Pied de page |
|---|---|---|---|
| À relire | « Relire » | `/pr <n> review` | `Entrée ouvrir · Ctrl+Entrée relire` |
| Retours sur mes PR | « Retours » | `/pr <n> comments` | `Entrée ouvrir · Ctrl+Entrée traiter les retours` |
| Mes PR | aucun : pas de bouton, Ctrl+Entrée ne fait rien | — | `Entrée ouvrir` |

Sur Mes PR, l'action est retirée (décidé en relecture) : une PR qui n'a que des commentaires hors fil à traiter n'a
plus d'action dans le dialogue ; on lance alors `/pr <n> comments` à la main.

### Chargement et erreurs

Les trois appels partent ensemble, sous le compte du profil (`ghCommand`). Une erreur d'un `gh pr list` s'affiche à
la place de la liste, messages inchangés, seule : pas de toast pour les fils, même s'ils ont échoué aussi.

Si seule la requête des fils échoue (réseau, droits, schéma), l'onglet montre les PR sans le groupe Retours sur mes
PR (décidé en relecture) : À relire et Mes PR comme aujourd'hui, « Retours » sur toutes mes PR, et un toast
d'avertissement « Retours non détectés » qui cite l'erreur. Les fils ne servent qu'à classer : sans eux, les listes
restent justes.

Hors périmètre : nombre de fils en attente affiché sur la ligne, commentaires hors fil, au-delà de
50 PR ou 100 fils, PR des autres.

## 2. Portée

| Endroit | Ce qu'il devient |
|---|---|
| `mods/start-work/github.js`, `PR_GROUPS` (deux groupes, `args` lus par `fetchGh`) | trois groupes dans l'ordre affiché ; `feedback` (« Retours sur mes PR », kind `comments`, bouton « Retours », hint « traiter les retours ») ; `mine` (« Mes PR ») sans kind, bouton ni hint ; les `args` des listes `gh` ne sont plus tirés de `PR_GROUPS` par position (un groupe sans liste à lui) |
| `github.js` (nouveau) | la requête des fils (texte GraphQL) et la règle pure « a des retours » (fils d'une PR, mon login), testées par `github.test.js` |
| `github.js`, `prRows({ toReview, mine })` | reçoit aussi les numéros de mes PR qui ont des retours ; pose `group: "feedback"` sur celles-ci, `mine` sur les autres ; ordre À relire, Retours, Mes PR ; retrait de mes PR de À relire inchangé. Reçoit `null` à la place des numéros quand la requête des fils a échoué : mes PR prennent alors un groupe qui garde le comportement d'aujourd'hui (titre « Mes PR », kind `comments`, bouton « Retours », hint « traiter les retours ») ; sa forme (groupe `mineAll` dans `PR_GROUPS` ou autre) est laissée au plan |
| `github.js`, `metaColor(i)` (`group === "mine"`) | aussi pour `feedback` (ce sont mes PR) |
| `github.js`, `groupLayout`, `listIndex` | inchangés : ils suivent `PR_GROUPS` et les groupes posés ; un troisième titre s'intercale de lui-même |
| `launch.js`, `fetchGh` (`PR_GROUPS.map(g => ghList(…g.args…))`) | trois appels en parallèle : les deux `gh pr list` (args explicites) et `gh api graphql` sous `ghCommand` ; échec de la requête des fils : `null` passé à `prRows` et toast « Retours non détectés » (sauf si une liste a échoué) ; la décision vit dans `fetchPrs` (`launch.js`), testée par `launch.test.js` avec les réponses simulées de `fake` (fils en échec, réponse `{}`, liste et fils en échec) |
| `start.js`, `launchKind`, `startLabel`, `footerText` / `prFooter` | lisent le groupe dans `PR_GROUPS` : `feedback` comme `mine` aujourd'hui ; `mine` sans kind : pas de lancement, pas de libellé, pied de page `Entrée ouvrir`) |
| `main.js`, `start(item, cx)` | sans kind, ne lance rien (aujourd'hui `launch(undefined)` lancerait `/bugfix`) |
| `main.js`, `row(i, n, t)` | bouton masqué quand le groupe n'a pas de bouton |
| `rows.js`, `listRow`, `groupTitle` | inchangés |
| `filter.js`, `matches` | inchangé |
| `main.test.js`, `start.test.js`, `github.test.js`, `launch.test.js` | cas `mine` revus (plus d'action) ; `launch.test.js` (`LIST`, réponses de `fake`) reçoit l'appel `gh api graphql` ; nouveaux cas `feedback` |
| `README.md`, § Start work | trois groupes, ce qui fait passer une PR dans Retours sur mes PR, le bouton selon le groupe |
| `docs/domaine.md` | termes ajoutés par l'analyse ; « Fil en attente » ajouté ; mis à jour : « Groupe de PR » (« à relire, puis mes PR »), « Lancer le travail » (« une PR de mes PR ou à relire ») et « Traiter les retours » (une PR de Retours sur mes PR), « Mes PR » (le groupe ne garde que mes PR sans retours, l'ensemble garde le nom « mes PR ») |

Lecteurs et écrivains de la valeur `group: "feedback"` : écrite par `prRows` (via `fetchGh`), lue par `groupLayout`
(titres), `metaColor`, `launchKind`, `startLabel`, `footerText` (par `main.js`). Aucun autre fichier ne lit la sortie
des listes `gh`. Les onglets Issues, Jira et Tâches n'ont pas de groupe.

## 3. Données existantes

Aucune donnée stockée : tout est relu de GitHub à chaque ouverture.

## 4. Critères d'acceptation

**P1 — voir mes PR qui ont des retours dans leur groupe, et traiter les retours** (story unique)

Moi : `me`.

- Une de mes PR (#7) avec un fil non résolu dont le dernier commentaire est d'alice : `RETOURS SUR MES PR 1` puis #7 ;
  #7 n'est pas dans Mes PR.
- Fil non résolu où j'ai répondu en dernier : la PR reste dans Mes PR. Fil résolu dont le dernier commentaire est
  d'alice : Mes PR.
- Cas combiné : deux fils, le premier résolu, le second non résolu avec alice en dernier → Retours sur mes PR (c'est
  n'importe quel fil qui décide, pas le premier).
- Mon propre fil seul, sans réponse, non résolu : Retours sur mes PR. Le même avec une réponse d'alice, puis la mienne :
  Mes PR.
- Fil ouvert par un bot, non résolu, dernier commentaire du bot : Mes PR.
- Ordre : `À RELIRE`, `RETOURS SUR MES PR`, `MES PR` ; un groupe vide n'a pas de titre. Le compteur `PR n` compte les
  trois groupes.
- Cas combiné : une de mes PR en brouillon avec 1 approbation et des retours → Retours sur mes PR, `1/2`, tag
  Brouillon.
- Ctrl+Entrée ou « Retours » sur #7 (Retours sur mes PR) : onglet `#7` avec `/pr 7 comments` ; pied de page
  `Entrée ouvrir · Ctrl+Entrée traiter les retours`.
- Une de mes PR sans retour (#8, Mes PR) : pas de bouton, Ctrl+Entrée ne lance rien, pied de page `Entrée ouvrir`.
- À relire : inchangé (« Relire », `/pr <n> review`).
- ↑/↓ passent d'un groupe à l'autre, titres compris, comme aujourd'hui avec deux groupes.
- Filtre « qa » : seules mes PR prêtes pour la QA restent, chacune sous le titre de son groupe (Retours ou Mes PR).
- La requête des fils échoue (« HTTP 502 ») : À relire et Mes PR comme aujourd'hui, « Retours » sur toutes mes PR
  (pied de page `Entrée ouvrir · Ctrl+Entrée traiter les retours`), et un toast d'avertissement qui cite l'erreur. Un
  `gh pr list` échoue : erreur à la place de la liste, messages inchangés. Cas combiné : un `gh pr list` et la
  requête des fils échouent ensemble → l'erreur de la liste seule, sans toast.
- Onglets Issues, Jira et Tâches : inchangés.

## 5. Filet sur l'existant

Déjà couverts : `github.test.js` (`prRows`, `metaColor`, `groupLayout`, `listIndex`), `launch.test.js` (`fetchGh` :
listes et trois messages d'erreur, caractérisé par la PR #6), `start.test.js` (`launchKind`, `startLabel`,
`footerText`), `main.test.js` (lancement review et comments, navigation entre groupes). Rien à caractériser en plus.

## 6. Origine

*Hors périmètre* de la spec `docs/superpowers/specs/2026-11-19-groupes-pr-design.md` (§ Comportement, Actions, et
§6 « groupe "retour sur mes PR" »), repris en issue #8. Hors périmètre ici : voir la fin du § Comportement.

## 7. Dette du code touché

- `main.js` fait 200 lignes, au seuil. La feature y change `start` et `row` sans ajouter de ligne (garde sur le kind
  dans l'expression existante). Proposé : **corrigé dans cette PR** au sens « ne grossit pas » ; si une ligne doit
  s'ajouter, le plan sort une fonction vers `start.js`.
- `fetchGh` (`launch.js`) fait 10 lignes ; avec un troisième appel et le repli sur l'échec des fils, il passerait
  autour de 15. Proposé : **corrigé dans cette PR** en sortant la lecture des PR (`fetchPrs`) en fonction nommée.
- `prRows` (`github.js`) a deux `map` dans un tableau ; un troisième groupe en ajoute un. Proposé : **corrigé dans
  cette PR** si elle dépasse un niveau de contrôle : le classement d'une de mes PR (`mineGroup`) en fonction nommée.

## Watch out (pour le plan)

- `search` dépend de l'index de recherche de GitHub : une PR créée il y a quelques secondes peut manquer ; elle reste
  dans Mes PR. Les numéros servent de jointure : une PR absente de la recherche n'a simplement pas de retours.
- `viewer.login` est le compte du jeton passé par `ghCommand` : celui du profil. Comparer les logins sans tenir compte
  de la casse.
- La commande : `gh api graphql -f query=<texte> -f q=<recherche>` ; le texte de la requête passe en argument (pas de
  fichier), via `ghCommand` comme les listes.
