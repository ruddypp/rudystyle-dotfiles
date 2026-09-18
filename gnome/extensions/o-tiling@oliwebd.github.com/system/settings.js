import Gio from 'gi://Gio';
import { get_current_path } from '../utils/paths.js';
import * as utils from '../utils/utils.js';
const DARK = ['dark', 'adapta', 'plata', 'dracula'];
const ACCENT_COLOR_MAP = {
    'blue': 'rgba(53, 132, 228, 1)',
    'teal': 'rgba(33, 144, 175, 1)',
    'green': 'rgba(58, 148, 74, 1)',
    'yellow': 'rgba(200, 136, 0, 1)',
    'orange': 'rgba(237, 91, 0, 1)',
    'red': 'rgba(224, 27, 36, 1)',
    'pink': 'rgba(205, 64, 119, 1)',
    'purple': 'rgba(145, 65, 172, 1)',
    'slate': 'rgba(111, 119, 131, 1)',
};
function settings_new_id(schema_id) {
    const defaultSource = Gio.SettingsSchemaSource.get_default();
    if (defaultSource && defaultSource.lookup(schema_id, true)) {
        try {
            return new Gio.Settings({ schema_id });
        }
        catch (why) {
            if (schema_id !== 'org.gnome.shell.extensions.user-theme') {
                // (global as any).log(`failed to get settings for ${schema_id}: ${why}`);
            }
            return null;
        }
    }
    return null;
}
function settings_new_schema(schema) {
    const GioSSS = Gio.SettingsSchemaSource;
    const schemaDir = Gio.File.new_for_path(get_current_path()).get_child('schemas');
    const defaultSource = GioSSS.get_default();
    const schemaSource = (schemaDir.query_exists(null) && defaultSource)
        ? GioSSS.new_from_directory(schemaDir.get_path(), defaultSource, false)
        : defaultSource;
    if (!schemaSource) {
        throw new Error('Could not load GSettings schema source for o-tiling.');
    }
    const schemaObj = schemaSource.lookup(schema, true);
    if (!schemaObj) {
        throw new Error('Schema ' + schema + ' could not be found for extension o-tiling. Please check your installation.');
    }
    return new Gio.Settings({ settings_schema: schemaObj });
}
const ACTIVE_HINT = 'active-hint';
const ACTIVE_HINT_BORDER_RADIUS = 'active-hint-border-radius';
const ACTIVE_HINT_BORDER_WIDTH = 'active-hint-border-width';
const STACKING_WITH_MOUSE = 'stacking-with-mouse';
const COLUMN_SIZE = 'column-size';
const EDGE_TILING = 'edge-tiling';
const GAP_INNER = 'gap-inner';
const GAP_OUTER = 'gap-outer';
const ROW_SIZE = 'row-size';
const SHOW_TITLE = 'show-title';
const SMART_GAPS = 'smart-gaps';
const SNAP_TO_GRID = 'snap-to-grid';
const TILE_BY_DEFAULT = 'tile-by-default';
const NEW_WINDOW_PLACEMENT = 'new-window-placement';
const HINT_COLOR_RGBA = 'hint-color-rgba';
const DEFAULT_RGBA_COLOR = 'rgba(53, 132, 228, 1)'; // Aura Blue
const LOG_LEVEL = 'log-level';
const CLEARED_SYSTEM_BINDINGS = 'cleared-system-bindings';
const DISABLED_WORKSPACES = 'disabled-workspaces';
const SHOW_SKIPTASKBAR = 'show-skip-taskbar';
const MOUSE_CURSOR_FOLLOWS_ACTIVE_WINDOW = 'mouse-cursor-follows-active-window';
const MOUSE_CURSOR_FOCUS_LOCATION = 'mouse-cursor-focus-location';
const MAX_WINDOW_WIDTH = 'max-window-width';
const ACTIVE_HINT_OVERLAY_ENABLED = 'active-hint-overlay-enabled';
const ACTIVE_HINT_OVERLAY_OPACITY = 'active-hint-overlay-opacity';
const ACTIVE_HINT_OVERLAY_COLOR_RGBA = 'active-hint-overlay-color-rgba';
const ACTIVE_HINT_OVERLAY_ALL_WINDOWS = 'active-hint-overlay-all-windows';
const WORKSPACE_SWITCHER_STYLE = 'workspace-switcher-style';
const WORKSPACE_NUMBER_INDICATOR = 'workspace-number-indicator';
const SHOW_OVERVIEW_BUTTON_IN_INDICATOR = 'show-overview-button-in-indicator';
const HIDE_PANEL_ICON = 'hide-panel-icon';
const QUICK_SETTINGS_TOGGLE = 'quick-settings-toggle';
const WORKSPACE_ANIMATION_STYLE = 'workspace-animation-style';
const WINDOW_ANIMATION_STYLE = 'window-animation-style';
const WINDOW_ANIMATION_DURATION = 'window-animation-duration';
const THEME_CONSISTENCY_STYLE = 'theme-consistency-style';
const SKIP_OVERVIEW = 'skip-overview';
const SHOW_MINIMIZE_MAXIMIZE_BUTTONS = 'show-minimize-maximize-buttons';
const SHOW_CLOSE_BUTTON = 'show-close-button';
const PANEL_TRANSPARENCY = 'panel-transparency';
const PANEL_TRANSPARENCY_OPACITY = 'panel-transparency-opacity';
const PANEL_TOP_GAP = 'panel-top-gap';

export class ExtensionSettings {
    ext = settings_new_schema('org.gnome.shell.extensions.o-tiling');
    int = settings_new_id('org.gnome.desktop.interface');
    mutter = settings_new_id('org.gnome.mutter');
    shell = settings_new_id('org.gnome.shell.extensions.user-theme');
    wm = settings_new_id('org.gnome.desktop.wm.preferences');
    // Getters
    active_hint() {
        return this.ext.get_boolean(ACTIVE_HINT);
    }
    active_hint_border_radius() {
        return this.ext.get_uint(ACTIVE_HINT_BORDER_RADIUS);
    }
    active_hint_border_width() {
        return this.ext.get_uint(ACTIVE_HINT_BORDER_WIDTH);
    }
    stacking_with_mouse() {
        return this.ext.get_boolean(STACKING_WITH_MOUSE);
    }
    column_size() {
        return this.ext.get_uint(COLUMN_SIZE);
    }
    dynamic_workspaces() {
        return this.mutter ? this.mutter.get_boolean('dynamic-workspaces') : false;
    }
    gap_inner() {
        return this.ext.get_uint(GAP_INNER);
    }
    gap_outer() {
        return this.ext.get_uint(GAP_OUTER);
    }
    get_system_accent_color() {
        if (!this.int)
            return DEFAULT_RGBA_COLOR;
        const keys = this.int.list_keys();
        if (keys && keys.includes('accent-color')) {
            try {
                const accent = this.int.get_string('accent-color');
                return ACCENT_COLOR_MAP[accent] ?? DEFAULT_RGBA_COLOR;
            }
            catch (e) {
                return DEFAULT_RGBA_COLOR;
            }
        }
        return DEFAULT_RGBA_COLOR;
    }
    hint_color_rgba() {
        const rgba = this.ext.get_string(HINT_COLOR_RGBA);
        if (rgba === 'auto') {
            return this.get_system_accent_color();
        }
        const valid_color = utils.isValidColor(rgba);
        if (!valid_color) {
            return this.get_system_accent_color();
        }
        return rgba;
    }
    theme() {
        return this.shell ? this.shell.get_string('name') : this.int ? this.int.get_string('gtk-theme') : 'Adwaita';
    }
    is_dark() {
        const theme = this.theme().toLowerCase();
        return DARK.some((dark) => theme.includes(dark));
    }
    is_high_contrast() {
        return this.theme().toLowerCase() === 'highcontrast';
    }
    row_size() {
        return this.ext.get_uint(ROW_SIZE);
    }
    show_title() {
        return this.ext.get_boolean(SHOW_TITLE);
    }
    smart_gaps() {
        return this.ext.get_boolean(SMART_GAPS);
    }
    snap_to_grid() {
        return this.ext.get_boolean(SNAP_TO_GRID);
    }
    tile_by_default() {
        return this.ext.get_boolean(TILE_BY_DEFAULT);
    }
    new_window_placement() {
        return this.ext.get_string(NEW_WINDOW_PLACEMENT);
    }
    workspaces_only_on_primary() {
        return this.mutter ? this.mutter.get_boolean('workspaces-only-on-primary') : false;
    }
    focus_change_on_pointer_rest() {
        return this.mutter ? this.mutter.get_boolean('focus-change-on-pointer-rest') : false;
    }
    log_level() {
        return this.ext.get_uint(LOG_LEVEL);
    }
    /** Used by system/keybindings.ts to survive process death. */
    cleared_system_bindings_raw() {
        return this.ext.get_string(CLEARED_SYSTEM_BINDINGS);
    }
    disabled_workspaces_raw() {
        return this.ext.get_string(DISABLED_WORKSPACES);
    }
    show_skiptaskbar() {
        return this.ext.get_boolean(SHOW_SKIPTASKBAR);
    }
    mouse_cursor_follows_active_window() {
        return this.ext.get_boolean(MOUSE_CURSOR_FOLLOWS_ACTIVE_WINDOW);
    }
    mouse_cursor_focus_location() {
        return this.ext.get_uint(MOUSE_CURSOR_FOCUS_LOCATION);
    }
    max_window_width() {
        return this.ext.get_uint(MAX_WINDOW_WIDTH);
    }
    active_hint_overlay_enabled() {
        return this.ext.get_boolean(ACTIVE_HINT_OVERLAY_ENABLED);
    }
    active_hint_overlay_opacity() {
        return this.ext.get_uint(ACTIVE_HINT_OVERLAY_OPACITY);
    }
    active_hint_overlay_color_rgba() {
        const rgba = this.ext.get_string(ACTIVE_HINT_OVERLAY_COLOR_RGBA);
        if (rgba === 'auto') {
            return 'auto';
        }
        const valid_color = utils.isValidColor(rgba);
        if (!valid_color) {
            return 'auto';
        }
        return rgba;
    }
    /** True when the tint should apply only to the active (focused) window. */
    active_hint_overlay_only_active() {
        // The schema key `active-hint-overlay-all-windows` means "apply to ALL", so we invert it here for the cleaner "only active" semantic.
        return !this.ext.get_boolean(ACTIVE_HINT_OVERLAY_ALL_WINDOWS);
    }
    active_hint_overlay_all_windows() {
        return this.ext.get_boolean(ACTIVE_HINT_OVERLAY_ALL_WINDOWS);
    }
    workspace_switcher_style() {
        return this.ext.get_boolean(WORKSPACE_SWITCHER_STYLE);
    }
    workspace_number_indicator() {
        return this.ext.get_boolean(WORKSPACE_NUMBER_INDICATOR);
    }
    show_overview_button_in_indicator() {
        return this.ext.get_boolean(SHOW_OVERVIEW_BUTTON_IN_INDICATOR);
    }
    hide_panel_icon() {
        return this.ext.get_boolean(HIDE_PANEL_ICON);
    }
    quick_settings_toggle() {
        return this.ext.get_boolean(QUICK_SETTINGS_TOGGLE);
    }
    workspace_animation_style() {
        return this.ext.get_string(WORKSPACE_ANIMATION_STYLE) ?? 'none';
    }
    window_animation_style() {
        return this.ext.get_string(WINDOW_ANIMATION_STYLE) ?? 'default';
    }
    window_animation_duration() {
        return this.ext.get_int(WINDOW_ANIMATION_DURATION);
    }
    theme_consistency_style() {
        return this.ext.get_string(THEME_CONSISTENCY_STYLE);
    }
    skip_overview() {
        return this.ext.get_boolean(SKIP_OVERVIEW);
    }
    show_minimize_maximize_buttons() {
        return this.ext.get_boolean(SHOW_MINIMIZE_MAXIMIZE_BUTTONS);
    }
    show_close_button() {
        return this.ext.get_boolean(SHOW_CLOSE_BUTTON);
    }
    panel_transparency() {
        return this.ext.get_boolean(PANEL_TRANSPARENCY);
    }
    panel_transparency_opacity() {
        return this.ext.get_uint(PANEL_TRANSPARENCY_OPACITY);
    }
    panel_top_gap() {
        return this.ext.get_uint(PANEL_TOP_GAP);
    }
    // Setters
    set_active_hint(set) {
        this.ext.set_boolean(ACTIVE_HINT, set);
    }
    set_active_hint_border_radius(set) {
        this.ext.set_uint(ACTIVE_HINT_BORDER_RADIUS, set);
    }
    set_active_hint_border_width(set) {
        this.ext.set_uint(ACTIVE_HINT_BORDER_WIDTH, set);
    }
    set_stacking_with_mouse(set) {
        this.ext.set_boolean(STACKING_WITH_MOUSE, set);
    }
    set_column_size(size) {
        this.ext.set_uint(COLUMN_SIZE, size);
    }
    set_edge_tiling(enable) {
        this.mutter?.set_boolean(EDGE_TILING, enable);
    }
    set_focus_change_on_pointer_rest(enable) {
        this.mutter?.set_boolean('focus-change-on-pointer-rest', enable);
    }
    set_gap_inner(gap) {
        this.ext.set_uint(GAP_INNER, gap);
    }
    set_gap_outer(gap) {
        this.ext.set_uint(GAP_OUTER, gap);
    }
    set_hint_color_rgba(rgba) {
        const valid_color = utils.isValidColor(rgba);
        if (valid_color) {
            this.ext.set_string(HINT_COLOR_RGBA, rgba);
        }
        else {
            this.ext.set_string(HINT_COLOR_RGBA, DEFAULT_RGBA_COLOR);
        }
    }
    set_row_size(size) {
        this.ext.set_uint(ROW_SIZE, size);
    }
    set_show_title(set) {
        this.ext.set_boolean(SHOW_TITLE, set);
    }
    set_smart_gaps(set) {
        this.ext.set_boolean(SMART_GAPS, set);
    }
    set_snap_to_grid(set) {
        this.ext.set_boolean(SNAP_TO_GRID, set);
    }
    set_tile_by_default(set) {
        this.ext.set_boolean(TILE_BY_DEFAULT, set);
    }
    set_new_window_placement(value) {
        this.ext.set_string(NEW_WINDOW_PLACEMENT, value);
    }
    set_log_level(set) {
        this.ext.set_uint(LOG_LEVEL, set);
    }
    set_cleared_system_bindings_raw(json) {
        this.ext.set_string(CLEARED_SYSTEM_BINDINGS, json);
    }
    set_disabled_workspaces_raw(json) {
        this.ext.set_string(DISABLED_WORKSPACES, json);
    }
    set_show_skiptaskbar(set) {
        this.ext.set_boolean(SHOW_SKIPTASKBAR, set);
    }
    set_mouse_cursor_follows_active_window(set) {
        this.ext.set_boolean(MOUSE_CURSOR_FOLLOWS_ACTIVE_WINDOW, set);
    }
    set_mouse_cursor_focus_location(set) {
        this.ext.set_uint(MOUSE_CURSOR_FOCUS_LOCATION, set);
    }
    set_max_window_width(set) {
        this.ext.set_uint(MAX_WINDOW_WIDTH, set);
    }
    set_active_hint_overlay_enabled(set) {
        this.ext.set_boolean(ACTIVE_HINT_OVERLAY_ENABLED, set);
    }
    set_active_hint_overlay_opacity(set) {
        this.ext.set_uint(ACTIVE_HINT_OVERLAY_OPACITY, set);
    }
    set_active_hint_overlay_color_rgba(rgba) {
        const valid_color = utils.isValidColor(rgba);
        if (valid_color) {
            this.ext.set_string(ACTIVE_HINT_OVERLAY_COLOR_RGBA, rgba);
        }
        else {
            this.ext.set_string(ACTIVE_HINT_OVERLAY_COLOR_RGBA, 'auto');
        }
    }
    set_active_hint_overlay_all_windows(set) {
        this.ext.set_boolean(ACTIVE_HINT_OVERLAY_ALL_WINDOWS, set);
    }
    set_workspace_switcher_style(set) {
        this.ext.set_boolean(WORKSPACE_SWITCHER_STYLE, set);
    }
    set_workspace_number_indicator(set) {
        this.ext.set_boolean(WORKSPACE_NUMBER_INDICATOR, set);
    }
    set_show_overview_button_in_indicator(set) {
        this.ext.set_boolean(SHOW_OVERVIEW_BUTTON_IN_INDICATOR, set);
    }
    set_hide_panel_icon(set) {
        this.ext.set_boolean(HIDE_PANEL_ICON, set);
    }
    set_quick_settings_toggle(set) {
        this.ext.set_boolean(QUICK_SETTINGS_TOGGLE, set);
    }
    set_workspace_animation_style(style) {
        this.ext.set_string(WORKSPACE_ANIMATION_STYLE, style);
    }
    set_window_animation_style(style) {
        this.ext.set_string(WINDOW_ANIMATION_STYLE, style);
    }
    set_window_animation_duration(ms) {
        this.ext.set_int(WINDOW_ANIMATION_DURATION, ms);
    }
    set_theme_consistency_style(style) {
        this.ext.set_string(THEME_CONSISTENCY_STYLE, style);
    }
    set_skip_overview(set) {
        this.ext.set_boolean(SKIP_OVERVIEW, set);
    }
    set_panel_transparency(v) {
        this.ext.set_boolean(PANEL_TRANSPARENCY, v);
    }
    set_panel_transparency_opacity(v) {
        this.ext.set_uint(PANEL_TRANSPARENCY_OPACITY, v);
    }
    set_panel_top_gap(v) {
        this.ext.set_uint(PANEL_TOP_GAP, v);
    }
    reset_all() {
        const keys = this.ext.list_keys();
        keys.forEach((key) => this.ext.reset(key));
    }
}
