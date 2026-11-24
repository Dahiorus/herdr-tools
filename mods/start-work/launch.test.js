// Run: node mods/start-work/launch.test.js — the acli and herdr-app calls of launch.js, against fake.js.
import assert from "node:assert/strict";
import { fake, reset } from "./fake.js";
const { THREADS_QUERY } = await import("./github.js");
const { launchAgent, takeTicket, isMine, assess, fetchTasks, fetchGh, fetchTickets } = await import("./launch.js");

const ok = (stdout = "") => ({ code: 0, stdout, stderr: "" });
const ticket = (o = {}) => ({ id: "POSO-127", type: "Story", statusName: "À faire", statusCategory: "new", assigneeName: null, url: "https://x/browse/POSO-127", ...o });

// launchAgent: one herdr-app do tab.new in the space and folder, named after the item, claude with the task.
reset(() => ok('{"tab":"t1"}'));
assert.equal(await launchAgent("#12", "s1", "/repo", "/bugfix https://github.com/o/r/issues/12"), null);
assert.deepEqual(fake.calls, [["herdr-app", "do", "tab.new", "--space", "s1", "--folder", "/repo", "--name", "#12", "--argv", '["claude"]', "--task", "/bugfix https://github.com/o/r/issues/12"]]);
reset(() => ({ code: 1, stdout: '{"error":"unknown space"}', stderr: "" }));
assert.equal(await launchAgent("#12", "s1", "/repo", "t"), "unknown space");
reset(() => { throw new Error("herdr-app introuvable"); });
assert.equal(await launchAgent("#12", "s1", "/repo", "t"), "herdr-app introuvable");

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
reset(() => { throw new Error("machine injoignable"); });
assert.deepEqual(await fetchTasks("o/r", ON), { error: "Reste à faire illisible : git : machine injoignable" });
reset((c, a) => (a[0] === "rev-parse" ? ok("/r\n") : ok("src/a.js\0")));
assert.deepEqual(await fetchTasks("o/r", ON), { error: "Pas de reste à faire dans o/r. `/todo add` le crée dans docs/reste-a-faire.md." });

// fetchGh (caractérisation): gh list mapped to rows; three error messages.
{
const ISSUES = ["gh", "issue", "list", "--repo", "o/r", "--json", "number,title,author,url", "--limit", "50"];
const FIXING = ["gh", "pr", "list", "--repo", "o/r", "--json", "number,isDraft,closingIssuesReferences", "--limit", "100"];
const isFixing = (a) => a[0] === "pr";
const issue12 = { number: 12, title: "Bug", author: { login: "alice" }, url: "u12" };
const fixes12 = [{ number: 40, isDraft: false, closingIssuesReferences: [{ number: 12, url: "u12" }] }];
reset((_c, a) => ok(JSON.stringify(isFixing(a) ? fixes12 : [issue12, { ...issue12, number: 13, url: "u13" }])));
const issueRowsOut = await fetchGh("issue", "o/r", undefined, {}, "/p.json");
assert.deepEqual(issueRowsOut.map((r) => [r.id, r.group, r.tag]), [["#13", "toFix", undefined], ["#12", "fixing", "PR #40"]]);
assert.deepEqual(fake.calls.sort(), [FIXING, ISSUES].sort()); // open PRs only: no --state
assert.deepEqual(fake.toasts, []);
// fixing PRs failed: issues as today, a warning toast
reset((_c, a) => (isFixing(a) ? { code: 1, stdout: "", stderr: "HTTP 502" } : ok(JSON.stringify([issue12]))));
assert.deepEqual(await fetchGh("issue", "o/r", undefined, {}, "/p.json"), [{ id: "#12", title: "Bug", meta: "alice", tag: undefined, url: "u12" }]);
assert.deepEqual(fake.toasts, [{ title: "PR de correction non détectées", body: "HTTP 502", level: "warning" }]);
// both failed: the issue list's error alone, no toast
reset(() => ({ code: 1, stdout: "", stderr: "HTTP 502" }));
assert.deepEqual(await fetchGh("issue", "o/r", "me", {}, "/p.json"), { error: "HTTP 502" });
assert.deepEqual(fake.toasts, []);
// profile account: the PR list goes through the same sh -c wrapper
reset((_c, a) => ok("[]"));
await fetchGh("issue", "o/r", "me", {}, "/p.json");
assert.ok(fake.calls.some((c) => c[0] === "sh" && c[4] === "me" && c.slice(5).join() === FIXING.slice(1).join()));
}
const LIST = (extra) => ["gh", "pr", "list", "--repo", "o/r", "--json", "number,title,author,url,isDraft,reviews", "--limit", "50", ...extra];
const raw = (number, login) => ({ number, title: `T${number}`, author: { login }, url: `u${number}`, isDraft: false, reviews: [] });
const GRAPHQL = ["gh", "api", "graphql", "-f", `query=${THREADS_QUERY}`, "-f", "q=repo:o/r is:pr is:open author:@me"];
const isGraphql = (a) => a[0] === "api" && a[1] === "graphql";
const threads = (n) => ({ data: { viewer: { login: "me" }, search: { nodes: [{ number: n, reviewThreads: { nodes: [{ isResolved: false, all: { totalCount: 1 }, first: { nodes: [{ author: { __typename: "User" } }] }, last: { nodes: [{ author: { login: "alice" } }] } }] } }] } } });
const prs = (a) => ok(JSON.stringify(a.includes("--author") ? [raw(7, "me")] : [raw(5, "bob")]));
reset((_c, a) => (isGraphql(a) ? ok(JSON.stringify(threads(7))) : prs(a)));
const rows = await fetchGh("pr", "o/r", undefined, {}, "/p.json");
assert.deepEqual(rows.map((r) => [r.id, r.group, r.meta]), [["#5", "toReview", "bob"], ["#7", "feedback", "0/2"]]);
assert.equal(rows.length, 2); // tab counter: PR 2
assert.deepEqual(fake.calls.sort(), [LIST(["--author", "@me"]), LIST(["--search", "review-requested:@me"]), GRAPHQL].sort()); // no general list
reset((_c, a) => (isGraphql(a) ? ok(JSON.stringify(threads(0))) : ok("[]")));
assert.deepEqual(await fetchGh("pr", "o/r", undefined, {}, "/p.json"), []);
// threads failed: Mes PR as before, a warning toast
reset((_c, a) => (isGraphql(a) ? { code: 1, stdout: "", stderr: "HTTP 502" } : prs(a)));
assert.deepEqual((await fetchGh("pr", "o/r", undefined, {}, "/p.json")).map((r) => r.group), ["toReview", "mineAll"]);
assert.deepEqual(fake.toasts, [{ title: "Retours non détectés", body: "HTTP 502", level: "warning" }]);
reset((_c, a) => (isGraphql(a) ? ok("{}") : prs(a)));
assert.deepEqual((await fetchGh("pr", "o/r", undefined, {}, "/p.json")).map((r) => r.group), ["toReview", "mineAll"]);
assert.equal(fake.toasts.length, 1);
assert.equal(fake.toasts[0].title, "Retours non détectés");
// a list failed: its error, no threads toast
reset((_c, a) => (isGraphql(a) ? { code: 1, stdout: "", stderr: "HTTP 502" } : a.includes("--author") ? { code: 1, stdout: "", stderr: "HTTP 502" } : ok("[]")));
assert.deepEqual(await fetchGh("pr", "o/r", undefined, {}, "/p.json"), { error: "HTTP 502" });
assert.deepEqual(fake.toasts, []);
// profile account: the threads query goes through the same sh -c wrapper as the lists
reset((_c, a) => (a.includes("graphql") ? ok(JSON.stringify(threads(7))) : prs(a)));
await fetchGh("pr", "o/r", "me", {}, "/p.json");
assert.ok(fake.calls.some((c) => c[0] === "sh" && c[1] === "-c" && c[3] === "sh" && c[4] === "me" && c.slice(5).join() === GRAPHQL.slice(1).join()));
assert.ok(fake.calls.some((c) => c[0] === "sh" && c[4] === "me" && c[5] === "pr")); // lists too
reset((_c, a) => (a.includes("--search") ? ok("[]") : { code: 1, stdout: "", stderr: "Could not resolve to a Repository" }));
assert.deepEqual(await fetchGh("pr", "o/r", "me", {}, "/p.json"), { error: "Le compte gh me (profil du projet) ne voit pas o/r." });
reset((_c, a) => (a[0] === "api" ? ok("carol\n") : a.includes("--author") ? ok("[]") : { code: 1, stdout: "", stderr: "Could not resolve to a Repository" }));
assert.deepEqual(await fetchGh("pr", "o/r", undefined, {}, "/p.json"), { error: "Le compte gh actif (carol) ne voit pas o/r, et aucun profil (/p.json) ne couvre ce propriétaire. Change de compte avec gh auth switch." });
reset(() => ({ code: 1, stdout: "", stderr: "HTTP 502" }));
assert.deepEqual(await fetchGh("issue", "o/r", "me", {}, "/p.json"), { error: "HTTP 502" });
reset(() => ({ code: 1, stdout: "", stderr: "Could not resolve to a Repository" }));
assert.deepEqual(await fetchGh("issue", "o/r", "me", {}, "/p.json"), { error: "Le compte gh me (profil du projet) ne voit pas o/r." });
reset((c, a) => (a[0] === "api" ? ok("carol\n") : { code: 1, stdout: "", stderr: "Could not resolve to a Repository" }));
assert.deepEqual(await fetchGh("issue", "o/r", undefined, {}, "/p.json"), { error: "Le compte gh actif (carol) ne voit pas o/r, et aucun profil (/p.json) ne couvre ce propriétaire. Change de compte avec gh auth switch." });

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

console.log("launch ok");
