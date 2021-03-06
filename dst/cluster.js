"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var d3 = require("d3");
var vis_1 = require("./vis");
var ClusterVis = /** @class */ (function (_super) {
    __extends(ClusterVis, _super);
    function ClusterVis() {
        var _this_1 = _super !== null && _super.apply(this, arguments) || this;
        _this_1.visType = "cluster";
        _this_1.imageSize = 48;
        _this_1.showEdges = false;
        _this_1.showProxies = false;
        _this_1.showUserEdges = false;
        _this_1.level = 0;
        _this_1.graph = {
            links: [],
            nodeMap: {},
            nodes: [],
            proxieLinks: [],
            userLinks: [],
            userProxyLinks: [],
        };
        _this_1.helpData = [];
        return _this_1;
    }
    ClusterVis.prototype.zoom = function (_this) {
        this.container.selectAll("#tooltip").remove();
        _this.canvasTransform = d3.event.transform;
        this.paint();
    };
    ClusterVis.prototype.hitTest = function (x, y) {
        for (var _i = 0, _a = this.graph.nodes; _i < _a.length; _i++) {
            var node = _a[_i];
            var dist = Math.sqrt(Math.pow(x - (node.x * this.canvasTransform.k + this.canvasTransform.x), 2)
                + Math.pow(y - (node.y * this.canvasTransform.k + this.canvasTransform.y), 2));
            if (dist <= node.r * this.canvasTransform.k) {
                return node;
            }
        }
        return false;
    };
    ClusterVis.prototype.build = function (data, centralNode) {
        var _this_1 = this;
        this.paintCluster = data.cluster;
        this.paintNodes = data.nodes;
        this.paintEdges = data.edges;
        this.paintCentralNode = centralNode;
        this.canvas = this.container.append("canvas");
        this.ctx = this.canvas.node().getContext("2d");
        this.zoomObj = d3.zoom()
            .scaleExtent([0.1, 8])
            .on("zoom", function () { _this_1.zoom(_this_1); });
        this.outerSvg = this.container.append("svg")
            .call(this.zoomObj);
        var defs = this.outerSvg.append("defs");
        defs.append("clipPath")
            .attr("id", "userClip")
            .append("circle")
            .attr("cx", this.imageSize / 2)
            .attr("cy", this.imageSize / 2)
            .attr("r", (this.imageSize - 4) / 2)
            .style("fill", "black");
        this.svg = this.outerSvg.append("g");
        this.edgeToggle = this.outerSvg.append("g")
            .attr("id", "cluster-vis-showEdges-toggle")
            .on("click", function () {
            if (_this_1.showEdges) {
                edgeToggleG.select("text")
                    .html(browser.i18n.getMessage("visClusterToggleOff"));
            }
            else {
                edgeToggleG.select("text")
                    .html(browser.i18n.getMessage("visClusterToggleOn"));
            }
            _this_1.showEdges = !_this_1.showEdges;
            if (_this_1.showEdges) {
                _this_1.showUserEdges = false;
            }
            _this_1.edgeToggle.classed("active", _this_1.showEdges);
            _this_1.paint();
        });
        var edgeToggleG = this.edgeToggle.append("g");
        edgeToggleG.append("image")
            .attr("class", "cluster-vis-showEdges-normal")
            .attr("width", 51)
            .attr("height", 33)
            .attr("xlink:href", "../assets/images/vis--cluster--showEdges-normal@2x.png");
        edgeToggleG.append("image")
            .attr("class", "cluster-vis-showEdges-active")
            .attr("width", 51)
            .attr("height", 33)
            .attr("xlink:href", "../assets/images/vis--cluster--showEdges-active@2x.png");
        edgeToggleG.append("text")
            .attr("text-anchor", "end")
            .attr("transform", "translate(-4, 20)")
            .html(browser.i18n.getMessage("visClusterToggleOff"));
        this.proxyToggle = this.outerSvg.append("g")
            .attr("id", "cluster-vis-showProxies-toggle")
            .on("click", function () {
            if (_this_1.showProxies) {
                proxyToggleG.select("text")
                    .html(browser.i18n.getMessage("visProxiesToggleOff"));
            }
            else {
                proxyToggleG.select("text")
                    .html(browser.i18n.getMessage("visProxiesToggleOn"));
            }
            _this_1.showProxies = !_this_1.showProxies;
            _this_1.proxyToggle.classed("active", _this_1.showProxies);
            _this_1.paint();
        });
        var proxyToggleG = this.proxyToggle.append("g");
        proxyToggleG.append("image")
            .attr("class", "cluster-vis-showProxies-normal")
            .attr("width", 51)
            .attr("height", 33)
            .attr("xlink:href", "../assets/images/vis--cluster--showProxies-normal@2x.png");
        proxyToggleG.append("image")
            .attr("class", "cluster-vis-showProxies-active")
            .attr("width", 51)
            .attr("height", 33)
            .attr("xlink:href", "../assets/images/vis--cluster--showProxies-active@2x.png");
        proxyToggleG.append("text")
            .attr("text-anchor", "end")
            .attr("transform", "translate(-4, 23)")
            .html(browser.i18n.getMessage("visProxiesToggleOff"));
        this.resize(true);
        this.buildLevel0();
    };
    ClusterVis.prototype.buildLevel0 = function () {
        var _this_1 = this;
        this.svg.selectAll("*").remove();
        this.edgeToggle.classed("invisible", true);
        this.proxyToggle.classed("invisible", true);
        this.outerSvg.on("click", null);
        // generate first level data
        var clusterCounts = {};
        this.paintNodes.forEach(function (node) {
            var clusterGroupId = node[6][_this_1.clusterId];
            if (!(clusterGroupId in clusterCounts)) {
                clusterCounts[clusterGroupId] = 0;
            }
            clusterCounts[clusterGroupId] += 1;
        });
        // centroid user icon
        var centerGroup = this.svg.append("g")
            .attr("class", "centerGroup")
            .attr("transform", "translate(" + this.width / 2 + ", " + this.height / 2 + ")");
        centerGroup.append("image")
            .attr("transform", "translate(-" + this.imageSize / 2 + ", -" + this.imageSize / 2 + ")")
            .attr("xlink:href", this.paintCentralNode.image)
            .style("width", this.imageSize)
            .style("height", this.imageSize)
            .attr("clip-path", "url(#userClip)");
        centerGroup.append("circle")
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("r", this.imageSize / 2 + 2)
            .style("fill", "transparent")
            .style("stroke", "rgba(0,0,0,0.2)");
        var clusters = Object.keys(this.paintCluster[this.clusterId].clusters);
        // position the cluster evenly in a circle around the centroid
        var radius = this.height / 4;
        var theta = 2 * Math.PI / clusters.length;
        // calc cluster positions
        var clusterPos = {};
        // get min and max number of nodes in cluster
        var max = 0;
        var min = Number.MAX_VALUE;
        // get min and max number of edges between cluster
        var eMax = 0;
        var eMin = Number.MAX_VALUE;
        var edgeList = [];
        clusters.forEach(function (cluster, i) {
            if (clusterCounts[cluster] > max) {
                max = clusterCounts[cluster];
            }
            if (clusterCounts[cluster] < min) {
                min = clusterCounts[cluster];
            }
            clusterPos[cluster] = [
                radius * Math.cos(i * theta),
                radius * Math.sin(i * theta),
            ];
            clusters.forEach(function (eCluster) {
                if (eCluster in _this_1.paintCluster[_this_1.clusterId].clusters[cluster].edges) {
                    var eCount = _this_1.paintCluster[_this_1.clusterId].clusters[cluster].edges[eCluster][0];
                    if (eCount > eMax) {
                        eMax = eCount;
                    }
                    if (eCount < eMin) {
                        eMin = eCount;
                    }
                    if (cluster !== eCluster && cluster < eCluster) {
                        edgeList.push([cluster, eCluster, eCount]);
                    }
                }
            });
        });
        var clusterScale = d3.scaleLinear().domain([min, max]).range([20, 40]);
        var edgeScale = d3.scaleLinear().domain([eMin, eMax]).range([1, 20]);
        // draw edges
        centerGroup.selectAll("line").data(edgeList).enter().append("line")
            .attr("x1", function (d) { return clusterPos[d[0]][0]; })
            .attr("x2", function (d) { return clusterPos[d[1]][0]; })
            .attr("y1", function (d) { return clusterPos[d[0]][1]; })
            .attr("y2", function (d) { return clusterPos[d[1]][1]; })
            .style("stroke", "rgba(0,0,0,0.3)")
            .style("stroke-width", function (d) { return edgeScale(d[2]); });
        // draw cluster circles
        var clusterGroups = centerGroup.selectAll("g").data(clusters).enter()
            .append("g")
            .attr("transform", function (d) { return "translate(" + clusterPos[d].join(",") + ")"; });
        clusterGroups.append("circle")
            .style("fill", function (d) { return _this_1.paintCluster[_this_1.clusterId].clusters[d].color; })
            .style("stroke", "none")
            .attr("r", function (d) { return clusterScale(clusterCounts[d]); });
        clusterGroups.append("text")
            .attr("transform", function (d) { return "translate(0," + (clusterScale(clusterCounts[d]) + 15) + ")"; })
            .attr("text-anchor", "middle")
            .text(function (d) { return _this_1.paintCluster[_this_1.clusterId].clusters[d].name; });
        clusterGroups.on("click", function (d) {
            _this_1.buildLevel1(d);
        });
        // Create the legend
        // TODO: Move legend to lower right
        var legendWidth = clusterScale(max) * 2;
        var legend = this.svg.append("g")
            .attr("transform", "translate(20,20)");
        var legendY = 20;
        legend.append("text")
            .text("Number of connections:")
            .attr("transform", "translate(0,0)");
        legend.append("line")
            .style("stroke", "black")
            .style("stroke-width", edgeScale(eMin))
            .attr("x1", 0)
            .attr("x2", legendWidth)
            .attr("y1", legendY)
            .attr("y2", legendY);
        legend.append("text")
            .attr("dy", 5)
            .style("font-size", 10)
            .text(eMin)
            .attr("transform", "translate(" + (legendWidth + 5) + ", " + legendY + ")");
        legendY += 20;
        legend.append("line")
            .style("stroke", "black")
            .style("stroke-width", edgeScale(eMax))
            .attr("x1", 0)
            .attr("x2", legendWidth)
            .attr("y1", legendY)
            .attr("y2", legendY);
        legend.append("text")
            .text(eMax)
            .attr("dy", 5)
            .style("font-size", 10)
            .attr("transform", "translate(" + (legendWidth + 5) + ", " + legendY + ")");
        legendY += 40;
        legend.append("text")
            .text("Number of Users:")
            .attr("transform", "translate(0," + legendY + ")");
        legend.append("circle")
            .attr("transform", "translate(0," + legendY + ")")
            .style("fill", "black")
            .attr("r", clusterScale(min))
            .attr("cx", legendWidth / 2)
            .attr("cy", legendWidth / 2);
        legend.append("text")
            .attr("dy", legendWidth / 2 + 5)
            .style("font-size", 10)
            .text(min)
            .attr("transform", "translate(" + (legendWidth + 5) + ", " + legendY + ")");
        legendY += 25 + clusterScale(min) * 2;
        legend.append("circle")
            .attr("transform", "translate(0," + legendY + ")")
            .style("fill", "black")
            .attr("r", clusterScale(max))
            .attr("cx", legendWidth / 2)
            .attr("cy", legendWidth / 2);
        legend.append("text")
            .text(max)
            .attr("dy", legendWidth / 2 + 5)
            .style("font-size", 10)
            .attr("transform", "translate(" + (legendWidth + 5) + ", " + legendY + ")");
    };
    ClusterVis.prototype.resetCluster = function () {
        this.svg.selectAll("*").remove();
        this.edgeToggle.classed("invisible", false);
        this.edgeToggle.classed("active", false);
        this.showEdges = false;
        this.proxyToggle.classed("invisible", false);
        this.proxyToggle.classed("active", false);
        this.showProxies = false;
        this.outerSvg.call(this.zoomObj.transform, d3.zoomIdentity);
        this.graph = {
            links: [],
            nodeMap: {},
            nodes: [],
            proxieLinks: [],
            userLinks: [],
            userProxyLinks: [],
        };
    };
    ClusterVis.prototype.setupClick = function () {
        var _this_1 = this;
        this.outerSvg.on("click", function () {
            if (_this_1.level > 0) {
                var x = d3.event.pageX;
                var y = d3.event.pageY;
                var hit_1 = _this_1.hitTest(x, y);
                if (hit_1 && hit_1[1] !== "cluster") {
                    var color = "#555555";
                    _this_1.showUserEdges = true;
                    _this_1.showEdges = false;
                    _this_1.graph.userLinks = [];
                    _this_1.graph.userProxyLinks = [];
                    _this_1.graph.links.forEach(function (link) {
                        if (link.source[0] === hit_1[0] || link.target[0] === hit_1[0]) {
                            _this_1.graph.userLinks.push(link);
                        }
                    });
                    _this_1.graph.proxieLinks.forEach(function (link) {
                        if (link.source === hit_1.index || link.target === hit_1.index) {
                            _this_1.graph.userProxyLinks.push(link);
                        }
                    });
                    if ("color" in hit_1) {
                        color = hit_1.color;
                    }
                    _this_1.tooltip(hit_1, hit_1.x * _this_1.canvasTransform.k + _this_1.canvasTransform.x, hit_1.y * _this_1.canvasTransform.k + _this_1.canvasTransform.y, color, [{
                            callback: function (d) {
                                _this_1.container.selectAll("#tooltip").remove();
                                _this_1.buildLevel2(d);
                            },
                            label: "Show connections to this user &raquo;",
                        }]);
                    _this_1.paint();
                }
                else {
                    _this_1.container.selectAll("#tooltip").remove();
                }
            }
        });
    };
    ClusterVis.prototype.setupSimulation = function (selector) {
        var _this_1 = this;
        this.simulation = d3.forceSimulation()
            .force("link", d3.forceLink().id(function (d) { return d[0]; }))
            .force("charge", d3.forceManyBody().strength(-250)) // modify in order to reduce outlier rockets
            .force("collide", d3.forceCollide().radius(function (d) { return d.r + 20; }).iterations(2))
            .force("center", d3.forceCenter(this.width / 2, this.height / 2 + 20));
        var rScale = d3.scaleLinear().range([5, this.imageSize / 4]).domain(d3.extent(this.graph.nodes, selector));
        this.graph.nodes.forEach(function (node) {
            var r = 20;
            if (13 in node) {
                r = rScale(selector(node));
            }
            node.r = r;
        });
        var ticked = function () {
            _this_1.paint();
        };
        this.simulation
            .nodes(this.graph.nodes)
            .on("tick", ticked);
        this.simulation.force("link")
            .links(this.graph.links);
    };
    ClusterVis.prototype.buildLevel1 = function (detailId) {
        var _this_1 = this;
        this.resetCluster();
        this.setupClick();
        this.level = 1;
        var clusterMap = {};
        var emptyCluster = 0;
        var clusters = Object.keys(this.paintCluster[this.clusterId].clusters);
        clusters.forEach(function (cluster) {
            if (cluster.toString() === detailId.toString() ||
                _this_1.paintCluster[_this_1.clusterId].clusters[cluster].edges[cluster][0] === 0) {
                emptyCluster += 1;
            }
        });
        var theta = 2 * Math.PI / (clusters.length - emptyCluster);
        var radius = this.height;
        if (radius > this.width) {
            radius = this.width;
        }
        radius = radius / 2 - 70;
        this.paintNodes.forEach(function (node) {
            if (node[6][_this_1.clusterId][0].toString() === detailId.toString()) {
                if (node[14] !== undefined && node[14] !== null) {
                    var img = document.createElement("img");
                    img.onerror = function (event) {
                        event.path[0].src = "../assets/images/twitter_default_profile_normal.png";
                    };
                    img.onload = function (event) {
                        node.imageLoad = true;
                    };
                    img.width = _this_1.imageSize;
                    img.height = _this_1.imageSize;
                    node.imageLoad = false;
                    node.image = img;
                    img.src = node[14];
                }
                _this_1.graph.nodes.push(node);
                _this_1.graph.nodeMap[node[0]] = _this_1.graph.nodes.length - 1;
            }
        });
        var idOffset = 1000000000;
        var ci = 0;
        clusters.forEach(function (cluster) {
            if (cluster.toString() !== detailId.toString()
                && _this_1.paintCluster[_this_1.clusterId].clusters[cluster].edges[cluster][0] > 0) {
                var clusterTempId = idOffset + parseInt(cluster.toString(), 10);
                _this_1.graph.nodes.push({
                    0: clusterTempId,
                    1: "cluster",
                    2: _this_1.paintCluster[_this_1.clusterId].clusters[cluster].name,
                    color: _this_1.paintCluster[_this_1.clusterId].clusters[cluster].color,
                    fixed: true,
                    fx: radius * Math.cos(ci * theta) + _this_1.width / 2,
                    fy: radius * Math.sin(ci * theta) + _this_1.height / 2,
                    r: 20,
                });
                clusterMap[cluster] = clusterTempId;
                _this_1.graph.nodeMap[clusterTempId] = _this_1.graph.nodes.length - 1;
                ci += 1;
            }
        });
        var clusterEdgeMap = {};
        this.paintEdges.forEach(function (edge) {
            var sourceCluster = _this_1.paintNodes[edge[0]][6][_this_1.clusterId][0];
            var targetCluster = _this_1.paintNodes[edge[1]][6][_this_1.clusterId][0];
            if (sourceCluster.toString() === detailId.toString() &&
                targetCluster.toString() === detailId.toString()) {
                if (edge[2] >= 2) {
                    _this_1.graph.links.push({
                        source: edge[0],
                        target: edge[1],
                    });
                }
                else {
                    _this_1.graph.proxieLinks.push({
                        source: _this_1.graph.nodeMap[edge[0]],
                        target: _this_1.graph.nodeMap[edge[1]],
                    });
                }
            }
            else if (sourceCluster.toString() === detailId.toString() ||
                targetCluster.toString() === detailId.toString()) {
                var foreignId = edge[1];
                var nodeId = edge[0];
                if (targetCluster.toString() === detailId.toString()) {
                    foreignId = edge[0];
                    nodeId = edge[1];
                }
                var foreignMappedIndex = clusterMap[_this_1.paintNodes[foreignId][6][_this_1.clusterId][0]];
                var edgeIndex = nodeId + "-" + foreignMappedIndex;
                if (edge[2] >= 2) {
                    if (!(edgeIndex in clusterEdgeMap)) {
                        clusterEdgeMap[edgeIndex] = 1;
                        _this_1.graph.links.push({
                            source: nodeId,
                            target: foreignMappedIndex,
                        });
                    }
                    else {
                        clusterEdgeMap[edgeIndex] += 1;
                    }
                }
                else {
                    if (!(edgeIndex in clusterEdgeMap)) {
                        clusterEdgeMap[edgeIndex] = 1;
                        _this_1.graph.proxieLinks.push({
                            source: _this_1.graph.nodeMap[nodeId],
                            target: _this_1.graph.nodeMap[foreignMappedIndex],
                        });
                    }
                    else {
                        clusterEdgeMap[edgeIndex] += 1;
                    }
                }
            }
        });
        this.setupSimulation(function (d) {
            if (13 in d) {
                return d[13][_this_1.clusterId][detailId][0];
            }
            return _this_1.graph.nodes.length;
        });
    };
    ClusterVis.prototype.buildLevel2 = function (data) {
        var _this_1 = this;
        this.resetCluster();
        this.setupClick();
        this.level = 2;
        this.paintEdges.forEach(function (edge) {
            if (edge[0] === data[0] || edge[1] === data[0]) {
                [edge[0], edge[1]].forEach(function (nodeId) {
                    if (!(nodeId in _this_1.graph.nodeMap)) {
                        if (_this_1.paintNodes[nodeId][14] !== undefined && _this_1.paintNodes[nodeId][14] !== null) {
                            var img = document.createElement("img");
                            img.onerror = function (event) {
                                event.path[0].src = "../assets/images/twitter_default_profile_normal.png";
                            };
                            img.onload = function (event) {
                                _this_1.paintNodes[nodeId].imageLoad = true;
                            };
                            img.width = _this_1.imageSize;
                            img.height = _this_1.imageSize;
                            _this_1.paintNodes[nodeId].imageLoad = false;
                            _this_1.paintNodes[nodeId].image = img;
                            img.src = _this_1.paintNodes[nodeId][14];
                        }
                        _this_1.paintNodes[nodeId].rUserCount = 0;
                        _this_1.paintNodes[nodeId].isCentral = false;
                        if (nodeId === data[0]) {
                            _this_1.paintNodes[nodeId].isCentral = true;
                        }
                        _this_1.graph.nodes.push(_this_1.paintNodes[nodeId]);
                        _this_1.graph.nodeMap[nodeId] = _this_1.graph.nodes.length - 1;
                    }
                });
            }
        });
        this.paintEdges.forEach(function (edge) {
            if (edge[0] in _this_1.graph.nodeMap && edge[1] in _this_1.graph.nodeMap) {
                if (edge[2] >= 2) {
                    _this_1.graph.links.push({
                        source: edge[0],
                        target: edge[1],
                    });
                    [edge[0], edge[1]].forEach(function (nodeId) {
                        _this_1.graph.nodes[_this_1.graph.nodeMap[nodeId]].rUserCount += 1;
                    });
                }
                else {
                    _this_1.graph.proxieLinks.push({
                        source: _this_1.graph.nodeMap[edge[0]],
                        target: _this_1.graph.nodeMap[edge[1]],
                    });
                }
            }
        });
        this.setupSimulation(function (d) { return d.rUserCount; });
    };
    // TODO: Add debouncer
    ClusterVis.prototype.paint = function () {
        var _this_1 = this;
        if (this.level >= 1) {
            this.ctx.save();
            this.ctx.clearRect(0, 0, this.width * 2, this.height * 2);
            this.ctx.translate(this.canvasTransform.x * 2, this.canvasTransform.y * 2);
            this.ctx.scale(this.canvasTransform.k, this.canvasTransform.k);
            this.ctx.strokeStyle = "rgba(0,0,0,0.2)";
            if (this.showUserEdges) {
                this.graph.userLinks.forEach(function (link) {
                    _this_1.positionLink(link, true);
                });
                if (this.showProxies) {
                    this.graph.userProxyLinks.forEach(function (link) {
                        _this_1.positionLink({
                            source: _this_1.graph.nodes[link.source],
                            target: _this_1.graph.nodes[link.target],
                        }, true);
                    });
                }
            }
            else if (this.showEdges) {
                this.graph.links.forEach(function (link) {
                    _this_1.positionLink(link, true);
                });
                if (this.showProxies) {
                    this.graph.proxieLinks.forEach(function (link) {
                        _this_1.positionLink({
                            source: _this_1.graph.nodes[link.source],
                            target: _this_1.graph.nodes[link.target],
                        }, true);
                    });
                }
            }
            this.graph.nodes.forEach(function (node) {
                _this_1.ctx.fillStyle = "#000000";
                if ("image" in node && node.imageLoad && node.image.complete) {
                    var extraRadius = 1;
                    if (_this_1.level === 2) {
                        extraRadius = 2;
                        _this_1.ctx.fillStyle = _this_1.paintCluster[_this_1.clusterId].clusters[node[6][_this_1.clusterId][0]].color;
                        if (node.isCentral) {
                            extraRadius = 4;
                        }
                    }
                    _this_1.ctx.beginPath();
                    _this_1.ctx.arc(node.x * 2, node.y * 2, node.r * 2 + extraRadius, 0, 2 * Math.PI);
                    _this_1.ctx.closePath();
                    _this_1.ctx.fill();
                    _this_1.ctx.save();
                    _this_1.ctx.beginPath();
                    _this_1.ctx.arc(node.x * 2, node.y * 2, node.r * 2, 0, 2 * Math.PI);
                    _this_1.ctx.closePath();
                    _this_1.ctx.clip();
                    _this_1.ctx.drawImage(node.image, node.x * 2 - node.r * 2, node.y * 2 - node.r * 2, node.r * 4, node.r * 4);
                    _this_1.ctx.restore();
                }
                else {
                    if ("color" in node) {
                        _this_1.ctx.fillStyle = node.color;
                    }
                    _this_1.ctx.beginPath();
                    _this_1.ctx.arc(node.x * 2, node.y * 2, node.r * 2, 0, 2 * Math.PI);
                    _this_1.ctx.closePath();
                    _this_1.ctx.fill();
                }
            });
            this.ctx.restore();
        }
    };
    ClusterVis.prototype.update = function (data) {
        this.outerSvg
            .attr("width", this.width)
            .attr("height", this.height);
        this.edgeToggle
            .attr("transform", "translate(" + (this.width - 73) + ", 67)");
        this.proxyToggle
            .attr("transform", "translate(" + (this.width - 73) + ", 127)");
        this.canvas
            .style("width", this.width + "px")
            .style("height", this.height + "px")
            .attr("width", this.width * 2)
            .attr("height", this.height * 2);
        this.svg.selectAll(".centerGroup")
            .attr("transform", "translate(" + this.width / 2 + ", " + this.height / 2 + ")");
    };
    // TODO: Move to utils
    ClusterVis.prototype.circlePath = function (x, y, r, direction) {
        return "M" + x + "," + y + "       m" + -r + ", 0       a" + r + "," + r + " 0 " + ((direction) ? "0" : "1") + "," + ((direction) ? "1" : "0") + " " + r * 2 + ",0       a" + r + "," + r + " 0 " + ((direction) ? "0" : "1") + "," + ((direction) ? "1" : "0") + " " + -r * 2 + ",0Z";
    };
    ClusterVis.prototype.positionLink = function (d, draw) {
        if (draw === void 0) { draw = false; }
        var offset = Math.sqrt(Math.pow(d.source.x - d.target.x, 2) + Math.pow(d.source.y - d.target.y, 2)) / 10;
        var midpointX = (d.source.x + d.target.x) / 2;
        var midpointY = (d.source.y + d.target.y) / 2;
        var dx = (d.target.x - d.source.x);
        var dy = (d.target.y - d.source.y);
        var normalise = Math.sqrt((dx * dx) + (dy * dy));
        var offSetX = midpointX + offset * (dy / normalise);
        var offSetY = midpointY - offset * (dx / normalise);
        if (draw) {
            this.ctx.beginPath();
            this.ctx.moveTo(d.source.x * 2, d.source.y * 2);
            this.ctx.bezierCurveTo(offSetX * 2, offSetY * 2, offSetX * 2, offSetY * 2, d.target.x * 2, d.target.y * 2);
            this.ctx.stroke();
        }
        else {
            return "M" + d.source.x + ", " + d.source.y + "S" + offSetX + ", " + offSetY + " " + d.target.x + ", " + d.target.y;
        }
    };
    return ClusterVis;
}(vis_1.Vis));
exports.ClusterVis = ClusterVis;
//# sourceMappingURL=cluster.js.map