class ScatterPlot {

  /**
   * Class constructor with basic chart configuration
   * @param _config {Object}
   * @param _data {Array}
   * @param _dispatcher {Object}
   * @param _tooltipConfig {LineChart}
   */
  constructor(_config, _data, _dispatcher, _tooltipConfig) {
    // Configuration object with defaults
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 1100,
      containerHeight: _config.containerHeight || 680,
      margin: _config.margin || {top: 30, right: 20, bottom: 35, left: 60},
      legendTransform: _config.legendTransform || {down: 15, right: 20},
      tooltipPadding: _config.tooltipPadding || 10,
      tooltipSafetyPadding: _config.tooltipSafetyPadding || 10, // HACK: not ideal
      countCutoff: _config.countCutoff || 5,
    }
    _data = _data.filter(d => d.count >= this.config.countCutoff);
    _data.sort((d1, d2) => d2.count - d1.count);
    this.data = _data;
    this.genres = _data.map(d => d['majority_genre']).sort();
    this.dispatcher = _dispatcher;
    this.tooltipConfig = _tooltipConfig;
    this.selectedGenres = new Set();
    this.initVis();
  }

  initVis() {
    let vis = this;

    // Calculate inner chart size. Margin specifies the space around the actual chart.
    vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
    vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

    // Initialize scales and axes
    vis.xScale = d3.scaleLinear()
        .range([0, vis.width])
        .domain([Math.floor(d3.min(vis.data, d => d.mean)),
          Math.ceil(d3.max(vis.data, d => d.mean))]);

    vis.yScale = d3.scaleLinear()
        .rangeRound([vis.height, 0])
        .domain([d3.max(vis.data, d => d['std_dev']), 0]);

    vis.radiusScale = d3.scaleSqrt()
        .range([4, 30])
        .domain([d3.min(vis.data, d => d.count),
          d3.max(vis.data, d => d.count)]);

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
        .text('score');

    vis.chart.append('text')
        .attr('class', 'axis-title')
        .attr('transform', `translate(-45,-10)`)
        .style('text-anchor', 'start')
        .text('standard deviation');

    vis.colorScale = d3.scaleOrdinal()
        .domain(vis.genres)
        .range(d3.schemeCategory10);

    vis.legend = d3.legendColor()
        .scale(vis.colorScale)
        .shapePadding(6);

    vis.chart.append('g')
        .attr('class', 'axis y-axis')
        .call(vis.yAxis);

    vis.chart.append('g')
        .attr('class', 'axis x-axis')
        .attr('transform', `translate(0,${vis.height})`)
        .call(vis.xAxis);

    vis.legendG = vis.chart.append('g')
        .attr("transform", `translate(${vis.config.legendTransform.right},${vis.config.legendTransform.down})`)
        .call(vis.legend);

    vis.chart.selectAll('.swatch')
        .classed("translucent", true);

    vis.updateVis();
  }

  updateVis() {
    let vis = this;

    vis.filteredData = vis.data.filter(d => {
      if (vis.selectedGenres.size === 0) {
        return true;
      } else {
        const genre = d['majority_genre'];
        return vis.selectedGenres.has(genre);
      }
    });

    vis.renderVis();
  }

  renderVis() {
    let vis = this;

    // Add circles
    const circles = vis.chart.selectAll('.label-mark')
        .data(vis.filteredData, d => d.label)
        .join('circle')
        .attr('class', 'label-mark')
        .attr('r', d => vis.radiusScale(d.count))
        .attr('cy', d => vis.yScale(d['std_dev']))
        .attr('cx', d => vis.xScale(d.mean))
        .attr('fill', d => vis.colorScale(d['majority_genre']));

    circles.on("mouseenter", (event, d) => {
        d3.select('#label-tooltip').style('display', 'block');
        vis.onMouseEnterOrMove(event, d, true);
      })
      .on("mousemove", event => {
        vis.onMouseEnterOrMove(event, null, false);
      })
      .on('mouseleave', () => {
        d3.select('#label-tooltip').style('display', 'none');
      })
      .on('click', (event, d) => {
        vis.dispatcher.call('clickLabel', this, d);
      });

    vis.chart.selectAll('.cell')
        .on("click", (event, d) => {
          vis.activateGenre(d);
        });
  }

  activateGenre(genre) {
    let vis = this;
    if (vis.selectedGenres.has(genre)) {
      vis.selectedGenres.delete(genre);
    } else {
      vis.selectedGenres.add(genre);
    }
    vis.updateVis();
  }

  onMouseEnterOrMove(event, d, shouldCallHoverLabel) {
    let vis = this;

    const padding = vis.config.tooltipPadding + vis.config.tooltipSafetyPadding
    const windowBottom = event.clientY + vis.tooltipConfig.containerHeight + padding;
    const windowRight = event.clientX + vis.tooltipConfig.containerWidth + padding;

    d3.select('#label-tooltip')
        .style('top', windowBottom < window.innerHeight ?
          (event.pageY + vis.config.tooltipPadding)
            : (event.pageY - 3 * vis.config.tooltipPadding - vis.tooltipConfig.containerHeight) + 'px')
        .style('left', windowRight < window.innerWidth ?
          (event.pageX + vis.config.tooltipPadding)
            : (event.pageX - 3 * vis.config.tooltipPadding - vis.tooltipConfig.containerWidth) + 'px');

    if (shouldCallHoverLabel) {
      vis.dispatcher.call('hoverLabel', event, d);
    }
  }
}