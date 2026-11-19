// Tâches du reste à faire : lecture seule, fonctions pures.
const FILE_NAME = /(^|\/)(reste-a-faire|todo)\.md$/i;

export function remainingWorkFile(paths, repo) {
  const all = paths.filter((p) => FILE_NAME.test(p));
  const docs = all.filter((p) => p.startsWith("docs/"));
  const found = docs.length ? docs : all;
  if (found.length === 1) return { path: found[0] };
  if (!found.length) return { error: `Pas de reste à faire dans ${repo}. \`/todo add\` le crée dans docs/reste-a-faire.md.` };
  return { error: `Plusieurs reste à faire : ${found.join(", ")}. Garde-en un seul, ou mets-le dans docs/.` };
}

const titleOf = (text) => {
  const raw = text.match(/^\*\*(.+?)\*\*/)?.[1] ?? text.split("\n")[0].split(":")[0];
  return raw.replace(/[`*]/g, "").replace(/\b_+|_+\b/g, "").trim();
};

function closeTask(current, tasks) {
  if (!current) return;
  const lines = [...current.lines];
  lines[0] = lines[0].replace(/^\[ \] /, "");
  if (/^(~~|\[x\])/i.test(lines[0])) return;
  const description = lines.join("\n").trimEnd();
  const id = current.number || description.match(/^\*\*.+?\*\*\s*\((#\d+)\b/)?.[1] || "";
  tasks.push({ key: `t${current.line}`, id, title: titleOf(description), description, meta: "" });
}

const unindent = (text) => text.replace(/^(?: {1,4}|\t)/, "");

// Un titre ferme la tâche en cours ; seul un titre de niveau 1 ou 2 change de section.
function readHeading(state, [, marks, name], close) {
  close();
  if (marks.length <= 2) state.inSection = marks.length === 2 && /^feature/i.test(name);
  state.seen ||= state.inSection;
}

// Fait avancer l'état d'une ligne : titre, puce, suite ou fin de tâche.
function readLine(state, text, line) {
  const close = () => { closeTask(state.current, state.tasks); state.current = null; };
  const fence = /^\s*```/.test(text);
  const heading = !fence && !state.fenced && text.match(/^(#+)\s+(.*)/);
  if (fence) state.fenced = !state.fenced;
  if (heading) return readHeading(state, heading, close);
  if (!state.inSection) return;
  const item = fence || state.fenced ? null : text.match(/^(?:(\d+)\.|[-*])\s+(.*)/);
  if (item) { close(); state.current = { line, number: item[1] ?? "", lines: [item[2]] }; }
  else if (fence || state.fenced || text.trim() === "" || /^\s/.test(text)) state.current?.lines.push(unindent(text));
  else close();
}

export function parseTasks(md) {
  const state = { tasks: [], current: null, inSection: false, seen: false, fenced: false };
  md.split(/\r?\n/).forEach((text, line) => readLine(state, text, line));
  closeTask(state.current, state.tasks);
  return state.seen ? state.tasks : null;
}

export const repoWithoutJira = (noJiraProfile, found) => noJiraProfile || Array.isArray(found?.tasks);

export const taskList = (found) => (found.error ? { error: found.error } : (found.tasks ?? []));

export const taskName = (item) => item.title.slice(0, 30).trimEnd();
