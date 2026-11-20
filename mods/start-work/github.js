// The columns of a gh list item: its author (meta) and, for a PR, its status (tag).
// Pure, no imports: `node mods/start-work/github.test.js` checks it.
export const prStatus = (pr) => (pr.isDraft ? "Brouillon" : "Prête");

// Theme color names, so tags follow light and dark mode.
export const STATUS_COLORS = { Prête: "ansi2", Brouillon: "muted" };
// The meta of my PR that needs me (ready for QA, changes requested), so it stands out (other meta stay dim).
export const META_COLORS = { "Prête pour la QA": "ansi2", "Changements demandés": "ansi1" };
// Only my PRs' meta gets a color: a Jira status could carry the same words.
export const metaColor = (i) => (["feedback", "mine", "mineAll"].includes(i.group) ? META_COLORS[i.meta] : undefined);

export const authorLogin = (item) => item.author?.login ?? "";

// isDraft and reviews are gh pr fields only: gh issue list rejects them.
// shortcut: gh pr list reads the first 100 reviews only; page with gh api if a PR gets more.
export const GH_LISTS = {
  pr: { fields: "number,title,author,url,isDraft,reviews", meta: authorLogin, tag: prStatus },
  issue: { fields: "number,title,author,url", meta: authorLogin },
};

// The gh pr list arguments of the two lists; the groups below are cut from them.
export const PR_LISTS = { toReview: ["--search", "review-requested:@me"], mine: ["--author", "@me"] };

const COMMENTS = { kind: "comments", button: "Retours", hint: "traiter les retours" };
// mineAll: my PRs when the threads query failed (no split into Retours / Mes PR).
export const PR_GROUPS = [
  { id: "toReview", label: "À relire", kind: "review", button: "Relire", hint: "relire" },
  { id: "feedback", label: "Retours sur mes PR", ...COMMENTS },
  { id: "mine", label: "Mes PR" },
  { id: "mineAll", label: "Mes PR", ...COMMENTS },
];

// My open PRs with their review threads. 50 PRs and the last 100 threads per PR: more is unreadable anyway, and the newest threads are the pending ones (issue #10).
export const THREADS_QUERY = `query($q: String!) {
  viewer { login }
  search(query: $q, type: ISSUE, first: 50) {
    nodes { ... on PullRequest { number reviewThreads(last: 100) { nodes {
      isResolved
      all: comments { totalCount }
      first: comments(first: 1) { nodes { author { __typename login } } }
      last: comments(last: 1) { nodes { author { login } } }
    } } } }
  }
}`;
export const threadsSearch = (repo) => `repo:${repo} is:pr is:open author:@me`;

// A thread I owe an answer to (the threads of /pr comments).
export const isPending = (thread, me) => {
  const lower = (c) => c?.author?.login?.toLowerCase();
  const mine = lower(thread.last?.nodes?.[0]) === me.toLowerCase();
  if (thread.isResolved) return false;
  if (thread.first?.nodes?.[0]?.author?.__typename === "Bot") return false;
  return !mine || thread.all?.totalCount === 1;
};

// Numbers of my PRs with a pending thread; throws when the response lacks search.nodes.
export const feedbackNumbers = (response) => {
  const nodes = response?.data?.search?.nodes;
  if (!Array.isArray(nodes)) throw new Error("réponse GraphQL sans search.nodes");
  const me = response.data.viewer?.login ?? "";
  return new Set(nodes.filter((n) => (n.reviewThreads?.nodes ?? []).some((t) => isPending(t, me))).map((n) => n.number));
};

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

const mineGroup = (raw, feedback) => (feedback === null ? "mineAll" : feedback.has(raw.number) ? "feedback" : "mine");
const rank = (row) => PR_GROUPS.findIndex((g) => g.id === row.group);

// feedback: Set of my PR numbers with pending threads, or null when the threads query failed.
export const prRows = ({ toReview, mine, feedback }) => {
  const mineNumbers = new Set(mine.map((raw) => raw.number));
  return [
    ...toReview.filter((raw) => !mineNumbers.has(raw.number)).map((raw) => ({ ...ghRow("pr", raw), group: "toReview" })),
    ...mine.map((raw) => ({ ...ghRow("pr", raw), meta: myPrMeta(raw.reviews ?? []), group: mineGroup(raw, feedback) })),
  ].sort((a, b) => rank(a) - rank(b));
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
