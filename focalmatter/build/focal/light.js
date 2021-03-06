define(["require", "exports", './util'], function (require, exports, util_1) {
    var light;
    (function (light) {
        light.StandardWavelengths = {
            d: 587.6,
            F: 486.1,
            C: 656.3,
            i: 365.0,
            t: 1014.0
        };
        light.colorFromWavelength = util_1.memoize_number(function (wavelength) {
            // these numbers were determined experimentally to look nice.
            var blue = [[425, 540, 1, 1]];
            var green = [[530, 740, 1 / 1.3, 1]];
            var red = [[630, 800, 1 / 2, 1], [380, 420, 1, .3]];
            function factor(data) {
                var sum = 0;
                data.forEach(function (c) {
                    var x = (wavelength - c[0]) / (c[1] - c[0]);
                    sum += Math.pow(Math.exp(-Math.PI * x * x), c[2]) * c[3];
                });
                return sum;
            }
            var rgb = [factor(red), factor(green), factor(blue)];
            var max = Math.max(rgb[0], rgb[1], rgb[2]);
            if (max > 1) {
                rgb[0] /= max;
                rgb[1] /= max;
                rgb[2] /= max;
            }
            return rgb.map(function (factor) {
                return Math.min(Math.max(Math.min(factor, 1), 0) * 256 | 0, 255);
            });
        });
        function rgbFromWavelength(wavelength) {
            return "rgb(" + light.colorFromWavelength(wavelength).join(',') + ")";
        }
        light.rgbFromWavelength = rgbFromWavelength;
        function DeAbbe(info) {
            var A = (info.nd - 1) / info.vd / (1 / light.StandardWavelengths.F - 1 / light.StandardWavelengths.C);
            var B = info.nd - A / light.StandardWavelengths.d;
            return function (u) {
                return A / u + B;
            };
        }
        function indexForSellmeierDispersion(info) {
            var B1 = info.B[0], B2 = info.B[1], B3 = info.B[2], C1 = info.C[0], C2 = info.C[1], C3 = info.C[2];
            return util_1.memoize_number(function (w) {
                var w2 = w * w * (1 / 1000000), n2 = 1
                    + (B1 * w2) / (w2 - C1)
                    + (B2 * w2) / (w2 - C2)
                    + (B3 * w2) / (w2 - C3);
                var index = Math.sqrt(n2);
                return index;
            });
        }
        light.indexForSellmeierDispersion = indexForSellmeierDispersion;
        function indexForStandardDispersion(data) {
            var nd = data.nd, vd;
            nd = data.nd;
            if (data.vd != null) {
                vd = data.vd;
            }
            else if (data.nF != null && data.nC != null) {
                vd = (data.nd - 1) / (data.nF - data.nC);
            }
            return util_1.memoize_number(DeAbbe({ nd: nd, vd: vd }));
        }
        light.indexForStandardDispersion = indexForStandardDispersion;
    })(light || (light = {}));
    exports["default"] = light;
});
