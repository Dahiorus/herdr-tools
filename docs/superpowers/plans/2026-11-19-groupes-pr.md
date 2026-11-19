# Groupes de PR dans Start work — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** l'onglet PR de Start work ne montre que les PR à relire puis mes PR, en deux groupes titrés ; mes PR
affichent leurs approbations ; Ctrl+Entrée ou le bouton lance `/pr <n> review` (« Relire ») ou `/pr <n> comments`
(« Retours »).

**Architecture:** les règles pures vont dans `github.js` (groupes, approbations, mise en page avec titres) et
`start.js` (action d'une PR : kind, libellé, pied de page). `launch.js` (`fetchGh`) fait deux `gh pr list` (un par
groupe) au lieu d'un. `main.js` et `rows.js` ne font que brancher ces règles.

**Tech Stack:** JavaScript gpui-kit (mod Herdr), `gh`, node pour les tests (`node:assert/strict`, `fake.js`).

**Spec:** `docs/superpowers/specs/2026-11-19-groupes-pr-design.md`

## Découpage en PR

Fichiers touchés hors tests, spec et plan : `github.js`, `start.js`, `launch.js`, `main.js`, `rows.js`, `README.md`,
`docs/domaine.md` (7). **Une seule PR**, story unique P1.

## Traçabilité

| Exigence (§ spec) | Tâche | Test qui la prouve |
|---|---|---|
| §5 : caractérisation de `fetchGh` (mapping, 3 messages d'erreur) | 1 | `launch.test.js` « fetchGh (caractérisation) » |
| §4 / Comportement : deux groupes, À relire puis Mes PR, PR des autres absentes | 2, 4 | `github.test.js` `prRows` ordre ; `launch.test.js` « fetchGh pr : deux listes » (aucune liste générale appelée) |
| §4 : une de mes PR aussi demandée à mon équipe → Mes PR seulement | 2 | `github.test.js` `prRows` doublon |
| §4 : `0/2`, `1/2`, `Prête pour la QA` (2 et 3 approbations) | 2 | `github.test.js` `myPrMeta` cas 1 à 4 |
| §4 : `Prête pour la QA` en vert (`ansi2`), `Changements demandés` en rouge (`ansi1`), en gras ; autres meta en `dim` (demande après recette) | après coup, review PR #6 | `github.test.js` `META_COLORS`, `metaColor` (Jira, Issues, Tâches restent en `dim`) |
| §4 : approuve puis commente `1/2` ; demande puis approuve `1/2` ; approuve puis demande `Changements demandés` ; `DISMISSED` `0/2` | 2 | `github.test.js` `myPrMeta` cas 5 à 8 |
| §4 : alice et bob approuvent, carol demande → `Changements demandés` | 2 | `github.test.js` `myPrMeta` cas 9 |
| §4 : brouillon avec 1 approbation → `1/2` + tag Brouillon | 2 | `github.test.js` `prRows` brouillon |
| Comportement : PR à relire gardent l'auteur en `meta` | 2 | `github.test.js` `prRows` (`meta: "bob"`) |
| §2 : `GH_LISTS.pr.fields` + `reviews` | 2 | `github.test.js` (ligne `fields` modifiée) |
| §4 : titres `À RELIRE 1` / `MES PR 1`, groupe vide sans titre, filtre « qa » | 2, 5 | `github.test.js` `groupLayout` (dont cas filtré) ; recette visuelle |
| §4 : ↑/↓ d'un groupe à l'autre, ligne visible | 2, 5 | `github.test.js` `listIndex` ; `main.test.js` « scroll compte les titres » |
| §4 : ↑ sur la première PR d'un groupe montre son titre (review P1) | P1 | `github.test.js` `listIndex(…, true)` ; `main.test.js` « ↑ vise le titre » |
| §4 : compteur `PR 2` | 4 | `launch.test.js` « fetchGh pr » (longueur de la liste rendue) |
| §4 : Ctrl+Entrée #5 → `/pr 5 review`, #7 → `/pr 7 comments`, dialogue fermé | 3, 5 | `start.test.js` `agentTask` ; `main.test.js` « PR à relire / mes PR : Ctrl+Entrée » |
| §4 : bouton « Relire » / « Retours » ; le bouton lance comme Ctrl+Entrée | 3, 5 | `start.test.js` `startLabel` ; `main.test.js` « The row's button » |
| §4 : pied de page selon le groupe | 3, 5 | `start.test.js` `footerText` cas PR |
| §4 : échec de `tab.new` → toast, dialogue ouvert | 5 | `main.test.js` « PR : échec de tab.new » |
| §4 : Entrée ouvre la PR dans tous les groupes | 5 | `main.test.js` « PR : Entrée ouvre » |
| §4 : aucune PR → « Rien d'ouvert » | 4 | `launch.test.js` « fetchGh pr : deux listes vides » → `[]` (statut inchangé dans `render()`) |
| §4 : une des deux commandes échoue → mêmes messages | 4 | `launch.test.js` « fetchGh pr : erreurs » (3 messages) |
| §4 : onglets Issues, Jira, Tâches inchangés | 1, 4, 5 | `launch.test.js` issue (caractérisation) ; `main.test.js` cas existants ; `start.test.js` cas existants |
| §7 : `fetchGh` ≤ 20 lignes, `catch` → `ghError` | 4 | caractérisation de la tâche 1 verte après |
| §7 : choix du kind dans `start.js` (`launchKind`) | 3, 5 | `start.test.js` `launchKind` |
| §7 : `main.js` ≤ 200 lignes | 5 | `wc -l mods/start-work/main.js` |
| §2 : README, glossaire, en-tête de `main.js` | 6 (—) | grep de la tâche 6 |

Usages vérifiés (étape 1b, `git grep`) : `GH_LISTS` lu par `launch.js:79` et `github.test.js` ; `fetchGh` appelé par
`main.js:80` seulement ; `agentTask` par `main.js:134` ; `footerText` par `main.js:184` ; `listRow`/`listBody` par
`main.js:154,196-197` ; `scroll_to_item` par `main.js:103` (et `fake.js`). Tests rendus faux, nommés dans leur
tâche : `github.test.js:10` (tâche 2), le cas `pr` de la caractérisation (tâche 4), `main.test.js` « PR tab:
Ctrl+Enter does nothing » (l. 43-49, tâche 5).

Vérifié contre GitHub (compte `brondon-ung`, `softwarevidal/renoshield`) : `gh pr list --search
"review-requested:@me"` ne rend que des PR ouvertes ; `--author @me` suit le jeton passé (`GH_TOKEN`) ; `reviews` rend
chaque avis avec `author.login`, `state`, `submittedAt`, dans l'ordre chronologique. `gh pr list` demande
`reviews(first: 100)` sans pagination (relevé dans le binaire `gh`) : au-delà de 100 avis, les plus récents manquent.
Accepté (`shortcut:` dans `myPrMeta`, tâche 2).

Non vérifiable par un test (comportement de GitHub), ajouté à la recette utilisateur : relecture demandée à une de mes
équipes → À relire ; relecture rendue → la PR disparaît (dont une demande à mon équipe déjà relue par moi) ; une de mes
PR demandée à mon équipe → Mes PR seulement (ce dernier cas est aussi couvert par `prRows`).

## Global Constraints

- Tests du contexte : `for f in mods/start-work/*.test.js; do node "$f" || exit 1; done` (depuis
  `~/.config/herdr-app`) ; tous verts avant chaque commit.
- Libellés exacts : `À relire`, `Mes PR`, `Prête pour la QA`, `Changements demandés`, `0/2`, `1/2`, bouton `Relire` /
  `Retours`, pied de page `Entrée ouvrir · Ctrl+Entrée relire` et `Entrée ouvrir · Ctrl+Entrée traiter les retours`
  (`Cmd` sur macOS), toast `Agent non lancé`.
- Seuil Prête pour la QA : 2 approbations. Règle d'approbation : dernier avis par relecteur hors `COMMENTED` et
  `PENDING` ; approbation si `APPROVED`.
- Tâches lancées : `/pr <n> review`, `/pr <n> comments`, `<n>` sans `#` ; onglet Herdr nommé `#<n>`.
- Modules purs (`github.js`, `start.js`) : aucun import de `herdr` ni `gpui-*`.
- Glossaire (`docs/domaine.md`) : pas de « section », « catégorie », « reviewer » dans les noms ; pour « approval »,
  voir la question ci-dessous.

Décidé en relecture du plan : « À ne pas dire » vaut pour le texte français (interface, docs) ; les noms anglais du
code sont gardés. La fonction qui rend le libellé `meta` de mes PR s'appelle `myPrMeta` (elle rend aussi
`Changements demandés`). La tâche 6 l'écrit dans l'en-tête du glossaire.
- Grille qualité : section « Grille qualité » de `~/.claude/skills/feature/SKILL.md`. `main.js` ≤ 200 lignes.
- Commits : préfixe `✨ Start work : …` (`✅` pour les tests seuls, `📝` pour la doc), pied
  `Co-Authored-By: <modèle de l'implémenteur>`.
- Recette : app native, pas de navigateur. Substitut : `herdr-app check ~/.config/herdr-app/mods/start-work` et les
  tests node ; la recette visuelle (titres, bouton, couleurs, scroll) est **à faire par l'utilisateur**.

## Review Focus

- Relecteur sans compte (`author: null`) : ses avis comptent sous le login `""`, sans erreur. Test : tâche 2.
- Avis `PENDING` sans `submittedAt` (`null`) : ignoré avant le tri, pas d'erreur de comparaison. Test : tâche 2.
- Filtre qui vide un groupe : pas de titre orphelin, `listIndex` cohérent. Test : tâche 2 (`groupLayout` filtré).
- Une seule des deux listes `gh` échoue : erreur affichée, pas une liste à moitié. Test : tâche 4.
- Liste vide puis ↑/↓ : `listIndex` avec `at = 0` sur `[]` rend 0. Test : tâche 2.

---

### Task 1 : Caractérisation de `fetchGh`

**Files:**
- Test: `mods/start-work/launch.test.js` (ajout en fin de fichier, import de `fetchGh`)

**Interfaces:**
- Consumes: `fetchGh(kind, repo, account, on, profiles)` actuel (`launch.js:77`).
- Produces: rien de nouveau ; tests verts sur `main`.

- [ ] **Step 1 : écrire les tests (comportement actuel)**

```javascript
// fetchGh (caractérisation): gh list mapped to rows; three error messages.
const ghOut = (items) => () => ok(JSON.stringify(items));
reset(ghOut([{ number: 12, title: "Bug", author: { login: "alice" }, url: "u12" }]));
assert.deepEqual(await fetchGh("issue", "o/r", undefined, {}, "/p.json"), [{ id: "#12", title: "Bug", meta: "alice", tag: undefined, url: "u12" }]);
assert.deepEqual(fake.calls, [["gh", "issue", "list", "--repo", "o/r", "--json", "number,title,author,url", "--limit", "50"]]);
reset(ghOut([{ number: 5, title: "Feat", author: { login: "bob" }, url: "u5", isDraft: true }]));
assert.deepEqual(await fetchGh("pr", "o/r", undefined, {}, "/p.json"), [{ id: "#5", title: "Feat", meta: "bob", tag: "Brouillon", url: "u5" }]);
reset(() => ({ code: 1, stdout: "", stderr: "HTTP 502" }));
assert.deepEqual(await fetchGh("issue", "o/r", "me", {}, "/p.json"), { error: "HTTP 502" });
reset(() => ({ code: 1, stdout: "", stderr: "Could not resolve to a Repository" }));
assert.deepEqual(await fetchGh("issue", "o/r", "me", {}, "/p.json"), { error: "Le compte gh me (profil du projet) ne voit pas o/r." });
reset((c, a) => (a[0] === "api" ? ok("carol\n") : { code: 1, stdout: "", stderr: "Could not resolve to a Repository" }));
assert.deepEqual(await fetchGh("issue", "o/r", undefined, {}, "/p.json"), { error: "Le compte gh actif (carol) ne voit pas o/r, et aucun profil (/p.json) ne couvre ce propriétaire. Change de compte avec gh auth switch." });
```

- [ ] **Step 2 : lancer, vérifier le vert sur le code actuel**

Run: `node mods/start-work/launch.test.js`
Expected: sortie sans `AssertionError`. Si un cas échoue, c'est le test qui est faux (il fige l'existant) : le
corriger contre `launch.js`, jamais l'inverse.

- [ ] **Step 3 : contrôle du rouge** — retirer temporairement `if (account) return …` de `fetchGh`, relancer : le
cas « compte du profil » échoue ; remettre la ligne. Noter la sortie dans le rapport.

- [ ] **Step 4 : commit**

```bash
git add mods/start-work/launch.test.js
git commit -m "✅ Start work : caractérisation de fetchGh

Co-Authored-By: <modèle de l'implémenteur>"
```

---

Lot **parallélisable** : tâches 2 (`github.js`, `github.test.js`) et 3 (`start.js`, `start.test.js`), sans fichier
commun.

### Task 2 : Règles pures des groupes de PR (`github.js`)

**Files:**
- Modify: `mods/start-work/github.js`
- Test: `mods/start-work/github.test.js` (la ligne 10, `GH_LISTS.pr.fields`, devient fausse : la mettre à jour)

**Interfaces:**
- Produces:
  - `GH_LISTS.pr.fields === "number,title,author,url,isDraft,reviews"` ; `GH_LISTS.issue` inchangé.
  - `PR_GROUPS` : `[{ id: "toReview", label: "À relire", args: ["--search", "review-requested:@me"] }, { id: "mine", label: "Mes PR", args: ["--author", "@me"] }]` (ordre d'affichage) ; amendé en review (P2) : chaque groupe porte aussi `kind`, `button`, `hint` (ex-`PR_ACTIONS`).
  - `APPROVALS_FOR_QA = 2`.
  - `myPrMeta(reviews: Array<{author, state, submittedAt}>) → string` : `Changements demandés` | `Prête pour la QA` | `"<n>/2"`.
  - `ghRow(kind, raw) → {id, title, meta, tag, url}` (le mapping actuel de `fetchGh`, déplacé ici).
  - `prRows({ toReview: raw[], mine: raw[] }) → row[]` : lignes À relire (sans les numéros présents dans `mine`) puis Mes PR, chacune avec `group` (`"toReview"` | `"mine"`) ; `meta` de mes PR = `myPrMeta(reviews)`, des PR à relire = l'auteur.
  - `groupLayout(items: row[]) → Array<{ title: string, count: number } | { item: row, n: number }>` : un titre avant la première ligne de chaque groupe (`title` = `label` de `PR_GROUPS`, `count` = lignes de ce groupe dans `items`), `n` = rang dans `items` ; lignes sans `group` : jamais de titre.
  - `listIndex(items: row[], at: number) → number` : rang de la ligne `at` parmi les enfants de la liste, titres compris.
    Amendé en review (P1) : `listIndex(items, at, up)` ; avec `up`, une ligne qui ouvre un groupe rend le rang de son titre.

- [ ] **Step 1 : écrire les tests**

```javascript
const rv = (login, state, t) => ({ author: login === null ? null : { login }, state, submittedAt: t });
assert.equal(myPrMeta([]), "0/2");
assert.equal(myPrMeta([rv("alice", "APPROVED", "1")]), "1/2");
assert.equal(myPrMeta([rv("alice", "APPROVED", "1"), rv("bob", "APPROVED", "2")]), "Prête pour la QA");
assert.equal(myPrMeta([rv("a", "APPROVED", "1"), rv("b", "APPROVED", "2"), rv("c", "APPROVED", "3")]), "Prête pour la QA");
assert.equal(myPrMeta([rv("alice", "APPROVED", "1"), rv("alice", "COMMENTED", "2")]), "1/2");
assert.equal(myPrMeta([rv("alice", "CHANGES_REQUESTED", "1"), rv("alice", "APPROVED", "2")]), "1/2");
assert.equal(myPrMeta([rv("alice", "APPROVED", "1"), rv("alice", "CHANGES_REQUESTED", "2")]), "Changements demandés");
assert.equal(myPrMeta([rv("alice", "APPROVED", "1"), rv("alice", "DISMISSED", "2")]), "0/2");
assert.equal(myPrMeta([rv("alice", "APPROVED", "1"), rv("bob", "APPROVED", "2"), rv("carol", "CHANGES_REQUESTED", "3")]), "Changements demandés");
assert.equal(myPrMeta([rv(null, "APPROVED", "1"), rv("alice", "PENDING", null)]), "1/2"); // no account; pending ignored
assert.equal(GH_LISTS.pr.fields, "number,title,author,url,isDraft,reviews");

const pr = (number, login, o = {}) => ({ number, title: `T${number}`, author: { login }, url: `u${number}`, isDraft: false, reviews: [], ...o });
assert.deepEqual(prRows({ toReview: [pr(5, "bob"), pr(7, "me")], mine: [pr(7, "me", { isDraft: true, reviews: [rv("alice", "APPROVED", "1")] })] }), [
  { id: "#5", title: "T5", meta: "bob", tag: "Prête", url: "u5", group: "toReview" },
  { id: "#7", title: "T7", meta: "1/2", tag: "Brouillon", url: "u7", group: "mine" }, // in both lists: Mes PR only
]);
assert.deepEqual(prRows({ toReview: [], mine: [] }), []);

const r5 = { id: "#5", group: "toReview" }, r6 = { id: "#6", group: "toReview" }, m7 = { id: "#7", group: "mine" };
assert.deepEqual(groupLayout([r5, r6, m7]), [{ title: "À relire", count: 2 }, { item: r5, n: 0 }, { item: r6, n: 1 }, { title: "Mes PR", count: 1 }, { item: m7, n: 2 }]);
assert.deepEqual(groupLayout([m7]), [{ title: "Mes PR", count: 1 }, { item: m7, n: 0 }]); // filtered: no empty À relire title
assert.deepEqual(groupLayout([{ id: "#12" }]), [{ item: { id: "#12" }, n: 0 }]); // issues: no title
assert.equal(listIndex([r5, r6, m7], 0), 1);
assert.equal(listIndex([r5, r6, m7], 2), 4);
assert.equal(listIndex([{ id: "#12" }, { id: "#13" }], 1), 1);
assert.equal(listIndex([], 0), 0);
```

- [ ] **Step 2 : lancer, constater le rouge**

Run: `node mods/start-work/github.test.js`
Expected: `SyntaxError` d'import (`myPrMeta` absent) — rouge attendu : échec de chargement.

- [ ] **Step 3 : implémenter** dans `github.js` les exports de **Interfaces**. `myPrMeta` : filtrer
`COMMENTED`/`PENDING`, garder le dernier avis par `author?.login ?? ""` (tri par `submittedAt`, chaînes ISO
comparables), puis `CHANGES_REQUESTED` présent → `Changements demandés`, sinon compte des `APPROVED` comparé à
`APPROVALS_FOR_QA`. Une fonction nommée par niveau de contrôle (grille, point 1). Commentaire
`// shortcut: gh pr list reads the first 100 reviews only; page with gh api if a PR gets more.`

- [ ] **Step 4 : tests du contexte**

Run: `for f in mods/start-work/*.test.js; do node "$f" || exit 1; done`
Expected: tout vert. Le cas `pr` de la caractérisation (tâche 1) reste vert : il n'asserte pas les arguments de
`gh`, et `fetchGh` n'est pas encore modifié.

- [ ] **Step 5 : commit**

```bash
git add mods/start-work/github.js mods/start-work/github.test.js
git commit -m "✨ Start work : règles des groupes de PR et des approbations

Co-Authored-By: <modèle de l'implémenteur>"
```

### Task 3 : Action d'une PR (`start.js`)

**Files:**
- Modify: `mods/start-work/start.js`
- Test: `mods/start-work/start.test.js`

**Interfaces:**
- Produces:
  - `PR_GROUPS` gagne `kind`, `button` et `hint` par groupe (`toReview` : `review`, « Relire », « relire » ; `mine` : `comments`, « Retours », « traiter les retours »), pas de `PR_ACTIONS` (amendé en review (P2)).
  - `agentTask("review", item)` → `/pr <n> review`, `agentTask("comments", item)` → `/pr <n> comments` (`n` = `item.id` sans `#`) ; autres kinds inchangés.
  - `launchKind(tab, item) → "task" | "issue" | "review" | "comments"` (onglet `jira` non concerné : `start()` le traite à part).
  - `startLabel(tab, item) → string` : le `button` du groupe (`PR_GROUPS`) sur `pr`, sinon `"Lancer"`.
  - `footerText(tab, platform, confirming, empty, group)` : 5e paramètre ; sur `pr`, `null` si `empty` ou sans `group`, sinon `Entrée ouvrir · <Ctrl|Cmd>+Entrée <hint>` ; autres cas inchangés.

- [ ] **Step 1 : écrire les tests**

```javascript
const prItem = (group) => ({ id: "#42", group, url: "https://github.com/o/r/pull/42" });
assert.equal(agentTask("review", prItem("toReview")), "/pr 42 review");
assert.equal(agentTask("comments", prItem("mine")), "/pr 42 comments");
assert.equal(launchKind("pr", prItem("toReview")), "review");
assert.equal(launchKind("pr", prItem("mine")), "comments");
assert.equal(launchKind("issue", issue), "issue");
assert.equal(launchKind("task", task), "task");
assert.equal(startLabel("pr", prItem("toReview")), "Relire");
assert.equal(startLabel("pr", prItem("mine")), "Retours");
assert.equal(startLabel("issue", issue), "Lancer");
assert.equal(footerText("pr", "linux", null, false, "toReview"), "Entrée ouvrir · Ctrl+Entrée relire");
assert.equal(footerText("pr", "macos", null, false, "mine"), "Entrée ouvrir · Cmd+Entrée traiter les retours");
assert.equal(footerText("pr", "linux", null, true, "toReview"), null);
```

Les assertions existantes (`footerText("pr", "linux")` → `null`, l. 8 ; confirmation sur `pr`, l. 87) restent.

- [ ] **Step 2 : lancer, constater le rouge** — `node mods/start-work/start.test.js` : `SyntaxError` d'import
(`launchKind` absent), rouge attendu.

- [ ] **Step 3 : implémenter** les exports de **Interfaces** dans `start.js`.

- [ ] **Step 4 : tests du contexte** — `for f in mods/start-work/*.test.js; do node "$f" || exit 1; done`, tout vert.

- [ ] **Step 5 : commit**

```bash
git add mods/start-work/start.js mods/start-work/start.test.js
git commit -m "✨ Start work : Relire et Traiter les retours sur une PR

Co-Authored-By: <modèle de l'implémenteur>"
```

---

### Task 4 : Deux listes `gh` pour l'onglet PR (`launch.js`)

**Files:**
- Modify: `mods/start-work/launch.js:76-90` (`fetchGh`)
- Test: `mods/start-work/launch.test.js` (le cas `pr` de la caractérisation devient faux : le remplacer par les cas ci-dessous)

**Interfaces:**
- Consumes: `GH_LISTS`, `PR_GROUPS`, `ghRow`, `prRows` (tâche 2).
- Produces: `fetchGh(kind, repo, account, on, profiles)` même signature ; pour `pr`, rend `prRows(...)` ou `{error}`.
  `ghError(error, repo, account, on, profiles) → Promise<{error}>` (le `catch` actuel, messages identiques, non exporté).

- [ ] **Step 1 : écrire les tests** (à la place du cas `pr` de la tâche 1)

```javascript
const LIST = (extra) => ["gh", "pr", "list", "--repo", "o/r", "--json", "number,title,author,url,isDraft,reviews", "--limit", "50", ...extra];
const raw = (number, login) => ({ number, title: `T${number}`, author: { login }, url: `u${number}`, isDraft: false, reviews: [] });
reset((_c, a) => ok(JSON.stringify(a.includes("--author") ? [raw(7, "me")] : [raw(5, "bob")])));
const rows = await fetchGh("pr", "o/r", undefined, {}, "/p.json");
assert.deepEqual(rows.map((r) => [r.id, r.group, r.meta]), [["#5", "toReview", "bob"], ["#7", "mine", "0/2"]]);
assert.equal(rows.length, 2); // tab counter: PR 2
assert.deepEqual(fake.calls.sort(), [LIST(["--author", "@me"]), LIST(["--search", "review-requested:@me"])].sort()); // no general list
reset(() => ok("[]"));
assert.deepEqual(await fetchGh("pr", "o/r", undefined, {}, "/p.json"), []);
reset((_c, a) => (a.includes("--author") ? ok("[]") : { code: 1, stdout: "", stderr: "HTTP 502" }));
assert.deepEqual(await fetchGh("pr", "o/r", "me", {}, "/p.json"), { error: "HTTP 502" });
reset((_c, a) => (a.includes("--search") ? ok("[]") : { code: 1, stdout: "", stderr: "Could not resolve to a Repository" }));
assert.deepEqual(await fetchGh("pr", "o/r", "me", {}, "/p.json"), { error: "Le compte gh me (profil du projet) ne voit pas o/r." });
reset((_c, a) => (a[0] === "api" ? ok("carol\n") : a.includes("--author") ? ok("[]") : { code: 1, stdout: "", stderr: "Could not resolve to a Repository" }));
assert.deepEqual(await fetchGh("pr", "o/r", undefined, {}, "/p.json"), { error: "Le compte gh actif (carol) ne voit pas o/r, et aucun profil (/p.json) ne couvre ce propriétaire. Change de compte avec gh auth switch." });
```

Avec un compte, les appels passent par `sh -c` (`ghCommand`) : les `a.includes(...)` restent vrais car les arguments
`gh` suivent dans `a`.

- [ ] **Step 2 : lancer, constater le rouge** — `node mods/start-work/launch.test.js` : `AssertionError` sur
`rows.map(...)` (une seule liste, pas de `group`).

- [ ] **Step 3 : implémenter** : `fetchGh` → `kind === "pr"` : `Promise.all` sur `PR_GROUPS` (un `gh pr list` par
groupe avec `g.args`), puis `prRows({toReview, mine})` ; sinon `ghRow` sur la liste `issue`. Le `catch` appelle
`ghError`. `fetchGh` ≤ 20 lignes.

- [ ] **Step 4 : tests du contexte** — tout vert, dont les trois messages de la caractérisation `issue`.

- [ ] **Step 5 : commit**

```bash
git add mods/start-work/launch.js mods/start-work/launch.test.js
git commit -m "✨ Start work : l'onglet PR lit mes PR et celles à relire

Co-Authored-By: <modèle de l'implémenteur>"
```

### Task 5 : Groupes, bouton et lancement dans le dialogue (`main.js`, `rows.js`)

**Files:**
- Modify: `mods/start-work/main.js` (`start`, `row`, `select`, `render`, imports, commentaire d'en-tête l. 1-4)
- Modify: `mods/start-work/rows.js` (`startButton` lit `start.label` ; nouveau `groupTitle`)
- Modify: `mods/start-work/fake.js` (`ScrollHandle` enregistre `fake.scrolls`)
- Test: `mods/start-work/main.test.js` (« PR tab: Ctrl+Enter does nothing », l. 43-49, devient faux : remplacé)

**Interfaces:**
- Consumes: `groupLayout`, `listIndex`, `PR_GROUPS` (tâche 2) ; `launchKind`, `startLabel`, `footerText(…, group)` (tâche 3) ; `fetchGh` (tâche 4).
- Produces: `groupTitle({ title, count }, t)` dans `rows.js` (texte `${title.toUpperCase()} ${count}`, 11 px, `t.dim`, non cliquable) ; `listRow(…, start)` lit `start.label`.

- [ ] **Step 1 : écrire les tests** (remplacent le cas « PR tab: Ctrl+Enter does nothing »)

```javascript
const toReview = { id: "#5", title: "t", meta: "bob", tag: "Prête", group: "toReview", url: "https://github.com/o/r/pull/5" };
const mine = { id: "#7", title: "t", meta: "1/2", tag: "Prête", group: "mine", url: "https://github.com/o/r/pull/7" };
// PR to review: Ctrl+Enter starts /pr 5 review and closes the dialog.
{
  const { cx, enter } = dialog("pr", toReview);
  enter(true);
  await cx.settle();
  assert.deepEqual(fake.calls, [TAB_NEW("#5", "/pr 5 review")]);
  assert.deepEqual(fake.closed, ["ov"]);
}
// My PR: /pr 7 comments.
{
  const { cx, enter } = dialog("pr", mine);
  enter(true);
  await cx.settle();
  assert.deepEqual(fake.calls, [TAB_NEW("#7", "/pr 7 comments")]);
}
// The row's button does the same as Ctrl+Enter.
{
  const { w, cx } = dialog("pr", toReview);
  w.render();
  fake.clicks["sw-start-#5"]({}, cx);
  await cx.settle();
  assert.deepEqual(fake.calls, [TAB_NEW("#5", "/pr 5 review")]);
}
// PR: tab.new fails → toast, dialog stays.
{
  const { cx, enter } = dialog("pr", mine, () => ({ code: 1, stdout: '{"error":"unknown space"}', stderr: "" }));
  enter(true);
  await cx.settle();
  assert.equal(fake.toasts[0].title, "Agent non lancé");
  assert.deepEqual(fake.closed, []);
}
// PR: Enter opens the browser.
{
  const { cx, enter } = dialog("pr", toReview);
  enter();
  await cx.settle();
  assert.deepEqual(fake.calls, [["xdg-open", "https://github.com/o/r/pull/5"]]);
}
// Scroll counts the group titles: ↓ from #5 to #7 reveals child 3 (title, #5, title, #7).
{
  const { w, key } = dialog("pr", toReview);
  w.lists.pr = [toReview, mine];
  key("down");
  assert.equal(fake.scrolls.at(-1), 3);
}
```

`dialog()` (l. 18) pose déjà `w.lists[tab] = [item]`. Le clic du bouton suit le test du bouton Jira (`main.test.js`,
vers la l. 131) : copier sa façon d'appeler `fake.clicks[...]`. Dans `fake.js`, ajouter `scrolls: []` à `fake` et à
`reset`, et faire enregistrer l'indice par `scroll_to_item`.

- [ ] **Step 2 : lancer, constater le rouge** — `node mods/start-work/main.test.js` : `AssertionError` sur
`fake.calls` (`[]` : `start()` ignore l'onglet `pr`).

- [ ] **Step 3 : implémenter**
  - `start()` : supprimer `|| this.tab === "pr"` ; `if (this.tab !== "jira") return this.launch(launchKind(this.tab, item), item, cx);`.
  - `row()` : toujours un objet `start`, avec `label: startLabel(this.tab, i)`.
  - `select(at)` : `scroll_to_item(listIndex(this.items(), this.at))`.
  - `render()` : le corps de liste (les deux branches) se construit par une méthode `rowsOf(items, t)` qui mappe `groupLayout(items)` en `this.row(e.item, e.n, t)` ou `groupTitle(e, t)` ; `footerText(…, items[this.at]?.group)`.
  - En-tête l. 1-4 : sur une PR, Ctrl+Entrée relit ou traite les retours selon le groupe.
  - `main.js` ≤ 200 lignes. S'il dépasse : sortir `tabs()` en fonction pure `tabList(third)` de `rows.js`, à côté de `nextTab`.

- [ ] **Step 4 : vérifier**

```bash
for f in mods/start-work/*.test.js; do node "$f" || exit 1; done
herdr-app check ~/.config/herdr-app/mods/start-work
wc -l mods/start-work/main.js
```

Expected : tests verts, `check` sans erreur, `main.js` ≤ 200.

- [ ] **Step 5 : commit**

```bash
git add mods/start-work/main.js mods/start-work/rows.js mods/start-work/fake.js mods/start-work/main.test.js
git commit -m "✨ Start work : groupes À relire et Mes PR, Relire et Retours dans le dialogue

Co-Authored-By: <modèle de l'implémenteur>"
```

### Task 6 : Documentation (—)

**Files:**
- Modify: `README.md` (§ Start work), `docs/domaine.md`

- [ ] **Step 1 : README** — après la phrase du statut (l. 21) : l'onglet PR ne montre que les PR à relire puis mes
PR, en deux groupes ; mes PR affichent leurs approbations (`1/2`, `Prête pour la QA`, `Changements demandés`). Au
§ Ctrl+Entrée : une PR à relire démarre `/pr <n> review` (bouton « Relire »), une de mes PR `/pr <n> comments`
(bouton « Retours »). Phrase des tests : « les groupes de PR et les approbations » ajouté à ce que vérifie
`github.test.js`.

- [ ] **Step 2 : glossaire** — sous le tableau, une ligne : « À ne pas dire » vaut pour le texte français
(interface, docs), pas pour les noms anglais du code. Colonnes « Dans le code » : `Groupe de PR` → `group`, `PR_GROUPS` (`github.js`) ;
`Approbation` → `myPrMeta` ; `Prête pour la QA` → `APPROVALS_FOR_QA` ; `Traiter les retours` → kind `comments`
(`PR_GROUPS`, `github.js`) ; `Relire` → kind `review` ; retirer les « proposé : ».

- [ ] **Step 3 : grep**

```bash
git grep -n "proposé :" -- docs/domaine.md
git grep -nw "Lancer starts an agent" -- . ':!docs/superpowers'
git grep -niw "approval\|reviewer\|catégorie" -- mods/start-work
```

Expected : le 1er vide ; le 2e ne trouve que `mods/start-work/main.js:3`, en-tête mis à jour ; le 3e ne trouve que des noms ou commentaires anglais du code et la catégorie de statut Jira de `start.test.js`.

- [ ] **Step 4 : commit**

```bash
git add README.md docs/domaine.md
git commit -m "📝 Start work : groupes de PR dans le README et le glossaire

Co-Authored-By: <modèle de l'implémenteur>"
```
