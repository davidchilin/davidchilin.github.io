document.addEventListener("DOMContentLoaded", function () {
  var margin = { top: 20, right: 30, bottom: 80, left: 90 };
  var width = 960 - margin.left - margin.right;
  var height = 500 - margin.top - margin.bottom;

  var svg = d3
    .select("#profit-plot")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  // --- Select the tooltip div ---
  var tooltip = d3.select("#scatter-tooltip");

  d3.csv(
    "https://davidchilin.github.io/metadata_7.csv",
    function (error1, metadata) {
      if (error1) {
        console.error("Error loading metadata.csv: ", error1);
        return;
      }
      var titleMap = d3.map(metadata, function (d) {
        return d.imdb_id;
      });

      d3.csv(
        "https://davidchilin.github.io/usgross_mapping.csv",
        function (error2, grossData) {
          if (error2) {
            console.error("Error loading usgross_mapping.csv: ", error2);
            return;
          }

          var data = grossData
            .map(function (d) {
              var movieMeta = titleMap.get(d.imdb_id);
              return {
                imdb_id: d.imdb_id,
                pct_wht: +d.pct_wht,
                us_gross: +d.us_gross,
                title: movieMeta ? movieMeta.title : "Unknown Title",
              };
            })
            .filter(function (d) {
              return d.us_gross > 0 && d.title !== "Unknown Title";
            });

          var x = d3.scale.linear().domain([0, 1]).range([width, 0]);
          var y = d3.scale
            .linear()
            .domain([
              0,
              d3.max(data, function (d) {
                return d.us_gross;
              }),
            ])
            .range([height, 0]);
          var colorScale = d3.scale
            .linear()
            .domain([0, 0.5, 1])
            .range(["rgb(9,21,255)", "rgb(221,221,221)", "rgb(255,203,69)"]);

          var xAxis = d3.svg
            .axis()
            .scale(x)
            .orient("bottom")
            .tickFormat(d3.format(".0%"));
          var yAxis = d3.svg
            .axis()
            .scale(y)
            .orient("left")
            .tickFormat(function (d) {
              return "$" + d / 1000000 + "M";
            });

          svg
            .append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis);
          svg.append("g").attr("class", "y axis").call(yAxis);

          svg
            .append("text")
            .attr("class", "axis-label")
            .attr("transform", "rotate(-90)")
            .attr("y", 0 - margin.left + 20)
            .attr("x", 0 - height / 2)
            .text("Domestic Box Office Gross (USD)");
          svg
            .append("text")
            .attr("class", "axis-label")
            .attr("y", height + margin.top + 30)
            .attr("x", width / 2)
            .text("Percent of Dialogue by White Actors");

          // --- DRAW CIRCLES with animation and tooltips ---
          svg
            .append("g")
            .selectAll("dot")
            .data(data)
            .enter()
            .append("circle")
            .style("fill", function (d) {
              return colorScale(d.pct_wht);
            })
            .style("opacity", 0.7)
            .attr("cx", function (d) {
              return x(d.pct_wht);
            })
            .attr("cy", function (d) {
              return y(d.us_gross);
            })
            .attr("r", 0) // Start with radius 0 for animation
            .on("mouseover", function (d) {
              // Show and populate the tooltip
              tooltip
                .classed("hidden", false)
                .style("left", d3.event.pageX + 15 + "px")
                .style("top", d3.event.pageY - 28 + "px");

              tooltip.select("#title").text(d.title);
              tooltip.select("#white-pct").text(d3.format(".1%")(d.pct_wht));
              tooltip
                .select("#nonwhite-pct")
                .text(d3.format(".1%")(1 - d.pct_wht));
            })
            .on("mouseout", function () {
              // Hide the tooltip
              tooltip.classed("hidden", true);
            })
            .transition() // Add entrance animation
            .duration(1000)
            .attr("r", 5); // Transition to final radius

          // --- DRAW CIRCLES with animation and tooltips ---
          svg
            .append("g")
            .selectAll("dot")
            .data(data)
            .enter()
            .append("circle")
            .style("fill", function (d) {
              return colorScale(d.pct_wht);
            })
            .style("opacity", 0.7)
            .attr("cx", function (d) {
              return x(d.pct_wht);
            })
            .attr("cy", function (d) {
              return y(d.us_gross);
            })
            .attr("r", 0)
            .on("mouseover", function (d) {
              var nonWhitePct = (1 - d.pct_wht) * 100;
              var whitePct = d.pct_wht * 100;

              tooltip
                .classed("hidden", false)
                .style("left", d3.event.pageX + 15 + "px")
                .style("top", d3.event.pageY - 28 + "px");

              tooltip.html(
                `<strong>${d.title}</strong><p><span class="tooltip-label">NONWHITE WORDS</span><span class="tooltip-bar-container"><span class="tooltip-bar nonwhite-bar" style="width: ${nonWhitePct}%"></span></span><span class="tooltip-percentage">${d3.format(".0f")(nonWhitePct)}%</span></p><p><span class="tooltip-label">WHITE WORDS</span><span class="tooltip-bar-container"><span class="tooltip-bar white-bar" style="width: ${whitePct}%"></span></span><span class="tooltip-percentage">${d3.format(".0f")(whitePct)}%</span></p>`,
              );
            })
            .on("mouseout", function () {
              tooltip.classed("hidden", true);
            })
            .transition()
            .duration(1000)
            .attr("r", 5);

          // --- Trendline ---
          var xSeries = data.map(function (d) {
            return d.pct_wht;
          });
          var ySeries = data.map(function (d) {
            return d.us_gross;
          });
          var leastSquaresCoeff = linearRegression(ySeries, xSeries);

          var x1 = d3.min(xSeries);
          var y1 = leastSquaresCoeff.slope * x1 + leastSquaresCoeff.intercept;
          var x2 = d3.max(xSeries);
          var y2 = leastSquaresCoeff.slope * x2 + leastSquaresCoeff.intercept;

          svg
            .append("line")
            .attr("class", "trendline")
            .attr("x1", x(x1))
            .attr("y1", y(y1))
            .attr("x2", x(x2))
            .attr("y2", y(y2));
        },
      );
    },
  );
});

function linearRegression(y, x) {
  var lr = {};
  var n = y.length;
  var sum_x = 0,
    sum_y = 0,
    sum_xy = 0,
    sum_xx = 0,
    sum_yy = 0;
  for (var i = 0; i < y.length; i++) {
    sum_x += x[i];
    sum_y += y[i];
    sum_xy += x[i] * y[i];
    sum_xx += x[i] * x[i];
    sum_yy += y[i] * y[i];
  }
  lr["slope"] = (n * sum_xy - sum_x * sum_y) / (n * sum_xx - sum_x * sum_x);
  lr["intercept"] = (sum_y - lr.slope * sum_x) / n;
  lr["r2"] = Math.pow(
    (n * sum_xy - sum_x * sum_y) /
      Math.sqrt((n * sum_xx - sum_x * sum_x) * (n * sum_yy - sum_y * sum_y)),
    2,
  );

  // NEW CODE - This line was missing
  return lr;
}
