document.addEventListener("DOMContentLoaded", function () {
  // --- 1. SETUP ---
  const margin = { top: 20, right: 30, bottom: 40, left: 90 };
  const width = 960 - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;

  const svg = d3
    .select("#profit-plot")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // --- 2. DATA LOADING & PROCESSING ---
  Promise.all([
    d3.csv("https://davidchilin.github.io/usgross_mapping.csv"),
    d3.csv("https://davidchilin.github.io/metadata_7.csv"),
  ])
    .then(function (files) {
      // ==> LOG 1: Check if files are loaded
      console.log("Loaded files:", files);

      const grossData = files[0];
      const metadata = files[1];

      const titleMap = new Map(metadata.map((d) => [d.imdb_id, d.title]));

      const data = grossData
        .map((d) => {
          return {
            imdb_id: d.imdb_id,
            pct_wht: +d.pct_wht, // Convert to number
            us_gross: +d.us_gross, // Convert to number
            title: titleMap.get(d.imdb_id) || "Unknown Title",
          };
        })
        .filter((d) => d.us_gross > 0 && d.title !== "Unknown Title");

      // ==> LOG 2: Check the final merged data
      console.log("Final processed data:", data);
      console.log("Number of data points:", data.length);

      // Exit if no data to plot
      if (data.length === 0) {
        console.error(
          "No data available to plot after processing. Halting script.",
        );
        return;
      }

      // --- 3. SCALES ---
      const x = d3.scaleLinear().domain([0, 1]).range([0, width]);

      const y = d3
        .scaleLinear()
        .domain([0, d3.max(data, (d) => d.us_gross)])
        .range([height, 0]);

      // ==> LOG 3: Check the scale domains
      console.log("Y-axis domain:", y.domain());

      // --- 4. AXES ---
      // ... (rest of the code is likely fine if data is the issue)
      svg
        .append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d3.format(".0%")));

      svg
        .append("g")
        .call(d3.axisLeft(y).tickFormat((d) => `$${d / 1000000}M`));

      // --- 5. DRAW CIRCLES ---
      svg
        .append("g")
        .selectAll("dot")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", (d) => x(d.pct_wht))
        .attr("cy", (d) => y(d.us_gross))
        .attr("r", 5)
        .style("fill", "#69b3a2")
        .style("opacity", 0.7);
    })
    .catch(function (error) {
      console.log("Error loading the data: " + error);
    });
});
