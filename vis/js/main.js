let reviews, labels, genres;
let stackedHistogram, scatterPlot, lineChart;

const dispatcher = d3.dispatch(
    'clickSegment',
    'clickLabel',
    'hoverLabel'
);

async function loadEndDate() {
  const text = await d3.text('../data/end_date.txt');
  document.getElementById('end-date').innerText = text;
}

async function loadReviews() {
  reviews = await d3.json('../data/reviews.json');
  reviews.forEach(d => {
    d['score'] = +d['score'];
    d['publish_date'] = new Date(d['publish_date']);
  });
  // TODO: this is really sub-optimal; save/load this instead
  genres = _getAllGenres();
}

async function loadLabels() {
  labels = await d3.json('../data/labels.json');
  labels.forEach(d => {
    d['count'] = +d['count'];
    d['mean'] = +d['mean'];
    d['median'] = +d['median'];
    d['std_dev'] = +d['std_dev'];
  });
}

async function loadData() {
  loadEndDate();
  await Promise.all([
      loadReviews(),
      loadLabels()
  ]);
}

async function main() {
  await loadData();
  lineChart = new LineChart({parentElement: '#label-tooltip'});
  stackedHistogram = new StackedHistogram({parentElement: '#histogram'}, reviews, genres, dispatcher);
  scatterPlot = new ScatterPlot({parentElement: '#scatter-plot'}, labels, dispatcher, lineChart.config);
}

main();

function getImagePreviewHTML(review) {
  return `<a href="https://pitchfork.com/reviews/albums/${review['href']}" target="_blank"/> \
    <img ${review['bnm'] ? "class=bnm" : ""} src=${review['artwork']}/>
    </a>`;
}

dispatcher.on('clickSegment', segment => {
  const genre = segment.key;
  const score = segment.data.score;

  // change the right-container header
  document.getElementById('album-list-title-genre-score')
      .innerText = genre + ", " + score.toFixed(1);

  // filter the reviews to match the passed in segment
  const filteredReviews = reviews.filter(d => {
    return d['score'] === score && d['genres'].includes(genre);
  });
  _updateAlbumLists(
    'filtered-albums-genre-score',
    filteredReviews
  );
});

dispatcher.on('clickLabel', label => {
  const labelName = label.label;

  // change the right-container header
  document.getElementById('album-list-title-label')
      .innerText = labelName;

  // filter the reviews to match the passed in segment
  const filteredReviews = reviews.filter(d => {
    return d['labels'].includes(labelName);
  });
  _updateAlbumLists(
    'filtered-albums-label',
    filteredReviews
  );
});

dispatcher.on('hoverLabel', label => {
  // TODO: cache the filtered reviews in 'clickLabel' since we have to
  //  hover before we click, by definition :)
  const filteredReviews = reviews.filter(d => {
    return d['labels'].includes(label.label);
  }).sort((review1, review2) => review1['publish_date'] - review2['publish_date']);
  lineChart.updateVis(label.label, filteredReviews);
});

function _updateAlbumLists(listId, filteredReviews) {
  // sort newest to oldest
  filteredReviews.sort((review1, review2) => review2['release_year'] - review1['release_year']);

  const albumImages = d3.select(`#${listId}`)
    .selectAll('li')
    .data(filteredReviews, d => d.href)
    .join('li')
    .append('a')
      .attr('href', d => `https://pitchfork.com/reviews/albums/${d.href}`)
      .attr('target', "_blank")
    .append('img')
      .attr('src', d => d.artwork)
      .attr('class', d => d.bnm ? "bnm" : "")

    .on("mousemove", (event, d) => {
      const tooltip = d3.select('#album-tooltip')
        .style('display', 'block')
        .html(`
          <div class="tooltip-title">${d.album}</div>
          <div class="tooltip-body">${d.artists.join(', ')}</div>
          `);
      const albumTooltip = document.getElementById('album-tooltip');
      const width = albumTooltip.offsetWidth;
      tooltip.style('left', event.pageX - 10 - width + 'px')
        .style('top', (event.pageY + 10) + 'px');
    })
    .on('mouseleave', () => {
      d3.select('#album-tooltip').style('display', 'none');
    })
}

function _getAllGenres() {
  let genres = new Set();
  genres.add("No genre specified");
  reviews.forEach(d => {
    d['genres'].forEach(g => {
      genres.add(g);
    })
  });
  return genres;
}