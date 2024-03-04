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
      review => `${review['artists']} — \
      ${review['album'].italics()} \
      (${review['release_year']})`,
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
      review => `${review['artists']} — \
      ${review['album'].italics()} \
      (${review['release_year']}) \
      <i>[${review['genres']}, <b>${review['score'].toFixed(1)}</b>]</i>`,
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

function _updateAlbumLists(listId, listElementFormatting, filteredReviews) {
  filteredReviews.sort((review1, review2) => review1['release_year'] - review2['release_year']);

  // remove the existing list entries
  const list = document.getElementById(listId);
  list.innerHTML = "";

  // append the filtered reviews to the <ul>
  filteredReviews.forEach(review => {
    const entry = document.createElement('li');
    entry.innerHTML = listElementFormatting(review);
    list.appendChild(entry);
  });
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