// exec/gh helpers of Start work: errors worded in French, gh run with the profile's account.
import { exec } from "herdr";

// gh with the token of the project profile's account. The token goes through the environment,
// never argv (readable in /proc). shortcut: ~/.claude only, not $CLAUDE_CONFIG_DIR.
const GH_AS = 'GH_TOKEN=$(gh auth token -u "$1") || exit; shift; export GH_TOKEN; exec gh "$@"';
export const ghCommand = (account, args) => (account ? ["sh", ["-c", GH_AS, "sh", account, ...args]] : ["gh", args]);
export const firstLine = (r) => (r.stderr || r.stdout).trim().split("\n")[0];

// exec rejects when the program can't start, the machine is unreachable or it times out (30 s).
export const sh = (cmd, args, opts) => exec(cmd, args, opts).catch((e) => { throw new Error(`${cmd} : ${e.message}`); });

export async function json(cmd, args, opts) {
  const r = await sh(cmd, args, opts);
  if (r.code !== 0) throw new Error(firstLine(r) || `${cmd} a échoué`);
  return JSON.parse(r.stdout);
}
