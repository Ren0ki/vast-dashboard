function openTab(evt, name) {
  // Hide all tab contents
  const tabs = document.getElementsByClassName("tabcontent");
  for (let i = 0; i < tabs.length; i++) tabs[i].style.display = "none";

  // Deactivate all tab buttons
  const links = document.getElementsByClassName("tablinks");
  for (let i = 0; i < links.length; i++)
    links[i].className = links[i].className.replace(" active", "");

  // Show the selected tab and mark it active
  document.getElementById(name).style.display = "block";
  evt.currentTarget.className += " active";

  // 🔁 Redraw relevant D3 graph or table when a tab is opened
  if (name === "Temporal") {
    drawGraph("#svg1", "temporal_network.json");
  } else if (name === "PeopleVessel") {
    drawGraph("#svg2", "people_vessel_network.json");
  } else if (name === "Pseudonym") {
    drawGraph("#svg3", "pseudonym_network.json");

    // 🧩 Load pseudonym similarity table dynamically
    d3.csv("pseudonym_pairs_full.csv").then((data) => {
      const tbody = d3.select("#pseudonymTable").select("tbody");
      tbody.selectAll("*").remove(); // Clear previous rows

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

      // ✨ Optional: smooth fade-in for table
      d3.select("#pseudonymTable")
        .style("opacity", 0)
        .transition()
        .duration(800)
        .style("opacity", 1);
    });

  } else if (name === "Nadia") {
    // Re-run Nadia’s special graph (animation resets each time)
    drawGraph("#svg4", "nadia_network.json", "Nadia Conti");
  }
}

// Default tab open on load
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("defaultOpen").click();
});

// --- Generic Force Graph Function ---
function drawGraph(svgSelector, jsonPath, highlight = null) {
  const svg = d3.select(svgSelector);
  const width = +svg.attr("width"),
    height = +svg.attr("height");
  svg.selectAll("*").remove();

  const g = svg.append("g"); // For zoom/pan

  const zoom = d3
    .zoom()
    .scaleExtent([0.3, 4])
    .on("zoom", (event) => g.attr("transform", event.transform));
  svg.call(zoom);

  d3.json(jsonPath).then((data) => {
    data.nodes.forEach((n) => {
      if (!n.type && /^Hour /.test(n.id)) n.type = "Hour";
    });

    // --- Color logic ---
    const isPseudonym = svgSelector === "#svg3";
    const isPeopleVessel = svgSelector === "#svg2";

    const color = (d) => {
      if (isPseudonym) return "#7eb0d5"; // consistent color for pseudonym graph
      if (highlight && d.id === highlight) return "#ff595e";
      if (d.type === "Person") return "#7eb0d5";
      if (d.type === "Vessel") return "#90d595";
      if (d.type === "Organization" || d.type === "Group") return "#fdb462";
      if (d.type === "Location") return "#e78ac3";
      if (d.type === "Hour") return "#8da0cb";
      return "#b0b0b0";
    };

    // --- Simulation setup ---
    const sim = d3
      .forceSimulation()
      .force("link", d3.forceLink().id((d) => d.id).distance(110).strength(0.3))
      .force("charge", d3.forceManyBody().strength(-250))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide(25));

    // --- Links ---
    const linkOpacity = isPeopleVessel ? 0.15 : 0.5;
    const link = g
      .append("g")
      .attr("stroke", "#aaa")
      .attr("stroke-opacity", linkOpacity)
      .selectAll("line")
      .data(data.links)
      .join("line")
      .attr("stroke-width", (d) => (d.value ? Math.max(1, d.value * 6) : 1));

    // --- Nodes ---
    const node = g
      .append("g")
      .selectAll("circle")
      .data(data.nodes)
      .join("circle")
      .attr("r", 6.5)
      .attr("fill", color)
      .call(drag(sim)); // no transition here now

    // --- Labels ---
    const label = g
      .append("g")
      .selectAll("text")
      .data(data.nodes)
      .join("text")
      .text((d) => d.id)
      .attr("font-size", (d) => (d.type === "Event" ? 9 : 11))
      .attr("dx", 10)
      .attr("dy", ".35em");

    // --- Simulation tick updates ---
    sim.nodes(data.nodes).on("tick", ticked);
    sim.force("link").links(data.links);

    function ticked() {
      link
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);
      node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
      label.attr("x", (d) => d.x).attr("y", (d) => d.y);
    }

    // --- Drag behavior ---
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
 // --- Static Community Dropdown for People–Vessel Network ---
const communityLabels = {
  1: "Tourism / Filming",
  2: "Logistics / Enforcement",
  3: "Environmentalism / Activism",
  4: "Commercial / Shipping",
  5: "Civic / Infrastructure",
  6: "Other / Miscellaneous"
};

// Pre-fill dropdown
const select = d3.select("#communitySelect");
Object.entries(communityLabels).forEach(([id, label]) => {
  select.append("option").attr("value", id).text(label);
});

// When dropdown changes, recolor nodes instead of removing them
select.on("change", function() {
  const val = this.value;

  d3.json("people_vessel_network.json").then(data => {
    // Reset the graph area
    d3.select("#svg2").selectAll("*").remove();

    // Draw full graph first
    const svg = d3.select("#svg2");
    const w = +svg.attr("width"),
          h = +svg.attr("height");

    const colorScale = d3.scaleOrdinal()
      .domain(Object.keys(communityLabels))
      .range(["#7eb0d5", "#90d595", "#fdb462", "#e78ac3", "#b3de69", "#fb8072"]);

    const sim = d3.forceSimulation(data.nodes)
      .force("link", d3.forceLink(data.links).id(d => d.id).distance(120))
      .force("charge", d3.forceManyBody().strength(-250))
      .force("center", d3.forceCenter(w / 2, h / 2));

    const link = svg.append("g")
      .selectAll("line")
      .data(data.links)
      .join("line")
      .attr("stroke", "#aaa")
      .attr("stroke-opacity", 0.5);

    const node = svg.append("g")
      .selectAll("circle")
      .data(data.nodes)
      .join("circle")
      .attr("r", 6)
      .attr("fill", d => colorScale(Math.floor(Math.random() * 6) + 1))
      .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    const label = svg.append("g")
      .selectAll("text")
      .data(data.nodes)
      .join("text")
      .text(d => d.id)
      .attr("font-size", 9)
      .attr("dx", 10)
      .attr("dy", ".35em");

    sim.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);
      node.attr("cx", d => d.x).attr("cy", d => d.y);
      label.attr("x", d => d.x).attr("y", d => d.y);
    });

    // Simple drag handlers
    function dragstarted(event, d) {
      if (!event.active) sim.alphaTarget(0.3).restart();
      d.fx = d.x; d.fy = d.y;
    }
    function dragged(event, d) {
      d.fx = event.x; d.fy = event.y;
    }
    function dragended(event, d) {
      if (!event.active) sim.alphaTarget(0);
      d.fx = null; d.fy = null;
    }

    // Highlight if specific community chosen
    if (val !== "all") {
      node.transition().duration(500)
        .attr("fill", (d, i) => i % 6 + 1 === +val ? colorScale(val) : "#ccc")
        .attr("opacity", (d, i) => i % 6 + 1 === +val ? 1 : 0.3);
      label.transition().duration(500)
        .attr("opacity", (d, i) => i % 6 + 1 === +val ? 1 : 0.1);
      link.transition().duration(500)
        .attr("stroke-opacity", (d, i) => i % 6 + 1 === +val ? 0.6 : 0.1);
    }
  });
});



  });
}
