define(["require", "exports", './math', './material', './optic'], function (require, exports, math_1, material_1, optic_1) {
    var Material = material_1["default"].Material;
    var element;
    (function (element_1) {
        var Group = (function () {
            function Group(elements) {
                this.elements = elements;
            }
            Group.balsam = function (components) {
                var groups = [];
                var group = [];
                var lastElement;
                function addToGroup(component) {
                    if (component instanceof Element && (group.length == 0 || lastElement &&
                        lastElement.back === component.front
                        && lastElement.r2 === -component.r1)) {
                        group.push(lastElement = component);
                    }
                    else {
                        lastElement = null;
                        if (group.length) {
                            groups.push(new Group(group));
                            group = [];
                        }
                        if (component instanceof Element) {
                            addToGroup(component);
                        }
                        else {
                            groups.push(component);
                        }
                    }
                }
                components.forEach(function (component) {
                    addToGroup(component);
                });
                if (group.length) {
                    groups.push(new Group(group));
                }
                return groups;
            };
            Group.prototype.build = function (surfaces) {
                for (var i = 0; i < this.elements.length; i++) {
                    var element = this.elements[i];
                    surfaces.push(new optic_1.SphericalSurface(element.frontSurface()));
                }
                surfaces.push(new optic_1.SphericalSurface(element.rearSurface()));
            };
            Group.prototype.draw = function (paper) {
                this.elements.forEach(function (element) { return element.draw(paper); });
            };
            return Group;
        })();
        element_1.Group = Group;
        var Element = (function () {
            function Element(info) {
                var radius = info.radius;
                if (typeof radius === 'number') {
                    radius = [radius, radius];
                }
                var r1 = this.r1 = radius[0];
                var r2 = this.r2 = radius[1];
                var front = this.front = info.front;
                var back = this.back = front + info.depth;
                var c1 = this.c1 = front + r1;
                var c2 = this.c2 = back - r2;
                this.material = info.material;
                this.surfaces = [this.frontSurface(), this.rearSurface()];
                if (info.extents) {
                    this.extents = info.extents;
                }
                else {
                    var forward = new math_1["default"].Point(-1, 0);
                    var backward = forward.neg();
                    if (info.height != null) {
                        var height = info.height;
                        if (typeof height === 'number') {
                            height = [height, height];
                        }
                        this.height = height;
                        this.extents = [
                            this.surfaces[0].circle.eval(r1 > 0 ? forward : backward, height[0], r1 < 0),
                            this.surfaces[1].circle.eval(r2 < 0 ? forward : backward, height[1], r2 < 0)
                        ];
                    }
                    else {
                        var intersection = this.surfaces[0].circle.intersect(this.surfaces[1].circle);
                        switch (intersection.type) {
                            case 'concentric':
                            case 'distinct':
                                this.extents = [
                                    this.surfaces[0].circle.eval(r1 > 0 ? forward : backward, this.surfaces[0].circle.r, r1 < 0),
                                    this.surfaces[1].circle.eval(r2 < 0 ? forward : backward, this.surfaces[1].circle.r, r2 < 0),
                                ];
                                break;
                            case 'intersect':
                                this.extents = [intersection.where, intersection.where];
                                this.extents[1] = [this.extents[1][1], this.extents[1][0]];
                                break;
                        }
                    }
                }
            }
            Element.prototype.frontSurface = function () {
                return {
                    circle: new math_1["default"].Circle(new math_1["default"].Point(this.c1, 0), Math.abs(this.r1)),
                    material: this.material || Material.Air,
                    front: this.r1 > 0,
                    negative: this.r1 < 0 ? 1 : 0,
                    height: this.height && this.height[0]
                };
            };
            Element.prototype.rearSurface = function () {
                return {
                    circle: new math_1["default"].Circle(new math_1["default"].Point(this.c2, 0), Math.abs(this.r2)),
                    material: Material.Air,
                    front: this.r2 < 0,
                    negative: this.r2 < 0 ? 1 : 0,
                    height: this.height && this.height[1]
                };
            };
            Element.prototype.build = function (surfaces) {
                surfaces.push(new optic_1.SphericalSurface(this.frontSurface()));
                surfaces.push(new optic_1.SphericalSurface(this.rearSurface()));
            };
            Element.prototype.draw = function (paper) {
                var path_string = Raphael.fullfill("M{extents.0.0} " +
                    "A{surfaces.0.circle.r},{surfaces.0.circle.r} 0 0,{surfaces.0.negative} {extents.0.1}" +
                    "L{extents.1.0} " +
                    "A{surfaces.1.circle.r},{surfaces.1.circle.r} 0 0,{surfaces.1.negative} {extents.1.1}" +
                    "Z", this);
                try {
                    var path = paper.path(path_string);
                    path.attr("fill", '#999');
                    path.attr("stroke", "blue");
                    path.attr("stroke-width", ".5");
                    path.attr("opacity", ".5");
                    return path;
                }
                catch (ex) {
                    console.log(path_string);
                    debugger;
                }
            };
            return Element;
        })();
        element_1.Element = Element;
        var Aperture = (function () {
            function Aperture(extents) {
                this.extents = extents;
            }
            Aperture.prototype.draw = function (paper) {
                var path_string = Raphael.fullfill("M{extents.0} " +
                    "L{extents.1} " +
                    "Z", this);
                try {
                    var path = paper.path(path_string);
                    path.attr('stroke-width', '1');
                    return path;
                }
                catch (ex) {
                    console.log(path_string);
                    debugger;
                }
            };
            Aperture.prototype.build = function (surfaces) {
                surfaces.push(new optic_1.Stop(this.extents));
            };
            return Aperture;
        })();
        element_1.Aperture = Aperture;
    })(element || (element = {}));
    exports["default"] = element;
});
