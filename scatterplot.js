document.addEventListener("DOMContentLoaded", function () {
  // Controller for scroll animations
  var scrollMagicController = new ScrollMagic.Controller();

  // D3 variables that need to be accessible across functions
  var svg, x, y, colorScale, data;
  var margin = { top: 20, right: 30, bottom: 80, left: 90 };
  var width = 960 - margin.left - margin.right;
  var height = 500 - margin.top - margin.bottom;

  // --- Main function to draw the chart ---
  function drawPlot(containerId) {
    svg = d3
      .select(containerId)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

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

            data = grossData
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

            // --- SCALES ---
            x = d3.scale.linear().domain([0, 1]).range([width, 0]);
            y = d3.scale
              .linear()
              .domain([
                0,
                d3.max(data, function (d) {
                  return d.us_gross;
                }),
              ])
              .range([height, 0]);
            colorScale = d3.scale
              .linear()
              .domain([0, 0.5, 1])
              .range(["rgb(9,21,255)", "rgb(221,221,221)", "rgb(255,203,69)"]);

            // --- AXES ---
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

            svg.append("line").attr("class", "trendline");
            svg
              .append("g")
              .attr("class", "circle-container")
              .selectAll("circle")
              .data(data, function (d) {
                return d.imdb_id;
              }) // Key function for object constancy
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
                  .style("top", d3.event.pageY - 28 + "px")
                  .html(
                    `<strong>${d.title}</strong><p><span class="tooltip-label">NONWHITE WORDS</span><span class="tooltip-bar-container"><span class="tooltip-bar nonwhite-bar" style="width: ${nonWhitePct}%"></span></span><span class="tooltip-percentage">${d3.format(".0f")(nonWhitePct)}%</span></p><p><span class="tooltip-label">WHITE WORDS</span><span class="tooltip-bar-container"><span class="tooltip-bar white-bar" style="width: ${whitePct}%"></span></span><span class="tooltip-percentage">${d3.format(".0f")(whitePct)}%</span></p>`,
                  );
              })
              .on("mouseout", function () {
                tooltip.classed("hidden", true);
              })
              .transition()
              .duration(1000)
              .attr("r", 5);

            updatePlot(1); // Draw initial trendline for step 1
            setupScroll();
          },
        );
      },
    );
  }

  // --- Function to update chart for zoom ---
  function updatePlot(step) {
    var yMin = 0;
    if (step === 2) yMin = 100000000; // $100M
    if (step === 3) yMin = 250000000; // $250M

    var newYDomain = [
      yMin,
      d3.max(data, function (d) {
        return d.us_gross;
      }),
    ];
    y.domain(newYDomain);

    // Update Y axis with a smooth transition
    var yAxis = d3.svg
      .axis()
      .scale(y)
      .orient("left")
      .tickFormat(function (d) {
        return "$" + d / 1000000 + "M";
      });
    svg.select(".y.axis").transition().duration(1000).call(yAxis);

    // Update circle positions and visibility
    svg
      .selectAll(".circle-container circle")
      .transition()
      .duration(1000)
      .attr("cy", function (d) {
        return y(d.us_gross);
      })
      .attr("r", function (d) {
        // Hide circles that are outside the new domain by setting radius to 0
        return d.us_gross >= newYDomain[0] ? 5 : 0;
      });

    // Filter data for the current view to calculate new trendline
    var filteredData = data.filter(function (d) {
      return d.us_gross >= yMin;
    });

    if (filteredData.length > 1) {
      var xSeries = filteredData.map(function (d) {
        return d.pct_wht;
      });
      var ySeries = filteredData.map(function (d) {
        return d.us_gross;
      });
      var leastSquaresCoeff = linearRegression(ySeries, xSeries);
      var x1 = d3.min(xSeries),
        y1 = leastSquaresCoeff.slope * x1 + leastSquaresCoeff.intercept;
      var x2 = d3.max(xSeries),
        y2 = leastSquaresCoeff.slope * x2 + leastSquaresCoeff.intercept;

      svg
        .select(".trendline")
        .style("opacity", 1)
        .transition()
        .duration(1000)
        .attr("x1", x(x1))
        .attr("y1", y(y1))
        .attr("x2", x(x2))
        .attr("y2", y(y2));
    } else {
      svg.select(".trendline").style("opacity", 0);
    }
  }

  // --- Setup ScrollMagic scenes ---
  function setupScroll() {
    // Calculate a more precise duration to reduce the gap
    var textHeight = document.querySelector(".scroll__text").offsetHeight;
    var plotHeight = document.querySelector(
      "#profit-pin-container",
    ).offsetHeight;
    var duration = textHeight - plotHeight + window.innerHeight;

    new ScrollMagic.Scene({
      triggerElement: "#profit-viz-container",
      triggerHook: "onLeave",
      duration: duration,
    })
      .setPin("#profit-pin-container")
      .addTo(scrollMagicController);

    // Scene 2: Trigger updates on steps
    d3.selectAll(".scroll__text .step").each(function () {
      var step = d3.select(this);
      new ScrollMagic.Scene({
        triggerElement: this,
        triggerHook: 0.8, // Trigger when a step is 80% from top of the viewport
      })
        .on("enter", function () {
          updatePlot(+step.attr("data-step"));
        })
        .on("leave", function (e) {
          // When scrolling back up, trigger the previous step's update
          if (e.scrollDirection === "REVERSE") {
            updatePlot(+step.attr("data-step") - 1);
          }
        })
        .addTo(scrollMagicController);
    });
  }

  // --- Helper function to calculate linear regression ---
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
    return lr;
  }

  // Start the whole process
  drawPlot("#profit-plot");
});
