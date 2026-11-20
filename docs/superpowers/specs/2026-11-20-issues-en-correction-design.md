# Issues en cours de correction dans Start work

## 1. Demande initiale

> « améliorer la vue des issues, elles sont listées, mais je ne sais pas lesquelles ont une pr de correction en cours,
> comment les différencier ? »

Précisé ensuite par l'utilisateur :

> « le but de la feature est de catégoriser les issues : celles qui sont à corriger et celles qui ont une pr en
> cours »

**But** : dans l'onglet Issues, séparer les issues à corriger de celles qu'une PR est déjà en train de corriger, pour
ne pas lancer `/bugfix` sur du travail déjà en cours.

## Langage

Termes du glossaire (`docs/domaine.md`, contexte Start work), ajoutés par l'analyse :

- **PR de correction** : PR ouverte (brouillon ou prête) qui fermera l'issue à sa fusion, parce que sa description le
  dit (« Fixes #n », « Closes #n »…) ou qu'on l'a liée à la main dans « Development » sur GitHub. Une simple mention
  « #n » n'en fait pas une. Une PR fusionnée ou fermée n'est jamais une PR de correction.
- **Issue en cours de correction** : issue qui a au moins une PR de correction.
- **Groupe d'issues** : « À corriger » (issues sans PR de correction), puis « En cours de correction » ; aucun groupe
  si la détection des PR de correction a échoué.

## Approches

GitHub donne le lien des deux côtés : `closedByPullRequestsReferences` sur l'issue, `closingIssuesReferences` sur la
PR. Côté issue, le champ rend aussi les PR **déjà fusionnées** (vérifié : issue #10 → PR #12, fusionnée), sans leur
état.

| Approche | Pour | Contre |
|---|---|---|
| **A. Une liste `gh pr list` de plus** (PR ouvertes du repo, `number,isDraft,closingIssuesReferences`), en parallèle de `gh issue list`, croisée par numéro d'issue | une commande `gh pr list` comme les listes existantes (`ghList` à ouvrir à d'autres champs et à une autre limite) ; seules les PR ouvertes viennent, l'état est garanti ; PR de forks comprises | ne voit pas une PR d'un autre repo qui corrige l'issue ; limite de 100 PR ouvertes |
| B. Une requête GraphQL sur les issues (`search … is:issue is:open`, `closedByPullRequestsReferences { number state isDraft }`) | voit aussi les PR d'autres repos | un texte GraphQL de plus ; dépend de l'index de recherche |
| C. Ajouter `closedByPullRequestsReferences` à `gh issue list` seul | aucun appel de plus | marquerait une issue dont la PR est déjà fusionnée |

Retenue : **A**. Commande lancée sur ce repo : `gh pr list --json number,closingIssuesReferences` rend, pour chaque
PR, les issues qu'elle ferme avec leur `number`, leur `url` et leur `repository` (`owner.login`, `name`).

## Comportement

### Ligne d'une issue

Une issue en cours de correction porte un tag dans la colonne de droite, celle du statut des PR (même forme : cadre
arrondi, texte 11 px) :

Le tag dit « PR #12 » (le numéro de la PR de correction), en vert (`ansi2`) si la PR est prête, en gris (`muted`) si
elle est en brouillon : les couleurs du statut des PR (décidé en relecture).

Une issue sans PR de correction n'a pas de tag, mais sa colonne reste réservée (vide) : les colonnes s'alignent
d'un groupe à l'autre (décidé en relecture). Si la détection échoue, les issues n'ont pas de groupe ni de colonne.

Une issue qui a plusieurs PR de correction montre la première (ordre de la liste des PR ouvertes), suivie du nombre
des autres : « PR #12 +1 » ; la couleur est celle de cette première PR (décidé en relecture).

Le filtre cherche déjà dans le tag (`matches`, sous-chaîne) : taper « #12 » garde aussi les issues dont le tag cite
#12 (et, comme aujourd'hui, #120 ou un titre qui contient « #12 »).

### Groupes d'issues

Le but de la feature est de **ranger les issues en groupes d'issues** (décidé par l'utilisateur) : l'onglet Issues range ses lignes
en deux groupes titrés, comme l'onglet PR, dans cet ordre :

1. **À corriger** : issues sans PR de correction ;
2. **En cours de correction** : issues qui ont au moins une PR de correction.

Même présentation que les groupes de PR : titre en capitales suivi du nombre de lignes après filtre
(`À CORRIGER 3`), groupe vide sans titre, ordre de GitHub (plus récentes d'abord) dans un groupe, ↑/↓ d'un groupe à
l'autre, titres compris. Le compteur de l'onglet (`Issues 5`) compte les deux groupes. Une issue est dans un seul
groupe.

Si la liste des PR échoue, les issues ne peuvent pas être classées : elles s'affichent sans groupe ni tag, dans
l'ordre de GitHub, comme aujourd'hui (voir « Chargement et erreurs »).

### Lancer le travail sur une issue en cours de correction

L'issue d'**En cours de correction** n'a pas de bouton « Lancer » : Ctrl+Entrée (Cmd+Entrée sur macOS) ne lance
rien, le pied de page dit `Entrée ouvrir` (décidé en relecture, comme le groupe Mes PR de l'onglet PR). Une issue
d'**À corriger** garde « Lancer » (`/bugfix <url>`) et le pied de page `Entrée ouvrir · Ctrl+Entrée lancer le travail`.
Si la détection a échoué (issues sans groupe), toutes les issues gardent « Lancer », comme aujourd'hui.

### Chargement et erreurs

Les deux appels (`gh issue list` et la liste des PR ouvertes) partent ensemble, sous le compte du profil
(`ghCommand`). Une erreur de `gh issue list` s'affiche à la place de la liste, messages inchangés, sans autre toast.
Si seule la liste des PR échoue, les issues s'affichent sans tag et un toast d'avertissement « PR de correction non
détectées » cite l'erreur (comme « Retours non détectés » dans l'onglet PR).

Une PR qui ferme une issue d'un autre repo (même numéro) ne compte pas : seul le lien vers une issue de ce repo
compte : l'`url` de la référence est comparée à celle de l'issue, canonique des deux côtés, même si le repo a été
renommé et que le remote garde l'ancien nom.

Limites (notées `shortcut:` dans le code) : 100 PR ouvertes ; une PR d'un autre repo qui corrige l'issue n'est pas vue.

Une PR qui vise une autre branche que celle par défaut (`develop`, branche de release) n'est pas vue : GitHub ne crée
le lien « Fixes #n » que pour la branche par défaut, seul le lien fait à la main dans « Development » compte alors.
Accepté (décidé en relecture) : écrit dans le `shortcut:` du code et dans le README.

Hors périmètre : confirmation avant de lancer, issue attribuée à quelqu'un sans PR (un autre signal), branche liée sans PR, auteur de la PR.

## 2. Portée

| Endroit | Ce qu'il devient |
|---|---|
| `mods/start-work/github.js`, `GH_LISTS.issue` (`fields`, `meta`, pas de `tag`) | inchangé : la liste des issues ne change pas de champs |
| `github.js` (nouveau) | les arguments de la liste des PR ouvertes (`--json number,isDraft,closingIssuesReferences --limit 100`) et la règle pure : PR ouvertes + repo → pour chaque numéro d'issue, ses PR de correction ; le tag d'une issue tiré de ses PR de correction ; testés par `github.test.js` |
| `github.js`, `ghRow(kind, raw)` | inchangé ; le tag est posé sur la ligne d'issue après coup, comme `prRows` pose `meta` et `group` |
| `github.js`, `STATUS_COLORS` (clé : libellé du tag) | le tag d'issue est variable (« PR #12 ») : sa couleur ne peut plus venir du libellé seul ; la ligne porte sa couleur de tag (ou une règle équivalente laissée au plan) |
| `github.js`, `PR_GROUPS`, `groupLayout` / `titleBefore` (titre cherché dans `PR_GROUPS`), `listIndex` | les deux groupes d'issues (`toFix` « À corriger », `fixing` « En cours de correction ») rejoignent la liste des groupes lue par `titleBefore` ; `toFix` porte l'action d'aujourd'hui (kind `issue`, bouton « Lancer », hint « lancer le travail »), `fixing` n'en a pas ; `launchKind`, `startLabel`, `footerText` les lisent (voir `start.js` ci-dessous). Forme exacte (liste commune ou liste par onglet) laissée au plan |
| `rows.js`, `groupedRows`, `groupTitle` | inchangés : déjà appelés pour tous les onglets |
| `rows.js`, `statusTag`, `listRow` (`i.tag`) | lit la couleur du tag de la ligne ; affiche le tag d'une issue comme celui d'une PR ; onglet PR inchangé |
| `launch.js`, `ghList(kind, repo, account, extra, on)` (`--json GH_LISTS[kind].fields --limit 50` imposés) | la liste des PR ouvertes a ses propres champs et sa limite : `ghList` les reçoit, ou cette liste passe par `json(...ghCommand(...))` comme `fetchFeedback` (choix laissé au plan) ; les trois appels existants inchangés |
| `launch.js`, `fetchGh(kind…)` (`kind !== "pr"` → une liste) | les issues ont deux appels en parallèle, comme `fetchPrs` : `fetchIssues` ; échec de la liste des PR → issues sans tag et toast ; échec de `gh issue list` → `ghError`, sans toast |
| `filter.js`, `matches` | inchangé (cherche déjà dans `tag`) |
| `start.js`, `launchKind`, `startLabel`, `footerText` (`tab === "pr"` → groupe, sinon le tab) | sur l'onglet Issues, lisent aussi le groupe : `fixing` sans kind, sans libellé, pied de page `Entrée ouvrir` ; `toFix` et issue sans groupe : comme aujourd'hui (`issue`, « Lancer », `lancer le travail`) |
| `start.js`, `agentTask` | inchangé |
| `main.js`, `start(item, cx)` (`!launchKind(...)` → rien), `row` (bouton masqué sans libellé), `render` (`footerText(…, items[this.at]?.group)`) | inchangé : ces gardes servent déjà le groupe Mes PR ; vérifié par un test `main.test.js` (Ctrl+Entrée sur une issue `fixing` ne lance rien) |
| `launch.test.js` (`fetchGh("issue"…)`, appels attendus : un seul `gh issue list`) | rendu faux : deux appels ; cas ajoutés (tag posé, PR en échec, les deux en échec) |
| `github.test.js` (`GH_LISTS.issue.tag` undefined) | reste vrai |
| `main.test.js` (ligne d'issue, réponses `[]`) | inchangé : une liste de PR vide ne pose aucun tag |
| `README.md`, § Start work | les deux groupes d'issues, le tag « PR #n », pas de « Lancer » en cours de correction, la limite des PR hors branche par défaut |
| `docs/domaine.md` | termes ajoutés par l'analyse (déjà écrits) |

Lecteurs du tag d'une ligne : `listRow` (`rows.js`, colonne de droite), `matches` (`filter.js`). Écrivains : `ghRow`
(PR), la nouvelle règle (issues). Aucun autre fichier ne lit la sortie des listes `gh`.

## 3. Données existantes

Aucune donnée stockée : tout est relu de GitHub à chaque ouverture.

## 4. Critères d'acceptation

**P1 — issues rangées en À corriger et En cours de correction** (story unique)

Repo `o/r`. Les libellés et couleurs du tag suivent les réponses aux questions ; exemples écrits avec la
recommandation.

- Issue #34 que la PR ouverte #12 (prête) ferme : dans `EN COURS DE CORRECTION`, tag « PR #12 », vert. Issue #35 sans
  PR : dans `À CORRIGER`, pas de tag.
- Ordre : `À CORRIGER` puis `EN COURS DE CORRECTION` ; dans chaque groupe, l'ordre de GitHub. Aucune issue en cours de
  correction : seul le titre `À CORRIGER` s'affiche. Toutes en cours : seul `EN COURS DE CORRECTION`.
- Filtre : les compteurs des titres comptent les lignes restantes ; un groupe vidé par le filtre perd son titre.
- ↑ depuis la première issue de `EN COURS DE CORRECTION` remonte sur la dernière de `À CORRIGER`, en montrant le titre.
- PR #13 en brouillon qui ferme #36 : tag « PR #13 », gris.
- Cas combiné : #37 fermée par #12 (prête) et #14 (brouillon) : « PR #12 +1 ».
- Cas combiné : une même PR (#12) ferme #34 et #38 : les deux issues portent « PR #12 ».
- Une PR qui ferme l'issue #34 d'un **autre** repo (`x/y`) : #34 de `o/r` n'a pas de tag.
- PR fusionnée qui ferme une issue restée ouverte : pas de tag (elle n'est pas dans la liste des PR ouvertes).
- Filtre « #12 » : une issue dont le tag est « PR #12 » reste, même si son titre ne cite pas #12.
- La liste des PR échoue (« HTTP 502 ») : issues sans groupe ni tag, dans l'ordre de GitHub, toast d'avertissement « PR de correction non détectées »
  qui cite l'erreur. `gh issue list` échoue : erreur à la place de la liste, messages inchangés. Cas combiné : les
  deux échouent → l'erreur de la liste seule, sans toast.
- Ctrl+Entrée sur #35 (À corriger) : onglet `#35` avec `/bugfix <url>` ; bouton « Lancer » ; pied de page
  `Entrée ouvrir · Ctrl+Entrée lancer le travail`.
- #34 (En cours de correction) : pas de bouton, Ctrl+Entrée ne lance rien, pied de page `Entrée ouvrir` ; Entrée
  ouvre l'issue.
- Cas combiné : détection en échec → aucune issue n'a de groupe, toutes gardent « Lancer » et `/bugfix`.
- Onglets PR, Jira et Tâches : inchangés (le tag des PR garde « Brouillon » / « Prête » et leurs couleurs).

## 5. Filet sur l'existant

Déjà couverts : `launch.test.js` (`fetchGh("issue")` : liste et trois messages d'erreur), `github.test.js`
(`GH_LISTS`, `ghRow`, `prRows`), `filter.test.js` (`matches` sur le tag), `main.test.js` (ligne d'issue, Lancer,
Ouvrir). `rows.js` (`statusTag`) n'a pas de test de rendu : le fake ne garde pas les couleurs ; la couleur se vérifie
par la règle pure qui la choisit. Rien à caractériser en plus.

## 6. Origine

Demande directe de l'utilisateur (*défaut ancien* : l'onglet Issues n'a jamais montré les PR de correction).

## 7. Dette du code touché

- `fetchGh` (`launch.js`) : la branche `kind !== "pr"` s'allonge d'un second appel. Proposé : **corrigé dans cette PR**
  en sortant `fetchIssues` en fonction nommée, comme `fetchPrs`.
- `statusTag` (`rows.js`) lit sa couleur par libellé. Proposé : **corrigé dans cette PR** (la couleur vient de la
  ligne), sans changer l'onglet PR.
- `main.js` fait 200 lignes, au seuil : la feature n'y touche pas (la règle du bouton vit dans `start.js`).
