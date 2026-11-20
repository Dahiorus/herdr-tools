# Retours sur mes PR dans Start work — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** l'onglet PR de Start work range mes PR qui ont au moins un fil en attente dans un groupe « Retours sur mes
PR », entre À relire et Mes PR ; « Retours » (`/pr <n> comments`) n'est plus proposé que là.

**Architecture:** les règles pures vont dans `github.js` (requête des fils, fil en attente, classement de mes PR,
groupes) et `start.js` (action selon le groupe). `launch.js` (`fetchGh`) ajoute une requête `gh api graphql` en
parallèle des deux `gh pr list`, avec repli si elle seule échoue. `main.js` ne fait que brancher, sans grossir.

**Tech Stack:** JavaScript gpui-kit (mod Herdr), `gh` (`pr list`, `api graphql`), node pour les tests
(`node:assert/strict`, `fake.js`).

**Spec:** `docs/superpowers/specs/2026-11-20-retours-mes-pr-design.md`

## Global Constraints

- Libellés exacts : titre de groupe « Retours sur mes PR » (affiché `RETOURS SUR MES PR`), bouton « Retours », hint
  « traiter les retours », toast « Retours non détectés » (niveau `warning`, corps : le message d'erreur).
- Ordre des groupes : À relire, Retours sur mes PR, Mes PR.
- Fil en attente : non résolu ; premier commentaire pas d'un auteur `__typename` `Bot` ; dernier commentaire pas de
  moi, ou `totalCount` 1. Logins comparés sans la casse.
- Requête : le texte GraphQL de la spec (§ Approches), variable `q` = `repo:<o/r> is:pr is:open author:@me`, lancée
  par `ghCommand(account, ["api", "graphql", "-f", "query=<texte>", "-f", "q=<recherche>"])`.
- `main.js` reste à 200 lignes au plus (§7).
- Commits : gitmoji comme l'historique (`✨ Start work : …`), terminés par
  `Co-Authored-By: <modèle de l'implémenteur>`.
- Tests : depuis la racine `~/.config/herdr-app`,
  `for f in mods/start-work/*.test.js; do node "$f" || exit 1; done` (contexte entier), puis
  `herdr-app check mods/start-work`.

## Review Focus

1. Auteur supprimé (« ghost ») : `author` à `null` dans `first` ou `last` → pas un bot ; dernier commentaire pas de
   moi → fil en attente. Test : tâche 1, `isPending` avec `author: null`.
2. Fil sans commentaire lisible (`first.nodes` vide) → pas un bot. Test : tâche 1.
3. Réponse GraphQL sans `data.search.nodes` (schéma inattendu) → échec de la détection (repli `mineAll` et toast,
   comme la spec range le schéma parmi les échecs) ; nœud sans `reviewThreads` → pas de retours. Test : tâche 1,
   `assert.throws(() => feedbackNumbers({}))`, nœud `{}`, et réponse `{}` dans `launch.test.js`.
4. Casse du login (`Me` dans `viewer`, `me` dans `last`) → c'est moi. Test : tâche 1.
5. Une liste `gh` et la requête des fils échouent ensemble → erreur de la liste seule, aucun toast. Test : tâche 1,
   `launch.test.js`.

## Découpage en PR

Fichiers touchés hors tests, spec et plan : `github.js`, `launch.js`, `start.js`, `main.js`, `README.md`,
`docs/domaine.md` (6). **Une seule PR**, story unique P1.

## Traçabilité

| Exigence (§ spec) | Tâche | Test qui la prouve |
|---|---|---|
| Détection : non résolu, dernier pas de moi | 1 | `github.test.js` `isPending` cas 1-3 |
| Détection : mon fil seul sans réponse ; le même avec réponse d'alice puis la mienne → pas en attente | 1 | `github.test.js` `isPending` cas 4-5 |
| Détection : fil ouvert par un bot | 1 | `github.test.js` `isPending` cas bot |
| §4 cas combiné : premier fil résolu, second en attente → Retours | 1 | `github.test.js` `feedbackNumbers` deux fils |
| Groupes : ordre À relire, Retours, Mes PR ; une de mes PR dans un seul groupe | 1 | `github.test.js` `prRows` avec `feedback` (jeu dans le désordre) |
| §4 cas combiné : brouillon, 1 approbation, retours → Retours, `1/2`, Brouillon | 1 | `github.test.js` `prRows` brouillon |
| Ligne : `meta` coloré sur Retours comme sur Mes PR | 1 | `github.test.js` `metaColor` `feedback`, `mineAll` ; `toReview` reste sans couleur |
| §4 : titres, groupe vide sans titre, compteur `PR n` sur les trois groupes | 1 | `github.test.js` `groupLayout` trois groupes ; `launch.test.js` longueur des lignes |
| §4 : ↑/↓ entre groupes | 1 | `github.test.js` `listIndex` sur trois groupes |
| Chargement : trois appels sous `ghCommand` | 1 | `launch.test.js` appels attendus (dont `GRAPHQL`) |
| §4 : requête des fils en échec → `mineAll` (« Mes PR », Retours partout) + toast | 1, 2 | `launch.test.js` « fils en échec » ; `start.test.js` `mineAll` |
| §4 cas combiné : liste et fils en échec → erreur seule, sans toast | 1 | `launch.test.js` « liste et fils en échec » |
| §4 : Ctrl+Entrée / « Retours » sur Retours → `/pr 7 comments`, pied de page `traiter les retours` | 2 | `start.test.js` `feedback` ; `main.test.js` « Retours : Ctrl+Entrée » |
| §4 : Mes PR sans retour : pas de bouton, Ctrl+Entrée ne lance rien, pied `Entrée ouvrir` | 2 | `start.test.js` `mine` ; `main.test.js` « Mes PR : rien » |
| §4 : À relire inchangé | 2 | `start.test.js`, `main.test.js` cas `toReview` existants |
| §4 : filtre « qa » garde chaque PR sous son groupe | 1 | `github.test.js` `groupLayout([m7])` (existant) et `groupLayout([f7])` ; recette visuelle |
| §4 : onglets Issues, Jira et Tâches inchangés | — | tests existants : `launch.test.js` « fetchGh issue », `main.test.js` issue, Jira et tâches, `metaColor` hors groupe |
| Chargement : schéma inattendu = échec de la détection | 1 | `github.test.js` `assert.throws(feedbackNumbers({}))` ; `launch.test.js` réponse `{}` |
| Portée : README, glossaire, commentaire `main.js:3` | 3 | `git grep` de la tâche 3 |

Usages vérifiés à l'étape 1b : `PR_GROUPS` (`github.js` `titleBefore`, `launch.js` `fetchGh`, `start.js`
`prGroup`) ; `metaColor` (`rows.js:26`) ; `group` (`main.js:184` `footerText`, `groupedRows`) ; `launchKind`,
`startLabel` (`main.js:108`, `main.js:155`). `rows.js` et `filter.js` inchangés : `listRow` masque le bouton via
`start.shown` (`invisible()`), figé par le test « Mes PR : rien » (tâche 2).

Tests existants que le plan rend faux, nommés dans leur tâche : `launch.test.js` « fetchGh pr » (appels et groupe
`mine` sans réponse aux fils, tâche 1) ; `main.test.js` « My PR: /pr 7 comments » et « PR: tab.new fails »
(item `mine`, tâche 2) ; `start.test.js` lignes `mine` → `comments` / `Retours` / `traiter les retours` (tâche 2).

---

### Task 1 : Requête des fils, classement de mes PR, troisième groupe

§ spec : Approches, Détection, Groupes, Chargement et erreurs, §2 (`PR_GROUPS`, `prRows`, `metaColor`, `fetchGh`), §7.

**Files:**
- Modify: `mods/start-work/github.js`
- Modify: `mods/start-work/launch.js` (`fetchGh`, nouvelles `fetchPrs`, `fetchFeedback`)
- Test: `mods/start-work/github.test.js`, `mods/start-work/launch.test.js`

**Interfaces:**
- Produces (`github.js`) :
  - `PR_GROUPS` : `toReview` (inchangé, sans `args`), puis
    `{ id: "feedback", label: "Retours sur mes PR", kind: "comments", button: "Retours", hint: "traiter les retours" }`,
    puis `mine` (`label: "Mes PR"`, garde `kind`/`button`/`hint` jusqu'à la tâche 2), puis
    `{ id: "mineAll", label: "Mes PR", kind: "comments", button: "Retours", hint: "traiter les retours" }`.
  - `PR_LISTS = { toReview: ["--search", "review-requested:@me"], mine: ["--author", "@me"] }` (les `args` quittent
    `PR_GROUPS`).
  - `THREADS_QUERY` (texte de la spec), `threadsSearch(repo) → string`.
  - `isPending(thread, me) → boolean`, `feedbackNumbers(response) → Set<number>` (`response` : JSON de
    `gh api graphql`, `{ data: { viewer: { login }, search: { nodes } } }`).
  - `prRows({ toReview, mine, feedback })` : `feedback` est un `Set` ou `null` (requête en échec).
  - `metaColor(i)` : couleur pour tout groupe de mes PR (`feedback`, `mine`, `mineAll`).
- Produces (`launch.js`) : `fetchGh` inchangé en signature.

- [ ] **Step 1 : tests rouges dans `github.test.js`** (ajouter `isPending`, `feedbackNumbers`, `PR_LISTS`,
  `threadsSearch` à l'import ; rouge attendu : échec d'import, symboles absents)

```javascript
const th = (o = {}) => ({ isResolved: false, all: { totalCount: 2 }, first: { nodes: [{ author: { __typename: "User", login: "alice" } }] }, last: { nodes: [{ author: { login: "alice" } }] }, ...o });
const lastBy = (login) => ({ last: { nodes: [{ author: login === null ? null : { login } }] } });
assert.equal(isPending(th(), "me"), true); // alice spoke last
assert.equal(isPending(th(lastBy("me")), "me"), false); // I answered last
assert.equal(isPending(th({ isResolved: true }), "me"), false);
assert.equal(isPending(th({ all: { totalCount: 1 }, ...lastBy("me") }), "me"), true); // my own thread, no answer
assert.equal(isPending(th({ all: { totalCount: 3 }, ...lastBy("me") }), "me"), false); // alice answered, then me
assert.equal(isPending(th({ first: { nodes: [{ author: { __typename: "Bot", login: "sonar" } }] }, ...lastBy("sonar") }), "me"), false);
assert.equal(isPending(th(lastBy(null)), "me"), true); // ghost author: not me
assert.equal(isPending(th({ first: { nodes: [] } }), "me"), true); // no readable first comment: not a bot
assert.equal(isPending(th(lastBy("me")), "Me"), false); // logins ignore case
const resp = (nodes, login = "me") => ({ data: { viewer: { login }, search: { nodes } } });
assert.deepEqual(feedbackNumbers(resp([{ number: 7, reviewThreads: { nodes: [th({ isResolved: true }), th()] } }, { number: 8, reviewThreads: { nodes: [th(lastBy("me"))] } }])), new Set([7])); // any thread decides, not the first
assert.deepEqual(feedbackNumbers(resp([])), new Set());
assert.throws(() => feedbackNumbers({})); // unexpected schema: detection failed, fetchFeedback falls back
assert.deepEqual(feedbackNumbers(resp([{}])), new Set());
assert.equal(threadsSearch("o/r"), "repo:o/r is:pr is:open author:@me");
assert.deepEqual(PR_LISTS, { toReview: ["--search", "review-requested:@me"], mine: ["--author", "@me"] });
```

  Puis `prRows` et les groupes (jeu dans le désordre de GitHub : #8 sans retour avant #7 avec retours) :

```javascript
const mineRaw = [pr(8, "me"), pr(7, "me", { isDraft: true, reviews: [rv("alice", "APPROVED", "1")] })];
assert.deepEqual(prRows({ toReview: [pr(5, "bob"), pr(7, "me")], mine: mineRaw, feedback: new Set([7]) }).map((r) => [r.id, r.group, r.meta, r.tag]), [
  ["#5", "toReview", "bob", "Prête"], ["#7", "feedback", "1/2", "Brouillon"], ["#8", "mine", "0/2", "Prête"],
]);
assert.deepEqual(prRows({ toReview: [], mine: mineRaw, feedback: null }).map((r) => [r.id, r.group]), [["#8", "mineAll"], ["#7", "mineAll"]]); // threads failed: today's Mes PR
const f7 = { id: "#7", group: "feedback" }, m8 = { id: "#8", group: "mine" };
assert.deepEqual(groupLayout([r5, f7, m8]), [{ title: "À relire", count: 1 }, { item: r5, n: 0 }, { title: "Retours sur mes PR", count: 1 }, { item: f7, n: 1 }, { title: "Mes PR", count: 1 }, { item: m8, n: 2 }]);
assert.deepEqual(groupLayout([{ id: "#8", group: "mineAll" }]).map((c) => c.title ?? c.item.id), ["Mes PR", "#8"]);
assert.equal(listIndex([r5, f7, m8], 2), 5);
assert.equal(listIndex([r5, f7, m8], 1, true), 2); // up onto #7 shows its title
assert.deepEqual(groupLayout([f7]), [{ title: "Retours sur mes PR", count: 1 }, { item: f7, n: 0 }]); // filtered: only Retours left
assert.equal(metaColor({ group: "feedback", meta: "Prête pour la QA" }), "ansi2");
assert.equal(metaColor({ group: "mineAll", meta: "Changements demandés" }), "ansi1");
```

  Les appels existants `prRows({ toReview, mine })` passent `feedback: new Set()` (sens inchangé : groupe `mine`).

- [ ] **Step 2 : tests rouges dans `launch.test.js`**, bloc « fetchGh » PR. Ajouter :

```javascript
const GRAPHQL = ["gh", "api", "graphql", "-f", `query=${THREADS_QUERY}`, "-f", "q=repo:o/r is:pr is:open author:@me"];
const isGraphql = (a) => a[0] === "api" && a[1] === "graphql";
const threads = (n) => ({ data: { viewer: { login: "me" }, search: { nodes: [{ number: n, reviewThreads: { nodes: [{ isResolved: false, all: { totalCount: 1 }, first: { nodes: [{ author: { __typename: "User" } }] }, last: { nodes: [{ author: { login: "alice" } }] } }] } }] } } });
```

  (`THREADS_QUERY` importé de `./github.js`.) Le test existant « fetchGh pr » devient faux (il ne répond pas à la
  requête des fils et attend deux appels) : il répond `threads(7)` à `isGraphql`, attend
  `[["#5", "toReview", "bob"], ["#7", "feedback", "0/2"]]`, et les appels `[LIST(author), LIST(search), GRAPHQL]`
  triés. Le cas `ok("[]")` répond `threads(0)` aux fils. Nouveaux cas :
  - fils en échec (`{ code: 1, stderr: "HTTP 502" }` sur `isGraphql`, listes `[raw(7, "me")]` / `[]`) : groupes
    `["mineAll"]`, `fake.toasts` = `[{ title: "Retours non détectés", body: "HTTP 502", level: "warning" }]` ;
  - réponse des fils `ok("{}")` (schéma inattendu) : groupes `["mineAll"]`, un toast « Retours non détectés » ;
  - liste `--author` et fils en échec : `{ error: "HTTP 502" }`, `fake.toasts` vide ;
  - compte du profil `"me"` : `GRAPHQL` passe par `["sh", "-c", …, "sh", "me", "api", "graphql", …]` comme `LIST`
    (vérifier la forme d'un appel `ghCommand` existant dans le même fichier).

- [ ] **Step 3 : lancer, voir rouge**

Run: `node mods/start-work/github.test.js; node mods/start-work/launch.test.js`
Expected: FAIL (import `isPending` absent ; puis assertions `fetchGh`).

- [ ] **Step 4 : implémenter `github.js`**

`isPending(thread, me)` : une ligne par condition de la règle (Global Constraints) ; login via `?.` à chaque niveau,
comparé en minuscules. `feedbackNumbers(response)` : nœuds `response?.data?.search?.nodes ?? []`, garde ceux dont
un fil (`reviewThreads?.nodes ?? []`) est en attente pour `viewer.login` ; lève une `Error` (« réponse GraphQL
sans search.nodes ») si `data.search.nodes` n'est pas un tableau. `prRows` : `myGroup(raw, feedback)` en
fonction nommée (`null` → `mineAll`, dans le `Set` → `feedback`, sinon `mine`), puis tri stable par rang du groupe
dans `PR_GROUPS` (`toReview` d'abord). `metaColor` : couleur si `i.group` désigne un groupe de mes PR
(`feedback`, `mine`, `mineAll`). Commentaire `shortcut:` sur `THREADS_QUERY` : 50 PR, 100 fils par PR ; paginer si
un repo en a plus.

- [ ] **Step 5 : implémenter `launch.js`**

`fetchGh` : pour `pr`, `return await fetchPrs(repo, account, on)` dans le `try` existant (le `catch` → `ghError`
reste). `fetchPrs` : `Promise.all` des deux `ghList` (`PR_LISTS.toReview`, `PR_LISTS.mine`) et de
`fetchFeedback(repo, account, on)` ; après lui seulement (une liste en échec rejette avant), si `feedback.error` →
`notify({ title: "Retours non détectés", body: feedback.error, level: "warning" })` et `null`. `fetchFeedback` ne
rejette jamais : `{ numbers: feedbackNumbers(await json(...ghCommand(account, [...]), on)) }` ou
`{ error: e.message }`. Mettre à jour le commentaire de `fetchGh` (trois appels).

- [ ] **Step 6 : contexte entier au vert**

Run: `for f in mods/start-work/*.test.js; do node "$f" || exit 1; done && herdr-app check mods/start-work`
Expected: chaque `<nom> ok`, check réussi.

- [ ] **Step 7 : commit**

```bash
git add mods/start-work/github.js mods/start-work/launch.js mods/start-work/github.test.js mods/start-work/launch.test.js
git commit -m "✨ Start work : groupe Retours sur mes PR, détecté par les fils en attente

Co-Authored-By: <modèle de l'implémenteur>"
```

### Task 2 : Plus d'action sur Mes PR sans retour

§ spec : Ligne et actions, §2 (`start.js`, `main.js` `start`, `row`), §7 (`main.js` ne grossit pas).

**Files:**
- Modify: `mods/start-work/github.js` (`PR_GROUPS.mine` : retirer `kind`, `button`, `hint`)
- Modify: `mods/start-work/start.js` (`prFooter`)
- Modify: `mods/start-work/main.js` (`start`, `row`)
- Test: `mods/start-work/start.test.js`, `mods/start-work/main.test.js`

**Interfaces:**
- Consumes : `PR_GROUPS` de la tâche 1.
- Produces : `launchKind("pr", mine)` et `startLabel("pr", mine)` → `undefined` ; `footerText` → `"Entrée ouvrir"`
  pour `mine`.

- [ ] **Step 1 : tests rouges `start.test.js`** (les trois lignes `mine` existantes deviennent fausses : remplacées)

```javascript
assert.equal(launchKind("pr", prItem("feedback")), "comments");
assert.equal(launchKind("pr", prItem("mineAll")), "comments");
assert.equal(launchKind("pr", prItem("mine")), undefined);
assert.equal(startLabel("pr", prItem("feedback")), "Retours");
assert.equal(startLabel("pr", prItem("mine")), undefined);
assert.equal(footerText("pr", "macos", null, false, "feedback"), "Entrée ouvrir · Cmd+Entrée traiter les retours");
assert.equal(footerText("pr", "linux", null, false, "mineAll"), "Entrée ouvrir · Ctrl+Entrée traiter les retours");
assert.equal(footerText("pr", "linux", null, false, "mine"), "Entrée ouvrir");
```

- [ ] **Step 2 : tests rouges `main.test.js`**

  Ajouter `const feedback = { ...mine, group: "feedback" };`. Les tests « My PR: /pr 7 comments » et « PR: tab.new
  fails » passent à `feedback` (même attendu : `/pr 7 comments`, toast). Nouveau test :

```javascript
// Mes PR without feedback: no button, Ctrl+Enter starts nothing, Enter still opens.
{
  const { w, cx, enter } = dialog("pr", mine);
  w.render();
  assert.equal(fake.hidden, 1); // the row's button is invisible
  enter(true);
  await cx.settle();
  assert.deepEqual(fake.calls, []);
  enter();
  await cx.settle();
  assert.deepEqual(fake.calls, [["xdg-open", "https://github.com/o/r/pull/7"]]);
}
```

  Vérifier que ce test échoue sans la garde de `start` (aujourd'hui `launch(undefined)` lance `/bugfix`) et sans
  `Boolean(label)` dans `row` (sélectionnée, la ligne montre le bouton).

- [ ] **Step 3 : lancer, voir rouge**

Run: `node mods/start-work/start.test.js; node mods/start-work/main.test.js`
Expected: FAIL (`launchKind` rend `"comments"` pour `mine` ; `/pr 7 comments` lancé).

- [ ] **Step 4 : implémenter**

`github.js` : `mine` réduit à `{ id: "mine", label: "Mes PR" }`. `start.js` : `prFooter` rend `"Entrée ouvrir"`
quand le groupe n'a pas de `hint`. `main.js`, sans ajouter de ligne : garde `!launchKind(this.tab, item)` dans la
première condition de `start` ; dans `row`, le libellé calculé une fois dans la destructuration existante et
`shown: Boolean(label) && (n === this.at || this.hovered === key)`.

- [ ] **Step 5 : contexte entier au vert, `main.js` ≤ 200 lignes**

Run: `for f in mods/start-work/*.test.js; do node "$f" || exit 1; done && herdr-app check mods/start-work && wc -l mods/start-work/main.js`
Expected: chaque `<nom> ok`, check réussi, `200` ou moins.

- [ ] **Step 6 : commit**

```bash
git add mods/start-work/github.js mods/start-work/start.js mods/start-work/main.js mods/start-work/start.test.js mods/start-work/main.test.js
git commit -m "✨ Start work : Retours seulement sur mes PR qui ont des fils en attente

Co-Authored-By: <modèle de l'implémenteur>"
```

### Task 3 : Doc (README, glossaire, en-tête de main.js)

§ spec : — (§2, lignes `README.md`, `docs/domaine.md`, et commentaire `main.js:3` relevé à l'étape 1b).

**Files:**
- Modify: `README.md` (§ Start work, l. 22 et 25)
- Modify: `docs/domaine.md` (« Groupe de PR », « Mes PR », « Lancer le travail », « Traiter les retours »)
- Modify: `mods/start-work/main.js:3` (commentaire)

- [ ] **Step 1 : écrire**

README l. 22 : trois groupes (À relire, Retours sur mes PR, Mes PR) ; une de mes PR passe dans Retours sur mes PR
quand un de ses fils de relecture est en attente (non résolu, pas d'un bot, dernier commentaire pas de moi, ou mon
fil seul) ; les commentaires hors fil ne comptent pas ; si la détection échoue, toast « Retours non détectés » et Mes
PR comme avant. README l. 25 : `/pr <n> comments` (bouton « Retours ») seulement sur Retours sur mes PR ; Mes PR n'a
pas de bouton. Glossaire : « Groupe de PR » → « à relire, puis retours sur mes PR, puis mes PR » ; « Mes PR » garde
la définition de l'ensemble et ajoute « Le groupe Mes PR ne garde que celles sans fil en attente (toutes si la
détection des retours a échoué) », code `--author @me`, groupes `mine`, `mineAll` ; « Lancer le travail » et
« Traiter les retours » → « une PR à relire, ou une de mes PR qui a des retours (toutes, si la détection a
échoué) » ; colonne « Dans le code » : « Fil en attente » → `isPending`, « Retours sur mes PR » → groupe `feedback`,
`feedbackNumbers`. `main.js:3` : « on a PR: Relire, or
Retours on my PRs with pending threads ».

- [ ] **Step 2 : vérifier les termes retirés**

Run: `git grep -nF "en deux groupes" -- . ':!docs/superpowers'; git grep -nF "à relire, puis mes PR" -- . ':!docs/superpowers'; git grep -nF "Relire or Retours by group" -- .`
Expected: aucune sortie.

- [ ] **Step 3 : contexte entier au vert, puis commit**

Run: `for f in mods/start-work/*.test.js; do node "$f" || exit 1; done && herdr-app check mods/start-work`

```bash
git add README.md docs/domaine.md mods/start-work/main.js
git commit -m "📝 Start work : doc du groupe Retours sur mes PR

Co-Authored-By: <modèle de l'implémenteur>"
```

## Recette

Application native sans navigateur : un sous-agent ne peut pas la jouer.

- Substitut (contrôleur) : `herdr-app check mods/start-work`, puis la requête réelle de `fetchFeedback` sur
  `Dahiorus/herdr-tools` avec `is:open` retiré (aucune PR ouverte) : `feedbackNumbers` sur sa sortie rend `{6, 5}`
  ou `{}` selon les fils (dernier commentaire de Dahiorus → vide attendu), commande et résultat notés dans
  `recette.md`.
- **À faire par l'utilisateur** : sur un repo avec une de mes PR ouvertes ayant un fil non résolu d'un relecteur,
  ouvrir Start work (`ctrl-shift-i`) : titre `RETOURS SUR MES PR 1`, bouton « Retours », pied de page ; une de mes PR
  sans fil : dans `MES PR`, sans bouton, Ctrl+Entrée sans effet.
