# Issues en cours de correction dans Start work — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** l'onglet Issues de Start work range ses issues en deux groupes, « À corriger » puis « En cours de
correction » (au moins une PR de correction ouverte), avec un tag « PR #n » coloré selon le statut de la PR ; pas de
« Lancer » sur une issue en cours de correction.

**Architecture:** les règles pures vont dans `github.js` (liste commune des groupes `GROUPS`, PR de correction par
issue, tag, lignes d'issues) et `start.js` (action selon le groupe, quel que soit l'onglet). `launch.js` ajoute un
`gh pr list` des PR ouvertes en parallèle de `gh issue list` (`fetchIssues`), avec repli sans groupe si elle seule
échoue. `rows.js` lit la couleur du tag par une règle de `github.js`. `main.js` ne change pas.

**Tech Stack:** JavaScript gpui-kit (mod Herdr), `gh` (`issue list`, `pr list`), node pour les tests
(`node:assert/strict`, `fake.js`).

**Spec:** `docs/superpowers/specs/2026-11-20-issues-en-correction-design.md`

## Global Constraints

- Libellés exacts : groupes « À corriger » et « En cours de correction » (titres affichés en capitales par
  `groupTitle`), tag `PR #<n>` ou `PR #<n> +<autres>`, toast « PR de correction non détectées » (niveau `warning`,
  corps : le message d'erreur), bouton « Lancer », hint « lancer le travail ».
- Ordre des groupes d'issues : À corriger, En cours de correction ; ordre de GitHub dans un groupe.
- Couleur du tag : `ansi2` si la première PR de correction est prête, `muted` si brouillon (couleurs de
  `STATUS_COLORS`).
- PR de correction : PR ouverte du repo dont `closingIssuesReferences` cite une issue de ce repo
  (son `url` égale à celle de l'issue ; amendé à la review, d'abord `repository` comparé au repo sans la casse).
- Commande : `gh pr list --repo <o/r> --json number,isDraft,closingIssuesReferences --limit 100`, sous
  `ghCommand(account, …)` comme les autres listes.
- `shortcut:` dans le code : 100 PR ouvertes ; PR d'un autre repo non vue ; PR qui vise une autre branche que celle
  par défaut non liée par GitHub (sauf lien « Development »).
- `main.js` ne change pas (200 lignes, §7).
- Commits : gitmoji comme l'historique (`✨ Start work : …`), terminés par
  `Co-Authored-By: <modèle de l'implémenteur>`.
- Tests : depuis la racine `~/.config/herdr-app`,
  `for f in mods/start-work/*.test.js; do node "$f" || exit 1; done` (contexte entier), puis
  `herdr-app check mods/start-work`.

## Review Focus

1. Référence sans `repository` (champ absent, schéma inattendu) → ne compte pas, pas d'exception. Test : tâche 2.
2. PR sans `closingIssuesReferences` (champ `null` ou absent) → aucune issue en cours de correction. Test : tâche 2.
3. Casse du repo (`O/R` dans le remote, `o`/`r` chez GitHub) → la PR compte. Test : tâche 2.
4. `gh issue list` et la liste des PR échouent ensemble → erreur de la liste seule, aucun toast. Test : tâche 3.
5. Filtre qui vide un groupe → son titre disparaît, l'autre garde son compteur. Test : tâche 2 (`groupLayout`).

## Découpage en PR

Fichiers touchés hors tests, spec et plan : `github.js`, `launch.js`, `start.js`, `rows.js`, `README.md`,
`docs/domaine.md` (6). **Une seule PR**, story unique P1.

## Traçabilité

| Exigence (§ spec) | Tâche | Test qui la prouve |
|---|---|---|
| Groupes : À corriger puis En cours de correction, ordre GitHub dans un groupe, une issue dans un seul groupe | 2 | `github.test.js` `issueRows` (jeu dans le désordre) |
| Groupes : titres, compteur après filtre, groupe vide sans titre | 2 | `github.test.js` `groupLayout` issues (deux groupes, puis un seul) |
| ↑ depuis la première issue en cours de correction remonte en montrant le titre | 2 | `github.test.js` `listIndex(…, true)` issues |
| Tag `PR #12`, vert si prête, gris si brouillon | 2 | `github.test.js` `fixTag`, `tagColor` |
| Plusieurs PR : `PR #12 +1`, couleur de la première | 2 | `github.test.js` `fixTag` deux PR (prête puis brouillon) |
| Une même PR ferme deux issues : les deux taguées | 2 | `github.test.js` `fixingPrs` |
| PR qui ferme l'issue d'un autre repo : ne compte pas ; casse ignorée | 2 | `github.test.js` `fixingPrs` `x/y`, `O/R` |
| PR fusionnée : pas de tag | 3 | `launch.test.js` : la commande ne demande que les PR ouvertes (appel exact, sans `--state`) |
| Filtre « #12 » garde l'issue taguée `PR #12` | 2 | `filter.test.js` |
| Liste des PR en échec : sans groupe ni tag, toast | 3 | `launch.test.js` cas `HTTP 502` |
| `gh issue list` en échec : erreur, messages inchangés ; les deux en échec : sans toast | 3 | `launch.test.js` (trois cas existants, adaptés) + cas combiné |
| Appels sous le compte du profil | 3 | `launch.test.js` cas `account: "me"` |
| À corriger : « Lancer », `/bugfix`, pied de page `lancer le travail` | 4 | `start.test.js` (`toFix`), `main.test.js` |
| En cours de correction : pas de bouton, Ctrl+Entrée ne lance rien, `Entrée ouvrir`, Entrée ouvre | 4 | `start.test.js` (`fixing`), `main.test.js` |
| Détection en échec : toutes gardent « Lancer » | 4 | `start.test.js` issue sans groupe (existant) |
| Onglet PR inchangé (groupes, boutons, tags, couleurs) | 1, 2 | tests existants de `github.test.js`, `start.test.js`, `main.test.js` ; `tagColor` d'un tag Prête/Brouillon |
| §7 `statusTag` : couleur venue de la ligne | 2 | `github.test.js` `tagColor` |
| §7 `fetchIssues` extraite | 3 | `launch.test.js` |
| Doc : README, glossaire | 5 | `git grep` des termes retirés |

Usages vérifiés (étape 1b) : `PR_GROUPS` lu par `rank`, `titleBefore` (`github.js`), `prGroup` (`start.js`) et cité
par `docs/domaine.md` (lignes Groupe de PR, Retours sur mes PR, Traiter les retours) → renommé `GROUPS` partout
(tâches 1 et 5). `STATUS_COLORS` lu par `statusTag` (`rows.js`) et `github.test.js` → `rows.js` passe par
`tagColor` (tâche 2), le test existant reste vrai. `ghList` appelé par `fetchGh` et `fetchPrs` → inchangé, la liste
des PR ouvertes passe par `json(...ghCommand(...))` comme `fetchFeedback`. `launchKind`, `startLabel`, `footerText`
lus par `main.js` (`start`, `row`, `render`) → signatures inchangées. `main.test.js` (chargement, réponses `ok("[]")`)
reste vrai : liste des PR vide → issues toutes dans À corriger.

---

### Task 1 : renommer `PR_GROUPS` en `GROUPS` (refacto, sans changement de comportement)

**§ spec :** §2 (forme laissée au plan), §7.

**Files:**
- Modify: `mods/start-work/github.js` (`PR_GROUPS`, `rank`, `titleBefore`)
- Modify: `mods/start-work/start.js` (`prGroup` → `groupOf`, `prFooter` → `groupFooter`)

**Interfaces:**
- Produces: `export const GROUPS` (`github.js`), même contenu que `PR_GROUPS`.

- [ ] **Step 1 :** renommer `PR_GROUPS` en `GROUPS` dans `github.js` et `start.js`, `prGroup` en `groupOf`,
  `prFooter` en `groupFooter` dans `start.js`. Pas de test nouveau : c'est un renommage, les tests existants le
  couvrent.
- [ ] **Step 2 :** `git grep -nw "PR_GROUPS\|prGroup\|prFooter" -- mods` → vide.
- [ ] **Step 3 :** lancer les tests du contexte entier → tous `ok`.
- [ ] **Step 4 :** commit.

```bash
git add mods/start-work/github.js mods/start-work/start.js
git commit -m "♻️ Start work : PR_GROUPS devient GROUPS

Co-Authored-By: <modèle de l'implémenteur>"
```

### Task 2 : règles des PR de correction et des groupes d'issues (`github.js`), couleur du tag (`rows.js`)

**§ spec :** Comportement (Ligne d'une issue, Groupes d'issues, Chargement et erreurs : autre repo, casse), §2, §4,
§7 (`statusTag`).

**Files:**
- Modify: `mods/start-work/github.js`
- Modify: `mods/start-work/rows.js` (`statusTag`, import)
- Test: `mods/start-work/github.test.js`, `mods/start-work/filter.test.js`

**Interfaces:**
- Consumes: `GROUPS` (tâche 1), `ghRow`, `rank`, `STATUS_COLORS`.
- Produces (tous exportés de `github.js`) :
  - `GROUPS` gagne, après les groupes de PR : `{ id: "toFix", label: "À corriger", kind: "issue", button: "Lancer", hint: "lancer le travail" }`
    et `{ id: "fixing", label: "En cours de correction" }`.
  - `fixingArgs(repo: string): string[]` → `["pr", "list", "--repo", repo, "--json", "number,isDraft,closingIssuesReferences", "--limit", "100"]`.
  - `fixingPrs(prs: object[], repo: string): Map<number, {number, isDraft}[]>` : numéro d'issue → ses PR de
    correction, dans l'ordre de `prs`.
  - `fixTag(prs: {number, isDraft}[]): { tag: string, tagColor: string }`.
  - `issueRows(raws: object[], fixing: Map | null): row[]` : `null` → `raws.map((r) => ghRow("issue", r))` tel
    quel (sans groupe) ; sinon chaque ligne prend `group` (`toFix` / `fixing`) et, pour `fixing`, `tag` et
    `tagColor` ; triées par `rank` (tri stable : ordre GitHub dans un groupe).
  - `tagColor(row): string | undefined` → `row.tagColor ?? STATUS_COLORS[row.tag]` (nom de couleur du thème).

- [ ] **Step 1 : tests (rouge attendu : échec à l'import, symboles absents)**

`mods/start-work/github.test.js` (ajouter `fixingArgs, fixingPrs, fixTag, issueRows, tagColor` à l'import) :

```javascript
// Issues being fixed: open PRs → fixing PRs per issue of this repo.
const ref = (number, owner = "o", name = "r") => ({ number, repository: { owner: { login: owner }, name } });
const pr = (number, isDraft, refs) => ({ number, isDraft, closingIssuesReferences: refs });
assert.deepEqual(fixingArgs("o/r"), ["pr", "list", "--repo", "o/r", "--json", "number,isDraft,closingIssuesReferences", "--limit", "100"]);
const fixing = fixingPrs([pr(12, false, [ref(34), ref(38)]), pr(14, true, [ref(34)]), pr(15, false, [ref(36, "x", "y")])], "o/r");
assert.deepEqual(fixing.get(34), [{ number: 12, isDraft: false }, { number: 14, isDraft: true }]);
assert.deepEqual(fixing.get(38), [{ number: 12, isDraft: false }]); // one PR, two issues
assert.equal(fixing.has(36), false); // other repo
assert.deepEqual(fixingPrs([pr(12, false, [ref(34, "O", "R")])], "o/r").get(34), [{ number: 12, isDraft: false }]); // case
assert.equal(fixingPrs([pr(12, false, null), { number: 13 }, pr(16, false, [{ number: 34 }])], "o/r").size, 0); // no refs, no repository
// Tag: first PR, its status color, +others
assert.deepEqual(fixTag([{ number: 12, isDraft: false }]), { tag: "PR #12", tagColor: "ansi2" });
assert.deepEqual(fixTag([{ number: 13, isDraft: true }]), { tag: "PR #13", tagColor: "muted" });
assert.deepEqual(fixTag([{ number: 12, isDraft: false }, { number: 14, isDraft: true }]), { tag: "PR #12 +1", tagColor: "ansi2" });
assert.equal(tagColor({ tag: "PR #13", tagColor: "muted" }), "muted");
assert.equal(tagColor({ tag: "Prête" }), "ansi2"); // PR tab unchanged
assert.equal(tagColor({ tag: "Brouillon" }), "muted");
// Rows: À corriger first, GitHub order inside a group
const issue = (number) => ({ number, title: `I${number}`, author: { login: "alice" }, url: `u${number}` });
const rows = issueRows([issue(37), issue(35), issue(34), issue(33)], new Map([[37, [{ number: 12, isDraft: false }]], [34, [{ number: 13, isDraft: true }]]]));
assert.deepEqual(rows.map((r) => [r.id, r.group, r.tag]), [["#35", "toFix", undefined], ["#33", "toFix", undefined], ["#37", "fixing", "PR #12"], ["#34", "fixing", "PR #13"]]);
assert.equal(rows[3].tagColor, "muted");
assert.deepEqual(issueRows([issue(35)], null), [{ id: "#35", title: "I35", meta: "alice", tag: undefined, url: "u35" }]); // detection failed: as today
assert.deepEqual(issueRows([issue(35)], new Map()).map((r) => r.group), ["toFix"]);
// Group titles, counts after filter, empty group without title, up onto a group's first row shows its title
assert.deepEqual(groupLayout(rows).filter((c) => c.title), [{ title: "À corriger", count: 2 }, { title: "En cours de correction", count: 2 }]);
assert.deepEqual(groupLayout(rows.slice(2)).filter((c) => c.title), [{ title: "En cours de correction", count: 2 }]);
assert.equal(listIndex(rows, 2, true), 3); // title of En cours de correction
```

`mods/start-work/filter.test.js` :

```javascript
assert.ok(matches({ id: "#34", title: "Login", meta: "alice", tag: "PR #12" }, "#12")); // fixing PR in the tag
```

- [ ] **Step 2 :** `node mods/start-work/github.test.js` → échec (`does not provide an export named 'fixingArgs'`).
  `filter.test.js` passe déjà (`matches` lit le tag) : test de non-régression, noté comme tel.
- [ ] **Step 3 :** implémenter les cinq fonctions et les deux groupes dans `github.js`, avec le `shortcut:` des
  limites (Global Constraints) au-dessus de `fixingArgs`. Un seul niveau de contrôle par fonction : la correspondance
  d'une référence au repo dans une fonction nommée (`inRepo(ref, repo)`), l'ajout d'une PR à la `Map` dans une autre.
  Dans `rows.js`, `statusTag(label, t)` devient `statusTag(i, t)` avec `t[tagColor(i)]`, `listRow` lui passe `i` ;
  importer `tagColor` à la place de `STATUS_COLORS`.
- [ ] **Step 4 :** tests du contexte entier → tous `ok` ; `herdr-app check mods/start-work` → passe.
- [ ] **Step 5 :** commit.

```bash
git add mods/start-work/github.js mods/start-work/rows.js mods/start-work/github.test.js mods/start-work/filter.test.js
git commit -m "✨ Start work : groupes d'issues et tag des PR de correction

Co-Authored-By: <modèle de l'implémenteur>"
```

### Task 3 : charger les PR de correction avec les issues (`launch.js`)

**§ spec :** Chargement et erreurs, §2 (`fetchGh`, `ghList`), §4 (erreurs), §7 (`fetchIssues`).

**Files:**
- Modify: `mods/start-work/launch.js` (`fetchGh`, nouvelles `fetchIssues`, `fetchFixing`)
- Test: `mods/start-work/launch.test.js`

**Interfaces:**
- Consumes: `fixingArgs`, `fixingPrs`, `issueRows` (tâche 2), `ghList`, `ghCommand`, `json`, `notify`.
- Produces: `fetchGh("issue", …)` rend les lignes de `issueRows`, ou `{error}` (inchangé).

- [ ] **Step 1 : tests (rouge attendu : appels et groupes absents)**

Test existant rendu faux, à remplacer : `launch.test.js`, bloc « fetchGh (caractérisation) » sur l'issue #12
(un seul appel attendu, ligne sans groupe). Il devient :

```javascript
const ISSUES = ["gh", "issue", "list", "--repo", "o/r", "--json", "number,title,author,url", "--limit", "50"];
const FIXING = ["gh", "pr", "list", "--repo", "o/r", "--json", "number,isDraft,closingIssuesReferences", "--limit", "100"];
const isFixing = (a) => a[0] === "pr";
const issue12 = { number: 12, title: "Bug", author: { login: "alice" }, url: "u12" };
const fixes12 = [{ number: 40, isDraft: false, closingIssuesReferences: [{ number: 12, repository: { owner: { login: "o" }, name: "r" } }] }];
reset((_c, a) => ok(JSON.stringify(isFixing(a) ? fixes12 : [issue12, { ...issue12, number: 13, url: "u13" }])));
const issueRowsOut = await fetchGh("issue", "o/r", undefined, {}, "/p.json");
assert.deepEqual(issueRowsOut.map((r) => [r.id, r.group, r.tag]), [["#13", "toFix", undefined], ["#12", "fixing", "PR #40"]]);
assert.deepEqual(fake.calls.sort(), [FIXING, ISSUES].sort()); // open PRs only: no --state
assert.deepEqual(fake.toasts, []);
// fixing PRs failed: issues as today, a warning toast
reset((_c, a) => (isFixing(a) ? { code: 1, stdout: "", stderr: "HTTP 502" } : ok(JSON.stringify([issue12]))));
assert.deepEqual(await fetchGh("issue", "o/r", undefined, {}, "/p.json"), [{ id: "#12", title: "Bug", meta: "alice", tag: undefined, url: "u12" }]);
assert.deepEqual(fake.toasts, [{ title: "PR de correction non détectées", body: "HTTP 502", level: "warning" }]);
// both failed: the issue list's error alone, no toast
reset(() => ({ code: 1, stdout: "", stderr: "HTTP 502" }));
assert.deepEqual(await fetchGh("issue", "o/r", "me", {}, "/p.json"), { error: "HTTP 502" });
assert.deepEqual(fake.toasts, []);
// profile account: the PR list goes through the same sh -c wrapper
reset((_c, a) => ok("[]"));
await fetchGh("issue", "o/r", "me", {}, "/p.json");
assert.ok(fake.calls.some((c) => c[0] === "sh" && c[4] === "me" && c.slice(5).join() === FIXING.slice(1).join()));
```

Les trois cas d'erreur existants de `fetchGh("issue")` (fin du fichier) restent tels quels : ils doivent passer sans
modification (une réponse en échec pour tous les appels donne l'erreur de la liste).

- [ ] **Step 2 :** `node mods/start-work/launch.test.js` → échec sur `issueRowsOut` (groupes absents).
- [ ] **Step 3 :** dans `launch.js`, `fetchGh` appelle `fetchIssues(repo, account, on)` pour `kind !== "pr"`.
  `fetchIssues` lance ensemble `ghList("issue", …)` et `fetchFixing(repo, account, on)`, toaste
  « PR de correction non détectées » si `fetchFixing` a échoué (seulement si la liste est venue, comme `fetchPrs`),
  puis rend `issueRows(issues, fixing.error ? null : fixing.prs)`. `fetchFixing` ne rejette jamais :
  `{ prs: fixingPrs(await json(...ghCommand(account, fixingArgs(repo)), on), repo) }` ou `{ error: e.message }`.
- [ ] **Step 4 :** tests du contexte entier → tous `ok` ; `herdr-app check mods/start-work` → passe.
- [ ] **Step 5 :** commit.

```bash
git add mods/start-work/launch.js mods/start-work/launch.test.js
git commit -m "✨ Start work : charger les PR de correction avec les issues

Co-Authored-By: <modèle de l'implémenteur>"
```

### Task 4 : action selon le groupe sur l'onglet Issues (`start.js`)

**§ spec :** Lancer le travail sur une issue en cours de correction, §2 (`start.js`, `main.js`), §4.

**Files:**
- Modify: `mods/start-work/start.js` (`launchKind`, `startLabel`, `footerText`)
- Test: `mods/start-work/start.test.js`, `mods/start-work/main.test.js`

**Interfaces:**
- Consumes: `GROUPS` avec `toFix`, `fixing` (tâche 2), `groupOf`, `groupFooter` (tâche 1).
- Produces: signatures inchangées ; une ligne avec `group` lit son groupe quel que soit l'onglet, une ligne sans
  `group` garde le comportement de son onglet.

- [ ] **Step 1 : tests (rouge attendu : `launchKind("issue", fixing)` vaut `"issue"`)**

`mods/start-work/start.test.js` :

```javascript
const toFix = { ...issue, group: "toFix" };
const fixingIssue = { ...issue, group: "fixing" };
assert.equal(launchKind("issue", toFix), "issue");
assert.equal(launchKind("issue", fixingIssue), undefined);
assert.equal(startLabel("issue", toFix), "Lancer");
assert.equal(startLabel("issue", fixingIssue), undefined);
assert.equal(footerText("issue", "linux", null, false, "toFix"), "Entrée ouvrir · Ctrl+Entrée lancer le travail");
assert.equal(footerText("issue", "macos", null, false, "fixing"), "Entrée ouvrir");
assert.equal(agentTask(launchKind("issue", toFix), toFix), "/bugfix https://github.com/owner/repo/issues/12");
```

Les cas existants sans groupe (`launchKind("issue", issue)`, `startLabel("issue", issue)`,
`footerText("issue", "linux")`) restent : ils prouvent le repli quand la détection a échoué.

`mods/start-work/main.test.js`, après les deux blocs « Issue » :

```javascript
// Issue to fix: Ctrl+Enter starts /bugfix as before.
{
  const { cx, enter } = dialog("issue", { ...issue, group: "toFix" });
  enter(true);
  await cx.settle();
  assert.deepEqual(fake.calls, [TAB_NEW("#12", "/bugfix https://github.com/o/r/issues/12")]);
}
// Issue being fixed: Ctrl+Enter starts nothing, Enter still opens it.
{
  const { cx, enter } = dialog("issue", { ...issue, group: "fixing", tag: "PR #40" });
  enter(true);
  await cx.settle();
  assert.deepEqual(fake.calls, []);
  enter();
  await cx.settle();
  assert.deepEqual(fake.calls, [["xdg-open", "https://github.com/o/r/issues/12"]]);
}
```

- [ ] **Step 2 :** `node mods/start-work/start.test.js` → échec (`'issue' !== undefined`).
- [ ] **Step 3 :** dans `start.js`, `launchKind` et `startLabel` lisent `groupOf(item)` dès que `item.group` existe
  (sinon : le tab, « Lancer ») ; `footerText` prend `groupFooter(key, group)` dès que `group` existe, le reste
  inchangé (`tab === "pr" && !group` → `null`).
- [ ] **Step 4 :** tests du contexte entier → tous `ok` ; `herdr-app check mods/start-work` → passe ;
  `wc -l mods/start-work/main.js` → 200 au plus.
- [ ] **Step 5 :** commit.

```bash
git add mods/start-work/start.js mods/start-work/start.test.js mods/start-work/main.test.js
git commit -m "✨ Start work : pas de Lancer sur une issue en cours de correction

Co-Authored-By: <modèle de l'implémenteur>"
```

### Task 5 : documentation (README, glossaire)

**§ spec :** — (mise à jour de la doc).

**Files:**
- Modify: `README.md` (§ Start work)
- Modify: `docs/domaine.md`

- [ ] **Step 1 :** `README.md`, § Start work : l'onglet Issues range ses issues en « À corriger » et « En cours de
  correction » (une PR ouverte la ferme : « Fixes #n » ou lien « Development ») ; le tag `PR #n` (vert prête, gris
  brouillon, `+n` s'il y en a plusieurs) ; pas de « Lancer » en cours de correction ; si la détection échoue, issues
  sans groupe et toast ; limites : 100 PR ouvertes, PR d'un autre repo, PR qui vise une autre branche que celle par
  défaut sans lien « Development ».
- [ ] **Step 2 :** `docs/domaine.md` : `PR_GROUPS` → `GROUPS` (lignes Groupe de PR, Retours sur mes PR, Traiter les
  retours) ; « Lancer le travail » : « depuis une issue à corriger (toutes, si la détection des PR de correction a
  échoué) » au lieu de « depuis une issue » ; ligne « Groupe d'issues », colonne code : « groupes `toFix`, `fixing`
  (`GROUPS`) » ; invariants : ajouter « une issue est dans un seul groupe d'issues ».
- [ ] **Step 3 : grep des termes retirés**

```bash
git grep -nw "PR_GROUPS" -- . ':!docs/superpowers'
git grep -nF "Une issue démarre \`/bugfix <url>\`." -- . ':!docs/superpowers'
```

Attendu : vide pour les deux (la phrase du README devient « Une issue à corriger démarre `/bugfix <url>` »).

- [ ] **Step 4 :** commit.

```bash
git add README.md docs/domaine.md
git commit -m "📝 Start work : issues à corriger et en cours de correction dans la doc

Co-Authored-By: <modèle de l'implémenteur>"
```

## Recette

Application native sans navigateur : un sous-agent ne peut pas la jouer.

- Substitut (contrôleur) : `herdr-app check mods/start-work`, puis sur ce repo
  `gh pr list --repo Dahiorus/herdr-tools --json number,isDraft,closingIssuesReferences --limit 100` (la commande
  exacte répond).
- **À faire par l'utilisateur** : ouvrir Start work (`ctrl-shift-i`) sur un repo qui a une issue avec une PR
  « Fixes #n » ouverte : deux groupes, tag `PR #n` à la bonne couleur, pas de bouton sur l'issue en cours de correction,
  `herdr-app shot` pour la largeur du tag `PR #12 +1` (colonne de 76 px).
