// Run: node mods/start-work/profile.test.js
import assert from "node:assert/strict";
import { noJira, profileAccount } from "./profile.js";

const profiles = '{"work":{"owners":["Acme"],"account":"me-work"},"perso":{"owners":["me","other"],"account":"me"}}';
assert.equal(profileAccount(profiles, "acme"), "me-work");
assert.equal(profileAccount(profiles, "other"), "me");
assert.equal(profileAccount(profiles, "nobody"), undefined);
assert.equal(profileAccount(null, "acme"), undefined);
assert.throws(() => profileAccount("{", "acme"), SyntaxError);
const plugins = '{"vidal":{"owners":["Acme"],"enabledPlugins":{"atlassian@claude-plugins-official":true}},"perso":{"owners":["me"],"enabledPlugins":{"atlassian@claude-plugins-official":false}},"bare":{"owners":["x"]}}';
assert.equal(noJira(plugins, "ME"), true);
assert.equal(noJira(plugins, "acme"), false);
assert.equal(noJira(plugins, "x"), false); // plugin not mentioned
assert.equal(noJira(plugins, "nobody"), false);
assert.equal(noJira(null, "me"), false);
assert.throws(() => noJira("{", "me"), SyntaxError);
console.log("profile ok");
