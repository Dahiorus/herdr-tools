// Run: node mods/start-work/jira.test.js
import assert from "node:assert/strict";
import { toJql, jiraSource, withSource } from "./jira.js";

assert.equal(toJql(" ABC "), "project = ABC AND statusCategory != Done ORDER BY updated DESC");
assert.equal(toJql("abc"), "project = ABC AND statusCategory != Done ORDER BY updated DESC");
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
console.log("jira ok");
