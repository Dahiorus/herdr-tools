// Start work: the focused terminal's GitHub repo, its open PRs and issues (gh),
// and the Jira tickets tied to that repo (acli). Tab switches lists, type to
// filter, ↑/↓ and Enter open the item in the browser, Esc closes.
// Jira source per repo, in .config.json (not tracked): a project key, a filter
// id (filter=123 or its URL) or raw JQL, typed once in the Jira tab.

import { View, div } from "gpui-kit";
import { v_flex, InputState, ScrollHandle } from "gpui-base";
import { exec, focused, spaces, theme, props, closeOverlay, notify, window, home, appHome, readTextFile, writeTextFile, checking } from "herdr";
import { toJql, jiraSource, withSource } from "./jira.js";
import { profileAccount } from "./profile.js";
import { GH_LISTS } from "./github.js";
import { matches } from "./filter.js";
import { ghCommand, firstLine, sh, json } from "./run.js";
import { listRow, header, filterBox } from "./rows.js";

const TABS = [["pr", "PR"], ["issue", "Issues"], ["jira", "Jira"]];
// Hidden: Herdr reloads the mod when any other file of its folder is saved.
const CONFIG = () => `${appHome()}/mods/start-work/.config.json`;

const FIX = "À corriger dans mods/start-work/.config.json.";
const PROFILES = () => `${home()}/.claude/profiles.json`;
export default class StartWork extends View {
  init(_props, cx) {
    this.tab = "pr";
    this.at = 0;
    this.lists = { pr: null, issue: null, jira: null }; // null: loading; {error} or [items]
    this.filter = "";
    this.scroll = ScrollHandle.new();
    this.input = InputState.new({ placeholder: "Filtrer…" });
    this.input.on("change", (_e, cx) => { this.filter = this.input.value(); this.select(0); cx.notify(); });
    this.input.on("submit", (_e, cx) => this.submit(cx));
    this.input.focus();
    cx.timer.after(600, () => this.input.focus());
    if (checking()) return;
    const f = focused();
    this.cwd = f?.cwd ?? null;
    this.machine = spaces().find((s) => s.id === f?.space)?.machine ?? null;
    cx.spawn(async (cx) => { await this.load(cx); });
  }

  async load(cx) {
    const on = { cwd: this.cwd ?? undefined, on: this.machine };
    // From the remote, not `gh repo view`: the Jira tab must not depend on which gh account is active.
    let error = this.cwd ? null : "Aucun terminal focalisé";
    if (this.cwd) {
      try {
        const r = await sh("git", ["remote", "get-url", "origin"], on);
        this.repo = r.stdout.trim().match(/github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/)?.[1];
        if (r.code !== 0) error = firstLine(r) || "git remote get-url origin a échoué";
        else if (!this.repo) error = "Le remote origin n'est pas un repo GitHub";
      } catch (e) { error = e.message; }
    }
    if (error) {
      this.lists = { pr: { error }, issue: { error }, jira: { error } };
      return cx.notify();
    }
    cx.notify();
    let account;
    try {
      account = profileAccount(await readTextFile(PROFILES()), this.repo.split("/")[0]);
    } catch (e) {
      this.lists.pr = this.lists.issue = { error: `${PROFILES()} illisible : ${e.message}` };
      return this.loadJira(cx);
    }
    await Promise.all([this.loadGh("pr", account, on, cx), this.loadGh("issue", account, on, cx), this.loadJira(cx)]);
  }

  async loadGh(kind, account, on, cx) {
    try {
      const list = GH_LISTS[kind];
      const items = await json(...ghCommand(account, [kind, "list", "--repo", this.repo, "--json", list.fields, "--limit", "50"]), on);
      this.lists[kind] = items.map((i) => ({ id: `#${i.number}`, title: i.title, meta: list.meta(i), tag: list.tag?.(i), url: i.url }));
    } catch (e) {
      this.lists[kind] = { error: await this.ghError(e.message, account, on) };
    }
    cx.notify();
  }

  async ghError(message, account, on) {
    if (!/Could not resolve to a Repository/.test(message)) return message;
    if (account) return `Le compte gh ${account} (profil du projet) ne voit pas ${this.repo}.`;
    const login = (await exec("gh", ["api", "user", "--jq", ".login"], on).catch(() => null))?.stdout.trim();
    return `Le compte gh actif${login ? ` (${login})` : ""} ne voit pas ${this.repo}, et aucun profil (${PROFILES()}) ne couvre ce propriétaire. Change de compte avec gh auth switch.`;
  }

  async loadJira(cx) {
    let source;
    try {
      this.configText = await readTextFile(CONFIG());
      source = jiraSource(this.configText, this.repo);
    } catch (e) {
      // No setup here: saving would overwrite every other repo's source.
      this.lists.jira = { error: `.config.json illisible : ${e.message}. ${FIX}` };
      return cx.notify();
    }
    if (!source) {
      this.lists.jira = { error: `Pas de source Jira pour ${this.repo}. Tape une clé de projet, filter=ID ou du JQL, puis Entrée. Pour la changer ensuite : mods/start-work/.config.json.`, setup: true };
      return cx.notify();
    }
    this.lists.jira = null;
    cx.notify();
    try {
      const [r, auth] = await Promise.all([
        json("acli", ["jira", "workitem", "search", "--jql", toJql(source), "--fields", "key,summary,status,assignee", "--limit", "50", "--json"], { on: this.machine }),
        sh("acli", ["jira", "auth", "status"], { on: this.machine }),
      ]);
      // `self` points at an internal Atlassian host, not the site: take the site from auth status.
      const site = auth.stdout.match(/Site:\s*(\S+)/)?.[1];
      if (!site) throw new Error(auth.code !== 0 ? (firstLine(auth) || "acli jira auth status a échoué") : "site Jira absent de acli jira auth status (acli jira auth login)");
      this.lists.jira = r.map((i) => ({
        id: i.key,
        title: i.fields?.summary ?? "",
        meta: [i.fields?.status?.name, i.fields?.assignee?.displayName].filter(Boolean).join(" · "),
        url: `https://${site}/browse/${i.key}`,
      }));
    } catch (e) {
      this.lists.jira = { error: `${e.message} (source « ${source} ». ${FIX})` };
    }
    cx.notify();
  }

  async saveJira(source, cx) {
    try {
      await writeTextFile(CONFIG(), withSource(this.configText, this.repo, source), this.configText ?? null);
    } catch (e) {
      await this.loadJira(cx); // re-read, so Enter again writes on top of the current file
      if (this.lists.jira?.setup) this.lists.jira.error = `Enregistrement refusé : ${e.message}. Réessaie avec Entrée.`;
      return cx.notify();
    }
    this.input.set_value("");
    this.filter = "";
    await this.loadJira(cx);
  }

  items() {
    const l = this.lists[this.tab];
    if (!Array.isArray(l)) return [];
    return l.filter((i) => matches(i, this.filter));
  }

  submit(cx) {
    const l = this.lists.jira;
    if (this.tab === "jira" && l?.setup && this.filter.trim()) {
      cx.spawn(async (cx) => { await this.saveJira(this.filter.trim(), cx); });
      return;
    }
    this.open(this.items()[this.at], cx);
  }

  select(at) {
    this.at = Math.max(0, at); // an empty list gives -1
    this.scroll.scroll_to_item(this.at);
  }

  open(item, cx) {
    if (!item) return;
    cx.spawn(async () => {
      const cmd = window().platform === "macos" ? "open" : "xdg-open";
      try {
        const r = await exec(cmd, [item.url]);
        if (r.code === 0) return closeOverlay(props().overlay);
        notify({ title: "Ouverture impossible", body: firstLine(r) || `${cmd} a échoué pour ${item.url}`, level: "error" });
      } catch (e) {
        notify({ title: "Ouverture impossible", body: `${cmd} : ${e.message}`, level: "error" });
      }
    });
  }

  render() {
    const t = theme();
    const items = this.items();
    this.at = Math.max(0, Math.min(this.at, items.length - 1));
    const l = this.lists[this.tab];
    const status = l === null ? "Chargement…" : l.error ?? (items.length ? null : "Rien d'ouvert");
    return v_flex()
      .id("start-work")
      .w_full().min_h(0).p(18).gap(10).bg(t.popover).text_size(13)
      .on_key_down((e, cx) => {
        const k = e.key;
        if (k === "escape") return closeOverlay(props().overlay);
        if (k === "tab") {
          const i = TABS.findIndex(([id]) => id === this.tab);
          this.tab = TABS[(i + (e.modifiers.shift ? TABS.length - 1 : 1)) % TABS.length][0];
          this.select(0);
        } else if (k === "down") this.select(Math.min(this.at + 1, items.length - 1));
        else if (k === "up") this.select(Math.max(this.at - 1, 0));
        else return;
        cx.stop_propagation();
        cx.notify();
      })
      .child(header(this.repo, TABS, this.tab, this.lists, t, (id, cx) => { this.tab = id; this.select(0); cx.notify(); }))
      .child(filterBox(this.input, t))
      .child(status
        ? div().p(10).text_color(t.muted).child(status)
        : v_flex().id("sw-list").h(Math.min(400, items.length * 32)).min_h(0).overflow_y_scrollbar().track_scroll(this.scroll).children(items.map((i, n) =>
          listRow(i, this.tab, n === this.at, t, (_e, cx) => this.open(i, cx)))));
  }
}
