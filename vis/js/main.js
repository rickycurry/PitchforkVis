let reviews, labels, genres, genreCounts;
let stackedHistogram, scatterPlot, lineChart;
let visualizations;

const NO_GENRE_STRING = "No genre specified";

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
  genreCounts = _getSortedGenreCounts();
  lineChart = new LineChart({parentElement: '#label-tooltip'});
  stackedHistogram = new StackedHistogram({parentElement: '#histogram'}, reviews, genreCounts, dispatcher);
  scatterPlot = new ScatterPlot({parentElement: '#scatter-plot'}, labels, dispatcher, lineChart.config);
  visualizations = [stackedHistogram, scatterPlot, lineChart];
}

main();

function getImagePreviewHTML(review) {
  return `<a href="https://pitchfork.com/reviews/albums/${review['href']}" target="_blank"/> \
    <img ${review['bnm'] ? "class=bnm" : ""} src=${review['artwork']}/>
    </a>`;
}

dispatcher.on('clickSegment', segment => {
  const genre = segment.key;
  const score = segment.data[0];

  // change the right-container header
  document.getElementById('album-list-title-genre-score')
      .innerText = genre + ", " + score.toFixed(1);

  // filter the reviews to match the passed in segment
  const filteredReviews = reviews.filter(d => {
    return d['score'] === score 
      && (genre === CONDENSED_GENRE_STRING) 
        ? d['genres'].some((element) => stackedHistogram.secondaryGenres.has(element))
        : d['genres'].includes(genre)
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

  d3.select(`#${listId}`)
    .selectAll('li')
    .data(filteredReviews, d => d.href)
    .join('li')
    .html(d => `
      <a href=https://pitchfork.com/reviews/albums/${d.href} target="_blank">
        <img src=${d.artwork} ${d.bnm ? "class=bnm" : ""}>
      </a>
    `)
    .on("mousemove", (event, d) => {
      const tooltip = d3.select('#album-tooltip')
        .style('display', 'block')
        .html(`
          <div class="tooltip-title"><i>${d.album}</i></div>
          <div class="tooltip-body"><b>${d.artists.join(', ')}</b></div>
          <div class="tooltip-body">${d.abstract}</div>
          `);
      const albumTooltip = document.getElementById('album-tooltip');
      const width = albumTooltip.offsetWidth;
      tooltip.style('left', event.pageX - 10 - width + 'px')
        .style('top', (event.pageY + 10) + 'px');
    })
    .on('mouseleave', () => {
      d3.select('#album-tooltip').style('display', 'none');
    });
}

function _getAllGenres() {
  let genres = new Set([NO_GENRE_STRING]);
  reviews.forEach(d => {
    d['genres'].forEach(g => {
      genres.add(g);
    });
  });
  return genres;
}

function _getSortedGenreCounts() {
  const counts = d3.map(genres, g => {
    if (g === NO_GENRE_STRING) return reviews.filter(r => r.genres.length === 0).length;
    else return reviews.filter(r => r.genres.includes(g)).length;
  });
  let genreCounts = d3.zip(Array.from(genres), counts)
  genreCounts.sort((a, b) => b[1] - a[1]);
  return genreCounts;
}

const checkbox = document.getElementById("darkmode");
checkbox.addEventListener('change', (event) => {
  const styleLink = document.getElementById("style-link");
  if (event.currentTarget.checked) {
    styleLink.setAttribute("href", "css/style_dark.css");
    visualizations.forEach(v => v.updatePalette(dark6));
  } else {
    styleLink.setAttribute("href", "css/style_light.css");
    visualizations.forEach(v => v.updatePalette(light6));
  }
});
