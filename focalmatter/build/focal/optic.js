define(["require", "exports", './math'], function (require, exports, math_1) {
    var Photon = (function () {
        function Photon(ray, wavelength, index, intensity) {
            if (index === void 0) { index = 1; }
            if (intensity === void 0) { intensity = 1; }
            this.ray = ray;
            this.wavelength = wavelength;
            this.index = index;
            this.intensity = intensity;
        }
        return Photon;
    })();
    exports.Photon = Photon;
    var SphericalSurface = (function () {
        function SphericalSurface(info) {
            this.info = info;
        }
        SphericalSurface.refract = function (ray, circle, height, intersection_point, out_p, index) {
            var R = ray;
            var P = intersection_point;
            if (Math.abs(P.y) > height) {
                return null;
            }
            var ray_direction = R.direction();
            var circle_direction = P.sub(circle.c).unit();
            if (out_p) {
                circle_direction = circle_direction.neg();
            }
            var incidence_sin = ray_direction.x * circle_direction.y - ray_direction.y * circle_direction.x;
            var refraction_sin = -incidence_sin * index;
            if (Math.abs(refraction_sin) > 1) {
                return null;
            }
            var refraction_direction = new math_1["default"].Point(-circle_direction.x, -circle_direction.y);
            var angle = new math_1["default"].Point(Math.sqrt(1 - refraction_sin * refraction_sin), refraction_sin);
            refraction_direction = new math_1["default"].Point(angle.x * refraction_direction.x + angle.y * refraction_direction.y, -angle.y * refraction_direction.x + angle.x * refraction_direction.y);
            return math_1["default"].Ray.fromDirectionAndPoint(refraction_direction, P);
        };
        SphericalSurface.prototype.trace = function (photon) {
            var intersect = this.info.circle.intersects(photon.ray);
            if (!intersect) {
                return null;
            }
            var index = this.info.material.index(photon.wavelength);
            var factor = photon.index / index;
            var ray = photon.ray;
            ray = SphericalSurface.refract(ray, this.info.circle, this.info.height, ray.at(intersect[this.info.front ? 0 : 1]), !this.info.front, factor);
            if (ray == null) {
                return null;
            }
            return [new Photon(ray, photon.wavelength, index, photon.intensity)];
        };
        return SphericalSurface;
    })();
    exports.SphericalSurface = SphericalSurface;
    var Stop = (function () {
        function Stop(extents) {
            this.segment = math_1["default"].Ray.fromTo(extents[0], extents[1]);
        }
        Stop.prototype.trace = function (photon) {
            var intercept = this.segment.intercept(photon.ray);
            if (intercept > 0 && intercept < 1) {
                return [photon];
            }
            return [];
        };
        return Stop;
    })();
    exports.Stop = Stop;
    var Optic = (function () {
        function Optic(surfaces) {
            this.surfaces = surfaces;
        }
        Optic.prototype.trace = function (photon, tracer) {
            for (var index = 0; index < this.surfaces.length; index++) {
                var photons = this.surfaces[index].trace(photon, tracer);
                photon = photons && photons[0];
                if (!photon) {
                    break;
                }
                tracer && tracer(photon);
            }
            return photon && [photon];
        };
        return Optic;
    })();
    exports.Optic = Optic;
});
