// Run: node mods/start-work/start.test.js
import assert from "node:assert/strict";
import { firstLine, decide, takeWith, agentTask, launchKind, startLabel, footerText, tabError, skillFor, refusal, askBeforeTaking, takeSteps, ticketRow, TARGET_STATUS } from "./start.js";

const issue = { id: "#12", url: "https://github.com/owner/repo/issues/12" };
assert.equal(agentTask("issue", issue), "/bugfix https://github.com/owner/repo/issues/12");

assert.equal(footerText("pr", "linux"), null);
assert.equal(footerText("issue", "linux"), "Entrée ouvrir · Ctrl+Entrée lancer le travail");
assert.equal(footerText("jira", "macos"), "Entrée ouvrir · Cmd+Entrée lancer le travail");

assert.equal(tabError({ code: 0, stdout: '{"tab":"tb1"}', stderr: "" }), null);
assert.equal(tabError({ code: 1, stdout: '{\n  "error": "no space \\"nope\\""\n}', stderr: "" }), 'no space "nope"');
assert.equal(tabError({ code: 1, stdout: "", stderr: "boom\nmore" }), "boom");
assert.equal(firstLine({ code: 1, stdout: "out", stderr: "err\nmore" }), "err");
assert.equal(firstLine({ code: 1, stdout: "out\nmore", stderr: "" }), "out");
const task = { id: "1", title: "Duels en concours Campagne", description: "**Duels en concours Campagne** : les tableaux\n  ne couvrent que TAEI.", path: "docs/reste-a-faire.md" };
const D = "/feature **Duels en concours Campagne** : les tableaux ne couvrent que TAEI.";
assert.equal(agentTask("task", task), `${D} (docs/reste-a-faire.md, point 1)`);
assert.equal(agentTask("task", { ...task, id: "#42" }), `${D} (docs/reste-a-faire.md, issue #42)`);
assert.equal(agentTask("task", { ...task, id: "" }), `${D} (docs/reste-a-faire.md)`);
assert.equal(agentTask("task", { ...task, description: "**A** : a\n\n  b" }), "/feature **A** : a b (docs/reste-a-faire.md, point 1)"); // internal blank line: one space
assert.equal(footerText("task", "linux", null, false), "Ctrl+Entrée lancer le travail");
assert.equal(footerText("task", "macos", null, false), "Cmd+Entrée lancer le travail");
assert.equal(footerText("task", "linux", null, true), null);
console.log("start ok");

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

assert.deepEqual(decide(ticket({ id: "POSO-12", type: "Epic", assigneeName: "Alice" }), false), { refusal: "POSO-12 est un Epic. Lance plutôt une de ses stories" });
assert.deepEqual(decide(ticket({ type: "Bogue", statusName: "Bloqué", statusCategory: "indeterminate", assigneeName: "Alice" }), false), { refusal: "POSO-127 est déjà en Bloqué" });
assert.deepEqual(decide(ticket({ assigneeName: "Alice" }), false), { ask: true });
assert.deepEqual(decide(ticket(), false), { take: true });
assert.deepEqual(decide(ticket({ statusName: TARGET_STATUS, statusCategory: "indeterminate", assigneeName: "Moi" }), true), { take: true });

const calls = [];
const run = (fn) => async (args) => { calls.push(args[2]); return fn(args); };
const ok = async () => ({ code: 0, stdout: "", stderr: "" });
const both = takeSteps(ticket(), false);
assert.equal(await takeWith(both, run(ok)), null);
assert.deepEqual(calls.splice(0), ["assign", "transition"]);
assert.deepEqual(await takeWith(both, run(async (a) => a[2] === "assign" ? { code: 1, stdout: "", stderr: "refusé\nplus" } : ok())),
  { title: "Attribution de POSO-127 impossible", body: "refusé" });
assert.deepEqual(calls.splice(0), ["assign"]);
assert.deepEqual(await takeWith(both, run(async (a) => { if (a[2] === "transition") throw new Error("réseau"); return ok(); })),
  { title: "POSO-127 n'a pas pu passer « En cours »", body: "réseau" });
assert.deepEqual(await takeWith(both, run(async () => ({ code: 2, stdout: "", stderr: "" }))), { title: "Attribution de POSO-127 impossible", body: "acli a échoué" });
calls.length = 0;

const confirming = { item: ticket({ assigneeName: "Alice" }) };
assert.equal(footerText("jira", "linux", confirming), "POSO-127 est attribué à Alice. Le prendre ? Entrée oui · Échap non");
assert.equal(footerText("pr", "linux", confirming), "POSO-127 est attribué à Alice. Le prendre ? Entrée oui · Échap non");
// Nothing listed (loading, error, no Jira source, empty list or filter): no footer.
assert.equal(footerText("issue", "linux", null, true), null);
assert.equal(footerText("jira", "macos", null, true), null);

const prItem = (group) => ({ id: "#42", group, url: "https://github.com/o/r/pull/42" });
assert.equal(agentTask("review", prItem("toReview")), "/pr 42 review");
assert.equal(agentTask("comments", prItem("mine")), "/pr 42 comments");
assert.equal(launchKind("pr", prItem("toReview")), "review");
assert.equal(launchKind("pr", prItem("feedback")), "comments");
assert.equal(launchKind("pr", prItem("mineAll")), "comments");
assert.equal(launchKind("pr", prItem("mine")), undefined);
assert.equal(launchKind("issue", issue), "issue");
assert.equal(launchKind("task", task), "task");
assert.equal(startLabel("pr", prItem("toReview")), "Relire");
assert.equal(startLabel("pr", prItem("feedback")), "Retours");
assert.equal(startLabel("pr", prItem("mine")), undefined);
assert.equal(startLabel("issue", issue), "Lancer");
assert.equal(footerText("pr", "linux", null, false, "toReview"), "Entrée ouvrir · Ctrl+Entrée relire");
assert.equal(footerText("pr", "macos", null, false, "feedback"), "Entrée ouvrir · Cmd+Entrée traiter les retours");
assert.equal(footerText("pr", "linux", null, false, "mineAll"), "Entrée ouvrir · Ctrl+Entrée traiter les retours");
assert.equal(footerText("pr", "linux", null, false, "mine"), "Entrée ouvrir");
assert.equal(footerText("pr", "linux", null, true, "toReview"), null);
{
  const toFix = { ...issue, group: "toFix" };
  const fixingIssue = { ...issue, group: "fixing" };
  assert.equal(launchKind("issue", toFix), "issue");
  assert.equal(launchKind("issue", fixingIssue), undefined);
  assert.equal(startLabel("issue", toFix), "Lancer");
  assert.equal(startLabel("issue", fixingIssue), undefined);
  assert.equal(footerText("issue", "linux", null, false, "toFix"), "Entrée ouvrir · Ctrl+Entrée lancer le travail");
  assert.equal(footerText("issue", "macos", null, false, "fixing"), "Entrée ouvrir");
  assert.equal(agentTask(launchKind("issue", toFix), toFix), "/bugfix https://github.com/owner/repo/issues/12");
}
