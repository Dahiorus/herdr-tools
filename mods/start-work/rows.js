// Pieces of the Start work dialog: tab header, filter box, list rows (PR status tag on the right).
import { div } from "gpui-kit";
import { h_flex, v_flex, Input, TextView } from "gpui-base";
import { tagColor, metaColor, groupLayout } from "./github.js";

const statusTag = (i, t) => {
  const column = h_flex().w(76).flex_none().justify_end();
  if (!i.tag) return column; // empty: grouped rows keep their columns aligned
  const color = t[tagColor(i)];
  return column.child(div().px(6).rounded(4).border_1().border_color(color).text_size(11).text_color(color).child(i.tag));
};

const startButton = (i, start, t) => h_flex().w(80).flex_none().justify_end().child( // fixed width: the columns stay aligned
  div().id(`sw-start-${i.key ?? i.id}`).flex_none().px(8).py(2).rounded(5).border_1().border_color(t.accent).text_size(11).text_color(t.accent)
    .when(!start.shown, (el) => el.invisible())
    .on_click((_e, cx) => { cx.stop_propagation(); start.onStart(cx); })
    .child(start.label ?? "")); // Mes PR: no label, the button stays invisible

export const listRow = (i, tab, selected, t, onClick, start) =>
  h_flex().id(`sw-${tab}-${i.key ?? i.id}`).flex_none().h(32).px(10).gap(10).items_center().rounded(7).cursor_pointer()
    .when(selected, (el) => el.bg(t.hover))
    .hover((s) => s.bg(t.hover))
    .on_click(onClick)
    .when(Boolean(start), (el) => el.on_hover((h, cx) => start.onHover(h, cx)))
    .child(div().w(90).flex_none().truncate().text_color(t.accent).child(i.id))
    .child(div().flex_1().truncate().text_color(t.foreground).child(i.title))
    .child(div().w(150).flex_none().truncate().text_right().text_size(11).text_color(t[metaColor(i)] ?? t.dim).when(Boolean(metaColor(i)), (el) => el.font_semibold())
      .child(start?.busy ? "Prise en charge…" : i.meta))
    .when(Boolean(i.tag || i.group), (el) => el.child(statusTag(i, t)))
    .when(Boolean(start), (el) => el.child(startButton(i, start, t)));

export const groupTitle = ({ title, count }, t) =>
  div().flex_none().px(10).pt(12).pb(4).text_size(13).font_semibold().text_color(t.foreground).child(`${title.toUpperCase()} ${count}`);

export const groupedRows = (items, row, t) => groupLayout(items).map((e) => (e.item ? row(e.item, e.n) : groupTitle(e, t)));

export const tabList = (third) => [["pr", "PR"], ["issue", "Issues"], ...(third ? [[third, third === "jira" ? "Jira" : "Tâches"]] : [])];

export const header = (repo, tabs, current, lists, t, onSelect, onClose) =>
  h_flex().items_center().gap(6)
    .child(div().flex_1().text_size(15).font_semibold().text_color(t.foreground).child(repo ?? "Start work"))
    .children(tabs.map(([id, label]) => div().id(`sw-tab-${id}`).px(10).py(3).rounded(6).cursor_pointer()
      .text_color(current === id ? t.foreground : t.dim)
      .when(current === id, (el) => el.bg(t.selected))
      .hover((s) => s.bg(t.hover))
      .on_click((_e, cx) => onSelect(id, cx))
      .child(label + (Array.isArray(lists[id]) ? ` ${lists[id].length}` : ""))))
    .child(h_flex().id("sw-close").ml(6).w(28).h(28).flex_none().items_center().justify_center().rounded(7).cursor_pointer()
      .border_1().border_color(t.input).bg(t.raised).text_size(18).text_color(t.foreground)
      .hover((s) => s.bg(t.hover).border_color(t.accent))
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation()) // a window drags on presses it isn't stopped from
      .on_click(() => onClose())
      .child("×"));

export const filterBox = (input, t) =>
  h_flex().h(36).flex_none().px(10).items_center().rounded(9).border_1().border_color(t.accent).bg(t.background)
    .child(Input.new(input).flex_1().h_full().text_size(12.8).text_color(t.foreground));

export const footer = (text, t) => div().text_size(11).text_color(t.dim).child(text);

export const listBody = (rows, scroll) =>
  v_flex().id("sw-list").min_h(0).overflow_y_scrollbar().track_scroll(scroll).children(rows);

export const descriptionPanel = (item, t) =>
  v_flex().id("sw-desc").w(340).h_full().flex_none().p(10).rounded(7).bg(t.background).overflow_y_scrollbar()
    .child(TextView.markdown("sw-md-" + item.key, item.description));

export const nextTab = (tabs, tab, back) => {
  const at = tabs.findIndex(([id]) => id === tab);
  const step = back ? tabs.length - 1 : 1;
  return tabs[(at + step) % tabs.length][0];
};
