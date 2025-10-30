function drawNadiaGraph(mode = "default") {
  const nadiaSVG = "#svg4";
  const nadiaJSON = "nadia_network.json";

  d3.json(nadiaJSON).then(data => {
    const svg = d3.select(nadiaSVG);
    const width = +svg.attr("width"), height = +svg.attr("height");
    svg.selectAll("*").remove();

    const g = svg.append("g");
    const zoom = d3.zoom().scaleExtent([0.3, 4]).on("zoom", (event) => g.attr("transform", event.transform));
    svg.call(zoom);

    const color = d => {
      if (mode === "illicit") {
        const st = d.sub_type || d.type;
        if (d.id === "Nadia Conti") return "gold";
        if (["Suspicious","Enforcement","IllegalActivity"].includes(st)) return "red";
        if (["Monitoring","Assessment"].includes(st)) return "purple";
        if (["Organization","AccessPermission","Authorization"].includes(st)) return "green";
        if (["Vessel","Location"].includes(st)) return "gray";
        return "lightblue";
      } else {
        if (d.id === "Nadia Conti") return "#ff595e";
        if (d.type === "Person") return "#7eb0d5";
        if (d.type === "Vessel") return "#90d595";
        if (d.type === "Organization" || d.type === "Group") return "#fdb462";
        if (d.type === "Location") return "#e78ac3";
        return "#b0b0b0";
      }
    };

    const link = g.append("g").attr("stroke", "#aaa").selectAll("line")
      .data(data.links).join("line")
      .attr("stroke-width", d => d.value ? Math.max(1, d.value*6) : 1);

    const node = g.append("g").selectAll("circle")
      .data(data.nodes).join("circle")
      .attr("r", 7)
      .attr("fill", color)
      .call(drag(simulation()));

    const label = g.append("g").selectAll("text")
      .data(data.nodes).join("text")
      .text(d => d.id)
      .attr("font-size", 11)
      .attr("dx", 10)
      .attr("dy", ".35em");

    const sim = simulation();
    sim.nodes(data.nodes).on("tick", ticked);
    sim.force("link").links(data.links);

    function simulation() {
      return d3.forceSimulation()
        .force("link", d3.forceLink().id(d => d.id).distance(120))
        .force("charge", d3.forceManyBody().strength(-260))
        .force("center", d3.forceCenter(width/2, height/2));
    }

    function ticked() {
      link.attr("x1", d => d.source.x).attr("y1", d => d.source.y)
          .attr("x2", d => d.target.x).attr("y2", d => d.target.y);
      node.attr("cx", d => d.x).attr("cy", d => d.y);
      label.attr("x", d => d.x).attr("y", d => d.y);
    }

    function drag(sim) {
      return d3.drag()
        .on("start", (event) => { if (!event.active) sim.alphaTarget(0.3).restart(); event.subject.fx = event.subject.x; event.subject.fy = event.subject.y; })
        .on("drag", (event) => { event.subject.fx = event.x; event.subject.fy = event.y; })
        .on("end", (event) => { if (!event.active) sim.alphaTarget(0); event.subject.fx = null; event.subject.fy = null; });
    }
  });
}

// --- Initial render and dropdown toggle ---
document.addEventListener("DOMContentLoaded", () => {
  drawNadiaGraph("default");
  d3.select("#nadiaMode").on("change", function() {
    const mode = this.value;
    drawNadiaGraph(mode);
  });
});
