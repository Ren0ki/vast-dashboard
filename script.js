// --- Tabs ---
function openTab(evt, name) {
  const tabs = document.getElementsByClassName("tabcontent");
  for (let i = 0; i < tabs.length; i++) tabs[i].style.display = "none";

  const links = document.getElementsByClassName("tablinks");
  for (let i = 0; i < links.length; i++)
    links[i].className = links[i].className.replace(" active", "");

  document.getElementById(name).style.display = "block";
  evt.currentTarget.className += " active";
}

// Default tab
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("defaultOpen").click();

  // Draw graphs after DOM is ready
  drawGraph("#svg1", "temporal_network.json");
  drawGraph("#svg2", "people_vessel_network.json");
  drawGraph("#svg3", "pseudonym_network.json");

  // Populate pseudonym table
  d3.csv("pseudonym_pairs_full.csv").then((data) => {
    const tbody = d3.select("#pseudonymTable").select("tbody");
    data.forEach((row) => {
      const tr = tbody.append("tr");
      tr.append("td")
        .text(row["Given Name"])
        .style("border", "1px solid #999")
        .style("padding", "6px 12px");
      tr.append("td")
        .text(row["Pseudonym"])
        .style("border", "1px solid #999")
        .style("padding", "6px 12px");
      tr.append("td")
        .text(row["Similarity"])
        .style("border", "1px solid #999")
        .style("padding", "6px 12px");
    });
  });
});

// --- Generic Force Graph Function ---
function drawGraph(svgSelector, jsonPath, highlight = null) {
  const svg = d3.select(svgSelector);
  const width = +svg.attr("width"),
    height = +svg.attr("height");
  svg.selectAll("*").remove();

  const g = svg.append("g");

  const zoom = d3
    .zoom()
    .scaleExtent([0.3, 4])
    .on("zoom", (event) => g.attr("transform", event.transform));
  svg.call(zoom);

  d3.json(jsonPath).then((data) => {
    data.nodes.forEach((n) => {
      if (!n.type && /^Hour /.test(n.id)) n.type = "Hour";
    });

    const color = (d) => {
      if (highlight && d.id === highlight) return "#ff595e";
      if (d.type === "Person") return "#7eb0d5";
      if (d.type === "Vessel") return "#90d595";
      if (d.type === "Organization" || d.type === "Group") return "#fdb462";
      if (d.type === "Location") return "#e78ac3";
      if (d.type === "Hour") return "#8da0cb";
      return "#b0b0b0";
    };

    const link = g
      .append("g")
      .attr("stroke", "#aaa")
      .selectAll("line")
      .data(data.links)
      .join("line")
      .attr("stroke-width", (d) => (d.value ? Math.max(1, d.value * 6) : 1));

    const node = g
      .append("g")
      .selectAll("circle")
      .data(data.nodes)
      .join("circle")
      .attr("r", 6.5)
      .attr("fill", color)
      .call(drag(simulation()));

    const label = g
      .append("g")
      .selectAll("text")
      .data(data.nodes)
      .join("text")
      .text((d) => d.id)
      .attr("font-size", (d) => (d.type === "Event" ? 9 : 11))
      .attr("dx", 10)
      .attr("dy", ".35em");

    const sim = simulation();
    sim.nodes(data.nodes).on("tick", ticked);
    sim.force("link").links(data.links);

    function simulation() {
      return d3
        .forceSimulation()
        .force("link", d3.forceLink().id((d) => d.id).distance(120))
        .force("charge", d3.forceManyBody().strength(-260))
        .force("center", d3.forceCenter(width / 2, height / 2));
    }

    function ticked() {
      link
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);
      node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
      label.attr("x", (d) => d.x).attr("y", (d) => d.y);
    }

    function drag(sim) {
      return d3
        .drag()
        .on("start", (event) => {
          if (!event.active) sim.alphaTarget(0.3).restart();
          event.subject.fx = event.subject.x;
          event.subject.fy = event.subject.y;
        })
        .on("drag", (event) => {
          event.subject.fx = event.x;
          event.subject.fy = event.y;
        })
        .on("end", (event) => {
          if (!event.active) sim.alphaTarget(0);
          event.subject.fx = null;
          event.subject.fy = null;
        });
    }
  });
}
