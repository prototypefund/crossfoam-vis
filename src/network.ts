import { debounce } from "@crossfoam/utils";
import * as d3 from "d3";
import * as REGL from "regl";
import { Vis } from "./vis";

class NetworkVis extends Vis {
  public visType = "network";
  public regl;
  public reglDraw;
  public reglDrawLine;
  public reglDrawMultiPoint;
  public clickNodes;
  public paintNodes;
  public paintEdges;
  public pointMode = "single";
  public time = 0;
  public frameLoop: any = false;
  public visNav;

  public handleResize = debounce(() => {
    this.resize(true);
  }, 200, true);

  public destroy() {
    this.destroyed = true;
    this.container.selectAll("#tooltip").remove();
  }

  public zoom(_this) {
    this.container.selectAll("#tooltip").remove();
    _this.canvasTransform = d3.event.transform;
    this.glAnimate();
  }

  public build(data: any, centralNode: any) {

    this.paintCluster = data.cluster;

    const pointColors = [];
    const pointPositions = [];
    const pointSizes = [];

    const pointMultiColors = [];
    const pointMultiPositions = [];
    const pointMultiSizes = [];

    data.nodes.forEach((node) => {
      let color = [85 / 255, 85 / 255, 85 / 255];

      if (node[6][this.clusterId].length > 0 &&
        node[6][this.clusterId][0] in this.paintCluster[this.clusterId].clusters) {
        const rgb = d3.color(this.paintCluster[this.clusterId].clusters[node[6][this.clusterId]].color).rgb();
        color = [rgb.r / 255, rgb.g / 255, rgb.b / 255];
      }

      pointColors.push(color);
      pointPositions.push([node[11] + this.width / 2, node[12] + this.height / 2]);
      pointSizes.push(node[10] * 4);

      let fullCount = 0;
      Object.keys(node[13][this.clusterId]).forEach((clusterKey) => {
        fullCount += node[13][this.clusterId][clusterKey][0];
        // fullCount += node[13][this.clusterId][clusterKey][1];
      });

      const assignLinks = (cNode, clusterKey, size): number => {
        if (cNode[13][this.clusterId][clusterKey][0] > 0) {
          let friendColor = [85 / 255, 85 / 255, 85 / 255];
          if (clusterKey in this.paintCluster[this.clusterId].clusters) {
            const rgb = d3.color(this.paintCluster[this.clusterId].clusters[clusterKey].color).rgb();
            friendColor = [rgb.r / 255, rgb.g / 255, rgb.b / 255];
          }

          pointMultiColors.push(friendColor);
          pointMultiPositions.push([cNode[11] + this.width / 2, cNode[12] + this.height / 2]);

          size += cNode[13][this.clusterId][clusterKey][0];
          pointMultiSizes.push(Math.sqrt(((Math.PI * Math.pow(cNode[10] * 4, 2)) / fullCount * size) / Math.PI));
        }

        return size;
      };

      // the assigned cluster color should be in the center
      if (node[6][this.clusterId].length > 0 &&
          node[6][this.clusterId][0] in this.paintCluster[this.clusterId].clusters) {
        let sumSize = assignLinks(node, node[6][this.clusterId], 0);
        Object.keys(node[13][this.clusterId]).forEach((clusterKey) => {
          if (clusterKey !== node[6][this.clusterId][0]) {
            sumSize = assignLinks(node, clusterKey, sumSize);
          }
        });
      } else {
        // unclustered / unconnected nodes
        pointMultiColors.push([85 / 255, 85 / 255, 85 / 255]);
        pointMultiPositions.push([node[11] + this.width / 2, node[12] + this.height / 2]);
        pointMultiSizes.push(node[10] * 4);
      }
    });

    this.paintEdges = data.edges.filter((d) => (d[3] < 2) ? true : false);

    this.resize(false);

    d3.select(window).on("resize", () => {
      this.handleResize();
    });

    // canvas
    const canvas = this.container.append("div")
      .style("width", this.width + "px")
      .style("height", this.height + "px")
      .attr("id", "overview-regl-canvas");

    const svg = this.container.append("svg")
      .attr("id", "overview-svg")
      .style("z-index", 2)
      .on("click", () => {
        const x = d3.event.pageX;
        const y = d3.event.pageY;

        let hit = false;

        pointPositions.forEach((node, ni) => {
          const dist = Math.sqrt(
            Math.pow(x - (node[0] * this.canvasTransform.k + this.canvasTransform.x), 2)
            + Math.pow(y - (node[1] * this.canvasTransform.k + this.canvasTransform.y), 2),
          );

          if (dist <= pointSizes[ni] / 4 * this.canvasTransform.k) {
            let color = "#555555";
            if (data.nodes[ni][6][this.clusterId].length > 0 &&
              data.nodes[ni][6][this.clusterId][0] in this.paintCluster[this.clusterId].clusters) {
              const rgb = d3.color(this.paintCluster[this.clusterId].clusters[data.nodes[ni][6][this.clusterId]].color)
                .rgb();
              color = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
            }

            this.tooltip(
              data.nodes[ni],
              node[0] * this.canvasTransform.k + this.canvasTransform.x,
              node[1] * this.canvasTransform.k + this.canvasTransform.y,
              color,
              [],
            );
            hit = true;
          }
        });

        if (!hit) {
          this.container.selectAll("#tooltip").remove();
        }

    }).call(d3.zoom()
      .scaleExtent([0.1, 8])
      .on("zoom", () => { this.zoom(this); }),
    );

    this.visNav = svg.append("g")
      .attr("id", "network-nav");

    [22, 17, 14, 11, 2].forEach((r, ri) => {
      this.visNav.append("circle")
        .attr("class", "network-nav-circle network-nav-circle-" + (ri + 1))
        .attr("r", r);
    });

    this.visNav.append("line")
      .attr("x1", -40);

    this.visNav.append("text")
      .attr("transform", "translate(-44, 5)")
      .attr("text-anchor", "end")
      .html(browser.i18n.getMessage("visNetworkToggleOff"));

    this.visNav.on("click", () => {
      if (this.pointMode === "single") {
        this.pointMode = "cluster";
        this.visNav.classed("active", true);
        this.visNav.select("text")
          .html(browser.i18n.getMessage("visNetworkToggleOn"));
      } else {
        this.pointMode = "single";
        this.visNav.classed("active", false);
        this.visNav.select("text")
          .html(browser.i18n.getMessage("visNetworkToggleOff"));
      }
      this.glAnimate();
    });

    this.canvasTransform = d3.zoomIdentity;

    this.regl = REGL(document.getElementById("overview-regl-canvas"));

    window.onbeforeunload = () => {
      this.regl.destroy();
    };

    this.reglDraw = this.regl({
      attributes: {
        color: pointColors,
        position: pointPositions,
        size: pointSizes,
      },
      count: pointColors.length,
      // TODO: for reusability move the frag and vertex shader into their own module
      frag: `
        // set the precision of floating point numbers
        precision highp float;
        // this value is populated by the vertex shader
        varying vec3 fragColor;
        void main() {
          float r = 0.0, delta = 0.0;
          vec2 cxy = 2.0 * gl_PointCoord - 1.0;
          r = dot(cxy, cxy);
          if (r > 1.0) {
              discard;
          }
          // gl_FragColor is a special variable that holds the color of a pixel
          gl_FragColor = vec4(fragColor, 1);
        }
      `,
      primitive: "points",
      uniforms: {
        offsetX: this.regl.prop("offsetX"),
        offsetY: this.regl.prop("offsetY"),
        scale: this.regl.prop("scale"),
        stageHeight: this.regl.prop("stageHeight"),
        stageWidth: this.regl.prop("stageWidth"),
      },
      vert: `
        // per vertex attributes
        attribute float size;
        attribute vec2 position;
        attribute vec3 color;
        // variables to send to the fragment shader
        varying vec3 fragColor;
        // values that are the same for all vertices
        uniform float scale;
        uniform float offsetX;
        uniform float offsetY;
        uniform float stageWidth;
        uniform float stageHeight;
        // helper function to transform from pixel space to normalized device coordinates (NDC)
        // in NDC (0,0) is the middle, (-1, 1) is the top left and (1, -1) is the bottom right.
        vec2 normalizeCoords(vec2 position) {
          // read in the positions into x and y vars
          float x = position[0] * scale + offsetX;
          float y = position[1] * scale + offsetY;
          return vec2(
            2.0 * ((x / stageWidth) - 0.5),
            // invert y to treat [0,0] as bottom left in pixel space
            -(2.0 * ((y / stageHeight) - 0.5))
          );
        }
        void main() {
          // update the size of a point based on the prop pointWidth
          gl_PointSize = size * scale;
          // send color to the fragment shader
          fragColor = color;
          // scale to normalized device coordinates
          // gl_Position is a special variable that holds the position of a vertex
          gl_Position = vec4(normalizeCoords(position), 0.0, 1.0);
        }
      `,
    });

    this.reglDrawMultiPoint = this.regl({
      attributes: {
        color: pointMultiColors,
        position: pointMultiPositions,
        size: pointMultiSizes,
      },
      count: pointMultiColors.length,
      frag: `
        // set the precision of floating point numbers
        precision highp float;
        // this value is populated by the vertex shader
        varying vec3 fragColor;
        void main() {
          float r = 0.0, delta = 0.0;
          vec2 cxy = 2.0 * gl_PointCoord - 1.0;
          r = dot(cxy, cxy);
          if (r > 1.0) {
              discard;
          }
          // gl_FragColor is a special variable that holds the color of a pixel
          gl_FragColor = vec4(fragColor, 1);
        }
      `,
      primitive: "points",
      uniforms: {
        offsetX: this.regl.prop("offsetX"),
        offsetY: this.regl.prop("offsetY"),
        scale: this.regl.prop("scale"),
        stageHeight: this.regl.prop("stageHeight"),
        stageWidth: this.regl.prop("stageWidth"),
      },
      vert: `
        // per vertex attributes
        attribute float size;
        attribute vec2 position;
        attribute vec3 color;
        // variables to send to the fragment shader
        varying vec3 fragColor;
        varying float tscale;
        // values that are the same for all vertices
        uniform float scale;
        uniform float offsetX;
        uniform float offsetY;
        uniform float stageWidth;
        uniform float stageHeight;
        // helper function to transform from pixel space to normalized device coordinates (NDC)
        // in NDC (0,0) is the middle, (-1, 1) is the top left and (1, -1) is the bottom right.
        vec2 normalizeCoords(vec2 position) {
          // read in the positions into x and y vars
          float x = position[0] * scale + offsetX;
          float y = position[1] * scale + offsetY;
          return vec2(
            2.0 * ((x / stageWidth) - 0.5),
            // invert y to treat [0,0] as bottom left in pixel space
            -(2.0 * ((y / stageHeight) - 0.5))
          );
        }
        void main() {
          // update the size of a point based on the prop pointWidth
          tscale = scale;
          if(tscale > 2.0) {
            tscale = 2.0;
          }
          gl_PointSize = size * tscale;
          // send color to the fragment shader
          fragColor = color;
          // scale to normalized device coordinates
          // gl_Position is a special variable that holds the position of a vertex
          gl_Position = vec4(normalizeCoords(position), 0.0, 1.0);
        }
      `,
    });

    this.reglDrawLine = this.regl({
      attributes: {
        position: pointPositions,
      },
      blend: {
        color: [0, 0, 0, 0],
        enable: true,
        equation: {
          alpha: "add",
          rgb: "add",
        },
        func: {
          dstAlpha: 1,
          dstRGB: "one minus src alpha",
          srcAlpha: 1,
          srcRGB: "src alpha",
        },
      },
      count: this.paintEdges.length,
      depth: {
        enable: false,
      },
      elements: this.paintEdges.map((edge) => [edge[0], edge[1]]),
      frag: `
        precision mediump float;
        uniform vec4 color;
        void main() {
          gl_FragColor = color;
        }`,
      lineWidth: 1,
      primitive: "line",
      uniforms: {
        color: [0, 0, 0, 0.5],
        offsetX: this.regl.prop("offsetX"),
        offsetY: this.regl.prop("offsetY"),
        scale: this.regl.prop("scale"),
        stageHeight: this.regl.prop("stageHeight"),
        stageWidth: this.regl.prop("stageWidth"),
      },
      vert: `
        precision mediump float;
        attribute vec2 position;
        uniform float scale;
        uniform float offsetX;
        uniform float offsetY;
        uniform float stageWidth;
        uniform float stageHeight;
        vec2 normalizeCoords(vec2 position) {
          // read in the positions into x and y vars
          float x = position[0] * scale + offsetX;
          float y = position[1] * scale + offsetY;
          return vec2(
            2.0 * ((x / stageWidth) - 0.5),
            // invert y to treat [0,0] as bottom left in pixel space
            -(2.0 * ((y / stageHeight) - 0.5))
          );
        }
        void main() {
          gl_Position = vec4(normalizeCoords(position), 0.0, 1.0);
        }`,
    });

    this.time = 1;
    this.update(false);
  }

  public glAnimate() {
    if (!this.frameLoop) {
      this.frameLoop = this.regl.frame(() => {
        this.regl.clear({
          color: [1, 1, 1, 1],
          depth: 1,
        });

        this.reglDrawLine({
          offsetX: this.canvasTransform.x,
          offsetY: this.canvasTransform.y,
          scale: this.canvasTransform.k,
          stageHeight: this.height,
          stageWidth: this.width,
        });

        if (this.pointMode === "cluster") {
          this.reglDrawMultiPoint({
            offsetX: this.canvasTransform.x,
            offsetY: this.canvasTransform.y,
            scale: this.canvasTransform.k,
            stageHeight: this.height,
            stageWidth: this.width,
          });
        } else {
          this.reglDraw({
            offsetX: this.canvasTransform.x,
            offsetY: this.canvasTransform.y,
            scale: this.canvasTransform.k,
            stageHeight: this.height,
            stageWidth: this.width,
          });
        }

        this.frameLoop.cancel();
        this.frameLoop = false;
      });
    }
  }

  public update(data: any) {
    this.container.select("#overview-regl-canvas")
      .style("width", this.width + "px")
      .style("height", this.height + "px");

    this.container.select("#overview-regl-canvas canvas")
      .attr("width", this.width * 2)
      .attr("height", this.height * 2)
      .style("width", this.width + "px")
      .style("height", this.height + "px");

    this.visNav.attr("transform", `translate(${this.width - 50}, 90)`);

    this.regl.poll();
    this.glAnimate();
  }

}

export { NetworkVis };
