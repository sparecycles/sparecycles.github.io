/*
 * Color        Frequency       Wavelength
 * violet       668–789 THz     380–450 nm
 * blue         606–668 THz     450–495 nm
 * green        526–606 THz     495–570 nm
 * yellow       508–526 THz     570–590 nm
 * orange       484–508 THz     590–620 nm
 * red          400–484 THz     620–750 nm
 */
define(["require", "exports", './focal/math', './focal/light', './focal/element', './focal/material', './focal/optic'], function (require, exports, math_1, light_1, element_1, material_1, optic_1) {
    var elements = [];
    var opticalSystem;
    function makePaper(id) {
        var paper = new Raphael(id);
        paper.setViewBox(-10, -20, 40, 70, false);
        return paper;
    }
    var draw = {};
    function render(paper, direction, wavelength, step, offset) {
        step = step || 1;
        offset = offset || 0;
        offset *= step;
        for (var i = 20 + offset; i >= -20; i -= step) {
            var ray = math_1["default"].Ray.fromDirectionAndPoint(direction.unit(), new math_1["default"].Point(-10, -i));
            var result = [];
            var complete = opticalSystem.trace(new optic_1.Photon(ray, wavelength), function (photon) {
                result.push(photon);
            });
            if (complete && result.length) {
                var last = result[result.length - 1];
                var stroke = paper.path(Raphael.fullfill("M{ray.origin}" +
                    result.map(function (photon) {
                        return Raphael.fullfill("L{origin}", photon.ray);
                    }).join("") +
                    "L{next}", {
                    ray: ray,
                    next: last.ray.at(100)
                }));
                stroke.attr('stroke-width', '.4');
                stroke.attr('stroke', light_1["default"].rgbFromWavelength(wavelength));
            }
        }
    }
    function drawLight(angle, dy) {
        draw.light.clear();
        [angle].forEach(function (angle) {
            render(draw.light, new math_1["default"].Point(1, angle), 400, 1, 0.0);
            render(draw.light, new math_1["default"].Point(1, angle), 500, 1, 0.0);
            render(draw.light, new math_1["default"].Point(1, angle), 600, 1, 0.0);
        });
    }
    var drawTasks = null;
    function postRedraw() {
        if (!drawTasks) {
            drawTasks = {};
            requestAnimationFrame(function () {
                var tasks = drawTasks;
                drawTasks = null;
                doRedraw(tasks);
            });
        }
        return drawTasks;
    }
    var scene = {};
    function redrawOptic(components) {
        postRedraw().optic = true;
        scene.components = components;
    }
    function computeFocalPlane(elements) {
    }
    function redrawLight(angle, dy) {
        postRedraw().light = true;
        scene.light = { angle: angle, dy: dy };
    }
    function doRedraw(tasks) {
        if (tasks.optic) {
            scene.groups = element_1["default"].Group.balsam(scene.components);
            var surfaces = [];
            scene.groups.forEach(function (group) { return group.build(surfaces); });
            opticalSystem = new optic_1.Optic(surfaces);
            drawOptic(scene.groups);
            tasks.light = true;
        }
        if (tasks.light && opticalSystem) {
            drawLight(scene.light.angle, scene.light.dy);
        }
    }
    function drawOptic(elements) {
        draw.paper.clear();
        elements.forEach(function (element) {
            var path = element.draw(draw.paper);
        });
    }
    function onDocumentParsed() {
        var colors = document.createElement("div");
        document.body.appendChild(colors);
        for (var wv = 350; wv <= 800; wv += 10) {
            var div = document.createElement("div");
            div.style.display = "inline-block";
            div.style.background = light_1["default"].rgbFromWavelength(wv);
            div.style.width = "5px";
            div.style.height = "30px";
            colors.appendChild(div);
        }
        draw.paper = makePaper("paper");
        draw.light = makePaper("light");
        window.addEventListener("mousemove", function (event) {
            var y = (event.clientY - window.innerHeight / 2) / window.innerHeight;
            redrawLight(y, 0);
        });
        document.getElementById('lens').addEventListener('change', update);
        update.call(document.getElementById('lens'));
        console.log("onDocumentParsed");
    }
    function parse(text) {
        var components = [];
        var x = 0;
        var unparsed = text.replace(/\s*\(([^\)]*)\)\s*/g, function (match, command) {
            var words = command.split(/\s+/);
            var depth = Number(words[1]);
            switch (words[0]) {
                case 'element':
                    var info = {
                        radius: [Number(words[2]), Number(words[3])],
                        front: x,
                        depth: depth,
                        material: material_1["default"].Material.Glass.Schott(words[4]),
                        height: words[5] ? Number(words[5]) : null
                    };
                    components.push(new element_1["default"].Element(info));
                    break;
                case 'air':
                    break;
                case 'stop':
                    var height = Number(words[2]);
                    components.push(new element_1["default"].Aperture([
                        new math_1["default"].Point(x, -height),
                        new math_1["default"].Point(x, +height)
                    ]));
                    break;
            }
            if (depth) {
                x += depth;
            }
            return "";
        });
        if (unparsed)
            throw unparsed;
        return components;
    }
    console.log("dom load blah");
    switch (document.readyState) {
        case 'loading':
            window.addEventListener("DOMContentLoaded", onDocumentParsed);
            break;
        case 'interactive':
        case 'complete':
        default:
            onDocumentParsed();
            break;
    }
    function update() {
        var textarea = this;
        var text = textarea.value;
        try {
            scene.components = parse(text);
            postRedraw().optic = true;
        }
        catch (ex) {
        }
    }
});
