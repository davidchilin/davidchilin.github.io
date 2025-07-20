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
      const grossData = files[0];
      const metadata = files[1];

      // Create a map for quick title lookup
      const titleMap = new Map(metadata.map((d) => [d.imdb_id, d.title]));

      // Process and merge data
      const data = grossData
        .map((d) => {
          return {
            imdb_id: d.imdb_id,
            pct_wht: +d.pct_wht,
            us_gross: +d.us_gross,
            title: titleMap.get(d.imdb_id) || "Unknown Title",
          };
        })
        .filter((d) => d.us_gross > 0 && d.title !== "Unknown Title"); // Filter out movies with no gross or title

      // --- 3. SCALES ---
      const x = d3
        .scaleLinear()
        .domain([0, 1]) // pct_wht is a percentage (0 to 1)
        .range([0, width]);

      const y = d3
        .scaleLinear()
        .domain([0, d3.max(data, (d) => d.us_gross)])
        .range([height, 0]);

      // --- 4. AXES ---
      svg
        .append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d3.format(".0%"))); // Format as percentage

      svg
        .append("g")
        .call(d3.axisLeft(y).tickFormat((d) => `$${d / 1000000}M`)); // Format as millions of dollars

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
