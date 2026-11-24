// Run: node mods/start-work/jira.test.js
import assert from "node:assert/strict";
import { toJql, projectKey, jiraSource, withSource, linksJql, openBlockersJql, withoutBlocked } from "./jira.js";

const SPRINT_JQL = (key) => `project = ${key} AND sprint in openSprints() AND (status = "À faire" OR (status = "En cours" AND assignee = currentUser())) ORDER BY updated DESC`;
assert.equal(toJql(" ABC "), SPRINT_JQL("ABC"));
assert.equal(toJql("abc"), SPRINT_JQL("ABC"));
assert.equal(projectKey(" abc "), "ABC");
assert.equal(projectKey("filter=1"), null);
assert.equal(projectKey("123"), null);
assert.equal(projectKey("assignee = currentUser()"), null);
assert.equal(toJql("filter=123"), "filter = 123");
assert.equal(toJql("FILTER = 123"), "filter = 123");
assert.equal(toJql("123"), "filter = 123");
assert.equal(toJql("https://x.atlassian.net/issues/?filter=123"), "filter = 123");
assert.equal(toJql("https://x.atlassian.net/issues/?filter=123&jql=project%20%3D%20ABC"), "filter = 123");
assert.equal(toJql("assignee = currentUser()"), "assignee = currentUser()");

assert.equal(jiraSource(null, "o/r"), undefined);
assert.equal(jiraSource('{"jira":{"o/r":"ABC"}}', "o/r"), "ABC");
assert.throws(() => jiraSource('{"jira":{"o/r":"ABC",}}', "o/r"), SyntaxError);
assert.throws(() => withSource('{"jira":{"a/b":"X",}}', "o/r", "ABC"), SyntaxError);
assert.deepEqual(JSON.parse(withSource('{"jira":{"a/b":"X"},"other":1}', "o/r", "ABC")), { jira: { "a/b": "X", "o/r": "ABC" }, other: 1 });
assert.deepEqual(JSON.parse(withSource(null, "o/r", "ABC")), { jira: { "o/r": "ABC" } });
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
console.log("jira ok");
