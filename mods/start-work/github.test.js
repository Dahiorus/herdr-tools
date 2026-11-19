// Run: node mods/start-work/github.test.js
import assert from "node:assert/strict";
import { prStatus, authorLogin, GH_LISTS, STATUS_COLORS, META_COLORS, metaColor, myPrMeta, prRows, groupLayout, listIndex } from "./github.js";

assert.equal(prStatus({ isDraft: true }), "Brouillon");
assert.equal(prStatus({ isDraft: false }), "Prête");
assert.equal(authorLogin({ author: { login: "alice" } }), "alice");
assert.equal(authorLogin({ author: null }), "");
assert.equal(authorLogin({ author: { login: "" } }), "");
assert.equal(GH_LISTS.issue.fields, "number,title,author,url"); // gh issue list rejects isDraft
assert.equal(GH_LISTS.pr.meta, authorLogin);
assert.equal(GH_LISTS.issue.meta, authorLogin);
assert.equal(GH_LISTS.pr.tag, prStatus);
assert.equal(GH_LISTS.issue.tag, undefined); // no status column on Issues
for (const isDraft of [true, false]) assert.ok(STATUS_COLORS[prStatus({ isDraft })]); // every status has a color
const rv = (login, state, t) => ({ author: login === null ? null : { login }, state, submittedAt: t });
assert.equal(myPrMeta([]), "0/2");
assert.equal(myPrMeta([rv("alice", "APPROVED", "1")]), "1/2");
assert.equal(myPrMeta([rv("alice", "APPROVED", "1"), rv("bob", "APPROVED", "2")]), "Prête pour la QA");
assert.equal(myPrMeta([rv("a", "APPROVED", "1"), rv("b", "APPROVED", "2"), rv("c", "APPROVED", "3")]), "Prête pour la QA");
assert.equal(myPrMeta([rv("alice", "APPROVED", "1"), rv("alice", "COMMENTED", "2")]), "1/2");
assert.equal(myPrMeta([rv("alice", "CHANGES_REQUESTED", "1"), rv("alice", "APPROVED", "2")]), "1/2");
assert.equal(myPrMeta([rv("alice", "APPROVED", "1"), rv("alice", "CHANGES_REQUESTED", "2")]), "Changements demandés");
assert.equal(myPrMeta([rv("alice", "APPROVED", "1"), rv("alice", "DISMISSED", "2")]), "0/2");
assert.equal(myPrMeta([rv("alice", "APPROVED", "2"), rv("alice", "CHANGES_REQUESTED", "1")]), "1/2");
assert.equal(myPrMeta([rv("alice", "APPROVED", "1"), rv("alice", "PENDING", "2")]), "1/2");
assert.equal(myPrMeta([rv("alice", "APPROVED", "1"), rv("bob", "APPROVED", "2"), rv("carol", "CHANGES_REQUESTED", "3")]), "Changements demandés");
assert.equal(myPrMeta([rv(null, "APPROVED", "1"), rv("alice", "PENDING", null)]), "1/2"); // no account; pending ignored
assert.equal(GH_LISTS.pr.fields, "number,title,author,url,isDraft,reviews");

const pr = (number, login, o = {}) => ({ number, title: `T${number}`, author: { login }, url: `u${number}`, isDraft: false, reviews: [], ...o });
assert.deepEqual(prRows({ toReview: [pr(5, "bob"), pr(7, "me")], mine: [pr(7, "me", { isDraft: true, reviews: [rv("alice", "APPROVED", "1")] })] }), [
  { id: "#5", title: "T5", meta: "bob", tag: "Prête", url: "u5", group: "toReview" },
  { id: "#7", title: "T7", meta: "1/2", tag: "Brouillon", url: "u7", group: "mine" }, // in both lists: Mes PR only
]);
assert.deepEqual(prRows({ toReview: [], mine: [] }), []);

const r5 = { id: "#5", group: "toReview" }, r6 = { id: "#6", group: "toReview" }, m7 = { id: "#7", group: "mine" };
assert.deepEqual(groupLayout([r5, r6, m7]), [{ title: "À relire", count: 2 }, { item: r5, n: 0 }, { item: r6, n: 1 }, { title: "Mes PR", count: 1 }, { item: m7, n: 2 }]);
assert.deepEqual(groupLayout([m7]), [{ title: "Mes PR", count: 1 }, { item: m7, n: 0 }]); // filtered: no empty À relire title
assert.deepEqual(groupLayout([{ id: "#12" }]), [{ item: { id: "#12" }, n: 0 }]); // issues: no title
assert.equal(listIndex([r5, r6, m7], 0), 1);
assert.equal(listIndex([r5, r6, m7], 2), 4);
assert.equal(listIndex([{ id: "#12" }, { id: "#13" }], 1), 1);
assert.equal(listIndex([], 0), 0);
// Going up onto the first row of a group reveals its title.
assert.equal(listIndex([r5, r6, m7], 0, true), 0);
assert.equal(listIndex([r5, r6, m7], 2, true), 3);
assert.equal(listIndex([r5, r6, m7], 1, true), 2);
assert.equal(listIndex([{ id: "#12" }, { id: "#13" }], 0, true), 0);
assert.equal(listIndex([], 0, true), 0);
// A PR ready for QA stands out in green, like the Prête tag; other meta stay dim.
assert.equal(META_COLORS[myPrMeta([rv("alice", "APPROVED", "1"), rv("bob", "APPROVED", "2")])], "ansi2");
assert.equal(META_COLORS["1/2"], undefined);
assert.equal(META_COLORS[myPrMeta([rv("alice", "APPROVED", "1"), rv("alice", "CHANGES_REQUESTED", "2")])], "ansi1");
// Only my PRs' meta gets a color: a Jira status of the same name stays dim.
assert.equal(metaColor({ group: "mine", meta: "Prête pour la QA" }), "ansi2");
assert.equal(metaColor({ group: "mine", meta: "Changements demandés" }), "ansi1");
assert.equal(metaColor({ meta: "Prête pour la QA" }), undefined);
assert.equal(metaColor({ group: "toReview", meta: "bob" }), undefined);
console.log("github ok");
