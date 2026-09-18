import * as log from './log.js';
import * as rectangle from './rectangle.js';
import Meta from 'gi://Meta';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
export var Orientation;
(function (Orientation) {
    Orientation[Orientation["HORIZONTAL"] = 0] = "HORIZONTAL";
    Orientation[Orientation["VERTICAL"] = 1] = "VERTICAL";
})(Orientation || (Orientation = {}));

export function nth_rev(array, nth) {
    return array[array.length - nth - 1];
}

export function ok(input, func) {
    return input ? func(input) : null;
}

export function ok_or_else(input, ok_func, or_func) {
    return input ? ok_func(input) : or_func();
}

export function or_else(input, func) {
    return input ? input : func();
}

export function bench(name, callback) {
    const start = new Date().getMilliseconds();
    const value = callback();
    const end = new Date().getMilliseconds();
    log.info(`bench ${name}: ${end - start} ms elapsed`);
    return value;
}

export function active_monitor_index() {
    // GNOME 49+ uses get_current_logical_monitor() on backend, while GNOME 48 uses get_current_monitor() on display.
    if (typeof global.backend.get_current_logical_monitor === 'function')
        return global.backend.get_current_logical_monitor().get_number();
    return global.display.get_current_monitor();
}

export function current_monitor() {
    const idx = active_monitor_index();
    const rect = global.display.get_monitor_geometry(idx);
    return rectangle.Rectangle.from_meta(rect);
}

// Fetch rectangle that represents the cursor
export function cursor_rect() {
    const [x, y] = global.get_pointer();
    return new rectangle.Rectangle([x, y, 1, 1]);
}

export function dbg(value) {
    log.debug(String(value));
    return value;
}

/// Missing from the Clutter API is an Actor children iterator
export function* get_children(actor) {
    let nth = 0;
    const children = actor.get_n_children();
    while (nth < children) {
        const child = actor.get_child_at_index(nth);
        if (child)
            yield child;
        nth += 1;
    }
}

export function join(iterator, next_func, between_func) {
    ok(iterator.next().value, (first) => {
        next_func(first);
        for (const item of iterator) {
            between_func();
            next_func(item);
        }
    });
}

export function is_keyboard_op(op) {
    const window_flag_keyboard = Meta.GrabOp.KEYBOARD_MOVING & ~Meta.GrabOp.WINDOW_BASE;
    return (op & window_flag_keyboard) != 0;
}

export function is_resize_op(op) {
    const window_dir_mask = (Meta.GrabOp.RESIZING_N | Meta.GrabOp.RESIZING_E | Meta.GrabOp.RESIZING_S | Meta.GrabOp.RESIZING_W) &
        ~Meta.GrabOp.WINDOW_BASE;
    return ((op & window_dir_mask) != 0 ||
        (op & Meta.GrabOp.KEYBOARD_RESIZING_UNKNOWN) == Meta.GrabOp.KEYBOARD_RESIZING_UNKNOWN);
}

export function is_move_op(op) {
    return !is_resize_op(op);
}

export function orientation_as_str(value) {
    return value == 0 ? 'Orientation::Horizontal' : 'Orientation::Vertical';
}

/// Useful in the event that you want to reuse an actor in the future
export function recursive_remove_children(actor) {
    for (const child of get_children(actor)) {
        recursive_remove_children(child);
    }
    actor.remove_all_children();
}

export function round_increment(value, increment) {
    return Math.round(value / increment) * increment;
}

export function round_to(n, digits) {
    const m = Math.pow(10, digits);
    n = parseFloat((n * m).toFixed(11));
    return Math.round(n) / m;
}

export function separator() {
    return new St.BoxLayout({ style_class: 'o-tiling-separator', x_expand: true });
}

// GNOME 48+: maximize/unmaximize always act on both axes.
export function maximize(window) {
    window.maximize();
}

export function unmaximize(window) {
    window.unmaximize();
}

export function is_maximized(window) {
    return window.maximized_horizontally || window.maximized_vertically;
}

/** Schedules a callback before the next compositor redraw (GNOME 45+ API). */
export function later_add(type, action) {
    return global.compositor.get_laters().add(type, action);
}

/** Removes a previously scheduled later callback (GNOME 45+ API). */
export function later_remove(id) {
    global.compositor.get_laters().remove(id);
}

/** Activates a window that is not an override-redirect window. */
export function activate_window(window) {
    // override-redirect windows don't participate in normal focus management
    if (window.is_override_redirect())
        return;
    window.activate(Clutter.get_current_event_time());
}

/** Detects desktop surfaces. */
export function is_desktop_window(meta_win) {
    const is_ding_desktop = !meta_win.decorated &&
        meta_win.get_gtk_application_id?.() === 'com.rastersoft.ding';
    return (meta_win.window_type === Meta.WindowType.DESKTOP ||
        meta_win.customJS_ding?.keepAtBottom === true ||
        is_ding_desktop);
}
