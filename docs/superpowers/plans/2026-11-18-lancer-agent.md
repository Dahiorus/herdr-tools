# Lancer le travail depuis Start work — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** dans Start work, Ctrl+Entrée (ou le bouton « Lancer ») sur une issue démarre un agent `/bugfix`, et sur un
ticket Jira le prend en charge (attribué à moi, « En cours ») puis démarre `/feature` ou `/bugfix` selon son type.

**Architecture:** les règles (skill selon le type, refus, texte de la demande, pied du dialogue) vont dans un module
pur `start.js`, testé par node. Les appels extérieurs (`acli`, `herdr-app do tab.new`) vont dans `launch.js`, qui
reçoit aussi la recherche des tickets sortie de `loadJira` (§7). `main.js` ne garde que l'enchaînement et l'état
d'affichage (en cours, confirmation, ligne survolée).

**Tech Stack:** JavaScript gpui-kit (mod Herdr), `acli`, `herdr-app do`, node pour les tests (`node:assert/strict`).

**Spec:** `docs/superpowers/specs/2026-11-18-lancer-agent-design.md`

## Découpage en PR

Fichiers touchés hors tests, spec et plan : `main.js`, `rows.js`, `start.js`, `launch.js`, `README.md`,
`docs/domaine.md` (6). **Une seule PR** : P1 (tâche 2) puis P2 (tâche 3), après la refacto (tâche 1). Livrées
ensemble, l'état intermédiaire « P1 sans P2 » de la spec n'est jamais publié.

## Traçabilité

| Exigence (§ spec) | Tâche | Test qui la prouve |
|---|---|---|
| §7 : recherche des tickets sortie de `loadJira` vers `launch.js` (`fetchTickets`), sans changement de comportement | 1 | `herdr-app check` + recette : onglet Jira identique (lignes, meta, erreur de source) |
| §7 : `main.js` sous 200 lignes | 1, 3 | `wc -l mods/start-work/main.js` ≤ 200 |
| Issue : demande `/bugfix <url>` | 2 | `start.test.js` « issue → /bugfix url » |
| Issue : onglet `#12`, espace et dossier du terminal focalisé, dialogue fermé | 2 | recette 1 |
| Ctrl+Entrée lance, Entrée ouvre toujours | 2 | recette 1 et 2 |
| Lancer sans effet dans PR, liste vide, filtre sans résultat | 2 | `start.test.js` « footerText pr → null » + recette 3 |
| `herdr-app do tab.new` en erreur → toast « Agent non lancé », dialogue ouvert | 2 | `start.test.js` « tabError » (sortie `{"error"}` et code 1) + recette 4 |
| Pied « Entrée ouvrir · Ctrl+Entrée lancer le travail » (Cmd sur macOS), issue et jira seulement, masqué quand rien n'est listé | 2, review (P3) | `start.test.js` « footerText » (3 cas + 2 cas `empty`) + recette 3 |
| Dialogue en `kind: "window"` (clic à côté sans effet) | review de la PR (R3) | recette 6 (clic à côté pendant « Prise en charge… ») |
| Bouton « × » : ferme, sauf pendant un lancement | demande de l'utilisateur en review de la PR | `main.test.js` (bouton pendant la prise en charge, bouton pendant la confirmation) |
| Clic sur une ligne ignoré pendant la confirmation | review de la PR (R1b) | `main.test.js` (confirmation) |
| Entrée, Échap et clic sur une ligne ignorés pendant un lancement | review (M5) | recette 6 (Échap pendant « Prise en charge… ») ; `main.test.js` (clic sur une ligne) |
| Bouton « Lancer » sur la ligne survolée ou sélectionnée | 2 | recette 5 |
| Type → skill : `Bug`/`Bogue` (casse ignorée) → `/bugfix`, `Epic`/`Initiative` → `null`, autre → `/feature` | 3 | `start.test.js` « skillFor » (6 cas) |
| Ticket : demande `/feature POSO-127 <url>` ou `/bugfix …` | 3 | `start.test.js` « jira → skill id url » (2 cas) |
| Refus Epic : « POSO-12 est un Epic. Lance plutôt une de ses stories » | 3 | `start.test.js` « refusal Epic » |
| Ont l'action : catégorie `new`, ou « En cours » à moi ; sinon « POSO-127 est déjà en Code Review » | 3 | `start.test.js` « refusal » (4 cas) |
| Ordre type, puis statut, puis assigné (cas combinés) | 3, review | `start.test.js` « Epic attribué à Alice », « Bogue Bloqué à Alice », `decide` (5 cas) ; recette 9 |
| Confirmation si attribué à un autre ; pas si à moi ni non attribué ; Lancer et changement d'onglet bloqués pendant | 3, review | `start.test.js` « askBeforeTaking » (3 cas), `footerText` avec `confirming` (2 cas) + recette 8 |
| Ctrl+Entrée (Lancer) pendant la confirmation : ignoré, seule Entrée confirme | 5 | recette 8 bis |
| Prise en charge : `assign` sauté si à moi, `transition` sauté si « En cours » | 3 | `start.test.js` « takeSteps » (4 cas) + recette 6 et 7 |
| Échecs : lecture assigné, attribution, transition → toast nommé, pas d'agent, liste rechargée | 3, review | `start.test.js` « takeSteps » (titres), `takeWith` (4 cas : tout passe, assign en échec → transition jamais appelée, transition qui rejette, sortie vide) + recette 10 |
| « Prise en charge… » à la place de meta ; un seul lancement à la fois (même ticket ou autre) | 3 | recette 6 et 11 |
| §2 : `--fields` ajoute `issuetype` ; `type`, `statusName`, `statusCategory`, `assigneeName` | 3 | `start.test.js` « ticketRow » |
| Appels `acli` (assign, transition, recherche de l'assigné) et `herdr-app do tab.new` : arguments, machine, échecs | PR (risque) | `launch.test.js` |
| Parcours du dialogue : Ctrl+Entrée / Entrée sur une issue, PR sans effet, confirmation (Ctrl+Entrée, Lancer et Tab ignorés, Entrée prend, Échap annule sans fermer), Entrée, Échap et clic sur une ligne ignorés pendant la prise en charge, échecs de lecture de l'assigné, d'attribution et d'onglet (liste Jira rechargée) | PR (risque) | `main.test.js` (chaque garde retirée le fait échouer) |
| §2 : README et glossaire | 4 (—) | `git grep -n "Ctrl+Entrée" -- README.md` non vide ; `git grep -n "Ctrl+Entrée lancer l'agent" -- . ':!docs/superpowers'` vide |

Usages vérifiés (étape 1b) : `submit` n'est appelé que par l'événement `submit` de l'`InputState` (`main.js:32`) ;
`listRow` seulement par `render` (`main.js:197`) ; `loadJira` par `load` (`:64`, `:66`) et `saveJira` (`:127`,
`:133`) ; `this.cwd` et `focused()` seulement dans `init` et `load`. Aucun autre mod n'importe `start-work`.
`filter.js`, `github.js`, `jira.js`, `profile.js`, `.config.json` restent inchangés.

## Global Constraints

- Libellés exacts : statut cible `En cours` ; pied `Entrée ouvrir · Ctrl+Entrée lancer le travail` (`Cmd+Entrée` sur
  macOS) ; bouton `Lancer` ; état de ligne `Prise en charge…` ; confirmation `POSO-127 est attribué à Alice. Le
  prendre ? Entrée oui · Échap non`.
- Toasts (`notify`, niveau `error`) : `Agent non lancé`, `Prise en charge de POSO-127 impossible`, `Attribution de
  POSO-127 impossible`, `POSO-127 n'a pas pu passer « En cours »` ; corps = première ligne de sortie (`firstLine`).
  Refus (niveau `warning`) : `POSO-12 est un Epic. Lance plutôt une de ses stories`, `POSO-127 est déjà en Code
  Review`.
- L'agent : `herdr-app do tab.new --space <space> --folder <cwd> --name <id> --argv '["claude"]' --task <demande>`,
  lancé localement par `exec` (sans `on`).
- `start.js` sans import `gpui-kit` ni `herdr` (README : `main.js` ne se charge pas sous node).
- Tests du contexte : `node mods/start-work/jira.test.js`, `profile.test.js`, `github.test.js`, `filter.test.js`,
  `start.test.js` (dès la tâche 2), `herdr-app check ~/.config/herdr-app/mods/start-work`.
- Commits : message en français avec gitmoji, terminé par `Co-Authored-By: <modèle de l'implémenteur>`.

## Review Focus

- Ctrl+Entrée qui déclencherait aussi l'ouverture du navigateur (le `submit` ne doit faire qu'une chose) → recette 1.
- Ticket sans `statusCategory` (champ absent du JSON d'`acli`) : refus « déjà en … », jamais d'exception →
  `start.test.js` « refusal sans catégorie ».
- Ticket sans assigné (`assignee` null) : pas de confirmation, `assign` appelé → `askBeforeTaking` et `takeSteps`.
- `herdr-app` absent du PATH ou injoignable : `exec` rejette → toast « Agent non lancé » avec le message → tâche 2,
  `launchAgent` attrape le rejet.
- Échap pendant la confirmation : annule la confirmation sans fermer le dialogue → recette 8.

---

### Task 1 : Sortir la recherche des tickets de `loadJira`

Refacto sans changement de comportement (§7).

**Files:**
- Create: `mods/start-work/launch.js`
- Modify: `mods/start-work/main.js:87-120` (`loadJira`)

**Interfaces:**
- Produces: `fetchTickets(source: string, machine: string | null) -> Promise<Array<{id, title, meta, url}>>`, qui
  porte le `Promise.all` (`acli … search`, `acli jira auth status`), l'erreur de site absent et le `map` actuels, mot
  pour mot. Elle rejette comme aujourd'hui ; `loadJira` garde son `try/catch` et son message
  `${e.message} (source « ${source} ». ${FIX})`.

- [ ] **Step 1 : Caractériser** — dans Herdr, ouvrir Start work (`ctrl-shift-i`) sur un repo à source Jira (ex.
  `softwarevidal/kisscool`), noter le nombre de tickets de l'onglet Jira et la meta des trois premiers.
- [ ] **Step 2 : Déplacer** le code dans `launch.js` (imports `json`, `sh`, `firstLine` de `./run.js`, `toJql` de
  `./jira.js`) et appeler `this.lists.jira = await fetchTickets(source, this.machine)`.
- [ ] **Step 3 : Vérifier** — `herdr-app check ~/.config/herdr-app/mods/start-work` passe ; les tests node passent ;
  dans Herdr, même nombre de tickets et même meta qu'au step 1.
- [ ] **Step 4 : Commit**

```bash
git add mods/start-work/launch.js mods/start-work/main.js
git commit -m "♻️ Start work : recherche des tickets dans launch.js

Co-Authored-By: <modèle de l'implémenteur>"
```

### Task 2 : Lancer le travail sur une issue (P1)

**Files:**
- Create: `mods/start-work/start.js`, `mods/start-work/start.test.js`
- Modify: `mods/start-work/launch.js`, `mods/start-work/main.js` (`init`, `submit`, `render`, nouvelles méthodes
  `start`, `launch`), `mods/start-work/rows.js` (`listRow`, nouveau `footer`)

**Interfaces:**
- Produces (`start.js`) :
  - `agentTask(kind: "issue" | "jira", item) -> string` — issue : `/bugfix ${item.url}` (la branche `jira` vient en
    tâche 3) ;
  - `footerText(tab: string, platform: string) -> string | null` — `null` pour `pr` ;
  - `tabError(result: {code, stdout, stderr}) -> string | null` — `null` si `code === 0`, sinon le champ `error` du
    JSON de `stdout`, à défaut `firstLine`-like (première ligne de stderr ou stdout).
- Produces (`launch.js`) : `launchAgent(item, space: string, cwd: string, task: string) -> Promise<string | null>` —
  message d'erreur ou `null`. Attrape le rejet d'`exec`.
- Produces (`rows.js`) : `listRow(i, tab, selected, t, onClick, start)` où `start = { shown: boolean, busy: boolean,
  onStart(cx), onHover(hovered, cx) }` ou `undefined` (onglet PR) ; `footer(text: string, t)`.
- Produces (`main.js`) : `start(item, cx)`, `launch(item, task, cx)`, `this.space`, `this.busy` (id de l'élément en
  cours ou `null`), `this.hovered` (id de la ligne survolée).

- [ ] **Step 1 : Test rouge** — `mods/start-work/start.test.js`

```javascript
// Run: node mods/start-work/start.test.js
import assert from "node:assert/strict";
import { agentTask, footerText, tabError } from "./start.js";

const issue = { id: "#12", url: "https://github.com/owner/repo/issues/12" };
assert.equal(agentTask("issue", issue), "/bugfix https://github.com/owner/repo/issues/12");

assert.equal(footerText("pr", "linux"), null);
assert.equal(footerText("issue", "linux"), "Entrée ouvrir · Ctrl+Entrée lancer le travail");
assert.equal(footerText("jira", "macos"), "Entrée ouvrir · Cmd+Entrée lancer le travail");

assert.equal(tabError({ code: 0, stdout: '{"tab":"tb1"}', stderr: "" }), null);
assert.equal(tabError({ code: 1, stdout: '{\n  "error": "no space \\"nope\\""\n}', stderr: "" }), 'no space "nope"');
assert.equal(tabError({ code: 1, stdout: "", stderr: "boom\nmore" }), "boom");
console.log("start ok");
```

- [ ] **Step 2 : Rouge** — `node mods/start-work/start.test.js` → échec d'import (`start.js` absent).
- [ ] **Step 3 : `start.js`** (fonctions ci-dessus), puis `launchAgent` dans `launch.js` (arguments de Global
  Constraints ; `tabError` sur le résultat ; rejet d'`exec` → son `message`).
- [ ] **Step 4 : `main.js`** :
  - `init` : `this.space = f?.space ?? null`, `this.busy = null`, `this.hovered = null` ;
  - `input.on("submit", (e, cx) => this.submit(e, cx))` ; dans `submit`, `e.secondary` → `this.start(item, cx)` et
    rien d'autre ; sinon inchangé ;
  - `start(item, cx)` : rien si `!item`, `this.busy`, ou onglet `pr` ; onglet `issue` → `this.launch(item,
    agentTask("issue", item), cx)` (onglet `jira` : tâche 3) ;
  - `launch(item, task, cx)` : `this.busy = item.id`, `await launchAgent(…)` ; erreur → `notify({ title: "Agent non
    lancé", body, level: "error" })`, `this.busy = null`, et `this.loadJira(cx)` si `this.tab === "jira"` (une prise
    en charge réussie avant l'échec doit se voir) ; sinon `closeOverlay(props().overlay)` ;
  - `render` : `listRow(…, start)` hors onglet PR, `shown` = ligne sélectionnée ou `this.hovered === i.id` ; sous la
    liste, `footer(footerText(this.tab, window().platform), t)` quand non `null`.
- [ ] **Step 5 : `rows.js`** — bouton `Lancer` (`.id(\`sw-start-${i.id}\`)`, `on_click` qui arrête la propagation
  pour ne pas ouvrir la ligne), `.invisible()` quand `!shown` pour garder la colonne alignée ; `on_hover` sur la
  ligne ; `footer` en `text_size(11)`, `t.dim`.
- [ ] **Step 6 : Vert** — les cinq tests node, `herdr-app check …/start-work`, `wc -l main.js` ≤ 200 (sinon
  remonter de la logique dans `start.js` ou `launch.js`, jamais de règle dans `main.js`).
- [ ] **Step 7 : Recette** (dans Herdr, repo à issues ouvertes) :
  1. Ctrl+Entrée sur `#n` → onglet `#n` dans l'espace et le dossier du terminal, `claude` reçoit `/bugfix <url>`,
     dialogue fermé, navigateur non ouvert ;
  2. Entrée sur la même issue → navigateur, pas d'onglet ;
  3. Ctrl+Entrée dans l'onglet PR, puis avec un filtre sans résultat → rien ;
  4. espace fermé entre-temps (ou `--space` invalide forcé à la main) → toast « Agent non lancé », dialogue ouvert ;
  5. survol d'une ligne → bouton « Lancer » visible ; clic → comme 1.
- [ ] **Step 8 : Commit**

```bash
git add mods/start-work/start.js mods/start-work/start.test.js mods/start-work/launch.js mods/start-work/main.js mods/start-work/rows.js
git commit -m "✨ Start work : lancer /bugfix sur une issue

Co-Authored-By: <modèle de l'implémenteur>"
```

### Task 3 : Prendre en charge un ticket et lancer (P2)

**Files:**
- Modify: `mods/start-work/start.js`, `start.test.js`, `launch.js`, `main.js` (`start`, confirmation, `submit`,
  `on_key_down` pour Échap), `rows.js` (état « Prise en charge… »)

**Interfaces:**
- Consumes : tâche 2 (`agentTask`, `launch`, `this.busy`, `listRow(…, start)`, `footer`).
- Produces (`start.js`) :
  - `TARGET_STATUS = "En cours"` ;
  - `ticketRow(issue, site) -> {id, title, meta, url, type, statusName, statusCategory, assigneeName}` (le `map` de
    `fetchTickets` y passe ; `meta` inchangé) ;
  - `skillFor(type: string) -> "/bugfix" | "/feature" | null` ;
  - `agentTask("jira", item)` → `${skillFor(item.type)} ${item.id} ${item.url}` ;
  - `refusal(item, mine: boolean) -> string | null` — dans cet ordre : `skillFor` null → `${id} est un ${type}. Lance
    plutôt une de ses stories` ; `statusCategory === "new"` → `null` ; `statusName === TARGET_STATUS && mine` →
    `null` ; sinon `${id} est déjà en ${statusName}` ;
  - `askBeforeTaking(item, mine) -> boolean` — `Boolean(item.assigneeName) && !mine` ;
  - `takeSteps(item, mine) -> Array<{args: string[], title: string}>` — `assign` (sauf `mine`) puis `transition`
    (sauf `statusName === TARGET_STATUS`), chacun avec son titre de toast.
- Produces (`launch.js`) : `isMine(key, machine) -> Promise<boolean>` (rejette sur erreur `acli`) ;
  `takeTicket(item, mine, machine) -> Promise<{title, body} | null>` (exécute `takeSteps` dans l'ordre, s'arrête au
  premier échec). `fetchTickets` ajoute `issuetype` à `--fields` et mappe par `ticketRow`.
- Produces (`main.js`) : `this.confirming` (`{item, mine}` ou `null`).

- [ ] **Step 1 : Tests rouges** — ajouter à `start.test.js` :

```javascript
import { skillFor, refusal, askBeforeTaking, takeSteps, ticketRow, TARGET_STATUS } from "./start.js";

const ticket = (o) => ({ id: "POSO-127", url: "https://x.atlassian.net/browse/POSO-127", type: "Story",
  statusName: "À faire", statusCategory: "new", assigneeName: "", ...o });

for (const t of ["Bug", "Bogue", "bogue", "BUG"]) assert.equal(skillFor(t), "/bugfix");
assert.equal(skillFor("Story"), "/feature");
assert.equal(skillFor("Tâche"), "/feature");
assert.equal(skillFor("Epic"), null);
assert.equal(skillFor("Initiative"), null);

assert.equal(agentTask("jira", ticket()), "/feature POSO-127 https://x.atlassian.net/browse/POSO-127");
assert.equal(agentTask("jira", ticket({ type: "Bogue" })), "/bugfix POSO-127 https://x.atlassian.net/browse/POSO-127");

assert.equal(refusal(ticket({ id: "POSO-12", type: "Epic" }), false), "POSO-12 est un Epic. Lance plutôt une de ses stories");
assert.equal(refusal(ticket(), false), null);
assert.equal(refusal(ticket({ statusName: TARGET_STATUS, statusCategory: "indeterminate" }), true), null);
assert.equal(refusal(ticket({ statusName: TARGET_STATUS, statusCategory: "indeterminate" }), false), "POSO-127 est déjà en En cours");
assert.equal(refusal(ticket({ statusName: "Code Review", statusCategory: "indeterminate" }), true), "POSO-127 est déjà en Code Review");
assert.equal(refusal(ticket({ statusName: "Bloqué", statusCategory: undefined }), false), "POSO-127 est déjà en Bloqué"); // sans catégorie
// cas combinés : le type, puis le statut, avant l'assigné
assert.equal(refusal(ticket({ id: "POSO-12", type: "Epic", assigneeName: "Alice" }), false), "POSO-12 est un Epic. Lance plutôt une de ses stories");
assert.equal(refusal(ticket({ type: "Bogue", statusName: "Bloqué", statusCategory: "indeterminate", assigneeName: "Alice" }), false), "POSO-127 est déjà en Bloqué");

assert.equal(askBeforeTaking(ticket({ assigneeName: "Alice" }), false), true);
assert.equal(askBeforeTaking(ticket({ assigneeName: "Moi" }), true), false);
assert.equal(askBeforeTaking(ticket(), false), false);

const steps = (item, mine) => takeSteps(item, mine).map((s) => s.args[2]); // la sous-commande d'acli
assert.deepEqual(steps(ticket(), false), ["assign", "transition"]);
assert.deepEqual(steps(ticket(), true), ["transition"]);
assert.deepEqual(steps(ticket({ statusName: TARGET_STATUS }), true), []);
assert.deepEqual(takeSteps(ticket(), false).map((s) => s.title), ["Attribution de POSO-127 impossible", "POSO-127 n'a pas pu passer « En cours »"]);
assert.deepEqual(takeSteps(ticket(), false)[0].args, ["jira", "workitem", "assign", "--key", "POSO-127", "--assignee", "@me", "--yes"]);
assert.deepEqual(takeSteps(ticket(), false)[1].args, ["jira", "workitem", "transition", "--key", "POSO-127", "--status", "En cours", "--yes"]);

assert.deepEqual(ticketRow({ key: "MM-1", fields: { summary: "S", issuetype: { name: "Bogue" }, status: { name: "À faire", statusCategory: { key: "new" } }, assignee: { displayName: "Alice" } } }, "x.atlassian.net"),
  { id: "MM-1", title: "S", meta: "À faire · Alice", url: "https://x.atlassian.net/browse/MM-1", type: "Bogue", statusName: "À faire", statusCategory: "new", assigneeName: "Alice" });
```

`args` : arguments d'`acli`, sans `acli` lui-même.

- [ ] **Step 2 : Rouge** — `node mods/start-work/start.test.js` → `SyntaxError` d'import (`skillFor` non exporté).
- [ ] **Step 3 : `start.js`** (fonctions ci-dessus), puis `launch.js` : `isMine` (`json("acli", ["jira", "workitem",
  "search", "--jql", \`key = ${key} AND assignee = currentUser()\`, "--fields", "summary", "--json"], { on: machine })`,
  vrai si la liste n'est pas vide ; `--fields key` seul rend `[null]` avec `acli`, vérifié au plan), `takeTicket`, `fetchTickets` (`issuetype` et `ticketRow`).
- [ ] **Step 4 : `main.js`** :
  - `start` : onglet `jira` → `this.busy = item.id`, puis dans `cx.spawn` : `isMine` (rejet → toast « Prise en charge
    de ${id} impossible », `this.busy = null`, `this.loadJira(cx)`) ; `refusal` → toast `warning`, `this.busy = null` ; `askBeforeTaking` → `this.confirming = { item, mine }`,
    `this.busy = null` ; sinon `this.take(item, mine, cx)` ;
  - `take(item, mine, cx)` : `this.busy = item.id`, `takeTicket` ; échec → toast `error`, `this.busy = null`,
    `this.loadJira(cx)` ; succès → `this.launch(item, agentTask("jira", item), cx)` ;
  - `submit` : si `this.confirming`, Entrée → `take(confirming.item, confirming.mine)` et `this.confirming = null`,
    rien d'autre ;
  - `start` : rien non plus si `this.confirming` ;
  - `on_key_down` : Échap avec `this.confirming` → `this.confirming = null` sans fermer ; Tab ignoré tant que
    `this.confirming` ; le clic d'onglet de `header` aussi ;
  - `render` : le pied affiche la confirmation (`${id} est attribué à ${assigneeName}. Le prendre ? Entrée oui · Échap
    non`) à la place de `footerText` ; la ligne `this.busy` passe `busy: true` à `listRow`, dans l'onglet `jira` seulement (la prise en charge ne
    concerne que les tickets).
- [ ] **Step 5 : `rows.js`** — `busy` : meta remplacée par `Prise en charge…`.

Pendant la confirmation, tout Lancer et tout changement d'onglet (Tab, Maj+Tab, clic sur un onglet) sont ignorés ;
Entrée ou Échap en sortent (décidé en relecture du plan).
- [ ] **Step 6 : Vert** — cinq tests node, `herdr-app check`, `wc -l main.js` ≤ 200.
- [ ] **Step 7 : Recette** (dans Herdr, sur un ticket que l'utilisateur désigne : elle modifie Jira) :
  6. `Story` à faire non attribuée → « Prise en charge… », ticket à moi et « En cours », onglet `POSO-n`, `/feature
     POSO-n <url>` ;
  7. `Bogue` à moi à faire → seulement la transition, `/bugfix` ;
  8. ticket attribué à un autre → confirmation ; Tab, clic d'onglet et Lancer sur un autre ticket → ignorés ; Échap
     annule (dialogue ouvert) ; Entrée → prise en charge ;
  9. Epic → toast Epic ; ticket « Code Review » → toast « déjà en Code Review » ; Jira inchangé ;
  10. ticket d'un projet sans statut « En cours » (ou `TARGET_STATUS` changé à la main pour l'essai) → toast
      transition, ticket attribué, liste rechargée, pas d'agent ;
  11. Lancer sur un second ticket pendant « Prise en charge… » → ignoré ; puis Lancer de nouveau sur le même ticket →
      ignoré, un seul onglet.
- [ ] **Step 8 : Commit**

```bash
git add mods/start-work/start.js mods/start-work/start.test.js mods/start-work/launch.js mods/start-work/main.js mods/start-work/rows.js
git commit -m "✨ Start work : prendre en charge un ticket Jira et lancer l'agent

Co-Authored-By: <modèle de l'implémenteur>"
```

### Task 4 : Documentation (—)

**Files:**
- Modify: `README.md` (§ Start work, liste des commandes de test), `docs/domaine.md` (déjà amendé par `ddd`, vérifier
  que `Dans le code` cite `start(item)`, `takeTicket`)

- [ ] **Step 1 :** README : Ctrl+Entrée (Cmd sur macOS) ou « Lancer » ; issue → `/bugfix <url>` ; ticket → attribué
  à moi, « En cours », puis `/feature` ou `/bugfix` (Bug, Bogue) ; Epic, Initiative et tickets déjà avancés refusés ;
  confirmation si attribué à un autre ; prérequis `herdr-app` dans le PATH ; ajouter `node
  mods/start-work/start.test.js` à la liste des tests.
- [ ] **Step 2 :** glossaire : `proposé : start(item)` → `start(item)`, `proposé : takeTicket` → `takeTicket`.
- [ ] **Step 3 : Grep** — `git grep -n "Ctrl+Entrée" -- README.md` non vide ; `git grep -n "proposé :\|Ctrl+Entrée lancer
  l'agent" -- . ':!docs/superpowers'` vide.
- [ ] **Step 4 : Commit**

```bash
git add README.md docs/domaine.md
git commit -m "📝 Start work : lancer le travail dans le README et le glossaire

Co-Authored-By: <modèle de l'implémenteur>"
```

## Convergence 1

### Task 5 : Ctrl+Entrée pendant la confirmation ne confirme pas

§ Comportement, Ticket Jira (« Pendant la confirmation, tout Lancer et tout changement d'onglet sont ignorés ; Entrée ou
Échap en sortent ») et §2, ligne « confirmation ». Aujourd'hui `submit` teste `this.confirming` avant `e.secondary` :
Ctrl+Entrée (le geste Lancer) prend le ticket.

**Files:**
- Modify: `mods/start-work/main.js` (`submit`)

- [ ] **Step 1 :** dans `submit`, avec `this.confirming`, `e.secondary` → rien ; Entrée seule → `take` comme aujourd'hui.
  Sur une ligne : `main.js` reste ≤ 200.

```javascript
if (c) { if (!e.secondary) { this.confirming = null; this.take(c.item, c.mine, cx); } return; }
```

- [ ] **Step 2 : Vert** — cinq tests node, `herdr-app check`, `wc -l main.js` ≤ 200. Règle de clavier dans `main.js`,
  comme Échap et Tab : pas de test node, preuve par la recette.
- [ ] **Step 3 : Recette 8 bis** — ticket attribué à un autre → confirmation ; Ctrl+Entrée → rien, la confirmation
  reste ; Entrée → prise en charge.
- [ ] **Step 4 : Commit**

```bash
git add mods/start-work/main.js
git commit -m "🐛 Start work : Ctrl+Entrée ne confirme pas la prise en charge

Co-Authored-By: <modèle de l'implémenteur>"
```

