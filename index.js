'use strict';

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const ProgressBar = require('progress');

const fs = require('fs');

let fileNames = ['./a_example.txt', './b_read_on.txt', './c_incunabula.txt', './d_tough_choices.txt', './e_so_many_books.txt', 'f_libraries_of_the_world.txt'];
let resultNames = ['./a_example_out.txt', './b_read_on_out.txt', './c_incunabula_out.txt', './d_tough_choices_out.txt', './e_so_many_books_out.txt', 'f_libraries_of_the_world_out.txt'];

let taskCode = process.argv[2];

let data = fs.readFileSync(fileNames[taskCode]).toString().split("\n");
let resultText = '';
let generalData = data[0].split(' ').map(parseFloat);
const booksCount = generalData[0], librariesCount = generalData[1], daysCount = generalData[2];
let libraries = [];
let books = [];
let booksReserve = [];
generalData = data[1].split(' ').map(parseFloat);

const scannedBooks = new Int8Array(new ArrayBuffer(booksCount));
for (let i = 0; i < booksCount; i++) {
  books.push(generalData[i]);
  booksReserve.push(generalData[i]);
  scannedBooks[i] = 0;
}
booksReserve.sort((a, b) => b - a);
let medianScore = (booksReserve[Math.floor(booksCount / 2)] + booksReserve[Math.ceil(booksCount / 2)]) / 2;
let bandwidths = [];
for (let i = 2, j = 0; i < data.length - 1; i+= 2, j++) {
  let row = data[i].split(' ').map(parseFloat);
  if (!row || !row[1]) {break;}
  libraries.push({
    id: j,
    signup: row[1],
    booksPerDay: row[2],
    score: 0,
    scoreNormalized: 0,
    //scores: [],
    //scorePerDay: 0,
    //scoreNormalizedPerDay: 0,
    //booksDays: 0,
    //lastLookedBook: 0,
    books: data[i + 1].split(' ').map(parseFloat).sort((a, b) => books[b] - books[a]),
    booksFlags: new Int8Array(new ArrayBuffer(booksCount)),
  });
}
data = null;
let step = librariesCount;
const dividor = 20;

console.log('Calc libraries score');

for (let i = 0; i < librariesCount; i++) {
  bandwidths.push(libraries[i].booksPerDay);
  const maxAvailableDays = Math.max(daysCount - libraries[i].signup, 0);
  const maxAvailableBooks = Math.min(libraries[i].books.length, maxAvailableDays * libraries[i].booksPerDay);
  for (let j = 0; j < booksCount; j++) {
    libraries[i].booksFlags[j] = 0;
  }
  for (let j = 0; j < maxAvailableBooks; j++) {
    libraries[i].score += books[libraries[i].books[j]];
    libraries[i].booksFlags[libraries[i].books[j]] = 1;
  }
}
bandwidths.sort((a, b) => b - a);
medianScore *= (bandwidths[Math.floor(librariesCount / 2)] + bandwidths[Math.ceil(librariesCount / 2)]) / 2;
for (let i = 0; i < librariesCount; i++) {
  libraries[i].scoreNormalized = libraries[i].score - (medianScore * step / dividor) * libraries[i].signup;
}

libraries.sort((a, b) => b.scoreNormalized - a.scoreNormalized);
let d = 0;
let bar = new ProgressBar(':bar :percent :etas', { total: daysCount - 1 });
let selectedLibraries = 0;
let score = 0;
while (d < daysCount && libraries.length) {
  step--;
  const results = [];
  let currentLibrary = libraries.shift();
  if (Array.isArray(currentLibrary)) {
    currentLibrary = currentLibrary[0];
  }
  d += currentLibrary.signup;
  bar.tick(currentLibrary.signup, null);
  const maxAvailableDays = daysCount - d;
  const maxAvailableBooks = Math.min(currentLibrary.books.length, maxAvailableDays * currentLibrary.booksPerDay);
  let book;
  for (let i = 0, c = 0; c < maxAvailableBooks && i < currentLibrary.books.length; c++, i++) {
    book = currentLibrary.books[i];
    if (scannedBooks[book]) {
      c--;
    } else {
      scannedBooks[book] = 1;
      score += books[book];
      results.push(book);
    }
  }

  if (d < daysCount && libraries.length) {
    //libraries = shuffle(libraries);
    let librariesToLook = libraries.splice(0, 5000);
    for (let j = 0; j < librariesToLook.length; j++) {
      const maxAvailableDays = Math.max(daysCount - d - librariesToLook[j].signup, 0);
      const maxAvailableBooks = Math.min(librariesToLook[j].books.length, maxAvailableDays * librariesToLook[j].booksPerDay);

      for (let i = 0, c = 0; c < maxAvailableBooks && i < librariesToLook[j].books.length; c++, i++) {
        book = librariesToLook[j].books[i];
        if (scannedBooks[book]) {
          c--;
          if (librariesToLook[j].booksFlags[book]) {
            librariesToLook[j].score -= books[book];
            librariesToLook[j].booksFlags[book] = 0;
          }
        } else {
          if (!librariesToLook[j].booksFlags[book]) {
            librariesToLook[j].score += books[book];
            librariesToLook[j].booksFlags[book] = 1;
          }
        }
      }
      librariesToLook[j].scoreNormalized = librariesToLook[j].score - (medianScore * step / dividor) * librariesToLook[j].signup;
    }
    librariesToLook.sort((a, b) => b.scoreNormalized - a.scoreNormalized);
    libraries = librariesToLook.concat(libraries);
  }
  if (results.length) {
    selectedLibraries++;
    if (resultText) {resultText += '\n';}
    resultText += currentLibrary.id + ' ' + results.length + '\n' + results.join(' ');
  }
}
console.log(score);

resultText = selectedLibraries + '\n' + resultText;

fs.writeFile(resultNames[taskCode], resultText, function(err) {
  if(err) {
    return console.log(err);
  }

  console.log("\nThe file was saved!");
});

