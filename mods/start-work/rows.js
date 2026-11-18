// Pieces of the Start work dialog: tab header, filter box, list rows (PR status tag on the right).
import { div } from "gpui-kit";
import { h_flex, Input } from "gpui-base";
import { STATUS_COLORS } from "./github.js";

const statusTag = (label, t) => {
  const color = t[STATUS_COLORS[label]];
  return h_flex().w(76).flex_none().justify_end()
    .child(div().px(6).rounded(4).border_1().border_color(color).text_size(11).text_color(color).child(label));
};

export const listRow = (i, tab, selected, t, onClick) =>
  h_flex().id(`sw-${tab}-${i.id}`).flex_none().h(32).px(10).gap(10).items_center().rounded(7).cursor_pointer()
    .when(selected, (el) => el.bg(t.hover))
    .hover((s) => s.bg(t.hover))
    .on_click(onClick)
    .child(div().w(90).flex_none().truncate().text_color(t.accent).child(i.id))
    .child(div().flex_1().truncate().text_color(t.foreground).child(i.title))
    .child(div().flex_none().text_size(11).text_color(t.dim).child(i.meta))
    .when(Boolean(i.tag), (el) => el.child(statusTag(i.tag, t)));

export const header = (repo, tabs, current, lists, t, onSelect) =>
  h_flex().items_center().gap(6)
    .child(div().flex_1().text_size(15).font_semibold().text_color(t.foreground).child(repo ?? "Start work"))
    .children(tabs.map(([id, label]) => div().id(`sw-tab-${id}`).px(10).py(3).rounded(6).cursor_pointer()
      .text_color(current === id ? t.foreground : t.dim)
      .when(current === id, (el) => el.bg(t.selected))
      .hover((s) => s.bg(t.hover))
      .on_click((_e, cx) => onSelect(id, cx))
      .child(label + (Array.isArray(lists[id]) ? ` ${lists[id].length}` : ""))));

export const filterBox = (input, t) =>
  h_flex().h(36).flex_none().px(10).items_center().rounded(9).border_1().border_color(t.accent).bg(t.background)
    .child(Input.new(input).flex_1().h_full().text_size(12.8).text_color(t.foreground));
