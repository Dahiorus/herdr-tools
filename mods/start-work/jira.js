// Pure helpers, no imports: `node mods/start-work/jira.test.js` checks them.

// The repo's Jira source in config.json's text (null: no file). Throws on invalid JSON,
// so a broken file is never rewritten from an empty config.
export function jiraSource(configText, repo) {
  return JSON.parse(configText ?? "{}").jira?.[repo];
}

// config.json's new text with the repo's source set, other repos kept.
export function withSource(configText, repo, source) {
  const config = JSON.parse(configText ?? "{}");
  config.jira = { ...(config.jira ?? {}), [repo]: source };
  return JSON.stringify(config, null, 2) + "\n";
}

// Uppercase project key if the source is one, else null.
export function projectKey(source) {
  const s = source.trim();
  return /^[A-Z][A-Z0-9_]+$/i.test(s) ? s.toUpperCase() : null;
}

// Project key, filter id/URL or JQL → JQL.
export function toJql(source) {
  const s = source.trim();
  const key = projectKey(s);
  if (key) return `project = ${key} AND sprint in openSprints() AND (status = "À faire" OR (status = "En cours" AND assignee = currentUser())) ORDER BY updated DESC`;
  // A filter URL may carry other parameters (jql=…): the filter wins.
  const f = s.match(/^(?:filter\s*=\s*)?(\d+)$/i) ?? s.match(/^https?:\/\/\S*[?&]filter=(\d+)(?:[&#]|$)/i);
  if (f) return `filter = ${f[1]}`;
  return s;
}

export const linksJql = (keys) => `key in (${keys.join(", ")}) AND issueLinkType = "is blocked by"`;

export const openBlockersJql = (key) => `issue in linkedIssues(${key}, "is blocked by") AND statusCategory != Done`;

const hasOpenBlocker = async (key, search) => (await search(openBlockersJql(key), 1)).length > 0;

// Items without an unfinished blocker, same order. `search(jql, limit)` runs the JQL (acli).
export async function withoutBlocked(items, search) {
  if (items.length === 0) return [];
  const linked = await search(linksJql(items.map((i) => i.key)), items.length);
  const flags = await Promise.all(linked.map((l) => hasOpenBlocker(l.key, search)));
  const blocked = new Set(linked.filter((_, i) => flags[i]).map((l) => l.key));
  return items.filter((i) => !blocked.has(i.key));
}
