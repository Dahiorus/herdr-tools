// Jira tab: reads the repo's source from .config.json, fetches its tickets, saves a source typed once.
import { readTextFile, writeTextFile, appHome } from "herdr";
import { jiraSource, withSource } from "./jira.js";
import { fetchTickets } from "./launch.js";

// Hidden: Herdr reloads the mod when any other file of its folder is saved.
const CONFIG = () => `${appHome()}/mods/start-work/.config.json`;
const FIX = "À corriger dans mods/start-work/.config.json.";

// True when .config.json has a source for the repo, or cannot be read (loadJira then shows why).
export async function hasJiraSource(view) {
  try { return Boolean(jiraSource(await readTextFile(CONFIG()), view.repo)); } catch { return true; }
}

export async function loadJira(view, cx) {
  let source;
  try {
    view.configText = await readTextFile(CONFIG());
    source = jiraSource(view.configText, view.repo);
  } catch (e) {
    // No setup here: saving would overwrite every other repo's source.
    view.lists.jira = { error: `.config.json illisible : ${e.message}. ${FIX}` };
    return cx.notify();
  }
  if (!source) {
    view.lists.jira = { error: `Pas de source Jira pour ${view.repo}. Tape une clé de projet, filter=ID ou du JQL, puis Entrée. Pour la changer ensuite : mods/start-work/.config.json.`, setup: true };
    return cx.notify();
  }
  view.lists.jira = null;
  cx.notify();
  try {
    view.lists.jira = await fetchTickets(source, view.machine);
  } catch (e) {
    view.lists.jira = { error: `${e.message} (source « ${source} ». ${FIX})` };
  }
  cx.notify();
}

export async function saveJira(view, source, cx) {
  try {
    await writeTextFile(CONFIG(), withSource(view.configText, view.repo, source), view.configText ?? null);
  } catch (e) {
    await loadJira(view, cx); // re-read, so Enter again writes on top of the current file
    if (view.lists.jira?.setup) view.lists.jira.error = `Enregistrement refusé : ${e.message}. Réessaie avec Entrée.`;
    return cx.notify();
  }
  view.input.set_value("");
  view.filter = "";
  await loadJira(view, cx);
}
