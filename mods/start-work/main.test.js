// Run: node mods/start-work/main.test.js — the Lancer and confirmation flow of the dialog, against fake.js.
import assert from "node:assert/strict";
import { fake, reset, makeCx } from "./fake.js";
const { default: StartWork } = await import("./main.js");

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
  Object.assign(w, { tab, space: "s1", cwd: "/repo", machine: null, repo: "o/r" });
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

console.log("main ok");
