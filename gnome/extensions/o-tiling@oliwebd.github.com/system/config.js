import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import * as log from '../utils/log.js';
const CONF_DIR = GLib.get_user_config_dir() + '/o-tiling';
export let CONF_FILE = CONF_DIR + '/config.json';
export const DEFAULT_FLOAT_RULES = [
    { class: 'Authy Desktop' },
    { class: 'Com.github.amezin.ddterm' },
    { class: 'Com.github.donadigo.eddy' },
    { class: 'Conky' },
    { title: 'Discord Updater' },
    { class: 'Enpass', title: 'Enpass Assistant' },
    { class: 'o-tiling-exceptions' },
    { class: 'Gjs', title: 'Settings' },
    { class: 'Gnome-initial-setup' },
    { class: 'Gnome-terminal', title: 'Preferences – General' },
    { class: 'Guake' },
    { class: 'Io.elementary.sideload' },
    { title: 'JavaEmbeddedFrame' },
    { class: 'KotatogramDesktop', title: 'Media viewer' },
    { class: 'Mozilla VPN' },
    { class: 'update-manager', title: 'Software Updater' },
    { class: 'Solaar' },
    { class: 'Steam', title: '^((?!Steam).)*$' },
    { class: 'Steam', title: '^.*(Guard|Login).*' },
    { class: 'TelegramDesktop', title: 'Media viewer' },
    { class: 'Zotero', title: 'Quick Format Citation' },
    { class: 'firefox', title: '^(?!.*Mozilla Firefox).*$' },
    { class: 'gnome-screenshot' },
    { class: 'ibus-.*' },
    { class: 'jetbrains-toolbox' },
    { class: 'jetbrains-webstorm', title: 'Customize WebStorm' },
    { class: 'jetbrains-webstorm', title: 'License Activation' },
    { class: 'jetbrains-webstorm', title: 'Welcome to WebStorm' },
    { class: 'krunner' },
    { class: 'pritunl' },
    { class: 're.sonny.Junction' },
    { class: 'system76-driver' },
    { class: 'tilda' },
    { class: 'zoom' },
    { class: '^.*action=join.*$' },
    { class: 'gjs' },
    { class: 'io.github.bugaevc.wl-clipboard' },
];

/** These windows will skip showing in Overview, Thumbnails or SwitcherList And any rule here should be added on the DEFAULT_RULES above */
export const SKIPTASKBAR_EXCEPTIONS = [
    { class: 'Conky' },
    { class: 'gjs' },
    { class: 'Guake' },
    { class: 'Com.github.amezin.ddterm' },
    { class: 'plank' },
];
function compile_rules(rules) {
    return rules.map(rule => ({
        classRe: rule.class ? new RegExp(rule.class, 'i') : null,
        titleRe: rule.title ? new RegExp(rule.title, 'i') : null,
        disabled: rule.disabled,
    }));
}

export class Config {
    /** List of windows that should float, regardless of their WM hints */
    float = [];
    /** List of Windows with skip taskbar true but still hidden in Overview, Switchers, Workspace Thumbnails */
    skiptaskbarhidden = [];
    /** Logs window details on focus of window */
    log_on_focus = false;
    /** Pre-compiled float rules for hot-path matching */
    _compiled_float = compile_rules(DEFAULT_FLOAT_RULES);
    /** Pre-compiled skip-taskbar rules for hot-path matching */
    _compiled_skip = compile_rules(SKIPTASKBAR_EXCEPTIONS);
    /** Rebuild compiled rule caches after any mutation */
    _rebuild_caches() {
        this._compiled_float = compile_rules(this.float.concat(DEFAULT_FLOAT_RULES));
        this._compiled_skip = compile_rules(this.skiptaskbarhidden.concat(SKIPTASKBAR_EXCEPTIONS));
    }
    /** Add a floating exception which matches by wm_class */
    add_app_exception(wmclass) {
        for (const r of this.float) {
            if (r.class === wmclass && r.title === undefined)
                return;
        }
        this.float.push({ class: wmclass });
        this._rebuild_caches();
        this.sync_to_disk();
    }
    /** Add a floating exception which matches by wm_title */
    add_window_exception(wmclass, title) {
        for (const r of this.float) {
            if (r.class === wmclass && r.title === title)
                return;
        }
        this.float.push({ class: wmclass, title });
        this._rebuild_caches();
        this.sync_to_disk();
    }
    window_shall_float(wclass, title) {
        for (const rule of this._compiled_float) {
            if (rule.classRe) {
                if (!rule.classRe.test(wclass)) {
                    continue;
                }
            }
            if (rule.titleRe) {
                if (!rule.titleRe.test(title)) {
                    continue;
                }
            }
            return rule.disabled ? false : true;
        }
        return false;
    }
    skiptaskbar_shall_hide(meta_window) {
        const wmclass = meta_window.get_wm_class();
        const wmtitle = meta_window.get_title();
        const isSkip = typeof meta_window.is_skip_taskbar === 'function' ? meta_window.is_skip_taskbar() : !!meta_window.skip_taskbar;
        if (!isSkip)
            return false;
        for (const rule of this._compiled_skip) {
            if (rule.classRe) {
                if (!rule.classRe.test(wmclass)) {
                    continue;
                }
            }
            if (rule.titleRe) {
                if (!rule.titleRe.test(wmtitle)) {
                    continue;
                }
            }
            return rule.disabled ? false : true;
        }
        return false;
    }
    async reload() {
        const conf = await Config.from_config();
        if (conf.tag === 0) {
            const c = conf.value;
            this.float = c.float;
            this.log_on_focus = c.log_on_focus;
        }
        else {
            log.error(`error loading conf: ${conf.why}`);
        }
        this._rebuild_caches();
    }
    rule_disabled(rule) {
        for (const value of this.float.values()) {
            if (value.disabled && rule.class === value.class && value.title === rule.title) {
                return true;
            }
        }
        return false;
    }
    to_json() {
        return JSON.stringify(this, set_to_json, 2);
    }
    toggle_system_exception(wmclass, wmtitle, disabled) {
        if (disabled) {
            for (const value of DEFAULT_FLOAT_RULES) {
                if (value.class === wmclass && value.title === wmtitle) {
                    value.disabled = disabled;
                    this.float.push(value);
                    this._rebuild_caches();
                    this.sync_to_disk();
                    return;
                }
            }
        }
        let index = 0;
        let found = false;
        for (const value of this.float) {
            if (value.class === wmclass && value.title === wmtitle) {
                found = true;
                break;
            }
            index += 1;
        }
        if (found)
            swap_remove(this.float, index);
        this._rebuild_caches();
        this.sync_to_disk();
    }
    remove_user_exception(wmclass, wmtitle) {
        let index = 0;
        const found = [];
        for (const value of this.float.values()) {
            if (value.class === wmclass && value.title === wmtitle) {
                found.push(index);
            }
            index += 1;
        }
        if (found.length !== 0) {
            for (const idx of found)
                swap_remove(this.float, idx);
            this._rebuild_caches();
            this.sync_to_disk();
        }
    }
    static from_json(json) {
        try {
            return JSON.parse(json);
        }
        catch (error) {
            log.error(`failed to parse config JSON: ${error}`);
            return new Config();
        }
    }
    static async from_config() {
        const stream = await Config.read();
        if (stream.tag === 1)
            return stream;
        const value = Config.from_json(stream.value);
        return { tag: 0, value };
    }
    static gio_file() {
        try {
            const conf = Gio.File.new_for_path(CONF_FILE);
            if (!conf.query_exists(null)) {
                const dir = Gio.File.new_for_path(CONF_DIR);
                if (!dir.query_exists(null) && !dir.make_directory(null)) {
                    return { tag: 1, why: 'failed to create o-tiling config directory' };
                }
                const example = new Config();
                example.float.push({ class: 'o-tiling-example', title: 'o-tiling-example' });
                conf.create(Gio.FileCreateFlags.NONE, null).write_all(JSON.stringify(example, undefined, 2), null);
            }
            return { tag: 0, value: conf };
        }
        catch (why) {
            return { tag: 1, why: `Gio.File I/O error: ${why}` };
        }
    }
    static async read() {
        try {
            const file = Config.gio_file();
            if (file.tag === 1)
                return file;
            return new Promise((resolve) => {
                file.value.load_contents_async(null, (obj, res) => {
                    try {
                        const [, buffer] = obj.load_contents_finish(res);
                        resolve({ tag: 0, value: new TextDecoder().decode(buffer) });
                    }
                    catch (e) {
                        resolve({ tag: 1, why: `failed to read config: ${e}` });
                    }
                });
            });
        }
        catch (why) {
            return { tag: 1, why: `failed to read o-tiling config: ${why}` };
        }
    }
    static write(data) {
        try {
            const file = Config.gio_file();
            if (file.tag === 1)
                return file;
            file.value.replace_contents(data, null, false, Gio.FileCreateFlags.NONE, null);
            return { tag: 0, value: file.value };
        }
        catch (why) {
            return { tag: 1, why: `failed to write to config: ${why}` };
        }
    }
    sync_to_disk() {
        Config.write(this.to_json());
    }
}
function set_to_json(_key, value) {
    if (typeof value === 'object' && value instanceof Set) {
        return [...value];
    }
    return value;
}
function swap_remove(array, index) {
    array[index] = array[array.length - 1];
    return array.pop();
}
