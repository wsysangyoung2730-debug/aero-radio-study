import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const root='dist';const dataContext={window:{}};vm.runInNewContext(fs.readFileSync(root+'/data.js','utf8'),dataContext);const db=dataContext.window.STUDY_DATA;
for(const key of ['chapters','questions','sources'])assert.equal(new Set(db[key].map(x=>x.id)).size,db[key].length,`${key} duplicate ID`);
const ids=new Set(db.chapters.map(x=>x.id)),srcs=new Set(db.sources.map(x=>x.id));
for(const c of db.chapters){assert(c.title&&c.summary&&c.topics.length,`empty chapter ${c.id}`);for(const id of c.sourceIds||[])assert(srcs.has(id),`missing source ${id}`);for(const t of c.topics){assert(typeof t.body==='string',`${c.id} no body`);assert(t.title,`${c.id} no topic title`)}}
for(const q of db.questions){assert(ids.has(q.chapterId),`${q.id} chapter missing`);assert.equal(q.options.length,4,`${q.id} 4 options`);assert.equal(new Set(q.options).size,4,`${q.id} duplicate options`);assert(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<4,`${q.id} answer`);assert(q.explanation.length>10,`${q.id} explanation`);for(const id of q.sourceIds||[])assert(srcs.has(id),`${q.id} missing source ${id}`)}
for(const m of db.materials)assert(fs.existsSync(`${root}/${m.url}`),`missing asset ${m.url}`);
for(const s of db.samples){assert(fs.existsSync(`${root}/${s.audio}`));assert(s.answer.length>30)}
for(const b of db.legalBooks){assert(b.articles.length>20);assert.equal(new Set(b.articles.map(a=>a.number)).size,b.articles.length);for(const a of b.articles)for(const x of a.blocks)if(x.image)assert(fs.existsSync(`${root}/${x.image}`),`missing table ${x.image}`)}
const els=new Map();const el=()=>({innerHTML:'',textContent:'',hidden:true,focus(){},addEventListener(){},classList:{remove(){},add(){},toggle(){}},querySelector(){return null},querySelectorAll(){return []}});
const context={window:{STUDY_DATA:db,addEventListener(){},scrollTo(){}},document:{body:{classList:{toggle(){}}},querySelector(s){if(!els.has(s))els.set(s,el());return els.get(s)},querySelectorAll(){return []},addEventListener(){},activeElement:null},localStorage:{getItem(){return null},setItem(){}},location:{hash:''},setInterval(){return 1},clearInterval(){},setTimeout(){},clearTimeout(){},console,URL,Blob,Date,Math,Uint16Array};
vm.createContext(context);vm.runInContext(fs.readFileSync(root+'/concept-practice.js','utf8'),context);vm.runInContext(fs.readFileSync(root+'/app.js','utf8'),context);
for(const route of ['home','law','english','quiz','practical','sources','review','vocabulary','legal',...db.chapters.map(c=>'chapter/'+c.id)]){context.location.hash='#'+route;vm.runInContext('navigate()',context);const html=els.get('#main').innerHTML;assert(html.length>200,route);assert(!html.includes('undefined'),route+' undefined output')}
for(const expr of ["alignText('ABC','ABC').rate===100","alignText('ABC','AC').del===1","alignText('ABC','ABXC').ins===1","alignText('ABC','ADC').sub===1","alignText('ABC','').del===3","alignText('','ABC').ins===3","normalize('a b, 12.3!')==='AB123'"])assert(vm.runInContext(expr,context),expr);
// 문제 교체·정답 확인과 기존 CBT 상태의 독립성을 확인한다.
context.assert = assert;
vm.runInContext(`(() => {
  for (const category of ['law', 'english']) {
    const session = conceptPracticeSession(category);
    assert.equal(session.ids.length, 3);
    assert.equal(new Set(session.ids).size, 3);
    const questions = session.ids.map(id => DB.questions.find(q => q.id === id));
    assert(questions.every(q => q.category === category));
    assert.equal(new Set(questions.map(q => DB.chapters.find(c => c.id === q.chapterId).section)).size, 3);
    const next = pickConceptQuestions(conceptPracticePool(category), session.ids);
    assert.equal(next.length, 3);
    assert(next.every(id => !session.ids.includes(id)), '다른 문제에는 직전 문항이 없어야 함');
    const q = questions[0];
    state.quiz = { ids: [q.id], answers: {}, flags: [], finished: false };
    const before = JSON.stringify(state);
    assert.equal(updateConceptAnswer(session, q, 'reveal'), false, '미응답 해설 공개 방지');
    assert.equal(updateConceptAnswer(session, q, 'answer', -1), false);
    assert.equal(updateConceptAnswer(session, q, 'answer', (q.answer + 1) % 4), true);
    assert.equal(updateConceptAnswer(session, q, 'reveal'), true);
    assert(conceptQuestionCard(q, session, 0).includes('정답은 ' + (q.answer + 1) + '번입니다.'));
    assert.equal(updateConceptAnswer(session, q, 'answer', q.answer), false, '채점 후 답 변경 방지');
    assert.equal(updateConceptAnswer(session, q, 'retry'), true);
    assert.equal(session.answers[q.id], undefined);
    assert(!session.revealed.includes(q.id));
    updateConceptAnswer(session, q, 'answer', q.answer);
    updateConceptAnswer(session, q, 'reveal');
    assert(conceptQuestionCard(q, session, 0).includes('정답입니다.'));
    assert.equal(JSON.stringify(state), before, '개념 연습이 CBT·학습 기록을 변경하면 안 됨');
  }
  for (const chapter of DB.chapters.filter(c => ['law', 'english'].includes(c.category))) {
    const session = conceptPracticeSession(chapter.category, chapter.id);
    assert(session.ids.length > 0 && session.ids.length <= 3);
    assert(session.ids.every(id => DB.questions.find(q => q.id === id).chapterId === chapter.id));
    assert(conceptPracticeSection(chapter.category, chapter.id).includes('이 단원 문제로 확인하기'));
  }
  assert.equal(pickConceptQuestions([]).length, 0);
  assert.equal(conceptPracticeSection('practical'), '');
})()`, context);
console.log(JSON.stringify({status:'passed',chapters:db.chapters.length,questions:db.questions.length,vocabulary:db.vocabulary.length,samples:db.samples.length,materials:db.materials.length,articles:db.legalBooks.reduce((n,b)=>n+b.articles.length,0),checks:'데이터·출처·파일 참조, 모든 화면 렌더링, 실기 문자 비교, 과목·단원 문제 배정, 정답 확인·재시도, CBT 기록 독립성'},null,2));
