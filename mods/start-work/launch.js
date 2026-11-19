// Every outside call of Start work (gh, git, acli, herdr-app, browser).
import { exec, notify, readTextFile, closeOverlay, props, window } from "herdr";
import { GH_LISTS, PR_GROUPS, ghRow, prRows } from "./github.js";
import { ghCommand, json, sh } from "./run.js";
import { firstLine, tabError, ticketRow, decide, takeSteps, takeWith } from "./start.js";
import { toJql } from "./jira.js";
import { remainingWorkFile, parseTasks } from "./tasks.js";

export async function fetchTickets(source, machine) {
  const [r, auth] = await Promise.all([
    json("acli", ["jira", "workitem", "search", "--jql", toJql(source), "--fields", "key,summary,status,assignee,issuetype", "--limit", "50", "--json"], { on: machine }),
    sh("acli", ["jira", "auth", "status"], { on: machine }),
  ]);
  // `self` points at an internal Atlassian host, not the site: take the site from auth status.
  const site = auth.stdout.match(/Site:\s*(\S+)/)?.[1];
  if (!site) throw new Error(auth.code !== 0 ? (firstLine(auth) || "acli jira auth status a échoué") : "site Jira absent de acli jira auth status (acli jira auth login)");
  return r.map((i) => ticketRow(i, site));
}

// Error message, or null once the agent tab exists. exec rejects when herdr-app can't start.
export async function launchAgent(name, space, cwd, task) {
  try {
    const r = await exec("herdr-app", ["do", "tab.new", "--space", space, "--folder", cwd, "--name", name, "--argv", '["claude"]', "--task", task]);
    return tabError(r);
  } catch (e) {
    return e.message;
  }
}

// Error message, or null once the browser command succeeded.
export async function openUrl(url, platform) {
  const cmd = platform === "macos" ? "open" : "xdg-open";
  try {
    const r = await exec(cmd, [url]);
    return r.code === 0 ? null : firstLine(r) || `${cmd} a échoué pour ${url}`;
  } catch (e) {
    return `${cmd} : ${e.message}`;
  }
}

// GitHub repo (owner/name) of the origin remote, or an error message.
export async function originRepo(on) {
  try {
    const r = await sh("git", ["remote", "get-url", "origin"], on);
    const repo = r.stdout.trim().match(/github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/)?.[1];
    if (r.code !== 0) return { error: firstLine(r) || "git remote get-url origin a échoué" };
    return repo ? { repo } : { error: "Le remote origin n'est pas un repo GitHub" };
  } catch (e) {
    return { error: e.message };
  }
}

// acli --fields key alone returns [null]: ask for summary. Rejects when acli fails.
export async function isMine(key, machine) {
  const r = await json("acli", ["jira", "workitem", "search", "--jql", `key = ${key} AND assignee = currentUser()`, "--fields", "summary", "--json"], { on: machine });
  return r.length > 0;
}

// {title, body} of the first failing step, or null once the ticket is taken.
export const takeTicket = (item, mine, machine) => takeWith(takeSteps(item, mine), (args) => sh("acli", args, { on: machine }));

// What Lancer does on a ticket: toasts a refusal or failure ({stop, reload}), else {mine, ask} (ask: confirm before taking it over).
export async function assess(item, machine) {
  let mine;
  try {
    mine = await isMine(item.id, machine);
  } catch (e) {
    notify({ title: `Prise en charge de ${item.id} impossible`, body: e.message, level: "error" });
    return { stop: true, reload: true };
  }
  const d = decide(item, mine);
  if (d.refusal) { notify({ title: d.refusal, body: "", level: "warning" }); return { stop: true }; }
  return { mine, ask: Boolean(d.ask) };
}

const ghList = (kind, repo, account, extra, on) =>
  json(...ghCommand(account, [kind, "list", "--repo", repo, "--json", GH_LISTS[kind].fields, "--limit", "50", ...extra]), on);

// Items of a gh list, or {error}. PRs come as two lists (to review, mine), tagged by group.
export async function fetchGh(kind, repo, account, on, profiles) {
  try {
    if (kind !== "pr") return (await ghList(kind, repo, account, [], on)).map((raw) => ghRow(kind, raw));
    const [toReview, mine] = await Promise.all(PR_GROUPS.map((g) => ghList(kind, repo, account, g.args, on)));
    return prRows({ toReview, mine });
  } catch (e) {
    return ghError(e, repo, account, on, profiles);
  }
}

// A repo gh can't see gets the account that was used.
async function ghError(e, repo, account, on, profiles) {
  if (!/Could not resolve to a Repository/.test(e.message)) return { error: e.message };
  if (account) return { error: `Le compte gh ${account} (profil du projet) ne voit pas ${repo}.` };
  const login = (await exec("gh", ["api", "user", "--jq", ".login"], on).catch(() => null))?.stdout.trim();
  return { error: `Le compte gh actif${login ? ` (${login})` : ""} ne voit pas ${repo}, et aucun profil (${profiles}) ne couvre ce propriétaire. Change de compte avec gh auth switch.` };
}

// Opens the item in the browser, then closes the dialog; toasts on failure.
export async function openItem(item) {
  const error = await openUrl(item.url, window().platform);
  if (!error) return closeOverlay(props().overlay);
  notify({ title: "Ouverture impossible", body: error, level: "error" });
}

const gitOut = async (args, on) => {
  const r = await sh("git", args, on);
  if (r.code !== 0) throw new Error(firstLine(r) || `git ${args[0]} a échoué`);
  return r.stdout;
};

// Remaining work read on the terminal's machine: {tasks} (null: no « Features » section) or {error}.
export async function fetchTasks(repo, on) {
  try {
    const root = (await gitOut(["rev-parse", "--show-toplevel"], on)).trim();
    const found = remainingWorkFile((await gitOut(["ls-files", "-z"], { ...on, cwd: root })).split("\0").filter(Boolean), repo);
    if (found.error) return { error: found.error };
    const md = await readTextFile(`${root}/${found.path}`, { on: on.on });
    if (md === null) throw new Error(`${found.path} absent`);
    return { tasks: parseTasks(md)?.map((t) => ({ ...t, path: found.path })) ?? null };
  } catch (e) {
    return { error: `Reste à faire illisible : ${firstLine({ stderr: e.message })}` };
  }
}
