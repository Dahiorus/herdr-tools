// The columns of a gh list item: its author (meta) and, for a PR, its status (tag).
// Pure, no imports: `node mods/start-work/github.test.js` checks it.
export const prStatus = (pr) => (pr.isDraft ? "Brouillon" : "Prête");

// Theme color names, so tags follow light and dark mode.
export const STATUS_COLORS = { Prête: "ansi2", Brouillon: "muted" };
// The meta of my PR that needs me (ready for QA, changes requested), so it stands out (other meta stay dim).
export const META_COLORS = { "Prête pour la QA": "ansi2", "Changements demandés": "ansi1" };
// Only my PRs' meta gets a color: a Jira status could carry the same words.
export const metaColor = (i) => (i.group === "mine" ? META_COLORS[i.meta] : undefined);

export const authorLogin = (item) => item.author?.login ?? "";

// isDraft and reviews are gh pr fields only: gh issue list rejects them.
// shortcut: gh pr list reads the first 100 reviews only; page with gh api if a PR gets more.
export const GH_LISTS = {
  pr: { fields: "number,title,author,url,isDraft,reviews", meta: authorLogin, tag: prStatus },
  issue: { fields: "number,title,author,url", meta: authorLogin },
};

export const PR_GROUPS = [
  { id: "toReview", label: "À relire", args: ["--search", "review-requested:@me"], kind: "review", button: "Relire", hint: "relire" },
  { id: "mine", label: "Mes PR", args: ["--author", "@me"], kind: "comments", button: "Retours", hint: "traiter les retours" },
];

export const APPROVALS_FOR_QA = 2;

// The row of a gh list item, as the dialog lists it.
export const ghRow = (kind, raw) => {
  const list = GH_LISTS[kind];
  return { id: "#" + raw.number, title: raw.title, meta: list.meta(raw), tag: list.tag?.(raw), url: raw.url };
};

// Each reviewer's last verdict; a comment or a pending review is not one.
const lastVerdicts = (reviews) => {
  const last = new Map();
  const sorted = reviews.filter((r) => r.state !== "COMMENTED" && r.state !== "PENDING")
    .sort((a, b) => (a.submittedAt ?? "").localeCompare(b.submittedAt ?? ""));
  for (const r of sorted) last.set(r.author?.login ?? "", r.state);
  return [...last.values()];
};

export const myPrMeta = (reviews) => {
  const verdicts = lastVerdicts(reviews);
  if (verdicts.includes("CHANGES_REQUESTED")) return "Changements demandés";
  const approvals = verdicts.filter((v) => v === "APPROVED").length;
  return approvals >= APPROVALS_FOR_QA ? "Prête pour la QA" : `${approvals}/${APPROVALS_FOR_QA}`;
};

export const prRows = ({ toReview, mine }) => {
  const mineNumbers = new Set(mine.map((raw) => raw.number));
  return [
    ...toReview.filter((raw) => !mineNumbers.has(raw.number)).map((raw) => ({ ...ghRow("pr", raw), group: "toReview" })),
    ...mine.map((raw) => ({ ...ghRow("pr", raw), meta: myPrMeta(raw.reviews ?? []), group: "mine" })),
  ];
};

// The list's children: a title before the first row of each group, then the rows.
const titleBefore = (items, n) => {
  const group = PR_GROUPS.find((g) => g.id === items[n].group);
  const first = group && items[n - 1]?.group !== group.id;
  return first ? [{ title: group.label, count: items.filter((i) => i.group === group.id).length }] : [];
};
export const groupLayout = (items) => items.flatMap((item, n) => [...titleBefore(items, n), { item, n }]);

// Going up onto a group's first row targets its title, so the title shows too.
export const listIndex = (items, at, up = false) => {
  const layout = groupLayout(items);
  const i = layout.findIndex((c) => c.n === at);
  return Math.max(0, up && layout[i - 1]?.title ? i - 1 : i);
};
