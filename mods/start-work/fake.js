// Tests only: stands in for herdr, gpui-kit and gpui-base under node, and records what the mod asks of them.
// Import it before the mod, then load the mod with `await import(...)`.
import { registerHooks } from "node:module";

const SELF = import.meta.url;
registerHooks({
  resolve: (spec, ctx, next) => (["herdr", "gpui-kit", "gpui-base"].includes(spec) ? { url: SELF, shortCircuit: true } : next(spec, ctx)),
});

// respond(cmd, args, opts) → {code, stdout, stderr} or throws (exec rejects).
export const fake = { calls: [], toasts: [], closed: [], keyDown: null, respond: () => ({ code: 0, stdout: "", stderr: "" }) };
export const reset = (respond) => Object.assign(fake, { calls: [], toasts: [], closed: [], keyDown: null, respond });

// herdr
export const exec = async (cmd, args, opts) => { fake.calls.push([cmd, ...args]); return fake.respond(cmd, args, opts); };
export const notify = (n) => fake.toasts.push(n);
export const closeOverlay = (id) => fake.closed.push(id);
export const props = () => ({ overlay: "ov" });
export const window = () => ({ platform: "linux" });
export const theme = () => ({});
export const checking = () => true;
export const readTextFile = async () => "{}";
export const [writeTextFile, focused, spaces, home, appHome] = [async () => {}, () => null, () => [], () => "/home", () => "/app"];

// gpui-kit / gpui-base: any element chain works; the root's on_key_down handler is kept.
const el = new Proxy(function () {}, {
  get: (_t, k) => (typeof k === "symbol" ? undefined : k === "on_key_down" ? (h) => { fake.keyDown = h; return el; } : () => el),
  apply: () => el,
});
export class View {}
export const [div, v_flex, h_flex, Input] = [el, el, el, el]; // callable, and Input.new(...) too
export const ScrollHandle = { new: () => ({ scroll_to_item() {} }) };
export const InputState = {
  new: () => {
    const on = {};
    return { on: (e, f) => { on[e] = f; }, focus() {}, value: () => "", set_value() {}, fire: (e, ev, cx) => on[e](ev, cx) };
  },
};

// A cx whose spawned tasks can be awaited with settle().
export function makeCx() {
  const tasks = [];
  const cx = {
    stopped: false,
    notify() {},
    stop_propagation() { cx.stopped = true; },
    timer: { after() {}, every() {} },
    spawn: (f) => tasks.push(f(cx)),
    settle: async () => { while (tasks.length) await tasks.shift(); },
  };
  return cx;
}
