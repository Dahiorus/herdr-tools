# Groupes de PR dans Start work

## 1. Demande initiale

> « amélioration de l'onglet PR de start-work, j'aimerais trier la liste des PR en 2 catégories : les miennes et
> celles que je dois relire. Pour les miennes, j'aimerais une action "/pr comments" pour répondre aux commentaires et
> connaitre le nombre d'approvals. Pour celles à relire, j'aimerais une action "/pr review" pour lancer une review de
> la pr. Tu peux t'inspirer de cette image :
> https://github.com/aguiddir/herdr-config/blob/main/mods/pr-inbox/preview.png »

**But** : à l'ouverture de Start work, voir d'un coup d'œil ce que j'ai à faire sur les PR du repo (relire celles
qu'on m'a demandées, traiter les retours sur les miennes) et lancer l'agent qui le fait, sans passer par GitHub.

L'image montre une liste en groupes titrés (« À relire 4 », « Retour sur mes PR 3 », « Mes PR en attente 27 »), une
ligne par PR, et une action « Relire avec Claude ». On reprend les groupes titrés et l'action ; pas le panneau de
détail à droite ni la liste multi-repos.

## Langage

Termes du glossaire (`docs/domaine.md`, contexte Start work), ajoutés par l'analyse :

- **Moi** : le compte GitHub du profil du repo, sinon le compte `gh` actif (`@me` sous son jeton).
- **Groupe de PR** (pas « catégorie », pas « section ») : partie de l'onglet PR qui rassemble les PR ouvertes selon
  mon rôle. Une PR est dans un seul groupe.
- **Mes PR** : PR ouvertes du repo dont je suis l'auteur.
- **PR à relire** : PR ouverte d'un autre dont la relecture m'est demandée (à moi ou à une de mes équipes) et pas
  encore rendue. GitHub retire la demande quand je publie une review ; l'auteur peut la redemander.
- **Approbation** : pour un relecteur, son dernier avis décisif quand c'est « Approuvé ». Un simple commentaire ne
  l'annule pas, une demande de changements oui. Même règle que `/pr approvals` (skill `pr`, « Actions sans arbre »).
- **Prête pour la QA** : une de mes PR qui a 2 approbations ou plus. Jamais « Prête » seul, qui est le statut d'une
  PR non brouillon.
- **Traiter les retours** (`/pr <n> comments`) et **Relire** (`/pr <n> review`) : deux formes de **Lancer le
  travail** sur une PR. « Répondre aux commentaires » est trop étroit : l'agent corrige aussi, pousse et redemande la
  relecture.

## Approches

| Approche | Pour | Contre |
|---|---|---|
| **A. Deux appels `gh` en parallèle**, un par groupe : `gh pr list --author @me` (Mes PR) et `gh pr list --search "review-requested:@me"` (À relire), mêmes champs `--json` que la liste actuelle plus `reviews` | `@me` résolu par GitHub sous le jeton du profil, équipes comprises ; chaque groupe a ses 50 PR, aucune PR qui me concerne n'est perdue derrière d'autres ; mêmes `ghCommand` et gestion d'erreur que l'existant | deux appels au lieu d'un |
| B. Une requête GraphQL (`gh api graphql`) qui rend tout | un seul appel | requête à écrire et maintenir, hors des `GH_LISTS` existants ; la résolution des équipes est à refaire à la main |
| C. Un seul `gh pr list` + `reviewRequests`, comparé au login (`gh api user`) | deux appels | une demande faite à une de mes équipes n'apparaît pas : il faudrait lister mes équipes ; limite de 50 partagée |

Retenue : **A** (décidé en relecture : chaque groupe vient de sa propre liste). Les PR des autres étant cachées
(décidé en relecture), la liste générale `gh pr list` n'est plus appelée.

## Comportement

### Groupes

L'onglet PR ne montre plus que les PR ouvertes qui me concernent, en deux groupes titrés, dans cet ordre :
**À relire**, puis **Mes PR**. Les PR des autres qui ne me demandent pas de relecture sont **cachées** (décidé en
relecture), y compris une PR dont j'ai déjà rendu la relecture. Chaque titre de groupe porte le nombre de PR du groupe
(après filtre), comme l'image : `À RELIRE 2`. Un groupe vide (aucune PR, ou aucune après filtre) n'a pas de titre.
Dans un groupe, l'ordre est celui de GitHub (plus récentes d'abord), comme aujourd'hui.

Une PR est dans un seul groupe. Une de mes PR est toujours dans Mes PR, même si sa relecture est demandée à une de mes
équipes (elle sort alors aussi de la recherche `review-requested:@me` et en est retirée).

Le compteur de l'onglet (`PR 3`) compte les PR affichées (À relire + Mes PR, avant filtre).

### Ligne d'une PR

Inchangé pour les deux groupes : numéro, titre, colonne `meta`, tag de statut (Brouillon / Prête).

Pour **mes PR**, la colonne `meta` montre les approbations au lieu de l'auteur (c'est moi) : `0/2`, `1/2`, puis
`Prête pour la QA` à partir de 2, en vert et en gras (demande après recette : le gris ne se voyait pas) ; `Changements demandés` en rouge et en gras. Les approbations se comptent sur le champ `reviews` de `gh pr list` : un relecteur
compte une fois, sur son dernier avis hors `COMMENTED` et `PENDING` ; c'est une approbation s'il est `APPROVED` (un
avis `DISMISSED` n'en est pas une). Même règle que `/pr approvals`.

Une demande de changements encore active (un relecteur dont le dernier avis, au sens ci-dessus, est
`CHANGES_REQUESTED`) remplace le compte et aussi « Prête pour la QA » par `Changements demandés` (décidé en relecture,
comme `/pr approvals` qui la signale) : alice et bob approuvent, carol demande des changements → `Changements demandés`.

Pour les **PR à relire**, la colonne `meta` garde l'auteur.

### Actions

| Groupe | Entrée / clic sur la ligne | Ctrl+Entrée (Cmd+Entrée sur macOS) ou bouton de la ligne | Agent lancé |
|---|---|---|---|
| À relire | ouvrir dans le navigateur (inchangé) | **Relire** | `/pr <n> review` |
| Mes PR | ouvrir dans le navigateur (inchangé) | **Traiter les retours** | `/pr <n> comments` |

L'agent démarre comme pour une issue : `launchAgent` ouvre un onglet Herdr du repo nommé `#<n>`, le dialogue se ferme ;
en cas d'échec, toast « Agent non lancé » avec l'erreur, le dialogue reste. `<n>` est le numéro sans `#`.
L'action est toujours proposée, brouillon compris, et même sans retour en attente : la skill `/pr` le dit et
s'arrête. Savoir s'il y a des retours demanderait une requête par PR.

Le bouton apparaît comme aujourd'hui sur la ligne survolée ou sélectionnée.

Libellé du bouton (décidé en relecture) : **« Relire »** sur une PR à relire, **« Retours »** sur une de mes PR ;
« Lancer » reste sur les issues, tickets et tâches.

Pied de page de l'onglet PR (vide aujourd'hui), selon la ligne sélectionnée : `Entrée ouvrir · Ctrl+Entrée relire`,
`Entrée ouvrir · Ctrl+Entrée traiter les retours` (Cmd sur macOS) ; rien quand la liste est vide ou en erreur, comme aujourd'hui.

### Navigation et filtre

↑/↓ passent d'une PR à la suivante en sautant les titres de groupe, d'un groupe à l'autre. La ligne sélectionnée
reste visible quand on descend (les titres décalent les lignes dans la liste). Quand on remonte sur la première PR
d'un groupe, son titre est visible aussi (amendé en review, P1). Le filtre porte sur les mêmes champs
qu'aujourd'hui (`id`, `title`, `meta`, `tag`) : taper « qa » garde mes PR prêtes pour la QA.

### Chargement et erreurs

Les deux appels `gh` partent ensemble, sous le compte du profil (`ghCommand`). Si l'un échoue, l'onglet PR affiche
l'erreur comme aujourd'hui (mêmes messages : compte du profil ou compte actif qui ne voit pas le repo). Aucune PR
dans les deux groupes : « Rien d'ouvert », inchangé.

Hors périmètre : panneau de détail de la PR, liste multi-repos, CI, groupe « retour sur mes PR » distinct (savoir
s'il y a des retours en attente), PR des autres (cachées), onglets Issues, Jira et Tâches.

## 2. Portée

| Endroit | Ce qu'il devient |
|---|---|
| `mods/start-work/github.js`, `GH_LISTS.pr.fields` (`number,title,author,url,isDraft`) | ajoute `reviews`, lu pour les approbations ; `issue` inchangé |
| `github.js`, `GH_LISTS.pr` (une liste) | les deux listes de l'onglet PR (Mes PR : `--author @me`, À relire : `--search "review-requested:@me"`), avec leur groupe ; la forme exacte est laissée au plan |
| `github.js` (nouveau) | règles pures : compte d'approbations et libellé `meta` de mes PR (`0/2`, `Prête pour la QA`, `Changements demandés`), retrait de mes PR de la liste À relire, ordre des groupes ; testées par `github.test.js` (ou un module voisin si `github.js` dépasse sa taille, décidé au plan) |
| `launch.js`, `fetchGh(kind, repo, account, on, profiles)` | pour `pr`, lance les deux listes (Mes PR, À relire) au lieu de la liste générale et pose `group` (et `meta` pour mes PR) sur chaque élément ; une erreur de l'une passe par le même `catch` (messages inchangés). `issue` inchangé |
| `start.js`, `agentTask(kind, item)` | deux kinds de plus : `review` → `/pr <n> review`, `comments` → `/pr <n> comments` |
| `start.js`, `footerText(tab, platform, confirming, empty)` | reçoit en plus le groupe de la ligne sélectionnée ; onglet PR : texte selon ce groupe (voir Actions) ; `footerText("pr", "linux")` sans ligne rend toujours `null` (`start.test.js`) ; ses autres cas inchangés |
| `main.js`, commentaire d'en-tête (« Ctrl+Enter or Lancer starts an agent ») | dit que sur une PR, Ctrl+Entrée relit ou traite les retours selon le groupe |
| `main.js`, `start(item, cx)` (`this.tab === "pr"` → rien) | PR à relire → `launch("review")`, mes PR → `launch("comments")` ; tout élément `pr` a désormais un groupe |
| `main.js`, `launch(kind, item, cx)` | nom de l'onglet `item.id` (`#42`) : inchangé ; seuls les nouveaux kinds passent |
| `main.js`, `row(i, n, t)` (pas de bouton sur `pr`) | bouton sur toutes les PR, libellé « Relire » ou « Retours » selon le groupe |
| `main.js`, `items()` | inchangé : `fetchGh` rend déjà les PR dans l'ordre des groupes (À relire puis Mes PR), que le filtre `matches` garde (amendé au plan) |
| `main.js`, `render()` / `rows.js`, `listBody`, `listRow` | titres de groupe intercalés dans l'onglet PR ; `listRow` reçoit le libellé du bouton (`startButton` écrit « Lancer » en dur) |
| `main.js`, `select(at)` → `scroll.scroll_to_item(at)` | l'indice de la ligne dans la liste compte les titres de groupe placés avant elle |
| `main.js`, `onKey` (↑/↓) | inchangé : il parcourt `items()`, qui ne contient pas les titres |
| `filter.js`, `matches` | inchangé (porte déjà sur `meta` et `tag`) |
| `main.test.js` | cas de lancement sur une PR (review, comments) ; le test « onglet PR : Ctrl+Entrée ne fait rien » (`main.test.js`, vers la l. 43) devient faux et est remplacé ; les autres cas `pr` restent |
| `README.md`, § Start work | groupes, approbations, Ctrl+Entrée sur une PR |
| `docs/domaine.md` | termes ajoutés par l'analyse (déjà écrits) ; « Groupe de PR » et le code réel mis à jour après le plan |

Lecteurs et écrivains des nouveaux champs d'un élément `pr` : `group` — écrit par `fetchGh`, lu par
`render()` (titres), `start()`, `row()` (bouton), `footerText` ; `meta` de mes PR — écrit par `fetchGh`, lu par
`listRow` et `matches`. Aucun autre fichier ne lit la sortie de `gh pr list`. Les onglets Issues, Jira et Tâches ne
reçoivent pas de `group`.

## 3. Données existantes

Aucune donnée stockée : la liste est relue de GitHub à chaque ouverture. `.config.json` n'est pas touché.

## 4. Critères d'acceptation

**P1 — voir mes PR et celles à relire en groupes, et lancer l'agent** (story unique : les groupes sans action ou
l'action sans groupes ne servent pas seuls)

- Repo avec une PR dont la relecture m'est demandée (#5 de bob), une de mes PR (#7) et une PR de carol sans demande
  (#9) : l'onglet PR montre `À RELIRE 1` puis #5, `MES PR 1` puis #7 ; #9 n'apparaît pas ; l'onglet affiche `PR 2`.
- Une PR de carol dont j'ai rendu la relecture (demande retirée par GitHub) n'apparaît pas.
- Relecture demandée à une de mes équipes, pas à moi : la PR est dans À relire.
- Cas combiné : une de mes PR dont la relecture est demandée à une de mes équipes est dans Mes PR seulement.
- Mes PR : 0 review → `0/2` ; alice approuve → `1/2` ; alice et bob approuvent → `Prête pour la QA` ; trois
  approbations → `Prête pour la QA`.
- Alice approuve puis commente : `1/2` (le commentaire n'annule pas). Alice demande des changements puis approuve :
  `1/2`. Alice approuve puis demande des changements : `Changements demandés`. Alice
  approuve, son approbation est rejetée (`DISMISSED`) : `0/2`.
- Alice et bob approuvent, carol demande des changements → `Changements demandés`.
- Cas combiné : une de mes PR en brouillon avec 1 approbation montre `1/2` et le tag Brouillon.
- Ctrl+Entrée sur #5 (À relire) ouvre un onglet `#5` avec `/pr 5 review` et ferme le dialogue ; sur #7 (Mes PR),
  `/pr 7 comments`. Le bouton de la ligne fait de même.
- Le bouton d'une PR à relire s'appelle « Relire », celui d'une de mes PR « Retours ».
- Pied de page : `Entrée ouvrir · Ctrl+Entrée relire` sur #5, `Entrée ouvrir · Ctrl+Entrée traiter les retours` sur #7.
- Échec de `herdr-app do tab.new` : toast « Agent non lancé », le dialogue reste ouvert.
- Entrée ouvre la PR dans le navigateur dans tous les groupes.
- ↑/↓ passent de la dernière PR d'À relire à la première de Mes PR ; la ligne sélectionnée reste visible. ↑ jusqu'à la
  première PR d'un groupe montre aussi son titre.
- Filtre « qa » (jeu de test dont aucun titre ni auteur ne contient « qa ») : seules mes PR prêtes pour la QA
  restent, sous leur titre `MES PR 1` ; le groupe À relire vidé n'a pas de titre.
- Aucune PR à relire ni à moi (même si le repo a des PR ouvertes d'autres) : « Rien d'ouvert ». Une des deux commandes `gh` échoue : l'erreur s'affiche à la place de la
  liste, mêmes messages qu'aujourd'hui pour un repo invisible.
- Onglets Issues, Jira et Tâches : inchangés (pas de titres, mêmes actions).

## 5. Filet sur l'existant

Déjà couverts : `github.test.js` (`GH_LISTS`, `prStatus`), `main.test.js` (lancement issue, ticket, tâche ;
`tab === "pr"` ne lance rien aujourd'hui : ce test devient faux, voir §2), `start.test.js` (`agentTask`, `footerText`).

Non couvert : `fetchGh` (`launch.js`) n'a aucun test. Caractérisation à écrire avant de le modifier, verte sur
`main`, dans `launch.test.js` contre `fake.js` : liste `issue` et `pr` mappée en `{id, title, meta, tag, url}` ; les
trois messages d'erreur (autre erreur rendue telle quelle ; « Could not resolve » avec compte du profil ; sans compte,
avec le login du compte actif). Le rendu (titres, bouton) se vérifie par `herdr-app check` et dans l'app.

## 6. Origine

Demande nouvelle de l'utilisateur, après `117a5b0`. Hors périmètre noté : panneau de détail, multi-repos, CI, groupe
« retour sur mes PR » (retours en attente détectés), PR des autres (cachées, décidé en relecture), au-delà de 50 PR
par groupe.

## 7. Dette du code touché

- `main.js` fait 200 lignes sur `main`, au seuil de la grille ; la feature l'augmente (titres, `start`, `row`).
  Proposé **corrigé dans cette PR** : les règles nouvelles vont dans des modules purs (`github.js` ou voisin,
  `start.js`), et le plan sort de `main.js` ce qu'il faut pour rester sous 200 lignes (par exemple le corps de la liste
  avec ses titres vers `rows.js`), sans changement de comportement.
- `fetchGh` (`launch.js`) fait 14 lignes avec un `try/catch` et deux `if` dans le `catch` ; la feature ajoute deux
  appels. Proposé **corrigé dans cette PR** : le `catch` sort en fonction nommée (`ghError`) si `fetchGh` dépasse
  20 lignes.
- `start(item, cx)` (`main.js`) enchaîne déjà trois cas ; la feature en ajoute deux. Proposé : le choix du kind
  d'après l'onglet et le groupe va dans `start.js` (pur, testé), `start()` ne fait que l'appeler.

## Watch out (pour le plan)

- `@me` dans `--author` et `--search` se résout sous le jeton passé par `ghCommand` : le compte du profil, pas le
  compte `gh` actif. À tester sur un repo dont le profil a un compte.
- `gh pr list --json reviews` : vérifier au plan qu'une PR très commentée ne tronque pas ses reviews, et que l'ordre
  rendu permet de prendre le dernier avis par relecteur (`submittedAt`).
- `scroll_to_item` compte les enfants directs de la liste : avec des titres intercalés, l'indice de la ligne n'est
  plus son rang dans `items()`.
