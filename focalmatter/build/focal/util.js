define(["require", "exports"], function (require, exports) {
    function memoize_number(fn) {
        var memory = {};
        return function (n) {
            var m = memory[n];
            if (m !== undefined) {
                return m;
            }
            return memory[n] = fn(n);
        };
    }
    exports.memoize_number = memoize_number;
    function memoize_string(fn) {
        var memory = {};
        return function (n) {
            var m = memory[n];
            if (m !== undefined) {
                return m;
            }
            return memory[n] = fn(n);
        };
    }
    exports.memoize_string = memoize_string;
});
