// simplified log4j levels
export var LOG_LEVELS;
(function (LOG_LEVELS) {
    LOG_LEVELS[LOG_LEVELS["OFF"] = 0] = "OFF";
    LOG_LEVELS[LOG_LEVELS["ERROR"] = 1] = "ERROR";
    LOG_LEVELS[LOG_LEVELS["WARN"] = 2] = "WARN";
    LOG_LEVELS[LOG_LEVELS["INFO"] = 3] = "INFO";
    LOG_LEVELS[LOG_LEVELS["DEBUG"] = 4] = "DEBUG";
})(LOG_LEVELS || (LOG_LEVELS = {}));
let _level = 0;

export function init_log_level(settings) {
    if (!settings)
        return () => { };
    _level = settings.get_uint('log-level');
    const id = settings.connect('changed::log-level', () => {
        _level = settings.get_uint('log-level');
    });
    return () => { if (id)
        settings.disconnect(id); };
}

/** parse level at runtime so we don't have to restart extension */
export function log_level() {
    return _level;
}

export function log(text) {
    console.log('o-tiling: ' + text);
}

export function error(text) {
    if (log_level() > LOG_LEVELS.OFF)
        console.error(`o-tiling: \x1b[31m[ERROR]\x1b[0m ${text}`);
}

export function warn(text) {
    if (log_level() > LOG_LEVELS.ERROR)
        console.warn(`o-tiling: \x1b[33m[WARN]\x1b[0m ${text}`);
}

export function info(text) {
    if (log_level() > LOG_LEVELS.WARN)
        console.log(`o-tiling: \x1b[32m[INFO]\x1b[0m ${text}`);
}

export function debug(text) {
    if (log_level() > LOG_LEVELS.INFO)
        console.log(`o-tiling: \x1b[36m[DEBUG]\x1b[0m ${text}`);
}
