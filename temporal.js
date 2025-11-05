function drawHourlyChart(dataPath = "weekly_hourly_counts.json") {
  d3.json(dataPath).then(data => {
    const svg = d3.select("#hourlyChartSVG");
    const width = +svg.attr("width");
    const height = +svg.attr("height");
    svg.selectAll("*").remove();

    const margin = { top: 40, right: 40, bottom: 50, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // --- Parse Data ---
    data.forEach(d => {
      d.week = +d.week;
      d.hour = +d.hour;
      d.count = +d.count;
    });

    // --- Scales ---
    const x = d3.scaleLinear()
      .domain([8, 14])
      .range([0, innerWidth]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.count)]).nice()
      .range([innerHeight, 0]);

    const color = d3.scaleOrdinal()
      .domain([1, 2])
      .range(["#1f77b4", "#ff7f0e"]);

    // --- Tooltip ---
    const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("background", "white")
      .style("border", "1px solid #999")
      .style("padding", "6px 10px")
      .style("border-radius", "6px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("opacity", 0);

    // --- Group Data by Week ---
    const weeks = d3.groups(data, d => d.week);

    const line = d3.line()
      .x(d => x(d.hour))
      .y(d => y(d.count))
      .curve(d3.curveMonotoneX);

    // --- Axes ---
    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).tickValues(d3.range(8, 15)).tickFormat(d3.format("d")));

    g.append("g").call(d3.axisLeft(y));

    // --- Gridlines ---
    g.append("g")
      .attr("class", "grid")
      .call(
        d3.axisLeft(y)
          .tickSize(-innerWidth)
          .tickFormat("")
      )
      .selectAll("line")
      .attr("stroke", "#eee");

    // --- Draw Animated Lines ---
    weeks.forEach(([week, values]) => {
      const path = g.append("path")
        .datum(values)
        .attr("fill", "none")
        .attr("stroke", color(week))
        .attr("stroke-width", 2)
        .attr("d", line);

      const totalLength = path.node().getTotalLength();

      // Animate line drawing
      path
        .attr("stroke-dasharray", totalLength + " " + totalLength)
        .attr("stroke-dashoffset", totalLength)
        .transition()
        .duration(2000)
        .ease(d3.easeCubicOut)
        .attr("stroke-dashoffset", 0);
    });

// --- Draw Dots + Tooltip Interactivity ---
weeks.forEach(([week, values]) => {
  g.selectAll(`.dot-week${week}`)
    .data(values)
    .join("circle")
    .attr("class", `dot-week${week}`)
    .attr("cx", d => x(d.hour))
    .attr("cy", d => y(d.count))
    .attr("r", 5)
    .attr("fill", color(week))
    .attr("opacity", 0) // start hidden
    .style("cursor", "pointer")
    .on("mouseover", function (event, d) {
      tooltip.transition().duration(200).style("opacity", 1);
      tooltip.html(
        `<b>Week:</b> ${d.week}<br/>
         <b>Hour:</b> ${d.hour}:00<br/>
         <b>Count:</b> ${d.count}`
      )
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
      d3.select(this).attr("r", 7);
    })
    .on("mousemove", (event) => {
      tooltip.style("left", (event.pageX + 10) + "px")
             .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function () {
      tooltip.transition().duration(300).style("opacity", 0);
      d3.select(this).attr("r", 5);
    })
    // 👇 This is the animation for dots appearing after line draw
    .transition()
    .delay(1800)     // wait for the line animation (~2 seconds)
    .duration(600)   // fade in smoothly
    .attr("opacity", 1);
});

    // --- Axis Labels ---
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height - 10)
      .attr("text-anchor", "middle")
      .attr("font-size", 12)
      .text("Hour of Day");

    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", 15)
      .attr("text-anchor", "middle")
      .attr("font-size", 12)
      .text("Number of Communications");

    // --- Legend (Horizontal) ---
    const legend = svg.append("g")
      .attr("transform", `translate(${width / 2 - 80}, 10)`);

    const legendItems = legend.selectAll(".legend-item")
      .data([1, 2])
      .join("g")
      .attr("class", "legend-item")
      .attr("transform", (_, i) => `translate(${i * 100}, 0)`);

    legendItems.append("circle")
      .attr("r", 6)
      .attr("fill", color);

    legendItems.append("text")
      .attr("x", 12)
      .attr("y", 4)
      .text(d => `Week ${d}`)
      .attr("font-size", 12);
  });
}

// --- Trigger Animation When Opening the Temporal Tab ---

document.addEventListener("DOMContentLoaded", () => {
  // Initial draw for Temporal tab
  drawHourlyChart();

  // Redraw when user clicks the Temporal tab
  const temporalButton = document.querySelector("button[onclick*='Temporal']");
  temporalButton.addEventListener("click", () => {
    drawHourlyChart();
  });
});
