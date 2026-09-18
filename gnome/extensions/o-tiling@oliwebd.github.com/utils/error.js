export class Error {
    reason;
    cause = null;
    constructor(reason) {
        this.reason = reason;
    }
    context(why) {
        const error = new Error(why);
        error.cause = this;
        return error;
    }
    *chain() {
        let current = this;
        while (current != null) {
            yield current;
            current = current.cause;
        }
    }
    format() {
        const causes = this.chain();
        let buffer = causes.next().value.reason;
        for (const error of causes) {
            buffer += `\n    caused by: ` + error.reason;
        }
        return buffer + `\n`;
    }
}
