// The columns of a gh list item: its author (meta) and, for a PR, its status (tag).
// Pure, no imports: `node mods/start-work/github.test.js` checks it.
export const prStatus = (pr) => (pr.isDraft ? "Brouillon" : "Prête");

// Theme color names, so tags follow light and dark mode.
export const STATUS_COLORS = { Prête: "ansi2", Brouillon: "muted" };

export const authorLogin = (item) => item.author?.login ?? "";

// isDraft is a gh pr field only: gh issue list rejects it.
export const GH_LISTS = {
  pr: { fields: "number,title,author,url,isDraft", meta: authorLogin, tag: prStatus },
  issue: { fields: "number,title,author,url", meta: authorLogin },
};
