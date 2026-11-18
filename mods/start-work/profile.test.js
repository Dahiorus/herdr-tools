// Run: node mods/start-work/profile.test.js
import assert from "node:assert/strict";
import { profileAccount } from "./profile.js";

const profiles = '{"work":{"owners":["Acme"],"account":"me-work"},"perso":{"owners":["me","other"],"account":"me"}}';
assert.equal(profileAccount(profiles, "acme"), "me-work");
assert.equal(profileAccount(profiles, "other"), "me");
assert.equal(profileAccount(profiles, "nobody"), undefined);
assert.equal(profileAccount(null, "acme"), undefined);
assert.throws(() => profileAccount("{", "acme"), SyntaxError);
console.log("profile ok");
