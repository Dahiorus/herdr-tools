// Start work: the focused terminal's GitHub repo, its open PRs and issues (gh),
// and the Jira tickets tied to that repo (acli). Tab switches lists, type to
// filter, ↑/↓ and Enter open the item in the browser, Esc closes.
// Jira source per repo, in .config.json (not tracked): a project key, a filter
// id (filter=123 or its URL) or raw JQL, typed once in the Jira tab.

import { View, div } from "gpui-kit";
import { v_flex, h_flex, InputState, Input, ScrollHandle } from "gpui-base";
import { exec, focused, spaces, theme, props, closeOverlay, notify, window, home, appHome, readTextFile, writeTextFile, checking } from "herdr";
import { toJql, jiraSource, withSource } from "./jira.js";
import { profileAccount } from "./profile.js";

const TABS = [["pr", "PR"], ["issue", "Issues"], ["jira", "Jira"]];
// Hidden: Herdr reloads the mod when any other file of its folder is saved.
const CONFIG = () => `${appHome()}/mods/start-work/.config.json`;

const FIX = "À corriger dans mods/start-work/.config.json.";
// gh with the token of the project profile's account. The token goes through the environment,
// never argv (readable in /proc). shortcut: ~/.claude only, not $CLAUDE_CONFIG_DIR.
const GH_AS = 'GH_TOKEN=$(gh auth token -u "$1") || exit; shift; export GH_TOKEN; exec gh "$@"';
const PROFILES = () => `${home()}/.claude/profiles.json`;
const firstLine = (r) => (r.stderr || r.stdout).trim().split("\n")[0];

// exec rejects when the program can't start, the machine is unreachable or it times out (30 s).
const sh = (cmd, args, opts) => exec(cmd, args, opts).catch((e) => { throw new Error(`${cmd} : ${e.message}`); });

async function json(cmd, args, opts) {
  const r = await sh(cmd, args, opts);
  if (r.code !== 0) throw new Error(firstLine(r) || `${cmd} a échoué`);
  return JSON.parse(r.stdout);
}

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
    const ghCmd = (args) => (account ? ["sh", ["-c", GH_AS, "sh", account, ...args]] : ["gh", args]);
    const gh = async (kind) => {
      try {
        const items = await json(...ghCmd([kind, "list", "--repo", this.repo, "--json", "number,title,author,url", "--limit", "50"]), on);
        this.lists[kind] = items.map((i) => ({ id: `#${i.number}`, title: i.title, meta: i.author?.login ?? "", url: i.url }));
      } catch (e) {
        if (!/Could not resolve to a Repository/.test(e.message)) { this.lists[kind] = { error: e.message }; return cx.notify(); }
        if (account) { this.lists[kind] = { error: `Le compte gh ${account} (profil du projet) ne voit pas ${this.repo}.` }; return cx.notify(); }
        const login = (await exec("gh", ["api", "user", "--jq", ".login"], on).catch(() => null))?.stdout.trim();
        this.lists[kind] = { error: `Le compte gh actif${login ? ` (${login})` : ""} ne voit pas ${this.repo}, et aucun profil (${PROFILES()}) ne couvre ce propriétaire. Change de compte avec gh auth switch.` };
      }
      cx.notify();
    };
    await Promise.all([gh("pr"), gh("issue"), this.loadJira(cx)]);
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
    const f = this.filter.toLowerCase();
    return l.filter((i) => !f || `${i.id} ${i.title} ${i.meta}`.toLowerCase().includes(f));
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
      .child(h_flex().items_center().gap(6)
        .child(div().flex_1().text_size(15).font_semibold().text_color(t.foreground).child(this.repo ?? "Start work"))
        .children(TABS.map(([id, label]) => div().id(`sw-tab-${id}`).px(10).py(3).rounded(6).cursor_pointer()
          .text_color(this.tab === id ? t.foreground : t.dim)
          .when(this.tab === id, (el) => el.bg(t.selected))
          .hover((s) => s.bg(t.hover))
          .on_click((_e, cx) => { this.tab = id; this.select(0); cx.notify(); })
          .child(label + (Array.isArray(this.lists[id]) ? ` ${this.lists[id].length}` : "")))))
      .child(h_flex().h(36).flex_none().px(10).items_center().rounded(9).border_1().border_color(t.accent).bg(t.background)
        .child(Input.new(this.input).flex_1().h_full().text_size(12.8).text_color(t.foreground)))
      .child(status
        ? div().p(10).text_color(t.muted).child(status)
        : v_flex().id("sw-list").h(Math.min(400, items.length * 32)).min_h(0).overflow_y_scrollbar().track_scroll(this.scroll).children(items.map((i, n) =>
          h_flex().id(`sw-${this.tab}-${i.id}`).flex_none().h(32).px(10).gap(10).items_center().rounded(7).cursor_pointer()
            .when(n === this.at, (el) => el.bg(t.hover))
            .hover((s) => s.bg(t.hover))
            .on_click((_e, cx) => this.open(i, cx))
            .child(div().w(90).flex_none().truncate().text_color(t.accent).child(i.id))
            .child(div().flex_1().truncate().text_color(t.foreground).child(i.title))
            .child(div().flex_none().text_size(11).text_color(t.dim).child(i.meta)))));
  }
}
