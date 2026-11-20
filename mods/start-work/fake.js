// Tests only: stands in for herdr, gpui-kit and gpui-base under node, and records what the mod asks of them.
// Import it before the mod, then load the mod with `await import(...)`.
import { registerHooks } from "node:module";

const SELF = import.meta.url;
registerHooks({
  resolve: (spec, ctx, next) => (["herdr", "gpui-kit", "gpui-base"].includes(spec) ? { url: SELF, shortCircuit: true } : next(spec, ctx)),
});

// respond(cmd, args, opts) → {code, stdout, stderr} or throws (exec rejects).
export const fake = { calls: [], toasts: [], closed: [], keyDown: null, actions: {}, ids: [], clicks: {}, scrolls: [], focus: 0, hovers: [], hidden: 0, files: {}, reads: [], writes: [], respond: () => ({ code: 0, stdout: "", stderr: "" }) };
export const reset = (respond, files = {}) => Object.assign(fake, { calls: [], toasts: [], closed: [], keyDown: null, actions: {}, ids: [], clicks: {}, scrolls: [], focus: 0, hovers: [], hidden: 0, files, reads: [], writes: [], respond });

// herdr
export const exec = async (cmd, args, opts) => { fake.calls.push([cmd, ...args]); return fake.respond(cmd, args, opts); };
export const notify = (n) => fake.toasts.push(n);
export const closeOverlay = (id) => fake.closed.push(id);
export const props = () => ({ overlay: "ov" });
export const window = () => ({ platform: "linux" });
export const theme = () => ({});
export const checking = () => true;
export const readTextFile = async (path, opts) => {
  fake.reads.push([path, opts]);
  const f = fake.files[path];
  if (f instanceof Error) throw f;
  return path in fake.files ? f : "{}";
};
export const writeTextFile = async (path, text) => { fake.writes.push([path, text]); };
export const [focused, spaces, home, appHome] = [() => null, () => [], () => "/home", () => "/app"];

// gpui-kit / gpui-base: any element chain works; the root's on_key_down and on_action handlers, .id(...) arguments, on_click handlers by the id set before them, on_hover handlers and invisible() calls are kept; child(null | undefined) throws, as in the runtime; when() runs its callback if true.
const el = new Proxy(function () {}, {
  get: (_t, k) => (typeof k === "symbol" ? undefined : k === "on_key_down" ? (h) => { fake.keyDown = h; return el; }
    : k === "on_action" ? (a, h) => { fake.actions[a] = h; return el; }
    : k === "id" ? (x) => { fake.ids.push(x); return el; } : k === "on_click" ? (h) => { fake.clicks[fake.ids.at(-1)] = h; return el; } : k === "on_hover" ? (h) => { fake.hovers.push(h); return el; }
    : k === "child" ? (c) => { if (c == null) throw new Error("child(value) expects an element, a string, or an entity"); return el; } : k === "invisible" ? () => { fake.hidden++; return el; } : k === "when" ? (c, f) => { if (c) f(el); return el; } : () => el),
  apply: () => el,
});
export class View {}
export const [div, v_flex, h_flex, Input] = [el, el, el, el]; // callable, and Input.new(...) too
export const TextView = { markdown: () => el };
export const ScrollHandle = { new: () => ({ scroll_to_item: (i) => fake.scrolls.push(i) }) };
export const InputState = {
  new: () => {
    const on = {};
    return { on: (e, f) => { on[e] = f; }, focus() { fake.focus++; }, value: () => "", set_value() {}, fire: (e, ev, cx) => on[e](ev, cx) };
  },
};

// A cx whose spawned tasks can be awaited with settle().
export function makeCx() {
  const tasks = [];
  const cx = {
    stopped: false,
    bindings: [],
    bind_keys: (b) => cx.bindings.push(...b),
    notify() {},
    stop_propagation() { cx.stopped = true; },
    timer: { after() {}, every() {} },
    spawn: (f) => tasks.push(f(cx)),
    settle: async () => { while (tasks.length) await tasks.shift(); },
  };
  return cx;
}
