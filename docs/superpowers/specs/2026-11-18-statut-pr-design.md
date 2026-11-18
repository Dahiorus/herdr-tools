# Statut des PR dans Start work

## 1. Demande initiale

> « j'ai besoin d'une 1re amélioration du mod start-work, il faudrait afficher les statuts des PR (draft, open) pour
> les PR sur lesquelles travailler »

Après la première implémentation (statut dans `meta`), en recette :

> « il faudrait mettre le statut en colonne à droite et avoir des tags colorés pour un visuel simple »

**But** : voir d'un coup d'œil quelles PR ouvertes sont encore en brouillon, pour choisir celle sur laquelle travailler.

## Langage

Termes du glossaire (`docs/domaine.md`, contexte Start work) :

- **PR ouverte** : ni fusionnée ni fermée. L'onglet PR ne liste que celles-ci (`gh pr list`, état `open` par défaut).
- **Statut de PR** : où en est une PR ouverte, **Brouillon** (`isDraft: true`, « Draft » sur GitHub) ou **Prête**
  pour la revue (`isDraft: false`).
- Le mot « open » de la demande ne désigne pas un statut : un brouillon est aussi une PR ouverte. Le « open » de la
  demande correspond à **Prête**.

## Approches

| Approche | Pour | Contre |
|---|---|---|
| **A. Statut dans la colonne meta** (`Brouillon · alice`), comme Jira (`statut · assigné`) | une ligne dans `gh(kind)` plus un module pur testé ; le filtre texte porte déjà sur `meta`, donc taper « brouillon » filtre | statut en texte gris, peu visible |
| B. Pastille colorée devant le titre | plus visible | nouvel élément d'interface, couleurs à choisir |
| **B'. Tag coloré dans une colonne à droite** (demandé en recette) | visible d'un coup d'œil, aligné d'une ligne à l'autre | une colonne de plus, couleurs à choisir |
| C. Pastille + tri des brouillons en bas | met en avant le travail prêt | change l'ordre que donne GitHub, hors demande |

Retenue d'abord : **A**, la plus petite. Remplacée en recette par **B'**, à la demande de l'utilisateur (statut en
texte gris peu visible).

## Comportement

Dans l'onglet PR, chaque ligne montre de gauche à droite : numéro, titre, auteur (`meta`, inchangé), puis le
**statut en tag coloré**, dans une colonne à droite de largeur fixe (les tags s'alignent d'une ligne à l'autre). Le
tag : libellé en 11 px, bordure de 1 px et texte de la couleur du statut, coins arrondis.

Couleurs (décidé en relecture) : **Prête en vert** (`ansi2` du thème), **Brouillon en gris** (`muted` du thème) ;
elles suivent le thème clair ou sombre.

Libellés (décidé en relecture) : **« Brouillon » / « Prête »**, les deux statuts, en français comme le reste du mod.

Exemples : `#12  Corriger le login  alice  [Brouillon]`, `#13  Ajouter l'export  bob  [Prête]`. Auteur absent :
colonne auteur vide, le tag reste.

Le filtre porte sur `id`, `title`, `meta` et le statut : taper « brouillon » garde les brouillons, comme avant.

L'onglet Issues n'a pas de statut : ni tag ni colonne vide.

Décision de revue et CI (`reviewDecision`, `statusCheckRollup`) : **non affichées** pour cette fois (décidé en
relecture) ; ce serait une 2e amélioration.

Hors périmètre : PR fermées ou fusionnées (toujours hors liste), tri ou filtre par statut, onglets Issues et Jira.

## 2. Portée

| Endroit | Ce qu'il devient |
|---|---|
| `mods/start-work/main.js`, `load()` → `gh(kind)` : `--json number,title,author,url` | ajoute `isDraft` pour l'onglet `pr` seulement : `gh issue list` ne connaît pas ce champ et échouerait |
| `main.js`, `gh(kind)` : `meta: i.author?.login ?? ""` | `meta` reste l'auteur seul, pour `pr` comme pour `issue` ; chaque PR reçoit en plus `tag` (« Brouillon » ou « Prête ») |
| `main.js`, `load()` | refacto (§7) : `gh` sort en `loadGh`, son `catch` en `ghError` (tous deux dans `main.js`), `ghCmd` en `ghCommand` (`run.js`) ; comportement inchangé |
| `main.js`, `items()` (filtre sur `id`, `title`, `meta`) | appelle `matches(item, filtre)` de `filter.js` (module pur, testé par `filter.test.js`), qui ajoute `tag` au texte filtré, pour que « brouillon » filtre toujours |
| `rows.js`, `listRow(i, tab, selected, t, onClick)` : ligne de liste (sortie de `render()`, §7) | colonne `meta` inchangée ; ajoute après elle `statusTag` (largeur fixe 76 px, tag coloré), sur les lignes qui ont un `tag` |
| `run.js` et `rows.js` (découpage, §7) | `run.js` reçoit `GH_AS`, `ghCommand`, `firstLine`, `sh`, `json` ; `rows.js` reçoit `listRow`, `statusTag`, `header`, `filterBox` ; code déplacé tel quel |
| `main.js`, `loadJira()` (`meta` des tickets) | inchangé, autre contexte |
| `README.md`, § Start work | une phrase : la ligne d'une PR affiche son statut en tag coloré à droite ; `node mods/start-work/github.test.js` ajouté à la phrase des tests |
| `docs/domaine.md` | glossaire du contexte Start work (créé par l'analyse) ; la ligne « Statut de PR » dit « affiché en tag coloré (`prStatus`, `github.js`) » au lieu de « dans `meta` (`prMeta`) » |
| `.gitignore` | `!/docs/` pour suivre spec, plan et glossaire |

Lecteurs et écrivains de `meta` : `gh(kind)` (écrit, PR et issues), `loadJira()` (écrit, Jira), `items()` (lit,
filtre, par `matches` de `filter.js`), `listRow` de `rows.js` (lit, affichage). Lecteurs et écrivains de `tag` (nouveau) : `loadGh` (écrit, PR seulement),
`items()` (lit, filtre, par `matches`), `listRow` et `statusTag` de `rows.js` (lit, tag) ; les tickets Jira n'en ont pas. Aucun autre fichier ne lit la sortie de `gh pr list`.

Le libellé dépend de `isDraft` : la règle va dans un module pur, testable par node (règle du README : `main.js` ne se
charge pas sous node) : `mods/start-work/github.js` avec `prStatus(pr)` (« Brouillon » ou « Prête ») et
`authorLogin(item)` (l'auteur ou `""`), testés par `github.test.js`. `prMeta` et `issueMeta` disparaissent : `meta`
est l'auteur pour les deux onglets. `main.js` choisit par une table par onglet plutôt que par un test sur le type de
liste (décidé en relecture du plan). Cette table, `GH_LISTS` (champs `--json`, `meta` et `tag` de chaque onglet), est
exportée par `github.js` et testée par `github.test.js` : `isDraft` demandé pour `pr` seulement, `tag` = `prStatus`
pour `pr`, pas de `tag` pour `issue` (décidé en review, M2, adapté en recette). Le nom de couleur du thème de chaque statut (`STATUS_COLORS`) est aussi dans `github.js`, testé pour que chaque
libellé de `prStatus` ait sa couleur ; `statusTag` (`rows.js`) le résout par `theme()` (décidé en review de PR).

## 3. Données existantes

Aucune donnée stockée : la liste est relue de GitHub à chaque ouverture. `.config.json` n'est pas touché.

## 4. Critères d'acceptation

**P1 — voir le statut de chaque PR ouverte** (story unique)

- Une PR brouillon de alice montre `alice` puis le tag `Brouillon`.
- Une PR prête de bob montre `bob` puis le tag `Prête`.
- Une PR prête sans auteur (compte supprimé, `author` null ou `login` vide) montre le tag `Prête`, colonne auteur vide.
- Une PR brouillon sans auteur montre le tag `Brouillon`.
- Les deux tags ont deux couleurs distinctes, et s'alignent dans une même colonne quel que soit l'auteur.
- Taper « brouillon » dans l'onglet PR garde les brouillons (et toute PR dont le titre ou l'auteur contient ce mot) ; taper « alice » garde toujours les PR de alice.
- L'onglet Issues affiche toujours l'auteur seul (`alice`), sans tag ni colonne vide ; l'onglet Jira est inchangé.
- Erreur `gh`, repo invisible, liste vide : messages inchangés.

## 5. Filet sur l'existant

`gh(kind)` n'a aucun test (code dans `main.js`, non chargeable sous node). Le libellé sorti dans `github.js` est
testé par `github.test.js`, comme la table `GH_LISTS` (champs demandés et libellé par onglet). Le reste (appel de `gh`, rendu de l'onglet Issues, erreurs, et la refacto de `load()` du §7) se vérifie par `herdr-app check` et dans
l'app, sur un repo qui a un brouillon et une PR prête, puis sur un repo que le compte ne voit pas (message d'erreur
inchangé).

## 6. Origine

Demande nouvelle de l'utilisateur, 1re amélioration après le commit `41f056b` (création du mod). Hors périmètre
noté : décision de revue et CI (décidé en relecture), tri par statut. Dette de `load()` : relevée par cette spec
(§7), corrigée ici.

## 7. Dette du code touché

`load()` (main.js:52-90) fait 39 lignes avec trois niveaux de fonctions imbriquées (`gh` défini dedans, `try/catch`,
`if`). La feature ne change qu'une ligne de `gh` et le `--json`.

Décision (relecture) : **corrigé dans cette PR**, en refacto sans changement de comportement, commitée avant la
feature :

- la fonction interne `gh(kind)` devient la méthode `loadGh(kind, account, on, cx)` ;
- son `catch` (trois cas : autre erreur, compte du profil, compte actif) devient la méthode
  `async ghError(message, account, on)`, qui rend le texte d'erreur ;
- `ghCmd` devient une fonction du module `ghCommand(account, args)`, à côté de `GH_AS` (dans `run.js` depuis le découpage).

`load()` garde la lecture du remote, le choix du compte et `Promise.all([this.loadGh("pr", …),
this.loadGh("issue", …), this.loadJira(cx)])`. Les messages d'erreur restent identiques, mot pour mot.

Décision (review Opus M1, à la demande de l'utilisateur au `/pr push`) : `main.js` passe de 219 lignes sur `main` à
234 avec cette feature, au-delà du seuil de 200 lignes de la grille. **Corrigé dans cette PR** : découpage sans
changement de comportement, pour ramener `main.js` sous 200 lignes ; tests du contexte et `herdr-app check` inchangés.
