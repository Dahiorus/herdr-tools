// Start work: the focused terminal's GitHub repo, its open PRs and issues (gh),
// and the Jira tickets tied to that repo (acli). Tab switches lists, type to
// filter, ↑/↓ and Enter open the item, Ctrl+Enter or Lancer starts an agent, Esc closes.
// Jira source per repo, in .config.json (not tracked): a project key, a filter
// id (filter=123 or its URL) or raw JQL, typed once in the Jira tab.

import { View, div } from "gpui-kit";
import { v_flex, InputState, ScrollHandle } from "gpui-base";
import { focused, spaces, theme, props, closeOverlay, notify, window, home, appHome, readTextFile, writeTextFile, checking } from "herdr";
import { jiraSource, withSource } from "./jira.js";
import { profileAccount } from "./profile.js";
import { matches } from "./filter.js";
import { fetchTickets, fetchGh, launchAgent, originRepo, openItem, assess, takeTicket } from "./launch.js";
import { agentTask, footerText } from "./start.js";
import { listRow, header, filterBox, footer } from "./rows.js";

const TABS = [["pr", "PR"], ["issue", "Issues"], ["jira", "Jira"]];
// Hidden: Herdr reloads the mod when any other file of its folder is saved.
const CONFIG = () => `${appHome()}/mods/start-work/.config.json`;

const FIX = "À corriger dans mods/start-work/.config.json.";
const PROFILES = () => `${home()}/.claude/profiles.json`;
export default class StartWork extends View {
  init(_props, cx) {
    this.tab = "pr";
    this.lists = { pr: null, issue: null, jira: null }; // null: loading; {error} or [items]
    this.at = 0; this.filter = "";
    // busy: id of the item being launched; hovered: id of the row under the pointer; confirming: {item, mine}
    this.busy = this.hovered = this.confirming = null;
    this.scroll = ScrollHandle.new();
    this.input = InputState.new({ placeholder: "Filtrer…" });
    this.input.on("change", (_e, cx) => { this.filter = this.input.value(); this.select(0); cx.notify(); });
    this.input.on("submit", (e, cx) => this.submit(e, cx));
    this.input.focus();
    cx.timer.after(600, () => this.input.focus());
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

  async loadGh(kind, account, on, cx) { this.lists[kind] = await fetchGh(kind, this.repo, account, on, PROFILES()); cx.notify(); }

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
      this.lists.jira = await fetchTickets(source, this.machine);
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

  submit(e, cx) {
    const c = this.confirming;
    if (this.busy) return; // closing now could cut a take-over between assign and transition
    if (c) { if (!e.secondary) { this.confirming = null; this.take(c.item, c.mine, cx); } return; }
    if (e.secondary) return this.start(this.items()[this.at], cx);
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

  start(item, cx) {
    if (!item || this.busy || this.confirming || this.tab === "pr") return;
    if (this.tab !== "jira") return this.launch("issue", item, cx);
    this.busy = item.id; cx.notify();
    cx.spawn(async (cx) => {
      const d = await assess(item, this.machine);
      if (!d.stop && !d.ask) return this.take(item, d.mine, cx);
      this.busy = null;
      if (d.ask) this.confirming = { item, mine: d.mine };
      else if (d.reload) await this.loadJira(cx);
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
      await this.loadJira(cx); // notifies
    });
  }

  launch(kind, item, cx) {
    this.busy = item.id; cx.notify();
    cx.spawn(async (cx) => {
      const error = await launchAgent(item, this.space, this.cwd, agentTask(kind, item));
      this.busy = null;
      if (!error) return closeOverlay(props().overlay);
      notify({ title: "Agent non lancé", body: error, level: "error" });
      if (kind === "jira") await this.loadJira(cx);
      cx.notify();
    });
  }

  open(item, cx) { if (item && !this.busy && !this.confirming) cx.spawn(() => openItem(item)); }
  dismiss() { if (!this.busy) closeOverlay(props().overlay); } // not close(): Herdr calls that when the overlay goes

  render() {
    const t = theme();
    const items = this.items();
    this.at = Math.max(0, Math.min(this.at, items.length - 1));
    const l = this.lists[this.tab];
    const c = this.confirming;
    const status = l === null ? "Chargement…" : l.error ?? (items.length ? null : "Rien d'ouvert");
    const hint = footerText(this.tab, window()?.platform, c, Boolean(status));
    return v_flex()
      .id("start-work")
      .w_full().min_h(0).p(18).gap(10).bg(t.popover).text_size(13)
      .on_key_down((e, cx) => {
        const k = e.key;
        if (k === "escape") { if (!c && !this.busy) return closeOverlay(props().overlay); this.confirming = null; }
        else if (k === "tab") { // ignored while confirming, but must not reach Herdr
          const d = e.modifiers.shift ? TABS.length - 1 : 1;
          if (!c) { this.tab = TABS[(TABS.findIndex(([id]) => id === this.tab) + d) % TABS.length][0]; this.select(0); }
        } else if (k === "down") this.select(Math.min(this.at + 1, items.length - 1));
        else if (k === "up") this.select(Math.max(this.at - 1, 0));
        else return;
        cx.stop_propagation();
        cx.notify();
      })
      .child(header(this.repo, TABS, this.tab, this.lists, t, (id, cx) => { if (c) return; this.tab = id; this.select(0); cx.notify(); }, () => this.dismiss()))
      .child(filterBox(this.input, t))
      .child(status
        ? div().p(10).text_color(t.muted).child(status)
        : v_flex().id("sw-list").h(Math.min(400, items.length * 32)).min_h(0).overflow_y_scrollbar().track_scroll(this.scroll).children(items.map((i, n) =>
          listRow(i, this.tab, n === this.at, t, (_e, cx) => this.open(i, cx), this.tab === "pr" ? undefined : {
          shown: n === this.at || this.hovered === i.id, busy: this.tab === "jira" && this.busy === i.id, onStart: (cx) => this.start(i, cx),
          onHover: (h, cx) => { this.hovered = h ? i.id : (this.hovered === i.id ? null : this.hovered); cx.notify(); },
        }))))
      .when(Boolean(hint), (el) => el.child(footer(hint, t)));
  }
}
