let data, genres;
let stackedHistogram;

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

  stackedHistogram = new StackedHistogram({parentElement: '#histogram'}, data, genres);
}

main();

function _getAllGenres() {
  let genres = new Set()
  data.forEach(d => {
    d['genres'].forEach(g => {
      genres.add(g);
    })
  });
  return genres;
}