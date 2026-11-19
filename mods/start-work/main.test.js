// Run: node mods/start-work/main.test.js — the Lancer and confirmation flow of the dialog, against fake.js.
import assert from "node:assert/strict";
import { fake, reset, makeCx } from "./fake.js";
const { default: StartWork } = await import("./main.js");
const { taskName } = await import("./tasks.js");

const ok = (stdout = "") => ({ code: 0, stdout, stderr: "" });
const alice = { id: "POSO-127", title: "t", meta: "", type: "Story", statusName: "À faire", statusCategory: "new", assigneeName: "Alice", url: "https://x/browse/POSO-127" };
const issue = { id: "#12", title: "t", meta: "", url: "https://github.com/o/r/issues/12" };
const TAB_NEW = (name, task) => ["herdr-app", "do", "tab.new", "--space", "s1", "--folder", "/repo", "--name", name, "--argv", '["claude"]', "--task", task];
const ASSIGN = ["acli", "jira", "workitem", "assign", "--key", "POSO-127", "--assignee", "@me", "--yes"];
const TRANSITION = ["acli", "jira", "workitem", "transition", "--key", "POSO-127", "--status", "En cours", "--yes"];
const isSearch = (a) => a[2] === "search";

// Dialog on a tab with one item; acli answers through `respond` (search: not mine).
function dialog(tab, item, respond = (_c, a) => (isSearch(a) ? ok("[]") : ok("{}"))) {
  reset(respond);
  const cx = makeCx();
  const w = new StartWork();
  w.init({}, cx);
  Object.assign(w, { tab, space: "s1", cwd: "/repo", machine: null, repo: "o/r", third: tab === "task" ? "task" : "jira" });
  w.lists[tab] = [item];
  const key = (k, shift = false) => { cx.stopped = false; w.render(); fake.keyDown({ key: k, modifiers: { shift } }, cx); };
  const enter = (secondary = false) => w.input.fire("submit", { secondary }, cx);
  return { w, cx, key, enter };
}
const writes = () => fake.calls.filter((c) => c[0] === "herdr-app" || (c[0] === "acli" && c[3] !== "search"));

// Issue: Ctrl+Enter opens the agent tab and closes the dialog; Enter only opens the browser.
{
  const { cx, enter } = dialog("issue", issue);
  enter(true);
  await cx.settle();
  assert.deepEqual(fake.calls, [TAB_NEW("#12", "/bugfix https://github.com/o/r/issues/12")]);
  assert.deepEqual(fake.closed, ["ov"]);
}
{
  const { cx, enter } = dialog("issue", issue);
  enter();
  await cx.settle();
  assert.deepEqual(fake.calls, [["xdg-open", "https://github.com/o/r/issues/12"]]);
}
// PR tab: Ctrl+Enter does nothing.
{
  const { cx, enter } = dialog("pr", issue);
  enter(true);
  await cx.settle();
  assert.deepEqual(fake.calls, []);
}

// Ticket taken by Alice: confirmation, no Jira write until Enter.
{
  const { w, cx, key, enter } = dialog("jira", alice);
  enter(true);
  await cx.settle();
  assert.equal(w.confirming.item, alice);
  assert.deepEqual(writes(), []);
  const n = fake.calls.length;
  enter(true); // Ctrl+Enter does not confirm
  w.start(alice, cx); // nor does Lancer
  w.open(alice, cx); // a row click neither opens the browser nor closes the dialog
  key("tab"); // nor does a tab change, and the key stays in the dialog
  assert.equal(w.tab, "jira");
  assert.equal(cx.stopped, true);
  await cx.settle();
  assert.equal(fake.calls.length, n); // not even a Jira read
  enter(); // Enter takes it
  await cx.settle();
  assert.deepEqual(writes(), [ASSIGN, TRANSITION, TAB_NEW("POSO-127", "/feature POSO-127 https://x/browse/POSO-127")]);
  assert.deepEqual(fake.closed, ["ov"]);
}
// Close button: closes the dialog, even while confirming (nothing is written to Jira yet).
{
  const { w, cx, enter } = dialog("jira", alice);
  enter(true);
  await cx.settle();
  assert.equal(w.confirming.item, alice);
  w.dismiss();
  assert.deepEqual(fake.closed, ["ov"]);
  assert.deepEqual(writes(), []);
}

// Esc cancels the confirmation without closing the dialog, then closes it.
{
  const { w, cx, key, enter } = dialog("jira", alice);
  enter(true);
  await cx.settle();
  key("escape");
  assert.equal(w.confirming, null);
  assert.deepEqual(fake.closed, []);
  assert.deepEqual(writes(), []);
  key("escape");
  assert.deepEqual(fake.closed, ["ov"]);
}

// Escape is bound in the filter input and the dialog; its action cancels the confirmation, then closes.
{
  const { w, cx, enter } = dialog("jira", alice);
  assert.deepEqual(cx.bindings.map((b) => [b.keystroke, b.action, b.context]),
    [["escape", "start_work_escape", "StartWork > Input"], ["escape", "start_work_escape", "StartWork"]]);
  enter(true);
  await cx.settle();
  w.render();
  fake.actions.start_work_escape({}, cx);
  assert.equal(w.confirming, null);
  assert.deepEqual(fake.closed, []);
  fake.actions.start_work_escape({}, cx);
  assert.deepEqual(fake.closed, ["ov"]);
}

// A click in the dialog (a tab, a row) gives the keyboard back to the filter input, so Escape still reaches our binding.
{
  const { w, cx } = dialog("issue", issue);
  w.render();
  const before = fake.focus;
  fake.clicks["start-work"]({}, cx);
  assert.equal(fake.focus, before + 1);
  // fake.js does not propagate: a tab or row click that stopped would never reach the root's handler.
  for (const id of ["sw-tab-pr", "sw-issue-#12"]) {
    cx.stopped = false;
    fake.clicks[id]({}, cx);
    assert.equal(cx.stopped, false, id);
  }
  await cx.settle();
}
// The Lancer button stops its click before the root: it gives the keyboard back itself.
{
  const { w, cx } = dialog("jira", alice);
  w.render();
  const before = fake.focus;
  fake.clicks["sw-start-POSO-127"]({}, cx);
  assert.equal(fake.focus, before + 1);
  await cx.settle();
}

// While the ticket is being taken: Enter and Esc are ignored, a second Lancer too.
{
  let release;
  const gate = new Promise((r) => { release = r; });
  const { w, cx, key, enter } = dialog("jira", { ...alice, assigneeName: null }, async (_c, a) => {
    if (isSearch(a)) return ok("[]");
    if (a[2] === "assign") await gate;
    return ok("{}");
  });
  enter(true);
  await new Promise((r) => setImmediate(r)); // assign is now pending
  assert.equal(w.busy, "POSO-127");
  enter(true);
  enter();
  key("escape");
  w.open(w.lists.jira[0], cx); // row click
  w.dismiss(); // close button
  assert.deepEqual(fake.closed, []);
  release();
  await cx.settle();
  assert.deepEqual(writes(), [ASSIGN, TRANSITION, TAB_NEW("POSO-127", "/feature POSO-127 https://x/browse/POSO-127")]);
  assert.deepEqual(fake.closed, ["ov"]);
}

// Failed assign: error toast, no transition, no agent, dialog open, Jira list reloaded.
{
  const { w, cx, enter } = dialog("jira", { ...alice, assigneeName: null }, (_c, a) =>
    isSearch(a) ? ok("[]") : a[2] === "assign" ? { code: 1, stdout: "", stderr: "refusé" } : ok("{}"));
  enter(true);
  await cx.settle();
  assert.deepEqual(writes(), [ASSIGN]);
  assert.deepEqual(fake.toasts, [{ title: "Attribution de POSO-127 impossible", body: "refusé", level: "error" }]);
  assert.deepEqual(fake.closed, []);
  assert.equal(w.busy, null);
  assert.equal(w.lists.jira?.setup, true); // reloaded: the fake .config.json has no source for o/r
}

// Agent tab refused after the take-over: « Agent non lancé », dialog open.
{
  const { w, cx, enter } = dialog("jira", { ...alice, assigneeName: null }, (c, a) =>
    c === "herdr-app" ? { code: 1, stdout: '{"error":"unknown space"}', stderr: "" } : isSearch(a) ? ok("[]") : ok("{}"));
  enter(true);
  await cx.settle();
  assert.deepEqual(fake.toasts, [{ title: "Agent non lancé", body: "unknown space", level: "error" }]);
  assert.deepEqual(fake.closed, []);
  assert.equal(w.busy, null);
  assert.equal(w.lists.jira?.setup, true); // reloaded
}

// Assignee unreadable: toast, nothing written, dialog open, Jira list reloaded.
{
  const { w, cx, enter } = dialog("jira", alice, () => ({ code: 1, stdout: "", stderr: "auth" }));
  enter(true);
  await cx.settle();
  assert.deepEqual(writes(), []);
  assert.deepEqual(fake.toasts, [{ title: "Prise en charge de POSO-127 impossible", body: "auth", level: "error" }]);
  assert.deepEqual(fake.closed, []);
  assert.equal(w.lists.jira?.setup, true); // reloaded
}

const PROFILES = "/home/.claude/profiles.json", CONFIG = "/app/mods/start-work/.config.json", REMAINING = "/repo/docs/reste-a-faire.md";
const profile = (on) => `{"p":{"owners":["o"],"account":"me","enabledPlugins":{"atlassian@claude-plugins-official":${on}}}}`;
const [WITH_JIRA, NO_JIRA] = [profile(true), profile(false)];
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
  const { w, key } = await loaded({ [PROFILES]: WITH_JIRA, [CONFIG]: '{"jira":{"o/r":"ABC"}}' });
  assert.deepEqual([w.lists.pr, w.lists.issue, w.lists.jira], [[], [], []]);
  w.tab = "jira"; key("tab");
  assert.equal(w.tab, "pr");
  key("tab", true);
  assert.equal(w.tab, "jira");
}

const labels = (w) => w.tabs().map(([, l]) => l);
const noTasksRead = () => !fake.calls.some((c) => c[1] === "ls-files");
const configRead = () => fake.reads.some(([p]) => p === CONFIG);
const SRC = '{"jira":{"o/r":"ABC"}}';
const ioErr = (m) => new Error(m);

// Third tab: Tâches or Jira, chosen from the profile, the Jira source and the remaining work.
{ const { w, key } = await loaded({ [PROFILES]: NO_JIRA, [REMAINING]: FEATURES });
  assert.deepEqual(labels(w), ["PR", "Issues", "Tâches"]); assert.equal(w.lists.task.length, 2); assert.equal(configRead(), false);
  w.tab = "task"; key("tab"); assert.equal(w.tab, "pr"); key("tab", true); assert.equal(w.tab, "task"); }
{ const { w } = await loaded({ [PROFILES]: NO_JIRA, [CONFIG]: SRC, [REMAINING]: FEATURES });
  assert.equal(w.third, "task"); assert.equal(configRead(), false); }
{ const { w } = await loaded({ [PROFILES]: WITH_JIRA, [CONFIG]: SRC });
  assert.equal(w.third, "jira"); assert.equal(noTasksRead(), true); }
{ const { w } = await loaded({ [PROFILES]: WITH_JIRA, [REMAINING]: FEATURES }); assert.equal(w.third, "task"); }
{ const { w } = await loaded({ [PROFILES]: WITH_JIRA }, "src/a.js\0"); assert.equal(w.third, "jira"); assert.equal(w.lists.jira.setup, true); }
{ const { w } = await loaded({ [PROFILES]: WITH_JIRA, [REMAINING]: "# Idées\n- x" }); assert.equal(w.third, "jira"); assert.equal(w.lists.jira.setup, true); }
{ const { w } = await loaded({ [PROFILES]: WITH_JIRA }, "a/todo.md\0b/TODO.md\0"); assert.equal(w.third, "jira"); assert.equal(w.lists.jira.setup, true); }
{ const { w } = await loaded({ [PROFILES]: WITH_JIRA, [REMAINING]: ioErr("io") }); assert.equal(w.third, "jira"); assert.equal(w.lists.jira.setup, true); }
{ const a = await loaded({ [PROFILES]: "{}", [REMAINING]: FEATURES }); assert.equal(a.w.third, "task");
  const b = await loaded({ [PROFILES]: "{}", [REMAINING]: "# Idées" }); assert.equal(b.w.third, "jira"); }
{ const { w } = await loaded({ [PROFILES]: ioErr("absent"), [REMAINING]: FEATURES });
  assert.equal(w.third, "task"); assert.equal(w.lists.pr.error, `${PROFILES} illisible : absent`); }
{ const { w } = await loaded({ [PROFILES]: WITH_JIRA, [CONFIG]: ioErr("io"), [REMAINING]: FEATURES });
  assert.equal(w.third, "jira"); assert.ok(w.lists.jira.error.startsWith(".config.json illisible : io")); assert.equal(noTasksRead(), true); }
{ const { w } = await loaded({ [PROFILES]: NO_JIRA }, "src/a.js\0");
  assert.equal(w.third, "task"); assert.equal(w.lists.task.error, "Pas de reste à faire dans o/r. `/todo add` le crée dans docs/reste-a-faire.md."); }
{ const { w } = await loaded({ [PROFILES]: NO_JIRA, [CONFIG]: ioErr("io"), [REMAINING]: FEATURES }); assert.equal(w.third, "task"); }
{ const { w } = await loaded({ [PROFILES]: NO_JIRA, [REMAINING]: "# Idées" }); assert.equal(w.third, "task"); assert.deepEqual(w.lists.task, []); }
{ reset((c, a) => (c === "git" && a[0] === "remote" ? { code: 1, stdout: "", stderr: "no remote" } : ok("[]")), { [PROFILES]: NO_JIRA });
  const cx = makeCx(); const w = new StartWork(); w.init({}, cx); Object.assign(w, { space: "s1", cwd: "/repo", machine: null });
  await w.load(cx); await cx.settle();
  assert.deepEqual(labels(w), ["PR", "Issues", "Jira"]); assert.ok(w.lists.jira.error); }

// While loading, the header shows PR and Issues only.
{ reset(); const w = new StartWork(); w.init({}, makeCx()); assert.deepEqual(w.tabs().map(([, l]) => l), ["PR", "Issues"]); }
// Jira tab shown before lists.jira exists: « Chargement… », so render must not read lists.jira.error.
{ reset(); const w = new StartWork(); w.init({}, makeCx()); Object.assign(w, { third: "jira", tab: "jira" }); assert.equal(w.lists.jira, undefined); w.render(); }
// Tasks tab: ↓ selects the next task, a row click selects without a browser, Enter does nothing, filter on title.
{
  const { w, cx, key } = await loaded({ [PROFILES]: NO_JIRA, [REMAINING]: FEATURES });
  w.tab = "task"; const n = fake.calls.length;
  key("down"); assert.equal(w.at, 1);
  w.rowClick(w.items()[0], 0, cx); assert.equal(w.at, 0);
  w.input.fire("submit", { secondary: false }, cx); await cx.settle();
  assert.equal(fake.calls.length, n); assert.deepEqual(fake.closed, []);
  w.filter = "campagne"; assert.deepEqual(w.items().map((i) => i.title), ["Duels en concours Campagne"]);
}

// Launch a task: Ctrl+Enter opens /feature in a tab named after the task; nothing is written, no acli.
const taskTab = async (remaining = FEATURES) => { const r = await loaded({ [PROFILES]: NO_JIRA, [REMAINING]: remaining }); r.w.tab = "task"; r.w.space = "s1"; return r; };
const TASK1 = TAB_NEW("Duels en concours Campagne", "/feature **Duels en concours Campagne** : les tableaux. (docs/reste-a-faire.md, point 1)");
{
  const { w, cx } = await taskTab();
  fake.respond = () => ok("{}");
  const n = fake.calls.length;
  w.input.fire("submit", { secondary: true }, cx); await cx.settle();
  assert.deepEqual(fake.calls.slice(n), [TASK1]);
  assert.deepEqual(fake.closed, ["ov"]); assert.deepEqual(fake.writes, []);
  assert.equal(fake.calls.some((c) => c[0] === "acli" && c[3] !== "search" && c[1] !== "auth"), false);
}
// Name cut at 30 characters.
{
  const { w, cx } = await taskTab("# R\n\n## Features\n\n1. **Un titre vraiment très long pour un onglet** : x.\n");
  fake.respond = () => ok("{}"); const n = fake.calls.length;
  w.input.fire("submit", { secondary: true }, cx); await cx.settle();
  assert.equal(fake.calls[n][fake.calls[n].indexOf("--name") + 1], taskName(w.lists.task[0]));
  assert.equal(taskName(w.lists.task[0]).length <= 30, true);
}
// Refused: toast, dialog stays, list untouched.
{
  const { w, cx } = await taskTab();
  const before = w.lists.task;
  fake.respond = () => ({ code: 1, stdout: '{"error":"unknown space"}', stderr: "" });
  w.input.fire("submit", { secondary: true }, cx); await cx.settle();
  assert.deepEqual(fake.toasts, [{ title: "Agent non lancé", body: "unknown space", level: "error" }]);
  assert.deepEqual(fake.closed, []); assert.equal(w.busy, null); assert.equal(w.lists.task, before);
}
// Launching: everything else is ignored until herdr-app answers.
{
  const { w, cx, key } = await taskTab();
  let release; const gate = new Promise((r) => { release = r; });
  fake.respond = async () => { await gate; return ok("{}"); };
  const [item, at, n] = [w.items()[0], w.at, fake.calls.length];
  w.input.fire("submit", { secondary: true }, cx);
  await new Promise((r) => setImmediate(r));
  assert.equal(w.busy, "t4");
  w.input.fire("submit", { secondary: true }, cx); key("escape"); w.dismiss(); w.rowClick(item, 1, cx);
  assert.equal(w.at, at); assert.equal(fake.calls.slice(n).length, 1); assert.deepEqual(fake.closed, []);
  release(); await cx.settle();
  assert.deepEqual(fake.closed, ["ov"]);
}

// Two bullets without a number: the row key (distinct keys) drives ids and hover, so hovering one shows Lancer on it only.
{
  const { w, cx } = await taskTab("# R\n\n## Features\n\n- **A** : a\n- **B** : b\n");
  w.at = 99;
  const build = (n) => { Object.assign(fake, { ids: [], hovers: [], hidden: 0 }); w.row(w.items()[n], n, {}); return { ids: fake.ids, hover: fake.hovers[0], shown: fake.hidden === 0 }; };
  const [a, b] = [build(0), build(1)];
  const [ka, kb] = w.items().map((i) => i.key);
  assert.notEqual(ka, kb);
  assert.deepEqual(a.ids, [`sw-task-${ka}`, `sw-start-${ka}`]);
  assert.deepEqual(b.ids, [`sw-task-${kb}`, `sw-start-${kb}`]);
  assert.deepEqual([a.shown, b.shown], [false, false]);
  b.hover(true, cx);
  assert.equal(w.hovered, kb);
  assert.equal(build(1).shown, true);
  assert.equal(build(0).shown, false);
}

console.log("main ok");
