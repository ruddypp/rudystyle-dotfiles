import * as Ecs from '../core/ecs.js';
import * as Lib from '../utils/lib.js';
import * as node from './node.js';
import * as Rect from '../utils/rectangle.js';

export function get_primary_monitor_index() {
    return global.display.get_primary_monitor();
}
const XPOS = 0;
const YPOS = 1;
const WIDTH = 2;
const HEIGHT = 3;

/** A tiling fork contains two children nodes. These nodes may either be windows, or sub-forks. */
export class Fork {
    left;
    right;
    area;
    entity;
    on_primary_display;
    workspace;
    length_left;
    prev_length_left;
    prev_ratio = 0.5;
    monitor;
    minimum_ratio = 0.1;
    orientation = Lib.Orientation.HORIZONTAL;
    orientation_changed = false;
    is_toplevel = false;
    smart_gapped = false;
    /** Tracks toggle count so that we may swap branches when toggled twice */
    n_toggled = 0;
    constructor(entity, left, right, area, workspace, monitor, orient, primary = false) {
        this.on_primary_display = primary;
        this.area = area;
        this.left = left;
        this.right = right;
        this.workspace = workspace;
        this.length_left = orient === Lib.Orientation.HORIZONTAL ? this.area.width / 2 : this.area.height / 2;
        this.prev_length_left = this.length_left;
        this.entity = entity;
        this.orientation = orient;
        this.monitor = monitor;
    }
    /** The calculated left area of this fork */
    area_of_left(ext) {
        return new Rect.Rectangle(this.is_horizontal()
            ? [this.area.x, this.area.y, this.length_left - ext.gap_inner_half, this.area.height]
            : [this.area.x, this.area.y, this.area.width, this.length_left - ext.gap_inner_half]);
    }
    /** The calculated right area of this fork */
    area_of_right(ext) {
        let area;
        if (this.is_horizontal()) {
            const x = this.area.x + this.length_left + ext.gap_inner_half;
            const width = this.area.width - this.length_left - ext.gap_inner_half;
            area = [x, this.area.y, width, this.area.height];
        }
        else {
            const y = this.area.y + this.length_left + ext.gap_inner_half;
            const height = this.area.height - this.length_left - ext.gap_inner_half;
            area = [this.area.x, y, this.area.width, height];
        }
        return new Rect.Rectangle(area);
    }
    depth() {
        return this.is_horizontal() ? this.area.height : this.area.width;
    }
    find_branch(entity) {
        const locate = (branch) => {
            switch (branch.inner.kind) {
                case 2:
                    if (Ecs.entity_eq(branch.inner.entity, entity)) {
                        return branch;
                    }
                    break;
                case 3:
                    for (const e of branch.inner.entities) {
                        if (Ecs.entity_eq(e, entity)) {
                            return branch;
                        }
                    }
            }
            return null;
        };
        const node = locate(this.left);
        if (node)
            return node;
        return this.right ? locate(this.right) : null;
    }
    /** If this fork has a horizontal orientation */
    is_horizontal() {
        return Lib.Orientation.HORIZONTAL == this.orientation;
    }
    length() {
        return this.is_horizontal() ? this.area.width : this.area.height;
    }
    /** Replaces the association of a window in a fork with another */
    replace_window(ext, a, b) {
        let closure = null;
        const check_right = () => {
            if (this.right) {
                const inner = this.right.inner;
                if (inner.kind === 2) {
                    closure = () => {
                        inner.entity = b.entity;
                    };
                }
                else if (inner.kind === 3) {
                    const idx = node.stack_find(inner, a.entity);
                    if (idx === null) {
                        closure = null;
                        return;
                    }
                    closure = () => {
                        node.stack_replace(ext, inner, b);
                        inner.entities[idx] = b.entity;
                    };
                }
            }
        };
        switch (this.left.inner.kind) {
            case 1:
                check_right();
                break;
            case 2:
                const inner = this.left.inner;
                if (Ecs.entity_eq(inner.entity, a.entity)) {
                    closure = () => {
                        inner.entity = b.entity;
                    };
                }
                else {
                    check_right();
                }
                break;
            case 3:
                const inner_s = this.left.inner;
                const idx = node.stack_find(inner_s, a.entity);
                if (idx !== null) {
                    const id = idx;
                    closure = () => {
                        node.stack_replace(ext, inner_s, b);
                        inner_s.entities[id] = b.entity;
                    };
                }
                else {
                    check_right();
                }
        }
        return closure;
    }
    /** Sets a new area for this fork */
    set_area(area) {
        this.area = area;
        return this.area;
    }
    /** Sets the ratio of this fork Ensures that the ratio is never smaller or larger than the constraints. */
    set_ratio(left_length) {
        const fork_len = this.is_horizontal() ? this.area.width : this.area.height;
        const min_split = Math.max(32, Math.round(fork_len * 0.10));
        const clamped = Math.round(Math.max(min_split, Math.min(fork_len - min_split, left_length)));
        this.prev_length_left = clamped;
        this.length_left = clamped;
        return this;
    }
    /** Defines this fork as a top level fork, and records it in the forest */
    set_toplevel(tiler, entity, string, id) {
        this.is_toplevel = true;
        tiler.toplevel.set(string, [entity, id]);
        return this;
    }
    /** Calculates the future arrangement of windows in this fork */
    measure(tiler, ext, area, record) {
        let ratio = null;
        const manually_moved = ext.grab_op !== null || ext.tiler.resizing_window;
        if (!this.is_toplevel) {
            if (this.orientation_changed) {
                this.orientation_changed = false;
                ratio = this.length_left / this.depth();
            }
            else {
                ratio = this.length_left / this.length();
            }
            this.area = this.set_area(area.clone());
        }
        else if (this.orientation_changed) {
            this.orientation_changed = false;
            ratio = this.length_left / this.depth();
        }
        if (ratio) {
            this.length_left = Math.round(ratio * this.length());
            if (manually_moved)
                this.prev_ratio = ratio;
        }
        else if (manually_moved) {
            this.prev_ratio = this.length_left / this.length();
        }
        if (this.right) {
            const [l, p, startpos] = this.is_horizontal() ? [WIDTH, XPOS, this.area.x] : [HEIGHT, YPOS, this.area.y];
            const region = this.area.clone();
            const half = this.area.array[l] / 2;
            const grid_size = this.is_horizontal() ? ext.column_size : ext.row_size;
            let length;
            if (this.length_left > half - grid_size && this.length_left < half + grid_size) {
                length = half;
            }
            else {
                const diff = (startpos + this.length_left) % grid_size;
                length = this.length_left - diff + (diff > grid_size / 2 ? grid_size : 0);
                if (length == 0)
                    length = grid_size;
            }
            region.array[l] = length - ext.gap_inner_half;
            this.left.measure(tiler, ext, this.entity, region, record);
            region.array[p] = region.array[p] + length + ext.gap_inner_half;
            region.array[l] = this.area.array[l] - length - ext.gap_inner_half;
            this.right.measure(tiler, ext, this.entity, region, record);
        }
        else {
            this.left.measure(tiler, ext, this.entity, this.area, record);
        }
    }
    migrate(ext, forest, area, monitor, workspace) {
        if (ext.auto_tiler && this.is_toplevel) {
            const primary = get_primary_monitor_index() === monitor;
            this.monitor = monitor;
            this.workspace = workspace;
            this.on_primary_display = primary;
            const blocked = [];
            forest.toplevel.set(forest.string_reps.get(this.entity), [this.entity, [monitor, workspace]]);
            for (const child of forest.iter(this.entity)) {
                switch (child.inner.kind) {
                    case 1:
                        const cfork = forest.forks.get(child.inner.entity);
                        if (!cfork)
                            continue;
                        cfork.workspace = workspace;
                        cfork.monitor = monitor;
                        cfork.on_primary_display = primary;
                        break;
                    case 2:
                        const window = ext.windows.get(child.inner.entity);
                        if (window) {
                            ext.size_signals_block(window);
                            window.reassignment = false;
                            window.known_workspace = workspace;
                            window.meta.change_workspace_by_index(workspace, true);
                            ext.monitors.insert(window.entity, [monitor, workspace]);
                            blocked.push(window);
                        }
                        break;
                    case 3:
                        for (const entity of child.inner.entities) {
                            const stack = ext.auto_tiler.forest.stacks.get(child.inner.idx);
                            if (stack) {
                                stack.workspace = workspace;
                            }
                            const window = ext.windows.get(entity);
                            if (window) {
                                ext.size_signals_block(window);
                                window.known_workspace = workspace;
                                window.meta.change_workspace_by_index(workspace, true);
                                ext.monitors.insert(window.entity, [monitor, workspace]);
                                blocked.push(window);
                            }
                        }
                }
            }
            area.x += ext.gap_outer;
            area.y += ext.gap_top;
            area.width -= ext.gap_outer * 2;
            area.height -= ext.gap_outer + ext.gap_top;
            this.set_area(area.clone());
            this.measure(forest, ext, area, forest.on_record());
            forest.arrange(ext, workspace, true);
            for (const window of blocked) {
                ext.size_signals_unblock(window);
            }
        }
    }
    rebalance_orientation() {
        this.set_orientation(this.area.height > this.area.width ? Lib.Orientation.VERTICAL : Lib.Orientation.HORIZONTAL);
    }
    set_orientation(o) {
        if (o !== this.orientation) {
            this.orientation = o;
            this.orientation_changed = true;
        }
    }
    /** Swaps the left branch with the right branch, if there is a right branch */
    swap_branches() {
        if (this.right) {
            const temp = this.left;
            this.left = this.right;
            this.right = temp;
        }
    }
    /** Toggles the orientation of this fork */
    toggle_orientation() {
        this.orientation =
            Lib.Orientation.HORIZONTAL === this.orientation ? Lib.Orientation.VERTICAL : Lib.Orientation.HORIZONTAL;
        this.orientation_changed = true;
        if (this.n_toggled === 1) {
            if (this.right) {
                const tmp = this.right;
                this.right = this.left;
                this.left = tmp;
            }
            this.n_toggled = 0;
        }
        else {
            this.n_toggled += 1;
        }
    }
}
