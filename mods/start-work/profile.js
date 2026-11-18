// The gh account of the /profile whose owners include this GitHub owner, as profile.sh finds it
// in ~/.claude/profiles.json; undefined: no profile, gh's active account. Throws on invalid JSON.
// Pure, no imports: `node mods/start-work/profile.test.js` checks it.
export function profileAccount(profilesText, owner) {
  const profiles = JSON.parse(profilesText ?? "{}");
  return Object.values(profiles).find((p) => p.owners?.some((o) => o.toLowerCase() === owner.toLowerCase()))?.account;
}
