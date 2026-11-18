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

// Project key, filter id/URL or JQL → JQL.
export function toJql(source) {
  const s = source.trim();
  if (/^[A-Z][A-Z0-9_]+$/i.test(s)) return `project = ${s.toUpperCase()} AND statusCategory != Done ORDER BY updated DESC`;
  // A filter URL may carry other parameters (jql=…): the filter wins.
  const f = s.match(/^(?:filter\s*=\s*)?(\d+)$/i) ?? s.match(/^https?:\/\/\S*[?&]filter=(\d+)(?:[&#]|$)/i);
  if (f) return `filter = ${f[1]}`;
  return s;
}
