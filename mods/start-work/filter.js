// The list filter of Start work: an item (PR, issue, Jira ticket) matches when its id,
// title, meta or status tag contains the typed text, ignoring case.
// Pure, no imports: `node mods/start-work/filter.test.js` checks it.
export const matches = (item, filter) =>
  !filter || `${item.id} ${item.title} ${item.meta} ${item.tag ?? ""}`.toLowerCase().includes(filter.toLowerCase());
