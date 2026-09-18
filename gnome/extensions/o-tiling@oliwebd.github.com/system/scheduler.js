import * as log from '../utils/log.js';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
let _failed = false;
let _checked = false; // whether we've checked service existence
let _pending = false;
let _foreground = 0;

export function setForeground(win) {
    if (_failed)
        return;
    if (_pending)
        return;
    if (!_checked) {
        _checked = true;
        _pending = true;
        Gio.DBus.system.call('org.freedesktop.DBus', '/org/freedesktop/DBus', 'org.freedesktop.DBus', 'NameHasOwner', new GLib.Variant('(s)', ['com.system76.Scheduler']), null, Gio.DBusCallFlags.NONE, 500, null, (_conn, result) => {
            _pending = false;
            try {
                const reply = Gio.DBus.system.call_finish(result);
                const [owned] = reply.deep_unpack();
                if (!owned) {
                    _failed = true;
                }
                else {
                    setForeground(win);
                }
            }
            catch (e) {
                log.debug(`Scheduler DBus NameHasOwner check failed: ${e}`);
                _failed = true;
            }
        });
        return;
    }
    const pid = win.get_pid();
    if (!pid || _foreground === pid)
        return;
    _foreground = pid;
    try {
        Gio.DBus.system.call('com.system76.Scheduler', '/com/system76/Scheduler', 'com.system76.Scheduler', 'SetForegroundProcess', new GLib.Variant('(u)', [pid]), null, // expected reply type
        Gio.DBusCallFlags.NONE, -1, // default timeout
        null, // cancellable
        (_connection, result) => {
            try {
                Gio.DBus.system.call_finish(result);
            }
            catch (error) {
                errorHandler(error);
            }
        });
    }
    catch (error) {
        errorHandler(error);
    }
}

/** Call from extension disable() to release state. */
export function destroy() {
    _foreground = 0;
    _failed = false;
    _checked = false;
    _pending = false;
}
function errorHandler(error) {
    log.debug(`system76-scheduler may not be installed and running: ${error}`);
    _failed = true;
}
