class StackedHistogram {

  /**
   * Class constructor with basic chart configuration
   * @param _config {Object}
   * @param _data {Array}
   * @param _genres {Set}
   * @param _dispatcher {Object}
   */
  constructor(_config, _data, _genres, _dispatcher) {
    // Configuration object with defaults
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 1100,
      containerHeight: _config.containerHeight || 680,
      margin: _config.margin || {top: 10, right: 10, bottom: 35, left: 60},
      legendTransform: _config.legendTransform || {down: 15, right: 20},
      tooltipPadding: _config.tooltipPadding || 10,
    }
    this.data = _data;
    this.data.forEach(review => {
      if (review['genres'].length === 0) {
        review['genres'].push('No genre specified');
      }
    });
    this.genreProperties = {};
    const genreKeys = [];
    _genres.forEach(genre => {
      this.genreProperties[genre] = {
        value: 0,
        enumerable: true,
        writable: true,
      };
      genreKeys.push(genre);
    });
    genreKeys.sort();
    this.genreKeys = genreKeys;
    this.selectedGenres = new Set();
    this.dispatcher = _dispatcher;
    this.activeSegment = null;
    this.initVis();
  }

  initVis() {
    let vis = this;

    // Calculate inner chart size. Margin specifies the space around the actual chart.
    vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
    vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

    // Initialize scales and axes
    vis.xScale = d3.scaleBand()
        .range([0, vis.width])
        .paddingInner(0.1);

    vis.yScale = d3.scaleLinear()
        .rangeRound([vis.height, 0]);

    vis.xAxis = d3.axisBottom(vis.xScale)
        .tickValues([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
        .tickSize(5)
        .tickSizeOuter(0);

    vis.yAxis = d3.axisLeft(vis.yScale)
        .ticks(7)
        .tickSize(-vis.width)
        .tickSizeOuter(0);

    // Define size of SVG drawing area
    vis.svg = d3.select(vis.config.parentElement)
        .attr('width', vis.config.containerWidth)
        .attr('height', vis.config.containerHeight);

    // SVG Group containing the actual chart; D3 margin convention
    vis.chart = vis.svg.append('g')
        .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);

    // x axis title
    vis.chart.append('text')
        .attr('class', 'axis-title')
        .attr('y', vis.height + 35)
        .attr('x', vis.width / 2)
        .style('text-anchor', 'middle')
        .text('score');

    vis.chart.append('text')
        .attr('class', 'axis-title')
        .attr('transform', `translate(-45,15)`)
        .style('text-anchor', 'start')
        .text('count');

    vis.updateVis();
  }

  updateVis() {
    // process our raw data
    let vis = this;
    let scores = [];
    for (let i = 0; i < 101; i++) {
      const score = i / 10.0;
      const obj = {score: score, None: 0.0};
      Object.defineProperties(obj, vis.genreProperties);
      scores.push(obj);
    }

    const filteredData = vis.data.filter(d => {
      if (vis.selectedGenres.size === 0) {
        return true;
      } else {
        const genres = d['genres'];
        for (const genre of genres) {
          if (vis.selectedGenres.has(genre)) {
            return true;
          }
        }
        return false;
      }
    });

    filteredData.forEach(review => {
      const scoreIndex = review['score'] * 10;
      const genres = review['genres'];
      const noGenresSelected = vis.selectedGenres.size === 0;
      genres.forEach(genre => {
        if (noGenresSelected || vis.selectedGenres.has(genre)) {
          scores[scoreIndex][genre] += 1.0 / genres.length;
        }
      });
    });

    vis.series = d3.stack()
        .keys(this.genreKeys)(scores)
        .map(d => (d.forEach(v => v.key = d.key), d));

    if (vis.activeSegment !== null) {
      for (const genre of vis.series) {
        if (vis.activeSegment.genre === genre.key) {
          for (const score of genre) {
            if (vis.activeSegment.score === score.data.score) {
              score.active = true;
              break;
            }
          }
          break;
        }
      }
    }

    vis.xScale.domain(scores.map(d => d.score));

    vis.yScale.domain([0, d3.max(vis.series, d => d3.max(d, d => d[1]))]);

    vis.colorScale = d3.scaleOrdinal()
        .domain(vis.genreKeys)
        .range(d3.schemeCategory10);

    vis.legend = d3.legendColor()
        .scale(vis.colorScale)
        .ascending(true)
        .shapePadding(6);

    vis.renderVis();
  }

  renderVis() {
    let vis = this;

    vis.chart.selectAll("g")
        .data(vis.series)
        .join("g")
          .attr("fill", d => vis.colorScale(d.key))
        .selectAll("rect")
        .data(d => d)
        .join("rect")
          .attr("x", d => vis.xScale(d.data.score))
          .attr("y", d => vis.yScale(d[1]))
          .attr("class", "bar")
          .attr("height", d => vis.yScale(d[0]) - vis.yScale(d[1]))
          .attr("width", vis.xScale.bandwidth())
          .classed("active", d => d.active)
        .on("mousemove", (event, d) => {
          d3.select('#tooltip')
              .style('display', 'block')
              .style('left', (event.pageX + vis.config.tooltipPadding) + 'px')
              .style('top', (event.pageY + vis.config.tooltipPadding) + 'px')
              .html(`
              <div class="tooltip-title">${d.key}, <b>${d.data.score.toFixed(1)}</b></div>
              <div class="tooltip-body"><b>${d.data[d.key].toFixed(2)}</b> reviews</div>
              `);
        })
        .on('mouseleave', () => {
          d3.select('#tooltip').style('display', 'none');
        })
        .on('click', (event, d) => {
          vis.dispatcher.call('clickSegment', this, d);
          vis.segmentClick(d);
        });

    // Append empty x-axis group and move it to the bottom of the chart
    vis.xAxisG = vis.chart.append('g')
        .attr('class', 'axis x-axis')
        .attr('transform', `translate(0,${vis.height})`)
        .call(vis.xAxis);

    // Append y-axis group
    vis.yAxisG = vis.chart.append('g')
        .attr('class', 'axis y-axis')
        .call(vis.yAxis);

    vis.legendG = vis.chart.append('g')
        .attr("transform", `translate(${vis.config.legendTransform.right},${vis.config.legendTransform.down})`)
        .call(vis.legend);

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

  segmentClick(data) {
    let vis = this;
    if (vis.activeSegment !== null &&
        vis.activeSegment.genre === data.key &&
        vis.activeSegment.score === data.data.score) {
      vis.activeSegment = null;
    }
    else {
      vis.activeSegment = {
        genre: data.key,
        score: data.data.score
      };
    }
    vis.updateVis();
  }
}