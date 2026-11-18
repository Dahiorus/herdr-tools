// Pure rules of "launch the work" in Start work (no gpui-kit/herdr import: tested under node).
export const TARGET_STATUS = "En cours";

export const firstLine = (r) => (r.stderr || r.stdout).trim().split("\n")[0];

export const ticketRow = (i, site) => {
  const f = i.fields ?? {};
  return {
    id: i.key,
    title: f.summary ?? "",
    meta: [f.status?.name, f.assignee?.displayName].filter(Boolean).join(" · "),
    url: `https://${site}/browse/${i.key}`,
    type: f.issuetype?.name ?? "",
    statusName: f.status?.name ?? "",
    statusCategory: f.status?.statusCategory?.key,
    assigneeName: f.assignee?.displayName ?? "",
  };
};

// shortcut: Epic and Initiative are refused, any other type gets /feature; list the types if a project adds more.
export const skillFor = (type) => /^(bug|bogue)$/i.test(type) ? "/bugfix" : /^(epic|initiative)$/i.test(type) ? null : "/feature";

export const agentTask = (kind, item) =>
  kind === "jira" ? `${skillFor(item.type)} ${item.id} ${item.url}` : `/bugfix ${item.url}`;

// Reason not to launch, or null. A ticket "à faire" (category new) is always launchable.
export const refusal = (item, mine) => {
  if (!skillFor(item.type)) return `${item.id} est un ${item.type}. Lance plutôt une de ses stories`;
  if (item.statusCategory === "new" || (item.statusName === TARGET_STATUS && mine)) return null;
  return `${item.id} est déjà en ${item.statusName}`;
};

export const askBeforeTaking = (item, mine) => Boolean(item.assigneeName) && !mine;

// Refusal first, then confirmation (taken by someone else), then straight to taking it.
export const decide = (item, mine) => {
  const reason = refusal(item, mine);
  return reason ? { refusal: reason } : askBeforeTaking(item, mine) ? { ask: true } : { take: true };
};

export const takeSteps = (item, mine) => [
  !mine && { args: ["jira", "workitem", "assign", "--key", item.id, "--assignee", "@me", "--yes"], title: `Attribution de ${item.id} impossible` },
  item.statusName !== TARGET_STATUS && { args: ["jira", "workitem", "transition", "--key", item.id, "--status", TARGET_STATUS, "--yes"], title: `${item.id} n'a pas pu passer « ${TARGET_STATUS} »` },
].filter(Boolean);

// One acli step: {title, body} on failure (non-zero exit or rejection), else null.
const runStep = async ({ args, title }, run) => {
  try {
    const r = await run(args);
    return r.code === 0 ? null : { title, body: firstLine(r) || "acli a échoué" };
  } catch (e) {
    return { title, body: e.message };
  }
};

// {title, body} of the first failing step (steps run in order), or null once all went through.
export async function takeWith(steps, run) {
  for (const step of steps) {
    const failure = await runStep(step, run);
    if (failure) return failure;
  }
  return null;
}

export const footerText = (tab, platform, confirming, empty) =>
  confirming ? `${confirming.item.id} est attribué à ${confirming.item.assigneeName}. Le prendre ? Entrée oui · Échap non` :
  tab === "pr" || empty ? null : `Entrée ouvrir · ${platform === "macos" ? "Cmd" : "Ctrl"}+Entrée lancer le travail`;

// `herdr-app do` prints {"error": …} on failure; else firstLine.
export const tabError = (r) => {
  if (r.code === 0) return null;
  try { const e = JSON.parse(r.stdout).error; if (e) return e; } catch {}
  return firstLine(r) || `herdr-app a échoué (code ${r.code})`;
};
