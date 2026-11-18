// Run: node mods/start-work/launch.test.js — the acli and herdr-app calls of launch.js, against fake.js.
import assert from "node:assert/strict";
import { fake, reset } from "./fake.js";
const { launchAgent, takeTicket, isMine, assess } = await import("./launch.js");

const ok = (stdout = "") => ({ code: 0, stdout, stderr: "" });
const ticket = (o = {}) => ({ id: "POSO-127", type: "Story", statusName: "À faire", statusCategory: "new", assigneeName: null, url: "https://x/browse/POSO-127", ...o });

// launchAgent: one herdr-app do tab.new in the space and folder, named after the item, claude with the task.
reset(() => ok('{"tab":"t1"}'));
assert.equal(await launchAgent({ id: "#12" }, "s1", "/repo", "/bugfix https://github.com/o/r/issues/12"), null);
assert.deepEqual(fake.calls, [["herdr-app", "do", "tab.new", "--space", "s1", "--folder", "/repo", "--name", "#12", "--argv", '["claude"]', "--task", "/bugfix https://github.com/o/r/issues/12"]]);
reset(() => ({ code: 1, stdout: '{"error":"unknown space"}', stderr: "" }));
assert.equal(await launchAgent({ id: "#12" }, "s1", "/repo", "t"), "unknown space");
reset(() => { throw new Error("herdr-app introuvable"); });
assert.equal(await launchAgent({ id: "#12" }, "s1", "/repo", "t"), "herdr-app introuvable");

// takeTicket: acli on the space's machine, assign then transition, each skipped when already done.
let opts;
reset((_c, _a, o) => { opts = o; return ok(); });
assert.equal(await takeTicket(ticket(), false, "vps"), null);
assert.deepEqual(fake.calls, [
  ["acli", "jira", "workitem", "assign", "--key", "POSO-127", "--assignee", "@me", "--yes"],
  ["acli", "jira", "workitem", "transition", "--key", "POSO-127", "--status", "En cours", "--yes"],
]);
assert.deepEqual(opts, { on: "vps" });
reset(() => ok());
assert.equal(await takeTicket(ticket({ statusName: "En cours" }), true, null), null);
assert.deepEqual(fake.calls, []);
reset((_c, a) => (a[2] === "assign" ? { code: 1, stdout: "", stderr: "refusé" } : ok()));
assert.deepEqual(await takeTicket(ticket(), false, null), { title: "Attribution de POSO-127 impossible", body: "refusé" });
assert.equal(fake.calls.length, 1); // no transition after a failed assign
reset(() => { throw new Error("injoignable"); });
assert.deepEqual(await takeTicket(ticket(), true, null), { title: "POSO-127 n'a pas pu passer « En cours »", body: "acli : injoignable" });

// isMine: a search restricted to the current user.
reset(() => ok('[{"key":"POSO-127"}]'));
assert.equal(await isMine("POSO-127", null), true);
assert.deepEqual(fake.calls, [["acli", "jira", "workitem", "search", "--jql", "key = POSO-127 AND assignee = currentUser()", "--fields", "summary", "--json"]]);
reset(() => ok("[]"));
assert.equal(await isMine("POSO-127", null), false);
reset(() => ({ code: 1, stdout: "", stderr: "unauthorized" }));
await assert.rejects(isMine("POSO-127", null), /unauthorized/);

// assess: refusals and failures toast and stop, without any Jira write.
reset(() => ({ code: 1, stdout: "", stderr: "unauthorized" }));
assert.deepEqual(await assess(ticket(), null), { stop: true, reload: true });
assert.deepEqual(fake.toasts, [{ title: "Prise en charge de POSO-127 impossible", body: "unauthorized", level: "error" }]);
reset(() => ok("[]"));
assert.deepEqual(await assess(ticket({ id: "POSO-12", type: "Epic" }), null), { stop: true });
assert.deepEqual(fake.toasts, [{ title: "POSO-12 est un Epic. Lance plutôt une de ses stories", body: "", level: "warning" }]);
reset(() => ok("[]"));
assert.deepEqual(await assess(ticket({ statusName: "Code Review", statusCategory: "indeterminate" }), null), { stop: true });
assert.equal(fake.toasts[0].title, "POSO-127 est déjà en Code Review");
reset(() => ok("[]"));
assert.deepEqual(await assess(ticket({ assigneeName: "Alice" }), null), { mine: false, ask: true });
assert.deepEqual(fake.toasts, []);
reset(() => ok("[{}]"));
assert.deepEqual(await assess(ticket({ assigneeName: "Moi" }), null), { mine: true, ask: false });
assert.ok(fake.calls.every((c) => c[3] === "search")); // assess only reads Jira

console.log("launch ok");
