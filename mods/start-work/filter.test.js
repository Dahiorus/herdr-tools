// Run: node mods/start-work/filter.test.js
import assert from "node:assert/strict";
import { matches } from "./filter.js";

const draft = { id: "#12", title: "Corriger le login", meta: "alice", tag: "Brouillon" };
const ticket = { id: "ABC-1", title: "Export", meta: "En cours · bob" }; // no tag: issue or Jira

assert.ok(matches(draft, ""));
assert.ok(matches(draft, "brouillon"));
assert.ok(matches(draft, "ALICE"));
assert.ok(matches(draft, "#12"));
assert.ok(!matches(draft, "prête"));
assert.ok(matches(ticket, "bob"));
assert.ok(!matches(ticket, "undefined")); // a missing tag is not the text "undefined"
assert.ok(matches({ id: "#34", title: "Login", meta: "alice", tag: "PR #12" }, "#12")); // fixing PR in the tag
console.log("filter ok");
