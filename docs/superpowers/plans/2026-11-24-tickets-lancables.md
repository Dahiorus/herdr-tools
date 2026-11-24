# Tickets lançables — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** pour une source clé de projet, l'onglet Jira de Start work ne liste que les tickets lançables : « À faire »
ou « En cours » à moi, dans le sprint actif, sans bloqueur non terminé.

**Architecture :** `toJql` (`jira.js`) porte les critères 1 et 2 en JQL. Le critère 3 est une fonction de `jira.js`,
`withoutBlocked(items, search)`, qui reçoit la recherche `acli` en paramètre (testée sans `acli`) ; `fetchTickets`
(`launch.js`) l'appelle pour une source clé de projet seulement.

**Tech Stack :** JavaScript (mod Herdr), tests `node <fichier>.test.js` avec `node:assert/strict` et `fake.js`.

**Spec :** `docs/superpowers/specs/2026-11-24-tickets-lancables-design.md`

## Découpage en PR

Une seule PR, une seule story (P1) : 3 fichiers touchés hors tests, spec et plan (`jira.js`, `launch.js`,
`README.md`).

## Global Constraints

- Les trois critères ne valent que pour une source clé de projet ; filtre et JQL : JQL et liste inchangées, sans tri
  des tickets bloqués.
- JQL d'une clé de projet, exacte :
  `project = X AND sprint in openSprints() AND (status = "À faire" OR (status = "En cours" AND assignee = currentUser())) ORDER BY updated DESC`.
- Liens des tickets : `key in (<clés>) AND issueLinkType = "is blocked by"` ; bloqueurs non terminés d'un ticket :
  `issue in linkedIssues(<clé>, "is blocked by") AND statusCategory != Done`, `--limit 1`.
- Un échec d'une recherche de bloqueurs remonte comme erreur (`fetchTickets` rejette, `loadJira` l'affiche).
- Liste vide : « Rien d'ouvert », inchangé (aucun code).
- L'ordre de la liste ne change pas.
- `jira.js` reste sans import (commentaire de tête) ; aucune fonction de plus de 20 lignes ni plus d'un niveau de
  contrôle (grille qualité, `~/.claude/skills/feature/SKILL.md`, section « Grille qualité »).
- Tests : `node mods/start-work/jira.test.js`, `node mods/start-work/launch.test.js`, et pour le contexte entier
  chaque `mods/start-work/*.test.js`.

## Review Focus

1. Ticket « En cours » à moi et bloqué : il sort aussi de la liste (testé tâche 3).
2. Recherche des liens qui rejette (réseau, droits) : `fetchTickets` rejette, pas de liste partielle (testé tâche 4).
3. Source filtre ou JQL : aucune recherche de bloqueurs (testé tâche 4).
4. `currentUser()` et les nouvelles JQL via `acli` : non vérifiés (acli non connecté au moment du plan) ;
   à jouer en recette (substitut, tâche 5).
5. Projet sans statut « À faire » : Jira refuse la JQL, l'erreur s'affiche comme aujourd'hui (aucun code, décidé dans
   la spec).

## Traçabilité

| § spec | Exigence | Tâche | Test qui la prouve |
|---|---|---|---|
| §5 | `fetchTickets` figé avant modification | 1 | `launch.test.js` : bloc « fetchTickets (caractérisation) » |
| Critères 1 et 2 | JQL d'une clé de projet | 2 | `jira.test.js` : `toJql(" ABC ")`, `toJql("abc")` |
| Portée, filtre et JQL | branches filtre et JQL inchangées | 2 | `jira.test.js` : assertions `filter = 123`, JQL brute (existantes) |
| Portée, clé de projet seulement | `projectKey` reconnaît la clé, rien d'autre | 2 | `jira.test.js` : `projectKey("abc")`, `projectKey("filter=1")`, `projectKey("a = b")` |
| Critère 3 | bloqué ⇔ un bloqueur non terminé | 3 | `jira.test.js` : bloc « withoutBlocked » (retiré si la recherche `linkedIssues` rend un ticket) |
| Critère 3, combinés | deuxième seul bloqué : ordre gardé ; « En cours » à moi bloqué retiré | 3 | `jira.test.js` : cas `["A-1","A-2","A-3"]` |
| Critère 3, limites | première liste vide : aucune recherche ; aucun lien : pas de `linkedIssues` | 3 | `jira.test.js` : cas `[]` et cas sans lien |
| Critère 3, échec | une recherche qui rejette fait rejeter | 3, 4 | `jira.test.js` `assert.rejects` ; `launch.test.js` cas « liens en échec » |
| Portée, `fetchTickets` | tri seulement pour une clé de projet | 4 | `launch.test.js` : source `POSO` (3 appels search) / `filter=1` (1 appel) |
| Portée, README | doc à jour (glossaire déjà à jour : commit de la spec) | 5 | `git grep` des termes retirés |

Usages vérifiés à l'étape 1b :

| Symbole | Usages | Ce qu'ils deviennent | Test qui fige |
|---|---|---|---|
| `toJql` | `launch.js:11`, `jira.test.js:5-12` | `launch.js` inchangé ; 2 assertions de `jira.test.js` changent (tâche 2) | `jira.test.js` |
| `fetchTickets` | `jiraTab.js:32` | inchangé : reçoit une liste plus courte ou une erreur, comme avant | `launch.test.js` (tâches 1 et 4) |
| `"Rien d'ouvert"` | `main.js:183` | inchangé | — (aucun code touché) |
| recherches `acli` simulées | `main.test.js` (`isSearch`) | inchangé : sa fausse config (`"{}"`) n'a pas de source, `fetchTickets` n'y est pas appelé | `main.test.js` (passe tel quel) |

---

### Task 1 : caractérisation de `fetchTickets`

§5 de la spec.

**Files :**
- Test : `mods/start-work/launch.test.js` (ajout juste avant le `console.log("launch ok")` final)

**Interfaces :**
- Consumes : `fetchTickets(source, machine)` de `launch.js` (existant), à ajouter à l'import dynamique ligne 5.
- Produces : constantes de test `SITE_OK`, `isAuth`, `RAW_TICKET`, réutilisées par la tâche 4.

Noms de premier niveau déjà pris dans ce fichier (ne pas redéclarer) : `ok`, `ticket`, `opts`, `gitOk`, `ON`, `seen`,
`ISSUES`, `FIXING`, `isFixing`, `issue12`, `fixes12`, `issueRowsOut`, `LIST`, `raw`, `GRAPHQL`, `isGraphql`,
`threads`, `prs`, `rows`.

- [ ] **Step 1 : écrire les tests (comportement actuel, vert attendu)**

```javascript
// fetchTickets (caractérisation) : search + auth status sur la machine du repo, site pris dans auth status.
const SITE_OK = ok("✓ Authenticated\n  Site: x.atlassian.net\n");
const isAuth = (a) => a[1] === "auth";
const RAW_TICKET = { key: "POSO-1", fields: { summary: "S", issuetype: { name: "Story" }, status: { name: "À faire", statusCategory: { key: "new" } }, assignee: null } };
let ticketOpts = [];
reset((_c, a, o) => { ticketOpts.push(o); return isAuth(a) ? SITE_OK : ok(JSON.stringify([RAW_TICKET])); });
assert.deepEqual(await fetchTickets("filter=1", "vps"), [
  { id: "POSO-1", title: "S", meta: "À faire", url: "https://x.atlassian.net/browse/POSO-1", type: "Story", statusName: "À faire", statusCategory: "new", assigneeName: "" },
]);
assert.deepEqual(fake.calls, [
  ["acli", "jira", "workitem", "search", "--jql", "filter = 1", "--fields", "key,summary,status,assignee,issuetype", "--limit", "50", "--json"],
  ["acli", "jira", "auth", "status"],
]);
assert.deepEqual(ticketOpts, [{ on: "vps" }, { on: "vps" }]);
reset((_c, a) => (isAuth(a) ? ok("✓ Authenticated\n") : ok("[]")));
await assert.rejects(fetchTickets("filter=1", null), /site Jira absent de acli jira auth status/);
reset((_c, a) => (isAuth(a) ? { code: 1, stdout: "", stderr: "unauthorized: use acli jira auth login\n" } : ok("[]")));
await assert.rejects(fetchTickets("filter=1", null), /^Error: unauthorized: use acli jira auth login$/);
```

La source `filter=1` est voulue : sa JQL ne change pas dans cette feature, ce bloc reste vert jusqu'au bout.

- [ ] **Step 2 : lancer** `node mods/start-work/launch.test.js` — attendu : `launch ok` (vert : c'est une
  caractérisation, rejouée sur le code actuel au moment du plan). Preuve qu'il couvre le code : remplacer
  temporairement `/Site:\s*(\S+)/` par `/Sitex:\s*(\S+)/` dans `launch.js`, relancer (rouge attendu : rejet « site
  Jira absent »), remettre, relancer (vert). Le rapport cite les deux sorties.
- [ ] **Step 3 : contexte entier** : `for f in mods/start-work/*.test.js; do node "$f" || exit 1; done` — attendu :
  tous passent.
- [ ] **Step 4 : commit**

```bash
git add mods/start-work/launch.test.js
git commit -m "✅ Start work : caractériser fetchTickets

Co-Authored-By: <modèle de l'implémenteur>"
```

### Task 2 : critères 1 et 2 dans `toJql`

Spec : « Critères 1 et 2 », Portée (`toJql`).

**Files :**
- Modify : `mods/start-work/jira.js:16-24`
- Test : `mods/start-work/jira.test.js:3-6`

**Interfaces :**
- Produces : `export function projectKey(source: string): string | null` — la clé en majuscules si `source.trim()`
  est une clé de projet (`/^[A-Z][A-Z0-9_]+$/i`), sinon `null`. `toJql` l'utilise pour sa première branche.

- [ ] **Step 1 : tests (rouge attendu : `projectKey` absent, `SyntaxError` à l'import ; JQL différente)**

`mods/start-work/jira.test.js`, import ligne 3 complété par `projectKey`, lignes 5-6 remplacées :

```javascript
const SPRINT_JQL = (key) => `project = ${key} AND sprint in openSprints() AND (status = "À faire" OR (status = "En cours" AND assignee = currentUser())) ORDER BY updated DESC`;
assert.equal(toJql(" ABC "), SPRINT_JQL("ABC"));
assert.equal(toJql("abc"), SPRINT_JQL("ABC"));
assert.equal(projectKey(" abc "), "ABC");
assert.equal(projectKey("filter=1"), null);
assert.equal(projectKey("123"), null);
assert.equal(projectKey("assignee = currentUser()"), null);
```

Les assertions des lignes 7-12 (filtre, URL, JQL brute) restent telles quelles : elles figent les branches inchangées.

- [ ] **Step 2 : lancer** `node mods/start-work/jira.test.js` — attendu : échec (`projectKey` n'est pas exporté).
- [ ] **Step 3 : implémenter** `projectKey` dans `jira.js` et faire utiliser `projectKey(source)` par la première
  branche de `toJql`, avec la JQL exacte des Global Constraints.
- [ ] **Step 4 : lancer** `node mods/start-work/jira.test.js` — attendu : `jira ok`. Puis le contexte entier (commande
  de la tâche 1) — attendu : tous passent.
- [ ] **Step 5 : commit**

```bash
git add mods/start-work/jira.js mods/start-work/jira.test.js
git commit -m "✨ Start work : tickets à faire du sprint actif pour une clé de projet

Co-Authored-By: <modèle de l'implémenteur>"
```

### Task 3 : `withoutBlocked` (critère 3)

Spec : « Critère 3 », critères d'acceptation combinés, §7 (tri sorti de `fetchTickets`).

**Files :**
- Modify : `mods/start-work/jira.js` (ajout en fin de fichier)
- Test : `mods/start-work/jira.test.js` (ajout avant `console.log("jira ok")`)

**Interfaces :**
- Consumes : rien des tâches précédentes.
- Produces :
  - `export const linksJql = (keys: string[]) => string` → `key in (A-1, A-2) AND issueLinkType = "is blocked by"` ;
  - `export const openBlockersJql = (key: string) => string` →
    `issue in linkedIssues(A-1, "is blocked by") AND statusCategory != Done` ;
  - `export async function withoutBlocked(items: {key: string}[], search: (jql: string, limit: number) => Promise<{key: string}[]>): Promise<{key: string}[]>`
    — `items` tels que rendus par `acli` (champ `key`), même ordre en sortie. Aucun appel à `search` si `items` est
    vide ; une recherche `linksJql` (limite `items.length`) ; puis, en parallèle (`Promise.all`), une recherche
    `openBlockersJql` (limite 1) par clé rendue ; un item dont cette recherche rend au moins un ticket est retiré.
    Un rejet de `search` fait rejeter `withoutBlocked`. Le filtre par item passe par une fonction nommée (un niveau de
    contrôle par fonction).

- [ ] **Step 1 : tests (rouge attendu : `withoutBlocked` absent, `SyntaxError` à l'import)**

Noms de premier niveau déjà pris dans `jira.test.js` : `assert`, `toJql`, `jiraSource`, `withSource`, `projectKey`,
`SPRINT_JQL`.

```javascript
// withoutBlocked: search(jql, limit) stands in for acli.
assert.equal(linksJql(["A-1", "A-2"]), 'key in (A-1, A-2) AND issueLinkType = "is blocked by"');
assert.equal(openBlockersJql("A-1"), 'issue in linkedIssues(A-1, "is blocked by") AND statusCategory != Done');
const fakeSearch = (answers) => {
  const asked = [];
  const search = async (jql, limit) => { asked.push([jql, limit]); const a = answers[jql] ?? []; if (a instanceof Error) throw a; return a; };
  return { asked, search };
};
const items3 = [{ key: "A-1" }, { key: "A-2" }, { key: "A-3" }];
// Deuxième seul bloqué (un bloqueur non terminé), troisième lié mais bloqueurs terminés : ordre gardé.
let s3 = fakeSearch({ [linksJql(["A-1", "A-2", "A-3"])]: [{ key: "A-2" }, { key: "A-3" }], [openBlockersJql("A-2")]: [{ key: "B-9" }] });
assert.deepEqual(await withoutBlocked(items3, s3.search), [{ key: "A-1" }, { key: "A-3" }]);
assert.deepEqual(s3.asked, [[linksJql(["A-1", "A-2", "A-3"]), 3], [openBlockersJql("A-2"), 1], [openBlockersJql("A-3"), 1]]);
// Liste vide : aucune recherche.
s3 = fakeSearch({});
assert.deepEqual(await withoutBlocked([], s3.search), []);
assert.deepEqual(s3.asked, []);
// Aucun lien : pas de recherche linkedIssues.
s3 = fakeSearch({});
assert.deepEqual(await withoutBlocked(items3, s3.search), items3);
assert.deepEqual(s3.asked, [[linksJql(["A-1", "A-2", "A-3"]), 3]]);
// Une recherche de bloqueurs qui échoue fait échouer le tout.
s3 = fakeSearch({ [linksJql(["A-1"])]: [{ key: "A-1" }], [openBlockersJql("A-1")]: new Error("réseau") });
await assert.rejects(withoutBlocked([{ key: "A-1" }], s3.search), /réseau/);
```

Le cas « deux bloqueurs, l'un terminé » et « mon ticket En cours bloqué » se jouent côté Jira (`statusCategory != Done`
dans la JQL, statut sans effet sur le tri) : le premier cas ci-dessus les couvre (un ticket est retiré dès que la
recherche rend un bloqueur, quel que soit son statut à lui).

- [ ] **Step 2 : lancer** `node mods/start-work/jira.test.js` — attendu : échec à l'import (`withoutBlocked`,
  `linksJql`, `openBlockersJql` absents).
- [ ] **Step 3 : implémenter** les trois exports dans `jira.js`.
- [ ] **Step 4 : lancer** `node mods/start-work/jira.test.js` — attendu : `jira ok` ; puis le contexte entier.
- [ ] **Step 5 : commit**

```bash
git add mods/start-work/jira.js mods/start-work/jira.test.js
git commit -m "✨ Start work : retirer les tickets bloqués par un ticket non terminé

Co-Authored-By: <modèle de l'implémenteur>"
```

### Task 4 : `fetchTickets` retire les tickets bloqués (clé de projet)

Spec : Portée (`fetchTickets`), « Critère 3 » (échec affiché comme erreur).

**Files :**
- Modify : `mods/start-work/launch.js:6-18`
- Test : `mods/start-work/launch.test.js` (ajout après le bloc de la tâche 1, avant `console.log("launch ok")`)

**Interfaces :**
- Consumes : `projectKey`, `withoutBlocked` (tâches 2 et 3) ; `SITE_OK`, `isAuth`, `RAW_TICKET` (tâche 1).
- Produces : `fetchTickets(source, machine)` inchangé en signature.

Après le `Promise.all` existant, et avant `ticketRow`, `fetchTickets` passe les items par `withoutBlocked` si
`projectKey(source)` n'est pas `null`, avec pour `search` :
`json("acli", ["jira", "workitem", "search", "--jql", jql, "--fields", "summary", "--limit", String(limit), "--json"], { on: machine })`
(`summary` et non `key` seul : `acli --fields key` rend `[null]`, voir le commentaire de `isMine`, `launch.js:53`).
Le site est lu avant le tri (une erreur de site reste prioritaire, comme aujourd'hui).

- [ ] **Step 1 : tests (rouge attendu : un seul appel `search`, POSO-2 encore listé)**

```javascript
// fetchTickets, clé de projet : liens puis bloqueurs, sur la machine du repo ; POSO-2 bloqué sort.
const twoTickets = [RAW_TICKET, { ...RAW_TICKET, key: "POSO-2" }];
const linksArgs = ["--jql", 'key in (POSO-1, POSO-2) AND issueLinkType = "is blocked by"', "--fields", "summary", "--limit", "2", "--json"];
const blockersArgs = ["--jql", 'issue in linkedIssues(POSO-2, "is blocked by") AND statusCategory != Done', "--fields", "summary", "--limit", "1", "--json"];
const jqlOf = (a) => a[a.indexOf("--jql") + 1];
let blockedOpts = [];
reset((_c, a, o) => {
  blockedOpts.push(o);
  if (isAuth(a)) return SITE_OK;
  if (jqlOf(a).startsWith("key in")) return ok('[{"key":"POSO-2"}]');
  if (jqlOf(a).startsWith("issue in")) return ok('[{"key":"POSO-9"}]');
  return ok(JSON.stringify(twoTickets));
});
assert.deepEqual((await fetchTickets("poso", "vps")).map((t) => t.id), ["POSO-1"]);
assert.deepEqual(fake.calls.slice(2), [["acli", "jira", "workitem", "search", ...linksArgs], ["acli", "jira", "workitem", "search", ...blockersArgs]]);
assert.ok(blockedOpts.every((o) => o.on === "vps"));
// Source filtre : aucune recherche de bloqueurs.
reset((_c, a) => (isAuth(a) ? SITE_OK : ok(JSON.stringify(twoTickets))));
assert.deepEqual((await fetchTickets("filter=1", null)).map((t) => t.id), ["POSO-1", "POSO-2"]);
assert.equal(fake.calls.length, 2);
// Liens en échec : fetchTickets rejette avec la première ligne d'acli.
reset((_c, a) => (isAuth(a) ? SITE_OK : jqlOf(a).startsWith("key in") ? { code: 1, stdout: "", stderr: "✗ Error: forbidden\n" } : ok(JSON.stringify(twoTickets))));
await assert.rejects(fetchTickets("POSO", null), /forbidden/);
```

Noms ajoutés, absents du fichier : `twoTickets`, `linksArgs`, `blockersArgs`, `jqlOf`, `blockedOpts`.

- [ ] **Step 2 : lancer** `node mods/start-work/launch.test.js` — attendu : échec sur le premier `assert.deepEqual`
  (`["POSO-1", "POSO-2"]`).
- [ ] **Step 3 : implémenter** dans `launch.js` (import de `projectKey`, `withoutBlocked` depuis `./jira.js`).
- [ ] **Step 4 : lancer** `node mods/start-work/launch.test.js` puis le contexte entier — attendu : tous passent.
- [ ] **Step 5 : `herdr-app check mods/start-work`** — attendu : sortie sans erreur.
- [ ] **Step 6 : commit**

```bash
git add mods/start-work/launch.js mods/start-work/launch.test.js
git commit -m "✨ Start work : l'onglet Jira ne liste que les tickets lançables

Co-Authored-By: <modèle de l'implémenteur>"
```

### Task 5 : documentation et substitut de recette

— (mise à jour de la doc).

**Files :**
- Modify : `README.md:40-42`

- [ ] **Step 1 : README.** Après la phrase « …ou du JQL. », ajouter :

```markdown
Pour une clé de projet, l'onglet ne liste que les tickets lançables : au statut « À faire », ou « En cours » et
attribués à moi, dans le sprint actif, et sans bloqueur non terminé (lien Jira « is blocked by »). Un filtre ou du JQL
est pris tel quel.
```

- [ ] **Step 2 : grep des termes retirés**

```bash
git grep -nF 'statusCategory != Done ORDER BY' -- . ':!docs/superpowers'
git grep -nF 'statusCategory != Done ORDER BY' -- docs/superpowers/plans/2026-11-24-tickets-lancables.md docs/superpowers/specs/2026-11-24-tickets-lancables-design.md
```

Attendu : aucune ligne pour le premier (avant la tâche 2 : `jira.js:19`, `jira.test.js:5-6`) ; pour le second,
seulement la ligne 30 de la spec (§ « Existant ») et les deux commandes ci-dessus dans ce plan.

- [ ] **Step 3 : substitut de recette (acli connecté requis, à faire par le contrôleur ou l'utilisateur)**

```bash
acli jira workitem search --jql 'project = POSO AND sprint in openSprints() AND (status = "À faire" OR (status = "En cours" AND assignee = currentUser())) ORDER BY updated DESC' --fields "key,summary,status,assignee,issuetype" --limit 50 --json
acli jira workitem search --jql 'key in (POSO-139, POSO-143) AND issueLinkType = "is blocked by"' --fields summary --limit 2 --json
acli jira workitem search --jql 'issue in linkedIssues(POSO-139, "is blocked by") AND statusCategory != Done' --fields summary --limit 1 --json
```

Attendu : JSON valide pour chacune. Première commande : chaque ticket rendu est au statut « À faire », ou « En cours »
avec pour assigné le compte connecté à `acli`, sans aucun « PR OK », « Backlog » ni « Selected for Development ».
Deuxième : rend POSO-139. Troisième : rend un ticket tant que POSO-131 n'est pas terminé.

Recette visuelle, à faire par l'utilisateur (onglet Jira de `softwarevidal/renoshield` dans Herdr) :
- POSO-139 est absent tant que POSO-131 n'est pas terminé ;
- la liste égale le résultat de la première commande moins les tickets bloqués, dans le même ordre ;
- une source `filter=…` (un autre repo, ou en éditant `.config.json`) donne la même liste qu'avant la feature.

- [ ] **Step 4 : commit**

```bash
git add README.md
git commit -m "📝 Start work : documenter les tickets lançables

Co-Authored-By: <modèle de l'implémenteur>"
```
