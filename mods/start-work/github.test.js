// Run: node mods/start-work/github.test.js
import assert from "node:assert/strict";
import { prStatus, authorLogin, GH_LISTS, STATUS_COLORS } from "./github.js";

assert.equal(prStatus({ isDraft: true }), "Brouillon");
assert.equal(prStatus({ isDraft: false }), "Prête");
assert.equal(authorLogin({ author: { login: "alice" } }), "alice");
assert.equal(authorLogin({ author: null }), "");
assert.equal(authorLogin({ author: { login: "" } }), "");
assert.equal(GH_LISTS.pr.fields, "number,title,author,url,isDraft");
assert.equal(GH_LISTS.issue.fields, "number,title,author,url"); // gh issue list rejects isDraft
assert.equal(GH_LISTS.pr.meta, authorLogin);
assert.equal(GH_LISTS.issue.meta, authorLogin);
assert.equal(GH_LISTS.pr.tag, prStatus);
assert.equal(GH_LISTS.issue.tag, undefined); // no status column on Issues
for (const isDraft of [true, false]) assert.ok(STATUS_COLORS[prStatus({ isDraft })]); // every status has a color
console.log("github ok");
