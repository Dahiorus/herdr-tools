// Run: node mods/start-work/github.test.js
import assert from "node:assert/strict";
import { prStatus, authorLogin, GH_LISTS, STATUS_COLORS, META_COLORS, metaColor, myPrMeta, prRows, groupLayout, listIndex, isPending, feedbackNumbers, PR_LISTS, threadsSearch } from "./github.js";

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
assert.deepEqual(prRows({ toReview: [pr(5, "bob"), pr(7, "me")], mine: [pr(7, "me", { isDraft: true, reviews: [rv("alice", "APPROVED", "1")] })], feedback: new Set() }), [
  { id: "#5", title: "T5", meta: "bob", tag: "Prête", url: "u5", group: "toReview" },
  { id: "#7", title: "T7", meta: "1/2", tag: "Brouillon", url: "u7", group: "mine" }, // in both lists: Mes PR only
]);
assert.deepEqual(prRows({ toReview: [], mine: [], feedback: new Set() }), []);

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
const th = (o = {}) => ({ isResolved: false, all: { totalCount: 2 }, first: { nodes: [{ author: { __typename: "User", login: "alice" } }] }, last: { nodes: [{ author: { login: "alice" } }] }, ...o });
const lastBy = (login) => ({ last: { nodes: [{ author: login === null ? null : { login } }] } });
assert.equal(isPending(th(), "me"), true); // alice spoke last
assert.equal(isPending(th(lastBy("me")), "me"), false); // I answered last
assert.equal(isPending(th({ isResolved: true }), "me"), false);
assert.equal(isPending(th({ all: { totalCount: 1 }, ...lastBy("me") }), "me"), true); // my own thread, no answer
assert.equal(isPending(th({ all: { totalCount: 3 }, ...lastBy("me") }), "me"), false); // alice answered, then me
assert.equal(isPending(th({ first: { nodes: [{ author: { __typename: "Bot", login: "sonar" } }] }, ...lastBy("sonar") }), "me"), false);
assert.equal(isPending(th(lastBy(null)), "me"), true); // ghost author: not me
assert.equal(isPending(th({ first: { nodes: [] } }), "me"), true); // no readable first comment: not a bot
assert.equal(isPending(th(lastBy("me")), "Me"), false); // logins ignore case
assert.equal(isPending(th(lastBy("Me")), "me"), false); // on both sides
const resp = (nodes, login = "me") => ({ data: { viewer: { login }, search: { nodes } } });
assert.deepEqual(feedbackNumbers(resp([{ number: 7, reviewThreads: { nodes: [th({ isResolved: true }), th()] } }, { number: 8, reviewThreads: { nodes: [th(lastBy("me"))] } }])), new Set([7])); // any thread decides, not the first
assert.deepEqual(feedbackNumbers(resp([])), new Set());
assert.throws(() => feedbackNumbers({}), /search\.nodes/); // unexpected schema: detection failed, fetchFeedback falls back
assert.deepEqual(feedbackNumbers(resp([{}])), new Set());
assert.equal(threadsSearch("o/r"), "repo:o/r is:pr is:open author:@me");
assert.deepEqual(PR_LISTS, { toReview: ["--search", "review-requested:@me"], mine: ["--author", "@me"] });

const mineRaw = [pr(8, "me"), pr(7, "me", { isDraft: true, reviews: [rv("alice", "APPROVED", "1")] })];
assert.deepEqual(prRows({ toReview: [pr(5, "bob"), pr(7, "me")], mine: mineRaw, feedback: new Set([7]) }).map((r) => [r.id, r.group, r.meta, r.tag]), [
  ["#5", "toReview", "bob", "Prête"], ["#7", "feedback", "1/2", "Brouillon"], ["#8", "mine", "0/2", "Prête"],
]);
assert.deepEqual(prRows({ toReview: [], mine: mineRaw, feedback: null }).map((r) => [r.id, r.group]), [["#8", "mineAll"], ["#7", "mineAll"]]); // threads failed: today's Mes PR
const f7 = { id: "#7", group: "feedback" }, m8 = { id: "#8", group: "mine" };
assert.deepEqual(groupLayout([r5, f7, m8]), [{ title: "À relire", count: 1 }, { item: r5, n: 0 }, { title: "Retours sur mes PR", count: 1 }, { item: f7, n: 1 }, { title: "Mes PR", count: 1 }, { item: m8, n: 2 }]);
assert.deepEqual(groupLayout([{ id: "#8", group: "mineAll" }]).map((c) => c.title ?? c.item.id), ["Mes PR", "#8"]);
assert.equal(listIndex([r5, f7, m8], 2), 5);
assert.equal(listIndex([r5, f7, m8], 1, true), 2); // up onto #7 shows its title
assert.deepEqual(groupLayout([f7]), [{ title: "Retours sur mes PR", count: 1 }, { item: f7, n: 0 }]); // filtered: only Retours left
assert.equal(metaColor({ group: "feedback", meta: "Prête pour la QA" }), "ansi2");
assert.equal(metaColor({ group: "mineAll", meta: "Changements demandés" }), "ansi1");
console.log("github ok");
