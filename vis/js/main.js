let data, genres;
let stackedHistogram;

const dispatcher = d3.dispatch('clickSegment');

async function loadData() {
  data = await d3.json('../data/reviews.json');
  data.forEach(d => {
    d['score'] = +d['score'];
    d['publish_date'] = new Date(d['publish_date']);
  });
  genres = _getAllGenres();
}

async function main() {
  await loadData();
  console.log(data.length)

  stackedHistogram = new StackedHistogram({parentElement: '#histogram'}, data, genres, dispatcher);
}

main();

dispatcher.on('clickSegment', segment => {
  const genre = segment.key;
  const score = segment.data.score;

  // filter the reviews to match the passed in segment
  const filteredReviews = data.filter(d => {
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
  data.forEach(d => {
    d['genres'].forEach(g => {
      genres.add(g);
    })
  });
  return genres;
}