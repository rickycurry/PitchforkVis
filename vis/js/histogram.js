class StackedHistogram {

  /**
   * Class constructor with basic chart configuration
   * @param _config {Object}
   * @param _data {Array}
   * @param _genres {Array[genre, count]}
   * @param _dispatcher {Object}
   */
  constructor(_config, _data, _genres, _dispatcher) {
    // Configuration object with defaults
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 1100,
      containerHeight: _config.containerHeight || 680,
      margin: _config.margin || {top: 10, right: 15, bottom: 35, left: 60},
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
    this.genreKeys = [];
    this.defaultPalette = dark6;
    const genreLimit = this.defaultPalette.length;
    
    const genres = _genres.map(d => d[0]);
    genres.forEach(genre => {
      this.genreProperties[genre] = {
        value: 0,
        enumerable: true,
        writable: true,
      };
      this.genreKeys.push(genre);
    });

    // We condense down to (genreLimit) genres to respect color perceptual principles
    this.primaryGenres = new Set(genres.slice(0, genreLimit - 1));
    this.primaryGenres.add("Various");
    this.secondaryGenres = new Set(genres.slice(genreLimit - 1));
    this.secondaryGenres.add("Return to primary view");

    this.selectedGenres = new Set();
    this.dispatcher = _dispatcher;
    this.isPrimaryMode = true;
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

    this.processData();

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
        .attr('transform', `translate(-45,0)`)
        .style('text-anchor', 'start')
        .text('count');

    vis.colorScale = d3.scaleOrdinal()
        .range(vis.defaultPalette);

    vis.legend = d3.legendColor()
        .scale(vis.colorScale)
        .shapePadding(6);

    vis.updateVis();
  }

  updateVis() {
    let vis = this;

    let filteredTidyData;
    if (vis.isPrimaryMode) {
      vis.colorScale.domain(vis.primaryGenres);
      const condensedTidyData = vis.tidyData.filter(d => vis.primaryGenres.has(d.genre));
      const dataToCondense = vis.tidyData.filter(d => vis.secondaryGenres.has(d.genre));
      const condenseMap = new Map();
      dataToCondense.forEach(d => {
        let scoreCount = condenseMap.get(d.score);
        scoreCount === undefined ? condenseMap.set(d.score, d.count) : condenseMap.set(d.score, scoreCount + d.count);
      });
      const condensedData = Array.from(condenseMap, (d) => {return {"count": d[1], "genre": "Various", "score": d[0]}});
      const combinedCondensedTidyData = condensedTidyData.concat(condensedData);

      filteredTidyData = combinedCondensedTidyData;
    } else {
      vis.colorScale.domain(vis.secondaryGenres);
      filteredTidyData = vis.tidyData.filter(d => vis.secondaryGenres.has(d.genre));
    }

    filteredTidyData = filteredTidyData.filter(d => {
      if (vis.selectedGenres.size === 0) return true;
      else return vis.selectedGenres.has(d.genre);
    });

    vis.series = d3.stack()
        .order(d3.stackOrderAscending)
        .keys(d3.union(filteredTidyData.map(d => d.genre))) 
        .value(([, group], key) => group.get(key).count)
      (d3.index(filteredTidyData, d => d.score, d => d.genre));

    vis.yScale.domain([0, d3.max(vis.series, d => d3.max(d, d => d[1]))]);

    vis.renderVis();
  }

  renderVis() {
    let vis = this;

    vis.chart.selectAll("g")
        .data(vis.series, d => d ? d.key : this.id)
        .join("g")
          .attr("class", "genre-group")
          .attr("fill", d => vis.colorScale(d.key))
        .selectAll("rect")
        .data(D => D.map(d => (d.key = D.key, d)))
        .join("rect")
          .attr("x", d => vis.xScale(d.data[0]))
          .attr("class", "bar")
          .attr("width", vis.xScale.bandwidth())
          // .classed("active", d => d.active) // Not sure this is necessary anymore
          // .transition( // This would be nice to have
          //   d3.transition()
          //   .duration(250)
          //   .ease(d3.easeLinear)
          // ) 
          .attr("y", d => vis.yScale(d[1]))
          .attr("height", d => vis.yScale(d[0]) - vis.yScale(d[1]));

    vis.chart.selectAll("rect")
        .on("mousemove", (event, d) => {
          d3.select('#tooltip')
              .style('display', 'block')
              .style('left', (event.pageX + vis.config.tooltipPadding) + 'px')
              .style('top', (event.pageY + vis.config.tooltipPadding) + 'px')
              .html(`
              <div class="tooltip-title">${d.key}, <b>${d.data[0].toFixed(1)}</b></div>
              <div class="tooltip-body"><b>${(d[1] - d[0]).toFixed(2)}</b> reviews</div>
              `);
        })
        .on('mouseleave', () => {
          d3.select('#tooltip').style('display', 'none');
        })
        .on('click', (_event, d) => {
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
        .on("click", (_event, d) => {
          vis.activateGenre(d);
        });
  }

  activateGenre(genre) {
    let vis = this;
    switch(genre) {
      case "Various":
        vis.selectedGenres.clear();
        vis.isPrimaryMode = false;
        vis.updateVis();
        return;
      case "Return to primary view":
        vis.selectedGenres.clear();
        vis.isPrimaryMode = true;
        vis.updateVis();
        return;
    }

    if (vis.selectedGenres.has(genre)) {
      vis.selectedGenres.delete(genre);
    } else {
      vis.selectedGenres.add(genre);
    }
    vis.updateVis();
  }

  segmentClick(data) {
    let vis = this;
    vis.dispatcher.call('clickSegment', this, data);
  }

  updatePalette(palette) {
    let vis = this;
    vis.colorScale.range(palette);
    vis.renderVis();
  }

  processData() {
    let vis = this;
    let scores = [];
    for (let i = 0; i < 101; i++) {
      const score = i / 10.0;
      const obj = {score: score};
      Object.defineProperties(obj, vis.genreProperties);
      scores.push(obj);
    }
    vis.xScale.domain(scores.map(d => d.score));

    vis.data.forEach(review => {
      const scoreIndex = review['score'] * 10;
      const genres = review['genres'];
      genres.forEach(genre => {
        scores[scoreIndex][genre] += 1.0 / genres.length;
      });
    });

    vis.tidyData = [];
    scores.forEach(s => {
      for (let genre of vis.genreKeys) {
        vis.tidyData.push({'score': s.score, 'genre': genre, 'count': s[genre]});
      }
    });
  }
}