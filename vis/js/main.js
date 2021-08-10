let reviews, labels, genres;
let stackedHistogram;

const dispatcher = d3.dispatch('clickSegment');

async function loadReviews() {
  reviews = await d3.json('../data/reviews.json');
  reviews.forEach(d => {
    d['score'] = +d['score'];
    d['publish_date'] = new Date(d['publish_date']);
  });
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
  await Promise.all([
      loadReviews(),
      loadLabels()
  ]);
}

async function main() {
  await loadData();
  stackedHistogram = new StackedHistogram({parentElement: '#histogram'}, reviews, genres, dispatcher);
}

main();

dispatcher.on('clickSegment', segment => {
  const genre = segment.key;
  const score = segment.data.score;

  // filter the reviews to match the passed in segment
  const filteredReviews = reviews.filter(d => {
    return d['score'] === score && d['genres'].includes(genre);
  });
  filteredReviews.sort((review1, review2) => review1['release_year'] - review2['release_year']);

  // remove the existing list entries
  const list = document.getElementById('filtered-albums');
  list.innerHTML = "";

  // change the right-container header
  document.getElementById('album-list-title').innerText = genre + ", " + score.toFixed(1);

  // append the filtered reviews to the <ul>
  filteredReviews.forEach(review => {
    const entry = document.createElement('li');
    entry.innerHTML = `${review['artists']} — ${review['album'].italics()} (${review['release_year']})`;
    list.appendChild(entry);
  });
});

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