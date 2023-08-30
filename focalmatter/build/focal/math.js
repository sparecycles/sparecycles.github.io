var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
define(["require", "exports"], function (require, exports) {
    var math;
    (function (math) {
        function sgn(x) {
            return x > 0 ? +1 : x < 0 ? -1 : 0;
        }
        math.sgn = sgn;
        function abs(x) {
            return x >= 0 ? x : -x;
        }
        math.abs = abs;
        var Point = (function () {
            function Point(x, y) {
                this.x = x;
                this.y = y;
            }
            Point.interpolate = function (p1, p2, t) {
                return new Point(p2.x * t + p1.x * (1 - t), p2.y * t + p1.y * (1 - t));
            };
            Point.prototype.unit = function () {
                var mag = this.mag();
                return mag == 0 ? this : this.mul(1 / mag);
            };
            Point.prototype.add = function (o) {
                var P = this;
                return new Point(P.x + o.x, P.y + o.y);
            };
            Point.prototype.neg = function () {
                return new Point(-this.x, -this.y);
            };
            Point.prototype.sub = function (o) {
                return new Point(this.x - o.x, this.y - o.y);
            };
            Point.prototype.to = function (o) {
                return o.sub(this).unit();
            };
            Point.prototype.mul = function (s) {
                return new Point(this.x * s, this.y * s);
            };
            Point.prototype.mag = function () {
                return Math.sqrt(this.mag2());
            };
            Point.prototype.mag2 = function () {
                return this.x * this.x + this.y * this.y;
            };
            Point.prototype.dist = function (o) {
                return o.sub(this).mag();
            };
            Point.prototype.dist2 = function (o) {
                return o.sub(this).mag2();
            };
            Point.prototype.toString = function () {
                var P = this;
                return this.x + "," + this.y;
            };
            Point.zero = new Point(0, 0);
            Point.up = new Point(0, -1);
            Point.down = new Point(0, +1);
            Point.left = new Point(-1, 0);
            Point.right = new Point(+1, 0);
            return Point;
        })();
        math.Point = Point;
        var Ray = (function () {
            function Ray(U, V, S, options) {
                options = options || {};
                var scale = Math.sqrt(U * U + V * V);
                U /= scale;
                V /= scale;
                S /= scale;
                this.scale = scale;
                this.U = U;
                this.V = V;
                this.S = S;
                this.t0 = 0;
                if (options.origin) {
                    this.origin = options.origin;
                    this.t0 = this.project_t(options.origin);
                }
            }
            Ray.fromTo = function (a, b) {
                return Ray.fromDirectionAndPoint(b.sub(a), a);
            };
            Ray.fromDirectionAndPoint = function (dir, point) {
                var D = dir;
                var P = point;
                return new Ray(D.y, -D.x, P.x * D.y + P.y * -D.x, { origin: P });
            };
            Ray.prototype.toString = function () {
                return "(" + this.at(0) + "-->" + this.direction() + ")";
            };
            Ray.prototype.value = function (point) {
                var P = point;
                var R = this;
                return P.x * R.U + P.y * R.V - R.S;
            };
            Ray.prototype.at = function (t) {
                var R = this;
                t += this.t0;
                return new Point(R.U * R.S - R.V * t, R.V * R.S + R.U * t);
            };
            Ray.prototype.direction = function () {
                var R = this;
                return new Point(-R.V, R.U);
            };
            Ray.prototype.project = function (point) {
                return this.at(this.project_t(point));
            };
            Ray.prototype.project_t = function (point) {
                var P = point;
                var R = this;
                return -R.V * P.x + R.U * P.y - R.t0;
            };
            Ray.prototype.transform = function (t, r) {
                var R = this;
                return R.at(t).add(new Point(R.U * r, R.V * r));
            };
            Ray.prototype.intercept = function (ray) {
                var R = this;
                var t = ((R.U * ray.U + R.V * ray.V) * R.S - ray.S) / (R.V * ray.U - R.U * ray.V) - this.t0;
                return t / this.scale;
            };
            return Ray;
        })();
        math.Ray = Ray;
        var Shape = (function () {
            function Shape(type) {
                this.type = type;
            }
            return Shape;
        })();
        math.Shape = Shape;
        var Circle = (function (_super) {
            __extends(Circle, _super);
            function Circle(c, r) {
                _super.call(this, Circle.type);
                this.c = c;
                this.r = r;
            }
            Circle.prototype.intersect = function (shape) {
                var isect = this['intersect$' + shape.type];
                if (isect) {
                    return isect.call(this, shape);
                }
                else {
                    throw new Error("Circle: intersect$" + shape.type + " not defined");
                }
            };
            Circle.prototype.intersect$circle = function (circle) {
                var result = {};
                var C1 = this;
                var C2 = circle;
                var distance2 = C1.c.dist2(C2.c);
                var d_radii = C1.r - C2.r;
                if (distance2 < d_radii * d_radii) {
                    result.type = 'concentric';
                    return result;
                }
                var radii = C1.r + C2.r;
                if (distance2 > radii * radii) {
                    result.type = 'distinct';
                    return result;
                }
                result.type = 'intersect';
                var r1_2 = C1.r * C1.r;
                var r2_2 = C2.r * C2.r;
                var space = result.space = Ray.fromDirectionAndPoint(Point.right, C1.c);
                var dc = space.project_t(C2.c);
                var m_x = (r1_2 - r2_2 + dc * dc) / (2 * dc);
                var root = r1_2 - m_x * m_x;
                if (root > 0) {
                    var height = Math.sqrt(root);
                    result.middle = m_x;
                    result.where = [space.transform(m_x, height), space.transform(m_x, -height)];
                }
                else {
                    var where = space.at(C1.r);
                    result.where = [space.transform(m_x, 0), space.transform(m_x, -0)];
                }
                return result;
            };
            Circle.prototype.eval = function (direction, height, flip) {
                var C = this;
                var sin = height / C.r;
                var cos = sin >= 1 ? 0 : Math.sqrt(1 - sin * sin);
                var center = C.c.add(direction.mul(cos * C.r));
                var d = direction.mul(height);
                var h = new Point(-d.y, d.x);
                if (flip)
                    h = h.neg();
                return [center.add(h), center.sub(h)];
            };
            Circle.prototype.intersects = function (ray) {
                var R = ray;
                var C = this;
                var e = R.value(C.c);
                if (C.r >= Math.abs(e)) {
                    var t = R.project_t(C.c);
                    var dt = Math.sqrt(C.r * C.r - e * e);
                    return [t - dt, t + dt];
                }
            };
            Circle.type = "circle";
            return Circle;
        })(Shape);
        math.Circle = Circle;
    })(math || (math = {}));
    exports["default"] = math;
});
