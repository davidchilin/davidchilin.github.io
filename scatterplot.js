document.addEventListener("DOMContentLoaded", function () {
  // --- 1. SETUP ---
  var margin = { top: 20, right: 30, bottom: 40, left: 90 };
  var width = 960 - margin.left - margin.right;
  var height = 500 - margin.top - margin.bottom;

  var svg = d3
    .select("#profit-plot")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  // --- 2. DATA LOADING (D3 v3 compatible) ---
  d3.queue()
    .defer(d3.csv, "https://davidchilin.github.io/usgross_mapping.csv")
    .defer(d3.csv, "https://davidchilin.github.io/metadata_7.csv")
    .await(ready);

  function ready(error, grossData, metadata) {
    if (error) {
      console.error("Error loading the data: ", error);
      return;
    }

    // Create a map for quick title lookup from metadata
    var titleMap = d3.map(metadata, function (d) {
      return d.imdb_id;
    });

    // Process and merge data
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

    console.log("Final processed data:", data);
    console.log("Number of data points:", data.length);

    // --- 3. SCALES ---
    var x = d3.scale
      .linear()
      .domain([0, 1]) // pct_wht is a percentage (0 to 1)
      .range([0, width]);

    var y = d3.scale
      .linear()
      .domain([
        0,
        d3.max(data, function (d) {
          return d.us_gross;
        }),
      ])
      .range([height, 0]);

    // --- 4. AXES ---
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

    // --- 5. DRAW CIRCLES ---
    svg
      .append("g")
      .selectAll("dot")
      .data(data)
      .enter()
      .append("circle")
      .attr("r", 5)
      .attr("cx", function (d) {
        return x(d.pct_wht);
      })
      .attr("cy", function (d) {
        return y(d.us_gross);
      })
      .style("fill", "#69b3a2")
      .style("opacity", 0.7);
  }
});
