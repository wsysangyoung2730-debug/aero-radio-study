import fs from 'node:fs';

const keys = ['sources', 'chapters', 'questions', 'vocabulary', 'coverage', 'samples', 'materials', 'phonetics'];
const data = Object.fromEntries(keys.map(key => [key, []]));
for (const name of ['legal', 'english', 'practical']) {
  const part = JSON.parse(fs.readFileSync(`content/${name}.json`, 'utf8'));
  for (const key of keys) data[key].push(...(part[key] || []));
}
data.legalBooks = JSON.parse(fs.readFileSync('content/legal-library.json', 'utf8'));
data.sources = [...new Map(data.sources.map(source => [source.id, source])).values()];
fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/data.js', `window.STUDY_DATA=${JSON.stringify(data)};\n`);
console.log(`학습 자료 생성: ${data.chapters.length}단원 · ${data.questions.length}문항`);
