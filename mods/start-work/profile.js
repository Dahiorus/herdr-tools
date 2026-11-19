// The gh account of the /profile whose owners include this GitHub owner, as profile.sh finds it
// in ~/.claude/profiles.json; undefined: no profile, gh's active account. Throws on invalid JSON.
// Pure, no imports: `node mods/start-work/profile.test.js` checks it.
function findProfile(profilesText, owner) {
  const profiles = JSON.parse(profilesText ?? "{}");
  return Object.values(profiles).find((p) => p.owners?.some((o) => o.toLowerCase() === owner.toLowerCase()));
}

export function profileAccount(profilesText, owner) {
  return findProfile(profilesText, owner)?.account;
}

// True when the owner's profile switches the Atlassian plugin off (`false`); absent counts as on.
export function noJira(profilesText, owner) {
  return findProfile(profilesText, owner)?.enabledPlugins?.["atlassian@claude-plugins-official"] === false;
}
