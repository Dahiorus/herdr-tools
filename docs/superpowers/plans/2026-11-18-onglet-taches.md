# Onglet Tâches de Start work — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** dans un repo sans Jira, Start work montre un onglet « Tâches » à la place de « Jira » : les tâches ouvertes de
la section Features du reste à faire, leur description à droite, et Lancer démarre `/feature` sur l'une d'elles.

**Architecture:** les règles pures (choix du fichier, lecture des tâches, choix de l'onglet, nom d'onglet) vont dans
`tasks.js` ; le profil sans Jira dans `profile.js` ; la lecture du fichier (git, `readTextFile`) dans `launch.js`.
L'onglet Jira sort de `main.js` vers `jiraTab.js` (§7) pour faire de la place ; `main.js` ne garde que
l'enchaînement et l'état d'affichage.

**Tech Stack:** JavaScript gpui-kit (mod Herdr), `git`, `herdr-app do`, node pour les tests (`node:assert/strict`,
`fake.js`).

**Spec:** `docs/superpowers/specs/2026-11-18-onglet-taches-design.md`

## Découpage en PR

Fichiers touchés hors tests, spec et plan : `main.js`, `rows.js`, `start.js`, `launch.js`, `profile.js`, `fake.js`,
`mod.json`, `README.md`, nouveaux `tasks.js` et `jiraTab.js` (10, `docs/domaine.md` déjà commité). **Une seule PR** :
filet (tâche 1), refacto (tâche 2), P1 (tâches 3 à 7), P2 (tâches 8 et 9). Livrées ensemble, l'état « P1 sans P2 »
n'est jamais publié, mais chaque story a ses tests.

## Traçabilité

Tous les chemins de test sont sous `mods/start-work/`.

| Exigence (§ spec) | Tâche | Test qui la prouve |
|---|---|---|
| §5 : `load` vidal avec source charge PR, Issues, Jira ; `Tab` Jira → PR, `Shift+Tab` PR → Jira | 1 | `main.test.js` « caractérisation load vidal » (vert avant toute modification) |
| §7 : `loadJira`/`saveJira` sortent dans `jiraTab.js`, sans changement | 2 | `main.test.js` existant (rechargements Jira, saisie) + caractérisation de la tâche 1, inchangés |
| §7 : corps de la liste dans `rows.js` (`listBody`) ; `main.js` ≤ 200 lignes, `render` ≤ 40 | 2, 6, 8 | `wc -l mods/start-work/main.js` ≤ 200 à chaque tâche |
| Choix du fichier : `reste-a-faire.md`/`todo.md`, casse ignorée ; `docs/` l'emporte ; erreurs « Pas de… », « Plusieurs… » | 3 | `tasks.test.js` « remainingWorkFile » (6 cas) |
| Section Features seule (titre commençant par « Feature », casse ignorée), même après Corrections ; absente → `null` | 3 | `tasks.test.js` « parseTasks sections » |
| Tâche = numéro ou puce en colonne 0 + suite indentée, sous-listes comprises ; paragraphe hors liste exclu | 3 | `tasks.test.js` « parseTasks fixture » (description de t6) |
| `~~` ou `[x]`/`[X]` en tête : cachée, même suivie de texte ; `[ ]` retiré | 3 | `tasks.test.js` « parseTasks fixture » (lignes 9, 10, 11) |
| Titre : gras d'ouverture, sinon jusqu'au premier « : » ; sans backticks ni italiques | 3 | `tasks.test.js` « titres » (`scorecards-pdf.js`, « Sans gras ») |
| Identifiant : numéro, sinon `#n` ouvrant la parenthèse après le gras, sinon `""` ; « (PR #131) » non pris | 3 | `tasks.test.js` « parseTasks fixture » (ids) |
| Bloc de code ``` : titres et puces à l'intérieur restent dans la description, indentés ou non | fix finale | `tasks.test.js` « Fenced code » |
| Clé interne unique par position (`t<ligne>`) | 3 | `tasks.test.js` « parseTasks fixture » (clés) |
| CRLF lu comme LF | 3 | `tasks.test.js` « CRLF » |
| Fichier réel de GECCO : chaque point non rayé de Features listé, aucun d'une autre section | 3 | commande node de l'étape 6 de la tâche 3 |
| Repo sans Jira : profil sans Jira, ou pas de source et un reste à faire avec Features | 3, 4, 6 | `profile.test.js` « noJira » ; `tasks.test.js` « repoWithoutJira » ; `main.test.js` « choix de l'onglet » (cas 1 à 13) |
| Lecture sur la machine du terminal ; erreurs « Reste à faire illisible : … », fichier absent | 5 | `launch.test.js` « fetchTasks » (machine `vps`, échec git, lecture qui rejette, `null`) |
| Pendant le chargement : « PR · Issues » seulement | 6 | `main.test.js` « en-tête pendant le chargement » |
| `Tab` / `Shift+Tab` entre Tâches et PR | 6 | `main.test.js` cas 1 |
| ↓ change la sélection ; clic = sélection sans navigateur ; Entrée sans effet ; filtre « campagne » | 6 | `main.test.js` « parcours de l'onglet Tâches » |
| Profil sans Jira : erreurs dans l'onglet Tâches ; fichier sans Features → « Rien d'ouvert » | 6 | `main.test.js` cas 12 et 14 |
| P1 : pas de Lancer, Ctrl+Entrée sans effet, pied masqué | 6 | `main.test.js` « Ctrl+Entrée en P1 » ; `start.test.js` « footerText task P1 » |
| Fenêtre 960 px | 6 | `grep '"width": 960' mods/start-work/mod.json` |
| Panneau de description, toute la hauteur de la fenêtre (amendé à la recette), rendu markdown | 6 | `herdr-app check` + recette visuelle (utilisateur) |
| P2 : `/feature <texte> (<chemin>, point N)`, `issue #n`, sans identifiant ; onglet nommé d'après le titre, coupé à 30 | 8 | `start.test.js` « agentTask task » (3 cas) ; `tasks.test.js` « taskName » ; `main.test.js` « Lancer une tâche » |
| P2 : `tab.new` en erreur → « Agent non lancé », dialogue ouvert, liste inchangée | 8 | `main.test.js` « Lancer une tâche refusé » |
| P2 : issue toujours `/bugfix <url>`, onglet `#12` | 8 | `main.test.js` existant « Issue: Ctrl+Enter » ; `launch.test.js` mis à jour |
| P2 : garde pendant un lancement (Entrée, Échap, `×`, clic, second Lancer) | 8 | `main.test.js` « tâche en cours de lancement » |
| §4 P1 : deux puces sans identifiant, survol et id de ligne uniques | 10 | `main.test.js` « tâches sans identifiant : survol » |
| P2 : pied « Ctrl+Entrée lancer le travail » (Cmd sur macOS), masqué si vide | 8 | `start.test.js` « footerText task » (3 cas) |
| §2 : README (P1, P2) | 7, 9 (—) | greps des tâches 7 et 9 |

Usages vérifiés (étape 1b) : `TABS` n'est lu que par `on_key_down` et `header` (`main.js`) ; `listRow` seulement par
`render` ; `launchAgent` par `main.js` `launch` et `launch.test.js` (3 appels) ; `agentTask` et `footerText` par
`main.js` et `start.test.js` ; `readTextFile` par `load` et `loadJira` ; `busy`/`hovered`/`item.id` dans `main.js`
seulement ; `mod.json` lu par Herdr seul. Les tests existants de `main.test.js` comptent sur `readTextFile` → `"{}"`
(repli gardé par `fake.js`). Aucun autre mod n'importe `start-work`. `filter.js`, `github.js`, `jira.js`, `run.js` et
`.config.json` restent inchangés.

## Global Constraints

- Messages au mot près : « Pas de reste à faire dans owner/repo. `/todo add` le crée dans docs/reste-a-faire.md. »,
  « Plusieurs reste à faire : a/todo.md, b/TODO.md. Garde-en un seul, ou mets-le dans docs/. »,
  « Reste à faire illisible : <première ligne> », « Rien d'ouvert », « Agent non lancé », libellé d'onglet « Tâches ».
- Start work lit le reste à faire et ne l'écrit jamais ; aucun appel `acli` dans l'onglet Tâches.
- Le plugin regardé : `atlassian@claude-plugins-official`, dans `enabledPlugins` du profil ; « sans Jira » = `false`.
- Grille qualité : fonction ≤ 20 lignes (composant d'interface ≤ 40), fichier ≤ 200 lignes ; aucun nom de la colonne
  « À ne pas dire » de `docs/domaine.md` (pas de `index`, `rang`, `todo`, `détail` dans les noms).
- Tests : `cd ~/.config/herdr-app && for f in mods/start-work/*.test.js; do node "$f" || exit 1; done`, puis
  `herdr-app check ~/.config/herdr-app/mods/start-work`, après chaque tâche.
- Commits : gitmoji en tête, message en français, terminé par `Co-Authored-By: <modèle de l'implémenteur>`.

## Review Focus

1. Reste à faire en CRLF (checkout Windows) : mêmes tâches qu'en LF → test « CRLF » de la tâche 3.
2. Suite indentée par tabulation ou par 2 espaces, sous-liste à 3 espaces : fait partie de la description → fixture
   de la tâche 3 (lignes 7, 8) et test « tabulation ».
3. Le vrai fichier de GECCO (sections dans l'ordre réel, titres avec backticks, `(*hors périmètre*, …)`) → commande
   node de la tâche 3, étape 6.
4. Profil sans Jira dont le fichier n'a pas de section Features : onglet Tâches avec « Rien d'ouvert », jamais l'onglet
   Jira → cas 14 de la tâche 6.
5. Terminal sur une autre machine : `git` et la lecture partent sur cette machine (`on`) → test « fetchTasks vps » de
   la tâche 5.

---

### Task 1 : Caractérisation de `load` et du cycle des onglets (§5)

**Files:**
- Modify: `mods/start-work/fake.js`
- Test: `mods/start-work/main.test.js`

**Interfaces:**
- Produces : `fake.files` (chemin → texte, `null` ou `Error` ; chemin absent → `"{}"`), `fake.reads` (`[path, opts]`
  par lecture), `fake.writes` (`[path, text]` par `writeTextFile`), `reset(respond, files = {})`. Dans `main.test.js` : constantes `PROFILES`, `CONFIG`, `TODO`,
  `VIDAL`, `PERSO`, `FEATURES`, `respondLoad(ls)` et `loaded(files, ls)` réutilisés aux tâches 6 et 8.

- [ ] **Step 1 : `fake.js` répond par fichier**

`reset(respond, files = {})` remet aussi `files`, `reads` et `writes`. `writeTextFile(path, text)` pousse `[path, text]` dans `fake.writes`. `readTextFile(path, opts)` pousse `[path, opts]` dans
`fake.reads`, lève la valeur si c'est une `Error`, rend `fake.files[path]` si la clé existe (même `null`), sinon `"{}"`.

- [ ] **Step 2 : Écrire la caractérisation (vert attendu sur le code actuel)**

```js
const PROFILES = "/home/.claude/profiles.json", CONFIG = "/app/mods/start-work/.config.json", TODO = "/repo/docs/reste-a-faire.md";
const profile = (on) => `{"p":{"owners":["o"],"account":"me","enabledPlugins":{"atlassian@claude-plugins-official":${on}}}}`;
const [VIDAL, PERSO] = [profile(true), profile(false)];
const FEATURES = "# Reste à faire\n\n## Features\n\n1. **Duels en concours Campagne** : les tableaux.\n2. **Autre** : x.\n";
// git, gh (direct or through sh -c with the profile's account) and acli, for a loading dialog on o/r at /repo.
const respondLoad = (ls) => (c, a) => {
  if (c === "git") return a[0] === "remote" ? ok("git@github.com:o/r.git\n") : a[0] === "rev-parse" ? ok("/repo\n") : ok(ls);
  if (c === "acli") return a[1] === "auth" ? ok("Site: x.atlassian.net") : ok("[]");
  return ok("[]"); // gh pr/issue list
};
async function loaded(files, ls = "docs/reste-a-faire.md\0") {
  reset(respondLoad(ls), files);
  const cx = makeCx();
  const w = new StartWork();
  w.init({}, cx);
  Object.assign(w, { space: "s1", cwd: "/repo", machine: null });
  await w.load(cx);
  await cx.settle();
  const key = (k, shift = false) => { w.render(); fake.keyDown({ key: k, modifiers: { shift } }, cx); };
  return { w, cx, key };
}

// Characterization (§5): a vidal repo with a Jira source loads PR, Issues and Jira; Tab cycles through them.
{
  const { w, key } = await loaded({ [PROFILES]: VIDAL, [CONFIG]: '{"jira":{"o/r":"ABC"}}' });
  assert.deepEqual([w.lists.pr, w.lists.issue, w.lists.jira], [[], [], []]);
  w.tab = "jira"; key("tab");
  assert.equal(w.tab, "pr");
  key("tab", true);
  assert.equal(w.tab, "jira");
}
```

- [ ] **Step 3 : Lancer, vert attendu**

Run : `node mods/start-work/main.test.js` → `main ok`. Puis retirer `this.loadJira(cx)` du `Promise.all` de `load` :
le test doit échouer (`w.lists.jira` reste `null`) ; remettre.

- [ ] **Step 4 : Suite complète et commit**

```bash
git add mods/start-work/fake.js mods/start-work/main.test.js
git commit -m "✅ Start work : caractérisation du chargement et du cycle des onglets

Co-Authored-By: <modèle de l'implémenteur>"
```

### Task 2 : Sortir l'onglet Jira et le corps de la liste de `main.js` (§7)

**Files:**
- Create: `mods/start-work/jiraTab.js`
- Modify: `mods/start-work/main.js`, `mods/start-work/rows.js`

**Interfaces:**
- Produces : `loadJira(view, cx)`, `saveJira(view, source, cx)` dans `jiraTab.js` (mêmes corps, `this` → `view`,
  `CONFIG` et `FIX` déplacés) ; `listBody(rows, scroll, height)` dans `rows.js` → `v_flex().id("sw-list")…` avec les
  enfants donnés ; méthode `row(i, n, t)` de `main.js` qui construit le `listRow` actuel.

- [ ] **Step 1 : Déplacer `loadJira`/`saveJira`** ; les 6 appels de `main.js` deviennent `loadJira(this, cx)` /
  `saveJira(this, …, cx)`. Imports `writeTextFile`, `appHome`, `jiraSource`, `withSource`, `fetchTickets` retirés de
  `main.js` s'ils n'y servent plus.
- [ ] **Step 2 : `listBody` et `row`** : `render` appelle
  `listBody(items.map((i, n) => this.row(i, n, t)), this.scroll).flex_1()` (amendé en relecture : la liste de tous
  les onglets prend toute la hauteur, comme celle des tâches).
- [ ] **Step 3 : Vérifier** : suite complète verte (aucun test modifié), `herdr-app check` passe,
  `wc -l mods/start-work/main.js` ≤ 165, `render` ≤ 40 lignes.
- [ ] **Step 4 : Commit** `♻️ Start work : onglet Jira dans jiraTab.js, corps de la liste dans rows.js`
  (+ `Co-Authored-By: <modèle de l'implémenteur>`).

### Lot parallélisable : tâches 3 et 4

Tâche 3 : `mods/start-work/tasks.js`, `mods/start-work/tasks.test.js`. Tâche 4 : `mods/start-work/profile.js`,
`mods/start-work/profile.test.js`. Aucun fichier commun, aucune dépendance.

### Task 3 : Lire les tâches du reste à faire (P1)

**Files:**
- Create: `mods/start-work/tasks.js` (pur, sans import), `mods/start-work/tasks.test.js`

**Interfaces:**
- Produces :
  - `remainingWorkFile(paths: string[], repo: string) → {path} | {error}` ;
  - `parseTasks(md: string) → null | Task[]`, `Task = {key: "t<ligne>", id: string, title: string, description: string, meta: ""}` ;
  - `repoWithoutJira(noJiraProfile: boolean, found) → boolean` = `noJiraProfile || Array.isArray(found?.tasks)` ;
  - `taskList(found) → {error} | Task[]` (`found.error` → `{error}`, sinon `found.tasks ?? []`) ;
  - `taskName(item) → string` (titre coupé à 30 caractères, fin blanche retirée).

- [ ] **Step 1 : Écrire les tests**

```js
// Run: node mods/start-work/tasks.test.js
import assert from "node:assert/strict";
import { remainingWorkFile, parseTasks, repoWithoutJira, taskList, taskName } from "./tasks.js";

// remainingWorkFile
assert.deepEqual(remainingWorkFile(["src/a.js", "docs/reste-a-faire.md"], "o/r"), { path: "docs/reste-a-faire.md" });
assert.deepEqual(remainingWorkFile(["TODO.md"], "o/r"), { path: "TODO.md" });
assert.deepEqual(remainingWorkFile(["docs/reste-a-faire.md", "notes/todo.md"], "o/r"), { path: "docs/reste-a-faire.md" });
assert.deepEqual(remainingWorkFile(["src/a.js"], "o/r"), { error: "Pas de reste à faire dans o/r. `/todo add` le crée dans docs/reste-a-faire.md." });
assert.deepEqual(remainingWorkFile(["a/todo.md", "b/TODO.md"], "o/r"), { error: "Plusieurs reste à faire : a/todo.md, b/TODO.md. Garde-en un seul, ou mets-le dans docs/." });
assert.deepEqual(remainingWorkFile(["docs/todo.md", "docs/x/reste-a-faire.md", "c/todo.md"], "o/r"), { error: "Plusieurs reste à faire : docs/todo.md, docs/x/reste-a-faire.md. Garde-en un seul, ou mets-le dans docs/." });

// parseTasks: fixture, line numbers on the left (not in the file).
const FIXTURE = [
  /* 0 */ "# Reste à faire", "", "Intro hors liste.", "",
  /* 4 */ "## Features", "",
  /* 6 */ "1. **Duels en concours Campagne** : les tableaux", "   ne couvrent que TAEI.", "   - sous-point",
  /* 9 */ "2. ~~**Fait**~~ (PR #135) Caduc : remplacé.", "3. [x] **Coché** : fini.", "4. [ ] **À cocher** : reste.",
  /* 12 */ "- **Puce** (#42, spec) : texte.", "- **Puce citée** : voir (PR #131).", "- Sans gras : texte `code`.",
  /* 15 */ "", "Paragraphe hors liste.",
  /* 17 */ "## Corrections", "", "5. **Correction** : non listée.",
].join("\n");
const tasks = parseTasks(FIXTURE);
assert.deepEqual(tasks.map((t) => [t.key, t.id, t.title]), [
  ["t6", "1", "Duels en concours Campagne"], ["t11", "4", "À cocher"], ["t12", "#42", "Puce"],
  ["t13", "", "Puce citée"], ["t14", "", "Sans gras"],
]);
assert.equal(tasks[0].description, "**Duels en concours Campagne** : les tableaux\nne couvrent que TAEI.\n- sous-point");
assert.equal(tasks[1].description, "**À cocher** : reste.");
assert.equal(tasks[4].description, "Sans gras : texte `code`.");
assert.ok(tasks.every((t) => t.meta === ""));
// CRLF
assert.deepEqual(parseTasks(FIXTURE.replaceAll("\n", "\r\n")), tasks);
// Tab-indented continuation; [X] upper case is done.
assert.equal(parseTasks("## Features\n1. **A** : x\n\tsuite\n2. [X] **B** : y")[0].description, "**A** : x\nsuite");
// Features after Corrections, case ignored; no Features → null; ### only closes the item.
assert.deepEqual(parseTasks("## Corrections\n- **C** : c\n## features à venir\n- **F** : f").map((t) => t.title), ["F"]);
assert.equal(parseTasks("# Idées\n- **A** : a"), null);
assert.equal(parseTasks("## Features\n1. **A** : a\n### Détail\n   pas dans A")[0].description, "**A** : a");
// Titles: backticks and italics removed.
assert.equal(parseTasks("## Features\n54. **`assets/print/scorecards-pdf.js` au-delà de 200 lignes** (*dette*) : x")[0].title, "assets/print/scorecards-pdf.js au-delà de 200 lignes");
assert.equal(parseTasks("## Features\n- Un *mot* sans gras")[0].title, "Un mot sans gras"); // no colon: the whole line

// repoWithoutJira / taskList / taskName
assert.equal(repoWithoutJira(true, { error: "x" }), true);
assert.equal(repoWithoutJira(false, { tasks: [] }), true);
assert.equal(repoWithoutJira(false, { tasks: null }), false);
assert.equal(repoWithoutJira(false, { error: "x" }), false);
assert.deepEqual(taskList({ error: "x" }), { error: "x" });
assert.deepEqual(taskList({ tasks: null }), []);
assert.equal(taskName({ title: "Recette navigateur des écrans du lot 5" }), "Recette navigateur des écrans");
console.log("tasks ok");
```

- [ ] **Step 2 : Lancer, rouge attendu** : `node mods/start-work/tasks.test.js` → `ERR_MODULE_NOT_FOUND` (tasks.js absent).

- [ ] **Step 3 : Implémenter `tasks.js`**

`remainingWorkFile` : noms `/(^|\/)(reste-a-faire|todo)\.md$/i` ; ceux qui commencent par `docs/` s'il y en a, sinon tous ;
un seul → `{path}`, plusieurs → l'erreur qui les liste dans l'ordre reçu.

`parseTasks` : une passe sur `md.split(/\r?\n/)`, une tâche en cours fermée par les cas ci-dessous.

```
ligne ``` (avec espaces avant) → bascule `fenced` ; tant que `fenced`, toute ligne est ajoutée à la tâche en cours
                         (ni titre, ni puce, ni fin) ; hors section, ignorée
titre `#`               → ferme ; hors section
titre `##`              → ferme ; section = /^feature/i sur le texte du titre ; vu ||= section
titre `###` et plus      → ferme
hors section Features    → ignorée
/^(?:(\d+)\.|[-*])\s+(.*)/ → ferme ; nouvelle tâche {ligne, numéro, lignes: [reste]}
ligne vide ou indentée   → ajoutée à la tâche en cours, sans son premier retrait (/^(?: {1,4}|\t)/)
autre texte              → ferme
fin                      → ferme ; rend vu ? tâches : null
fermer : retire `[ ] ` en tête ; ignore si la 1re ligne commence par `~~` ou `[x]` (casse ignorée) ;
         description = lignes jointes par "\n", fin blanche retirée ;
         id = numéro, sinon /^\*\*.+?\*\*\s*\((#\d+)\b/, sinon "" ;
         titre = /^\*\*(.+?)\*\*/, sinon le texte avant le premier « : » (toute la ligne sans « : »), trim,
                 sans `` ` `` ni `*`, sans `_` entourant un mot
```

- [ ] **Step 4 : Lancer, vert attendu** : `node mods/start-work/tasks.test.js` → `tasks ok`.

- [ ] **Step 5 : Fichier réel de GECCO**

```bash
F=~/IdeaProjects/GECCO/docs/reste-a-faire.md
node --input-type=module -e 'import {parseTasks} from "./mods/start-work/tasks.js"; import fs from "node:fs"; console.log(parseTasks(fs.readFileSync(process.argv[1], "utf8")).map((t) => t.id).join(" "))' "$F"
awk '/^## /{p=/^## [Ff]eature/;next} /^# /{p=0} p' "$F" | grep -E '^[0-9]+\. ' | grep -vE '^[0-9]+\. +(~~|\[[xX]\])' | sed -E 's/\..*//' | tr '\n' ' '
```

Attendu : les deux lignes donnent les mêmes numéros, dans le même ordre (aucune puce dans la section Features de
GECCO aujourd'hui ; s'il y en a, elles s'ajoutent avec leur `#n` ou un vide).

- [ ] **Step 6 : Commit** `✨ Start work : lecture des tâches du reste à faire` (+ `Co-Authored-By: <modèle de l'implémenteur>`).

### Task 4 : Profil sans Jira (P1)

**Files:**
- Modify: `mods/start-work/profile.js`
- Test: `mods/start-work/profile.test.js`

**Interfaces:**
- Produces : `noJira(profilesText: string | null, owner: string) → boolean` : vrai si le profil dont les `owners`
  contiennent `owner` (casse ignorée, comme `profileAccount`) a `enabledPlugins["atlassian@claude-plugins-official"] === false`.
  Lève `SyntaxError` sur un JSON invalide. La recherche du profil devient une fonction partagée avec `profileAccount`.

- [ ] **Step 1 : Tests (rouge attendu : `noJira` n'est pas exporté)**

```js
const plugins = '{"vidal":{"owners":["Acme"],"enabledPlugins":{"atlassian@claude-plugins-official":true}},"perso":{"owners":["me"],"enabledPlugins":{"atlassian@claude-plugins-official":false}},"bare":{"owners":["x"]}}';
assert.equal(noJira(plugins, "ME"), true);
assert.equal(noJira(plugins, "acme"), false);
assert.equal(noJira(plugins, "x"), false); // plugin not mentioned
assert.equal(noJira(plugins, "nobody"), false);
assert.equal(noJira(null, "me"), false);
assert.throws(() => noJira("{", "me"), SyntaxError);
```

- [ ] **Step 2 : Implémenter**, puis `node mods/start-work/profile.test.js` → `profile ok`.
- [ ] **Step 3 : Commit** `✨ Start work : profil sans Jira` (+ `Co-Authored-By: <modèle de l'implémenteur>`).

### Task 5 : Lire le reste à faire sur la machine du terminal (P1)

**Files:**
- Modify: `mods/start-work/launch.js`
- Test: `mods/start-work/launch.test.js`

**Interfaces:**
- Consumes : `remainingWorkFile`, `parseTasks` (tâche 3) ; `sh` de `run.js` ; `firstLine` de `start.js`.
- Produces : `fetchTasks(repo: string, on: {cwd, on}) → Promise<{tasks: (Task & {path})[] | null} | {error}>`.
  `git rev-parse --show-toplevel` (avec `on`), puis `git ls-files -z` (avec `{...on, cwd: <racine>}`), puis
  `readTextFile(<racine>/<path>, { on: on.on })`. Code git non nul → `firstLine` ; rejet → message ; `null` →
  `<path> absent` ; toute erreur → `{error: "Reste à faire illisible : <première ligne>"}`. Erreurs de `remainingWorkFile`
  rendues telles quelles.

- [ ] **Step 1 : Tests (rouge attendu : `fetchTasks` n'est pas exporté)**

```js
// fetchTasks: git and the read on the terminal's machine; each failure worded « Reste à faire illisible : … ».
const gitOk = (c, a) => (a[0] === "rev-parse" ? ok("/r\n") : ok("docs/reste-a-faire.md\0src/a.js\0"));
const ON = { cwd: "/r/sub", on: "vps" };
let seen = [];
reset((c, a, o) => { seen.push(o); return gitOk(c, a); }, { "/r/docs/reste-a-faire.md": "## Features\n1. **A** : a" });
assert.deepEqual(await fetchTasks("o/r", ON), { tasks: [{ key: "t1", id: "1", title: "A", description: "**A** : a", meta: "", path: "docs/reste-a-faire.md" }] });
assert.deepEqual(fake.calls, [["git", "rev-parse", "--show-toplevel"], ["git", "ls-files", "-z"]]);
assert.deepEqual(seen, [ON, { cwd: "/r", on: "vps" }]);
assert.deepEqual(fake.reads, [["/r/docs/reste-a-faire.md", { on: "vps" }]]);
reset(gitOk, { "/r/docs/reste-a-faire.md": "# Idées" });
assert.deepEqual(await fetchTasks("o/r", ON), { tasks: null });
reset(gitOk, { "/r/docs/reste-a-faire.md": null });
assert.deepEqual(await fetchTasks("o/r", ON), { error: "Reste à faire illisible : docs/reste-a-faire.md absent" });
reset(gitOk, { "/r/docs/reste-a-faire.md": new Error("permission refusée\nligne 2") });
assert.deepEqual(await fetchTasks("o/r", ON), { error: "Reste à faire illisible : permission refusée" });
reset(() => ({ code: 128, stdout: "", stderr: "fatal: not a git repository\n" }));
assert.deepEqual(await fetchTasks("o/r", ON), { error: "Reste à faire illisible : fatal: not a git repository" });
reset((c, a) => (a[0] === "rev-parse" ? ok("/r\n") : ok("src/a.js\0")));
assert.deepEqual(await fetchTasks("o/r", ON), { error: "Pas de reste à faire dans o/r. `/todo add` le crée dans docs/reste-a-faire.md." });
```

- [ ] **Step 2 : Implémenter**, puis `node mods/start-work/launch.test.js` → `launch ok`.
- [ ] **Step 3 : Commit** `✨ Start work : lecture du reste à faire sur la machine du terminal` (+ `Co-Authored-By: <modèle de l'implémenteur>`).

### Task 6 : Onglet Tâches dans le dialogue (P1)

**Files:**
- Modify: `mods/start-work/main.js`, `mods/start-work/rows.js`, `mods/start-work/jiraTab.js`,
  `mods/start-work/start.js`, `mods/start-work/fake.js`, `mods/start-work/mod.json`
- Test: `mods/start-work/main.test.js`, `mods/start-work/start.test.js`

**Interfaces:**
- Consumes : `fetchTasks` (tâche 5), `noJira` (tâche 4), `repoWithoutJira`, `taskList` (tâche 3), `loadJira` (tâche 2).
- Produces :
  - `main.js` : `this.third` (`null` pendant le chargement, puis `"jira"` ou `"task"`) ; `tabs()` →
    `[["pr","PR"],["issue","Issues"]]` plus `[third, "Jira" | "Tâches"]` une fois choisi, lu par `on_key_down` et
    `header` à la place de `TABS` ; `loadThird(noJiraProfile, on, cx)` ; `rowClick(i, n, cx)` (onglet `task` : sélection,
    ignorée pendant un lancement ; sinon `open`) ; `this.lists` démarre à `{ pr: null, issue: null }`.
  - `jiraTab.js` : `hasJiraSource(view) → Promise<boolean>` (vrai si `.config.json` a une source pour `view.repo`, ou
    s'il est illisible : l'erreur actuelle de l'onglet Jira s'affiche alors).
  - `rows.js` : `descriptionPanel(item, t)` → `w(340)`, `h(400)`, défilant, `TextView.markdown("sw-md-" + item.key, item.description)` ;
    id de ligne et de bouton `i.key ?? i.id`.
  - `start.js` : `footerText("task", …)` → `null` (P1).
  - `fake.js` : exporte `TextView = { markdown: () => el }`.
  - `mod.json` : `"width": 960`.

- [ ] **Step 1 : Tests (rouge attendu : `w.tabs` n'est pas une fonction)**

Dans `main.test.js`, avec `loaded` de la tâche 1 (`labels = (w) => w.tabs().map(([, l]) => l)`,
`noTasksRead = () => !fake.calls.some((c) => c[1] === "ls-files")`). Le helper `dialog` reçoit
`third: tab === "task" ? "task" : "jira"`. Chaque cas est un bloc `{ … }` :

| Cas | `files` (et `ls`) | Attendu |
|---|---|---|
| 1 | `PERSO`, `TODO: FEATURES` | `labels` = PR, Issues, Tâches ; `lists.task.length` = 2 ; `CONFIG` jamais lu (`fake.reads`) ; `tab = "task"`, `key("tab")` → `pr` ; `key("tab", true)` → `task` |
| 2 | `PERSO`, `CONFIG` avec source `ABC`, `TODO: FEATURES` | onglet `task` (le profil l'emporte), `CONFIG` jamais lu |
| 3 | `VIDAL`, `CONFIG` avec source | onglet `jira`, `noTasksRead()` |
| 4 | `VIDAL`, `TODO: FEATURES` | onglet `task` |
| 5 | `VIDAL`, `ls = "src/a.js\0"` | onglet `jira`, `lists.jira.setup === true` |
| 6 | `VIDAL`, `TODO: "# Idées\n- x"` | onglet `jira`, `setup` |
| 7 | `VIDAL`, `ls = "a/todo.md\0b/TODO.md\0"` | onglet `jira`, `setup` |
| 8 | `VIDAL`, `TODO: new Error("io")` | onglet `jira`, `setup` |
| 9 | `PROFILES: "{}"`, `TODO: FEATURES` ; puis `TODO: "# Idées"` | `task` ; puis `jira` |
| 10 | `PROFILES: new Error("absent")`, `TODO: FEATURES` | `task` ; `lists.pr.error` = `${PROFILES} illisible : absent` |
| 11 | `VIDAL`, `CONFIG: new Error("io")`, `TODO: FEATURES` | `jira`, `lists.jira.error` commence par `.config.json illisible : io`, `noTasksRead()` |
| 12 | `PERSO`, `ls = "src/a.js\0"` | `task`, `lists.task.error` = « Pas de reste à faire dans o/r. `/todo add` le crée dans docs/reste-a-faire.md. » |
| 13 | `PERSO`, `CONFIG: new Error("io")`, `TODO: FEATURES` | `task` |
| 14 | `PERSO`, `TODO: "# Idées"` | `task`, `lists.task` = `[]` (« Rien d'ouvert ») |
| 15 | remote en échec (`git remote` code 1) | `labels` = PR, Issues, Jira ; `lists.jira.error` posée |

Plus :

```js
// While loading, the header shows PR and Issues only.
{ reset(); const w = new StartWork(); w.init({}, makeCx()); assert.deepEqual(w.tabs().map(([, l]) => l), ["PR", "Issues"]); }
// Tasks tab: ↓ selects the next task, a row click selects without a browser, Enter and Ctrl+Enter do nothing (P1), filter on title.
{
  const { w, cx, key } = await loaded({ [PROFILES]: PERSO, [TODO]: FEATURES });
  w.tab = "task"; const n = fake.calls.length;
  key("down"); assert.equal(w.at, 1);
  w.rowClick(w.items()[0], 0, cx); assert.equal(w.at, 0);
  w.input.fire("submit", { secondary: false }, cx); w.input.fire("submit", { secondary: true }, cx); await cx.settle();
  assert.equal(fake.calls.length, n); assert.deepEqual(fake.closed, []);
  w.filter = "campagne"; assert.deepEqual(w.items().map((i) => i.title), ["Duels en concours Campagne"]);
}
```

Le test « Ctrl+Entrée sans effet » ci-dessus est **rendu faux par la tâche 8** (nommé là-bas). Dans `start.test.js` :
`assert.equal(footerText("task", "linux", null, false), null)` (« footerText task P1 »), **rendu faux par la tâche 8**.

- [ ] **Step 2 : Lancer, rouge attendu** : `node mods/start-work/main.test.js` → `TypeError: w.tabs is not a function`.

- [ ] **Step 3 : Implémenter**

`load` : `originRepo` en erreur → `third = "jira"`, les trois listes en erreur (comme aujourd'hui). Sinon lit
`profiles.json` une fois : `account = profileAccount(text, owner)`, `noJiraProfile = noJira(text, owner)` ; en échec : erreur
actuelle sur PR et Issues, puis `loadThird(false, on, cx)` seul. Sinon `Promise.all` de PR, Issues et
`loadThird(noJiraProfile, on, cx)`.
`loadThird` : sans `noJiraProfile` et avec `hasJiraSource(this)` → `third = "jira"`, `loadJira(this, cx)` ; sinon
`fetchTasks(this.repo, on)` ; `repoWithoutJira` faux → `third = "jira"`, `loadJira` ; vrai → `third = "task"`,
`lists.task = taskList(found)`, `cx.notify()`. `open` exige `item?.url`. `start` ignore l'onglet `task` (P1). `row` :
`onClick` → `rowClick`, pas de `start` pour `pr` ni `task`. `render`, onglet `task` sans `status` :
`h_flex().gap(10)` de `listBody(rows, this.scroll, 400).flex_1()` et `descriptionPanel(items[this.at], t)`.

- [ ] **Step 4 : Vérifier** : suite complète verte, `herdr-app check` passe, `wc -l mods/start-work/main.js` ≤ 200,
  `render` ≤ 40 lignes, `grep '"width": 960' mods/start-work/mod.json`.

- [ ] **Step 5 : Commit** `✨ Start work : onglet Tâches et description du besoin` (+ `Co-Authored-By: <modèle de l'implémenteur>`).

### Task 7 : Documentation P1 (—)

**Files:** Modify: `README.md` (§ Start work et ligne de la table des mods)

- [ ] **Step 1 :** décrire l'onglet Tâches : quand il remplace Jira (profil sans Jira, ou pas de source et un reste à
  faire avec Features), le fichier lu (`reste-a-faire.md`/`todo.md`, `docs/` prioritaire), la section Features seule,
  les tâches rayées ou cochées cachées, la description à droite ; un repo du second cas qui veut l'onglet Jira reçoit sa
  source en éditant `mods/start-work/.config.json` (la saisie n'est plus proposée) ; « trois onglets : PR, Issues et Jira » devient
  « PR, Issues, puis Jira ou Tâches » ; ajouter `node mods/start-work/tasks.test.js` à la liste des tests.
- [ ] **Step 2 :** `git grep -n "Tâches" README.md` non vide ; `git grep -n "trois onglets : PR, Issues et Jira" README.md` vide ;
  `git grep -n "tasks.test.js" README.md` non vide.
- [ ] **Step 3 : Commit** `📝 Start work : onglet Tâches dans le README` (+ `Co-Authored-By: <modèle de l'implémenteur>`).

### Task 8 : Lancer le travail sur une tâche (P2)

**Files:**
- Modify: `mods/start-work/start.js`, `mods/start-work/launch.js`, `mods/start-work/main.js`
- Test: `mods/start-work/start.test.js`, `mods/start-work/launch.test.js`, `mods/start-work/main.test.js`

**Interfaces:**
- Consumes : `taskName` (tâche 3), tâches avec `path` (tâche 5).
- Produces :
  - `agentTask("task", item)` → `/feature <description, lignes trimées et jointes par " "> (<path><ref>)`, `ref` =
    `, point N` pour un numéro, `, issue #n` pour un `#n`, rien sans identifiant ;
  - `footerText("task", platform, null, empty)` → `"Ctrl+Entrée lancer le travail"` (`Cmd` sur macOS), `null` si `empty` ;
  - `launchAgent(name: string, space, cwd, task)` (le nom d'onglet au lieu de l'élément) ;
  - `main.js` : `start` sur `task` → `launch("task", item, cx)` ; `busy` et `hovered` portent `i.key ?? i.id` ;
    bouton Lancer dans l'onglet `task` ; nom d'onglet `taskName(item)` pour une tâche, `item.id` sinon.

- [ ] **Step 1 : Tests**

`start.test.js` (« agentTask task », « footerText task ») :

```js
const task = { id: "1", title: "Duels en concours Campagne", description: "**Duels en concours Campagne** : les tableaux\n  ne couvrent que TAEI.", path: "docs/reste-a-faire.md" };
assert.equal(agentTask("task", task), "/feature **Duels en concours Campagne** : les tableaux ne couvrent que TAEI. (docs/reste-a-faire.md, point 1)");
assert.equal(agentTask("task", { ...task, id: "#42" }), "/feature **Duels en concours Campagne** : les tableaux ne couvrent que TAEI. (docs/reste-a-faire.md, issue #42)");
assert.equal(agentTask("task", { ...task, id: "" }), "/feature **Duels en concours Campagne** : les tableaux ne couvrent que TAEI. (docs/reste-a-faire.md)");
assert.equal(footerText("task", "linux", null, false), "Ctrl+Entrée lancer le travail");
assert.equal(footerText("task", "macos", null, false), "Cmd+Entrée lancer le travail");
assert.equal(footerText("task", "linux", null, true), null);
```

Le test « footerText task P1 » de la tâche 6 est retiré ici (rendu faux). `launch.test.js` : les trois appels
`launchAgent({ id: "#12" }, …)` deviennent `launchAgent("#12", …)`, attendus inchangés.

`main.test.js` : le bloc « Ctrl+Entrée sans effet (P1) » de la tâche 6 perd ses deux lignes Ctrl+Entrée (rendues
fausses ; Entrée reste sans effet). Nouveaux blocs, avec `loaded({ [PROFILES]: PERSO, [TODO]: FEATURES })`,
`w.tab = "task"` et `respond` remplacé après le chargement :

| Bloc | Action | Attendu |
|---|---|---|
| « Lancer une tâche » | `enter(true)` | `herdr-app` reçoit `TAB_NEW("Duels en concours Campagne", "/feature **Duels en concours Campagne** : les tableaux. (docs/reste-a-faire.md, point 1)")` ; `fake.closed` = `["ov"]` ; `fake.writes` = `[]` ; aucun appel `acli` |
| « Nom coupé à 30 » | tâche au titre de plus de 30 caractères | `--name` = `taskName(item)` (30 premiers caractères, fin blanche retirée) |
| « Lancer une tâche refusé » | `herdr-app` répond `{"error":"unknown space"}`, code 1 | toast `{ title: "Agent non lancé", body: "unknown space", level: "error" }` ; `fake.closed` = `[]` ; `w.busy` = `null` ; `w.lists.task` est le même tableau qu'avant |
| « tâche en cours de lancement » | `herdr-app` bloqué sur une promesse ; Entrée, `key("escape")`, `w.dismiss()`, `w.rowClick(item, 1, cx)`, second `enter(true)` | `w.busy` = `"t4"` ; `w.at` inchangé ; un seul `tab.new` ; `fake.closed` = `[]` jusqu'à la libération, puis `["ov"]` |

`TAB_NEW` et `/repo` viennent du helper existant ; `w.space = "s1"` est posé après `loaded`.

- [ ] **Step 2 : Lancer, rouge attendu** : `node mods/start-work/start.test.js` → échec d'assertion sur
  `agentTask("task", …)` (aujourd'hui `/bugfix undefined`).

- [ ] **Step 3 : Implémenter** selon les Interfaces.

- [ ] **Step 4 : Vérifier** : suite complète verte (dont « Issue: Ctrl+Enter » existant : `/bugfix <url>`, onglet
  `#12`), `herdr-app check` passe, `wc -l mods/start-work/main.js` ≤ 200.

- [ ] **Step 5 : Commit** `✨ Start work : lancer /feature sur une tâche` (+ `Co-Authored-By: <modèle de l'implémenteur>`).

### Task 9 : Documentation P2 (—)

**Files:** Modify: `README.md` (§ Start work)

- [ ] **Step 1 :** Lancer sur une tâche : nouvel onglet nommé d'après le titre (30 caractères), `/feature <texte>
  (<chemin>, point N)` ou `issue #n`, reste à faire non modifié ; Entrée ne fait rien sur une tâche.
- [ ] **Step 2 :** `git grep -n "point N\|issue #" README.md` non vide.
- [ ] **Step 3 : Commit** `📝 Start work : lancer une tâche dans le README` (+ `Co-Authored-By: <modèle de l'implémenteur>`).

## Convergence 1

### Task 10 : Tester le survol et la clé de ligne des tâches sans identifiant (§4 P1)

**Files:**
- Modify: `mods/start-work/fake.js` (noter les `.id(...)` et les gestionnaires `on_hover` appelés sur la chaîne, par
  exemple `fake.ids`, `fake.hovers`)
- Test: `mods/start-work/main.test.js`

Spec : §4 P1, « deux puces sans identifiant : survoler l'une ne montre « Lancer » que sur elle » ; §2, clé interne
`key ?? id` pour `hovered`, `busy` et l'id de ligne.

- [ ] **Step 1 : Test « tâches sans identifiant : survol »** : reste à faire avec deux puces sans numéro ni `#n`
  (`- **A** : a`, `- **B** : b`), `w.tab = "task"`, `w.row(i, n, t)` pour chacune. Attendu : ids de ligne distincts
  (clés `t3` et `t4` dans les ids) ; `onHover(true)` de la ligne B pose `w.hovered === "t4"` ; la ligne A reconstruite
  n'a pas `shown` (`n !== w.at` et `hovered !== "t3"`).
- [ ] **Step 2 : Rouge** : le test échoue avec la mutation `this.hovered === i.id` dans `row` (aujourd'hui survivante) ;
  la preuve est la sortie avec la mutation, puis la mutation retirée. Le code de production ne change pas.
- [ ] **Step 3 : Vérifier** : suite complète verte, `herdr-app check` passe.
- [ ] **Step 4 : Commit** `✅ Start work : survol des tâches sans identifiant` (+ `Co-Authored-By: <modèle de l'implémenteur>`).

## Vérification et recette

- Suite : `cd ~/.config/herdr-app && for f in mods/start-work/*.test.js; do node "$f" || exit 1; done` ;
  `herdr-app check ~/.config/herdr-app/mods/start-work`.
- Substitut de recette (application native) : la commande node de la tâche 3, étape 5, sur le fichier de GECCO.
- **Recette visuelle, à faire par l'utilisateur** : `ctrl-shift-i` dans un terminal de GECCO (onglets, panneau,
  défilement à 400 px, ↓, clic, filtre « campagne », Lancer) ; dans un terminal d'un repo vidal avec source Jira
  (onglet Jira inchangé) ; dans `dsi-docs` (onglet Jira). Aussi : le survol ne change pas le panneau ; filtre sans
  résultat, liste vide ou en erreur → pas de panneau, message sur toute la largeur ; deux puces sans identifiant →
  « Lancer » seulement sur la puce survolée.
- Dette (§7) : `on_key_down` a été extrait en `onKey` dans cette PR (relecture finale) ; sa chaîne de `if`, d'abord
  reportée en issue, est corrigée à `/pr push` (`nextTab` dans rows.js, `showTab` dans main.js ; spec §7 amendée).
  Plus aucune issue à ouvrir.
