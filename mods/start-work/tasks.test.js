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

// Title: first line only, even without bold or colon.
assert.equal(parseTasks("## Features\n- Un mot sans gras\n  suite : x")[0].title, "Un mot sans gras");

// Fenced code: headings and items inside stay in the description (even unindented).
const FENCED = parseTasks("## Features\n- **A** : a\n```\n# cmd\n## Corrections\n- pas une tâche\n```\n- **B** : b");
assert.deepEqual(FENCED.map((t) => t.title), ["A", "B"]);
assert.equal(FENCED[0].description, "**A** : a\n```\n# cmd\n## Corrections\n- pas une tâche\n```");
assert.equal(parseTasks("## Features\n- **A** : a\n```\n## Corrections\n```\n- **B** : b").length, 2);

// repoWithoutJira / taskList / taskName
assert.equal(repoWithoutJira(true, { error: "x" }), true);
assert.equal(repoWithoutJira(false, { tasks: [] }), true);
assert.equal(repoWithoutJira(false, { tasks: null }), false);
assert.equal(repoWithoutJira(false, { error: "x" }), false);
assert.deepEqual(taskList({ error: "x" }), { error: "x" });
assert.deepEqual(taskList({ tasks: null }), []);
assert.equal(taskName({ title: "Recette navigateur des écrans du lot 5" }), "Recette navigateur des écrans");
console.log("tasks ok");
