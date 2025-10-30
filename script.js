// --- Tab Navigation ---
function openTab(evt, name) {
  const tabs = document.getElementsByClassName("tabcontent");
  for (let i = 0; i < tabs.length; i++) tabs[i].style.display = "none";

  const links = document.getElementsByClassName("tablinks");
  for (let i = 0; i < links.length; i++)
    links[i].className = links[i].className.replace(" active", "");

  document.getElementById(name).style.display = "block";
  evt.currentTarget.className += " active";
}

// --- Default Tab + Graph Initialization ---
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("defaultOpen").click();

  drawGraph("#svg1", "temporal_network.json");
  drawGraph("#svg2", "people_vessel_network.json");
  drawGraph("#svg3", "pseudonym_network.json");
  drawGraph("#svg4", "nadia_network.json", "Nadia Conti");

  // Populate pseudonym table
  d3.csv("pseudonym_pairs_full.csv").then((data) => {
    const tbody = d3.select("#pseudonymTable").select("tbody");
    data.forEach((row) => {
      const tr = tbody.append("tr");
      ["Given Name", "Pseudonym", "Similarity"].forEach((col) => {
        tr.append("td")
          .text(row[col])
          .style("border", "1px solid #999")
          .style("padding", "6px 12px");
      });
    });
  });
});

// --- Generic Force Graph Function ---
function drawGraph(svgSelector, jsonPath, highlight = null) {
  const svg = d3.select(svgSelector);
  const width = +svg.attr("width"),
    height = +svg.attr("height");
  svg.selectAll("*").remove();

  const g = svg.append("g"); // for zoom/pan

  const zoom = d3
    .zoom()
    .scaleExtent([0.3, 4])
    .on("zoom", (event) => g.attr("transform", event.transform));
  svg.call(zoom);

  d3.json(jsonPath).then((data) => {
    data.nodes.forEach((n) => {
      if (!n.type && /^Hour /.test(n.id)) n.type = "Hour";
    });

    const isPseudonym = svgSelector === "#svg3";
    const color = (d) => {
      if (isPseudonym) return "#7eb0d5";
      if (highlight && d.id === highlight) return "#ff595e";
      if (d.type === "Person") return "#7eb0d5";
      if (d.type === "Vessel") return "#90d595";
      if (d.type === "Organization" || d.type === "Group") return "#fdb462";
      if (d.type === "Location") return "#e78ac3";
      if (d.type === "Hour") return "#8da0cb";
      return "#b0b0b0";
    };

    const sim = d3
      .forceSimulation()
      .force("link", d3.forceLink().id((d) => d.id).distance(120))
      .force("charge", d3.forceManyBody().strength(-260))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const isPeopleVessel = svgSelector === "#svg2";
    const linkOpacity = isPeopleVessel ? 0.15 : 0.5;

    const link = g
      .append("g")
      .attr("stroke", "#aaa")
      .attr("stroke-opacity", linkOpacity)
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
      .call(drag(sim));

    const label = g
      .append("g")
      .selectAll("text")
      .data(data.nodes)
      .join("text")
      .text((d) => d.id)
      .attr("font-size", (d) => (d.type === "Event" ? 9 : 11))
      .attr("dx", 10)
      .attr("dy", ".35em");

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

// --- Weekly Line Chart ---
d3.json("temporal_network.json").then((data) => {
  const hourCounts = d3.rollup(data.links, (v) => v.length, (d) => d.target);

  const points = Array.from(hourCounts, ([hour, count]) => ({
    hour: +hour.replace("Hour ", ""),
    count,
  })).sort((a, b) => a.hour - b.hour);

  const svg = d3.select("#temporalLine"),
    w = +svg.attr("width"),
    h = +svg.attr("height"),
    margin = { top: 30, right: 30, bottom: 40, left: 50 },
    innerW = w - margin.left - margin.right,
    innerH = h - margin.top - margin.bottom;

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3
    .scaleLinear()
    .domain(d3.extent(points, (d) => d.hour))
    .range([0, innerW]);
  const y = d3
    .scaleLinear()
    .domain([0, d3.max(points, (d) => d.count)])
    .range([innerH, 0]);

  g.append("path")
    .datum(points)
    .attr("fill", "none")
    .attr("stroke", "#0077b6")
    .attr("stroke-width", 2)
    .attr("d", d3.line().x((d) => x(d.hour)).y((d) => y(d.count)));

  g.append("g")
    .attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(x).ticks(12));
  g.append("g").call(d3.axisLeft(y));
  g.append("text")
    .attr("x", innerW / 2)
    .attr("y", innerH + 35)
    .text("Hour of Day");
  g.append("text")
    .attr("x", -innerH / 2)
    .attr("y", -35)
    .text("Event Count")
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle");
});

// --- Community Filter ---
const select = d3.select("#communitySelect");
select.on("change", function () {
  const val = this.value;
  d3.json("people_vessel_network.json").then((data) => {
    let filtered = data;
    if (val !== "all") {
      const community = +val;
      filtered = {
        nodes: data.nodes.filter((d) => d.community === community),
        links: data.links.filter(
          (l) =>
            data.nodes.some(
              (n) => n.id === l.source && n.community === community
            ) &&
            data.nodes.some(
              (n) => n.id === l.target && n.community === community
            )
        ),
      };
    }
    d3.select("#svg2").selectAll("*").remove();
    drawFilteredGraph("#svg2", filtered);
  });
});

// --- Filtered Graph Function (for community view) ---
function drawFilteredGraph(svgSelector, data) {
  const svg = d3.select(svgSelector),
    w = +svg.attr("width"),
    h = +svg.attr("height");

  const g = svg.append("g");
  const sim = d3
    .forceSimulation(data.nodes)
    .force("link", d3.forceLink(data.links).id((d) => d.id).distance(120))
    .force("charge", d3.forceManyBody().strength(-250))
    .force("center", d3.forceCenter(w / 2, h / 2));

  const color = (d) =>
    d.type === "Person"
      ? "#7eb0d5"
      : d.type === "Vessel"
      ? "#90d595"
      : d.type === "Organization"
      ? "#fdb462"
      : "#b0b0b0";

  const link = g
    .append("g")
    .selectAll("line")
    .data(data.links)
    .join("line")
    .attr("stroke", "#999");
  const node = g
    .append("g")
    .selectAll("circle")
    .data(data.nodes)
    .join("circle")
    .attr("r", 6)
    .attr("fill", color)
    .call(drag(sim));
  const label = g
    .append("g")
    .selectAll("text")
    .data(data.nodes)
    .join("text")
    .text((d) => d.id)
    .attr("font-size", 9)
    .attr("dx", 8);

  sim.on("tick", () => {
    link
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y);
    node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
    label.attr("x", (d) => d.x).attr("y", (d) => d.y);
  });

  function drag(sim) {
    return d3
      .drag()
      .on("start", (e, d) => {
        if (!e.active) sim.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (e, d) => {
        d.fx = e.x;
        d.fy = e.y;
      })
      .on("end", (e, d) => {
        if (!e.active) sim.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });
  }
}

// --- Pseudonym Heatmap ---
d3.csv("pseudonym_pairs_full.csv").then((data) => {
  data.forEach((d) => (d.Similarity = +d.Similarity));

  const aliases = Array.from(
    new Set([
      ...data.map((d) => d["Given Name"]),
      ...data.map((d) => d["Pseudonym"]),
    ])
  );
  const scale = d3.scaleLinear().domain([0, 1]).range(["#f0f9e8", "#0868ac"]);

  const svg = d3.select("#heatmap"),
    w = +svg.attr("width"),
    h = +svg.attr("height"),
    cell = Math.min(w, h) / aliases.length;

  const g = svg.append("g").attr("transform", "translate(100,100)");

  g.selectAll("rect")
    .data(data)
    .join("rect")
    .attr("x", (d) => aliases.indexOf(d["Given Name"]) * cell)
    .attr("y", (d) => aliases.indexOf(d["Pseudonym"]) * cell)
    .attr("width", cell)
    .attr("height", cell)
    .attr("fill", (d) => scale(d.Similarity));

  g.selectAll(".xLabel")
    .data(aliases)
    .join("text")
    .attr("x", (d, i) => i * cell + cell / 2)
    .attr("y", -5)
    .attr("text-anchor", "end")
    .attr("transform", (d, i) => `rotate(-45,${i * cell + cell / 2},-5)`)
    .text((d) => d);

  g.selectAll(".yLabel")
    .data(aliases)
    .join("text")
    .attr("y", (d, i) => i * cell + cell / 2)
    .attr("x", -10)
    .attr("text-anchor", "end")
    .text((d) => d);
});
