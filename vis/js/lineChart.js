class LineChart {

  /**
   * Class constructor with basic chart configuration
   * @param _config {Object}
   */
  constructor(_config) {
    // Configuration object with defaults
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 400,
      containerHeight: _config.containerHeight || 300,
      margin: _config.margin || {top: 30, right: 20, bottom: 75, left: 30},
    }
    this.initVis();
  }

  initVis() {
    let vis = this;

    // Calculate inner chart size. Margin specifies the space around the actual chart.
    vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
    vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

    // Initialize scales and axes
    vis.xScale = d3.scaleTime()
        .range([0, vis.width]);

    vis.yScale = d3.scaleLinear()
        .range([vis.height, 0])
        .domain([0, 10]);

    vis.xAxis = d3.axisBottom(vis.xScale)
        .tickSize(-vis.height)
        .tickSizeOuter(0)
        .tickPadding(10);

    vis.yAxis = d3.axisLeft(vis.yScale)
        .tickSize(-vis.width)
        .tickSizeOuter(0);

    // Define size of SVG drawing area
    vis.svg = d3.select(vis.config.parentElement)
        .attr('width', vis.config.containerWidth)
        .attr('height', vis.config.containerHeight);

    // SVG Group containing the actual chart; D3 margin convention
    vis.chart = vis.svg.append('g')
        .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);

    vis.xAxisG = vis.chart.append('g')
        .attr('class', 'axis x-axis')
        .attr('transform', `translate(0,${vis.height})`);

    // Append y-axis group
    vis.yAxisG = vis.chart.append('g')
        .attr('class', 'axis y-axis');

    vis.chart.append('text')
        .attr('class', 'axis-title')
        .attr('y', vis.height + 65)
        .attr('x', vis.width / 2)
        .style('text-anchor', 'middle')
        .text('publication date');

    vis.chart.append('text')
        .attr('class', 'axis-title')
        .attr('transform', `translate(-25,-10)`)
        .style('text-anchor', 'start')
        .text('score');

    vis.chart.append("text")
        .attr('class', 'tooltip-title')
        .attr('transform', `translate(${vis.width / 2}, -15)`)
        .style('text-anchor', 'middle')
        .attr('id', "label-tooltip-title");
  }

  updateVis(title = "", data = []) {
    let vis = this;

    vis.data = data;
    d3.select("#label-tooltip-title")
        .text(title);
    vis.xScale.domain([d3.min(vis.data, d => d.publish_date),
      d3.max(vis.data, d => d.publish_date)]);

    vis.renderVis();
  }

  renderVis() {
    let vis = this;

    vis.chart.selectAll("path")
        .remove();

    vis.chart.append("path")
        .datum(vis.data)
        .attr("fill", "none")
        .attr("stroke", "#bbb")
        .attr("stroke-width", 1.5)
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round")
        .attr("d", d3.line()
            .defined(d => !isNaN(d.score))
            .x(d => vis.xScale(d.publish_date))
            .y(d => vis.yScale(d.score)));

    vis.chart.selectAll('.point')
        .data(vis.data, d => d.label)
        .join('circle')
        .attr('class', 'point')
        .attr('r', 2)
        .attr('cy', d => vis.yScale(d.score))
        .attr('cx', d => vis.xScale(d.publish_date));

    // Update axes
    vis.xAxisG.call(vis.xAxis)
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-65)");
        // .selectAll(".tick").each(function(d) {
          // TODO: reformat from %B to %b
          //  and make years bold!
        // });
    vis.yAxisG.call(vis.yAxis);
  }
}