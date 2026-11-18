// Every outside call of Start work (gh, git, acli, herdr-app, browser).
import { exec, notify, closeOverlay, props, window } from "herdr";
import { GH_LISTS } from "./github.js";
import { ghCommand, json, sh } from "./run.js";
import { firstLine, tabError, ticketRow, decide, takeSteps, takeWith } from "./start.js";
import { toJql } from "./jira.js";

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
export async function launchAgent(item, space, cwd, task) {
  try {
    const r = await exec("herdr-app", ["do", "tab.new", "--space", space, "--folder", cwd, "--name", item.id, "--argv", '["claude"]', "--task", task]);
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

// Items of a gh list, or {error}. A repo gh can't see gets the account that was used.
export async function fetchGh(kind, repo, account, on, profiles) {
  try {
    const list = GH_LISTS[kind];
    const items = await json(...ghCommand(account, [kind, "list", "--repo", repo, "--json", list.fields, "--limit", "50"]), on);
    return items.map((i) => ({ id: `#${i.number}`, title: i.title, meta: list.meta(i), tag: list.tag?.(i), url: i.url }));
  } catch (e) {
    if (!/Could not resolve to a Repository/.test(e.message)) return { error: e.message };
    if (account) return { error: `Le compte gh ${account} (profil du projet) ne voit pas ${repo}.` };
    const login = (await exec("gh", ["api", "user", "--jq", ".login"], on).catch(() => null))?.stdout.trim();
    return { error: `Le compte gh actif${login ? ` (${login})` : ""} ne voit pas ${repo}, et aucun profil (${profiles}) ne couvre ce propriétaire. Change de compte avec gh auth switch.` };
  }
}

// Opens the item in the browser, then closes the dialog; toasts on failure.
export async function openItem(item) {
  const error = await openUrl(item.url, window().platform);
  if (!error) return closeOverlay(props().overlay);
  notify({ title: "Ouverture impossible", body: error, level: "error" });
}
