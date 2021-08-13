class ScatterPlot {

  /**
   * Class constructor with basic chart configuration
   * @param _config {Object}
   * @param _data {Array}
   * @param _dispatcher {Object}
   */
  constructor(_config, _data, _dispatcher) {
    // Configuration object with defaults
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 1100,
      containerHeight: _config.containerHeight || 680,
      margin: _config.margin || {top: 10, right: 10, bottom: 35, left: 60},
      tooltipPadding: _config.tooltipPadding || 10,
      countCutoff: _config.countCutoff || 5,
    }
    _data = _data.filter(d => d.count >= this.config.countCutoff);
    _data.sort((d1, d2) => d2.count - d1.count);
    this.data = _data;
    this.dispatcher = _dispatcher;
    this.initVis();
  }

  initVis() {
    let vis = this;

    // Calculate inner chart size. Margin specifies the space around the actual chart.
    vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
    vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

    // Initialize scales and axes
    vis.xScale = d3.scaleLinear()
        .range([0, vis.width]);

    vis.yScale = d3.scaleLinear()
        .rangeRound([vis.height, 0]);

    vis.radiusScale = d3.scaleSqrt()
        .range([4, 30]);

    vis.xAxis = d3.axisBottom(vis.xScale)
        .tickValues([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
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

    vis.chart.append('text')
        .attr('class', 'axis-title')
        .attr('y', vis.height + 35)
        .attr('x', vis.width / 2)
        .style('text-anchor', 'middle')
        .text('Score');

    vis.updateVis();
  }

  updateVis() {
    let vis = this;
    vis.xScale.domain([Math.floor(d3.min(vis.data, d => d.mean)),
                       Math.ceil(d3.max(vis.data, d => d.mean))]);
    vis.yScale.domain([d3.max(vis.data, d => d['std_dev']), 0]);
    vis.radiusScale.domain([d3.min(vis.data, d => d.count),
                            d3.max(vis.data, d => d.count)]);
    vis.renderVis();
  }

  renderVis() {
    let vis = this;

    vis.chart.append('g')
        .attr('class', 'axis y-axis')
        .call(vis.yAxis);

    vis.chart.append('g')
        .attr('class', 'axis x-axis')
        .attr('transform', `translate(0,${vis.height})`)
        .call(vis.xAxis);

// Add circles
    const circles = vis.chart.selectAll('.point')
        .data(vis.data, d => d.label)
        .join('circle')
        .attr('class', 'point')
        .attr('r', d => vis.radiusScale(d.count))
        .attr('cy', d => vis.yScale(d['std_dev']))
        .attr('cx', d => vis.xScale(d.mean))
        .attr('fill', 'black');

    circles.on("mousemove", (event, d) => {
      d3.select('#tooltip')
          .style('display', 'block')
          .style('left', (event.pageX + vis.config.tooltipPadding) + 'px')
          .style('top', (event.pageY + vis.config.tooltipPadding) + 'px')
          .html(`<div class="tooltip-title">${d.label}</div>`);
      })
      .on('mouseleave', () => {
      d3.select('#tooltip').style('display', 'none');
      })
      .on('click', (event, d) => {
        vis.dispatcher.call('clickLabel', this, d);
        // vis.segmentClick(d);
      });
  }
}