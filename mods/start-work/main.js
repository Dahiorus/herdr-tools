// Start work: the focused terminal's GitHub repo, its open PRs and issues (gh),
// and the Jira tickets tied to that repo (acli). Tab switches lists, type to
// filter, ↑/↓ and Enter open the item, Ctrl+Enter or Lancer starts an agent, Esc closes.
// Jira source per repo, in .config.json (not tracked): a project key, a filter
// id (filter=123 or its URL) or raw JQL, typed once in the Jira tab.

import { View, div } from "gpui-kit";
import { v_flex, h_flex, InputState, ScrollHandle } from "gpui-base";
import { focused, spaces, theme, props, closeOverlay, notify, window, home, readTextFile, checking } from "herdr";
import { loadJira, saveJira, hasJiraSource } from "./jiraTab.js";
import { profileAccount, noJira } from "./profile.js";
import { matches } from "./filter.js";
import { taskList, repoWithoutJira, taskName } from "./tasks.js";
import { fetchGh, fetchTasks, launchAgent, originRepo, openItem, assess, takeTicket } from "./launch.js";
import { agentTask, footerText } from "./start.js";
import { listRow, listBody, header, filterBox, footer, descriptionPanel, nextTab } from "./rows.js";

const PROFILES = () => `${home()}/.claude/profiles.json`;
export default class StartWork extends View {
  init(_props, cx) {
    this.tab = "pr";
    this.third = null; // null while loading, then "jira" or "task"
    this.lists = { pr: null, issue: null }; // null: loading; {error} or [items]
    this.at = 0; this.filter = "";
    // busy: id of the item being launched; hovered: id of the row under the pointer; confirming: {item, mine}
    this.busy = this.hovered = this.confirming = null;
    this.scroll = ScrollHandle.new();
    this.input = InputState.new({ placeholder: "Filtrer…" });
    this.input.on("change", (_e, cx) => { this.filter = this.input.value(); this.select(0); cx.notify(); });
    this.input.on("submit", (e, cx) => this.submit(e, cx));
    this.input.focus();
    cx.timer.after(600, () => this.input.focus());
    // Herdr closes popups on Escape, not windows, and the filter input would take the key: a binding of ours wins.
    cx.bind_keys(["StartWork > Input", "StartWork"].map((context) => ({ keystroke: "escape", action: "start_work_escape", context })));
    if (checking()) return;
    const f = focused();
    [this.cwd, this.space] = [f?.cwd ?? null, f?.space ?? null];
    this.machine = spaces().find((s) => s.id === f?.space)?.machine ?? null;
    cx.spawn(async (cx) => { await this.load(cx); });
  }

  async load(cx) {
    const on = { cwd: this.cwd ?? undefined, on: this.machine };
    // From the remote, not `gh repo view`: the Jira tab must not depend on which gh account is active.
    const { repo, error } = this.cwd ? await originRepo(on) : { error: "Aucun terminal focalisé" };
    this.repo = repo;
    if (error) {
      this.third = "jira";
      this.lists = { pr: { error }, issue: { error }, jira: { error } };
      return cx.notify();
    }
    cx.notify();
    let account, noJiraProfile;
    try {
      const text = await readTextFile(PROFILES());
      const owner = this.repo.split("/")[0];
      [account, noJiraProfile] = [profileAccount(text, owner), noJira(text, owner)];
    } catch (e) {
      this.lists.pr = this.lists.issue = { error: `${PROFILES()} illisible : ${e.message}` };
      return this.loadThird(false, on, cx);
    }
    await Promise.all([this.loadGh("pr", account, on, cx), this.loadGh("issue", account, on, cx), this.loadThird(noJiraProfile, on, cx)]);
  }

  tabs() { return [["pr", "PR"], ["issue", "Issues"], ...(this.third ? [[this.third, this.third === "jira" ? "Jira" : "Tâches"]] : [])]; }

  // Tâches if the profile has no Jira, or if the repo has no Jira source and a readable remaining-work file with
  // a Features section; Jira otherwise. A Jira source is not worth reading the file: it skips fetchTasks.
  async loadThird(noJiraProfile, on, cx) {
    const skip = !noJiraProfile && await hasJiraSource(this);
    const found = skip ? null : await fetchTasks(this.repo, on);
    if (found && repoWithoutJira(noJiraProfile, found)) {
      [this.third, this.lists.task] = ["task", taskList(found)];
      return cx.notify();
    }
    this.third = "jira";
    await loadJira(this, cx);
  }

  async loadGh(kind, account, on, cx) { this.lists[kind] = await fetchGh(kind, this.repo, account, on, PROFILES()); cx.notify(); }

  items() {
    const l = this.lists[this.tab];
    if (!Array.isArray(l)) return [];
    return l.filter((i) => matches(i, this.filter));
  }

  submit(e, cx) {
    const c = this.confirming;
    if (this.busy) return; // closing now could cut a take-over between assign and transition
    if (c) { if (!e.secondary) { this.confirming = null; this.take(c.item, c.mine, cx); } return; }
    if (e.secondary) return this.start(this.items()[this.at], cx);
    const l = this.lists.jira;
    if (this.tab === "jira" && l?.setup && this.filter.trim()) {
      cx.spawn(async (cx) => { await saveJira(this, this.filter.trim(), cx); });
      return;
    }
    this.open(this.items()[this.at], cx);
  }

  select(at) {
    this.at = Math.max(0, at); // an empty list gives -1
    this.scroll.scroll_to_item(this.at);
  }

  start(item, cx) {
    if (!item || this.busy || this.confirming || this.tab === "pr") return;
    if (this.tab !== "jira") return this.launch(this.tab === "task" ? "task" : "issue", item, cx);
    this.busy = item.id; cx.notify();
    cx.spawn(async (cx) => {
      const d = await assess(item, this.machine);
      if (!d.stop && !d.ask) return this.take(item, d.mine, cx);
      this.busy = null;
      if (d.ask) this.confirming = { item, mine: d.mine };
      else if (d.reload) await loadJira(this, cx);
      cx.notify();
    });
  }

  take(item, mine, cx) {
    this.busy = item.id; cx.notify();
    cx.spawn(async (cx) => {
      const failure = await takeTicket(item, mine, this.machine);
      if (!failure) return this.launch("jira", item, cx);
      this.busy = null;
      notify({ ...failure, level: "error" });
      await loadJira(this, cx); // notifies
    });
  }

  launch(kind, item, cx) {
    this.busy = item.key ?? item.id; cx.notify();
    cx.spawn(async (cx) => {
      const error = await launchAgent(kind === "task" ? taskName(item) : item.id, this.space, this.cwd, agentTask(kind, item));
      this.busy = null;
      if (!error) return closeOverlay(props().overlay);
      notify({ title: "Agent non lancé", body: error, level: "error" });
      if (kind === "jira") await loadJira(this, cx);
      cx.notify();
    });
  }

  open(item, cx) { if (item?.url && !this.busy && !this.confirming) cx.spawn(() => openItem(item)); }
  rowClick(item, n, cx) { // a task has no page to open: the row only selects
    if (this.tab !== "task") this.open(item, cx);
    else if (!this.busy) { this.select(n); cx.notify(); }
  }

  showTab(id) { if (!this.confirming) { this.tab = id; this.select(0); } }
  dismiss() { if (!this.busy) closeOverlay(props().overlay); } // not close(): Herdr calls that when the overlay goes

  row(i, n, t) {
    const [key, jira] = [i.key ?? i.id, this.tab === "jira"];
    return listRow(i, this.tab, n === this.at, t, (_e, cx) => this.rowClick(i, n, cx), this.tab === "pr" ? undefined : {
      shown: n === this.at || this.hovered === key, busy: jira && this.busy === key, onStart: (cx) => { this.input.focus(); this.start(i, cx); }, // its click stops before the root's
      onHover: (h, cx) => { this.hovered = h ? key : (this.hovered === key ? null : this.hovered); cx.notify(); },
    });
  }

  escape(cx) {
    if (!this.confirming && !this.busy) return closeOverlay(props().overlay);
    this.confirming = null;
    cx.notify();
  }

  onKey(e, cx, items) {
    const k = e.key;
    if (k === "escape") { cx.stop_propagation(); return this.escape(cx); }
    if (k === "tab") this.showTab(nextTab(this.tabs(), this.tab, e.modifiers.shift)); // ignored while confirming, but must not reach Herdr
    else if (k === "down") this.select(Math.min(this.at + 1, items.length - 1));
    else if (k === "up") this.select(Math.max(this.at - 1, 0));
    else return;
    cx.stop_propagation();
    cx.notify();
  }

  render() {
    const t = theme();
    const items = this.items();
    this.at = Math.max(0, Math.min(this.at, items.length - 1));
    const l = this.lists[this.tab];
    const c = this.confirming;
    const status = l == null ? "Chargement…" : l.error ?? (items.length ? null : "Rien d'ouvert");
    const hint = footerText(this.tab, window()?.platform, c, Boolean(status));
    return v_flex()
      .id("start-work")
      .size_full().min_h(0).p(18).gap(10).bg(t.popover).text_size(13)
      .key_context("StartWork")
      // A press in the window can take the keyboard off the filter input, and Escape would then reach nothing of ours.
      .on_click(() => this.input.focus())
      .on_action("start_work_escape", (_e, cx) => this.escape(cx))
      .on_key_down((e, cx) => this.onKey(e, cx, items))
      .child(header(this.repo, this.tabs(), this.tab, this.lists, t, (id, cx) => { this.showTab(id); cx.notify(); }, () => this.dismiss()))
      .child(filterBox(this.input, t))
      .child(status ? div().p(10).text_color(t.muted).child(status) : this.tab === "task"
        ? h_flex().flex_1().min_h(0).gap(10).child(listBody(items.map((i, n) => this.row(i, n, t)), this.scroll).flex_1().min_w(0).h_full()).child(descriptionPanel(items[this.at], t))
        : listBody(items.map((i, n) => this.row(i, n, t)), this.scroll).flex_1())
      .when(Boolean(hint), (el) => el.child(footer(hint, t)));
  }
}
