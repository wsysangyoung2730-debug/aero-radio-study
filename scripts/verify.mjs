import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const root='dist';const dataContext={window:{}};vm.runInNewContext(fs.readFileSync(root+'/data.js','utf8'),dataContext);const db=dataContext.window.STUDY_DATA;
for(const key of ['chapters','questions','sources'])assert.equal(new Set(db[key].map(x=>x.id)).size,db[key].length,`${key} duplicate ID`);
const ids=new Set(db.chapters.map(x=>x.id)),srcs=new Set(db.sources.map(x=>x.id));
for(const c of db.chapters){assert(c.title&&c.summary&&c.topics.length,`empty chapter ${c.id}`);for(const id of c.sourceIds||[])assert(srcs.has(id),`missing source ${id}`);for(const t of c.topics){assert(typeof t.body==='string',`${c.id} no body`);assert(t.title,`${c.id} no topic title`)}}
for(const q of db.questions){assert(ids.has(q.chapterId),`${q.id} chapter missing`);assert.equal(q.options.length,4,`${q.id} 4 options`);assert.equal(new Set(q.options).size,4,`${q.id} duplicate options`);assert(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<4,`${q.id} answer`);assert(q.explanation.length>10,`${q.id} explanation`);for(const id of q.sourceIds||[])assert(srcs.has(id),`${q.id} missing source ${id}`)}
const pastQuestions=db.questions.filter(q=>q.kind==='past-exam');
assert(pastQuestions.some(q=>q.category==='english')&&pastQuestions.some(q=>q.category==='law'),'기출 두 과목 수록');
for(const q of pastQuestions){
  assert(q.exam.year>=2017&&q.exam.year<=2023,`${q.id} 기출 연도`);
  for(const key of ['page','answerPage'])assert(Number.isInteger(q.exam[key])&&q.exam[key]>=1&&q.exam[key]<=110,`${q.id} PDF 쪽수`);
  assert(q.exam.number>=1&&q.exam.number<=70&&q.exam.sourceLabel,`${q.id} 기출 출처`);
  assert(!/임의로 정답|정답을 확보하지 못/.test(q.prompt),`${q.id} 미확인 문항 제외`);
}
for(const id of ['local-past-exam-questions','local-past-exam-answers']){
  const source=db.sources.find(s=>s.id===id);assert(source,`missing source ${id}`);
  const bytes=fs.readFileSync(`${root}/${source.url}`);assert.equal(bytes.subarray(0,5).toString(),'%PDF-',`${id} PDF 원본`);
}
for(const m of db.materials)assert(fs.existsSync(`${root}/${m.url}`),`missing asset ${m.url}`);
for(const s of db.samples){assert(fs.existsSync(`${root}/${s.audio}`));assert(s.answer.length>30)}
for(const b of db.legalBooks){assert(b.articles.length>20);assert.equal(new Set(b.articles.map(a=>a.number)).size,b.articles.length);for(const a of b.articles)for(const x of a.blocks)if(x.image)assert(fs.existsSync(`${root}/${x.image}`),`missing table ${x.image}`)}
const els=new Map();const el=()=>({innerHTML:'',textContent:'',hidden:true,focus(){},addEventListener(){},classList:{remove(){},add(){},toggle(){}},querySelector(){return null},querySelectorAll(){return []}});
const context={window:{STUDY_DATA:db,addEventListener(){},scrollTo(){}},document:{body:{classList:{toggle(){}}},querySelector(s){if(!els.has(s))els.set(s,el());return els.get(s)},querySelectorAll(){return []},addEventListener(){},activeElement:null},localStorage:{getItem(){return null},setItem(){}},location:{hash:''},setInterval(){return 1},clearInterval(){},setTimeout(){},clearTimeout(){},console,URL,Blob,Date,Math,Uint16Array};
vm.createContext(context);vm.runInContext(fs.readFileSync(root+'/concept-practice.js','utf8'),context);vm.runInContext(fs.readFileSync(root+'/visual-english.js','utf8'),context);vm.runInContext(fs.readFileSync(root+'/transmit-practice.js','utf8'),context);vm.runInContext(fs.readFileSync(root+'/app.js','utf8'),context);
for(const route of ['home','law','english','quiz','practical','sources','review','vocabulary','legal','visual-english',...db.visualEnglish.topics.map(t=>'visual-english/'+t.id),...db.chapters.map(c=>'chapter/'+c.id)]){context.location.hash='#'+route;vm.runInContext('navigate()',context);const html=els.get('#main').innerHTML;assert(html.length>200,route);assert(!html.includes('undefined'),route+' undefined output')}
for(const topic of db.visualEnglish.topics){
  assert(fs.existsSync(`${root}/${topic.image.file}`),`missing visual image ${topic.id}`);
  assert(topic.image.alt&&topic.image.credit&&topic.image.reading,`missing image context ${topic.id}`);
  for(const url of [topic.image.url,topic.image.source,topic.image.reference].filter(Boolean))assert.equal(new URL(url).protocol,'https:');
  assert(topic.terms.length>0&&topic.terms.every(t=>t.en&&t.ko&&t.meaning),`empty visual term ${topic.id}`);
  for(const id of topic.chapters)assert(ids.has(id),`missing visual chapter ${id}`);
  context.location.hash='#visual-english/'+topic.id;vm.runInContext('navigate()',context);
  const html=els.get('#main').innerHTML;
  assert.equal((html.match(/class="visual-topic"/g)||[]).length,1,`selected visual topic ${topic.id}`);
  assert(html.includes(topic.image.file)&&html.includes(topic.image.source));
  if(topic.illustration){
    const image=topic.illustration,bytes=fs.readFileSync(`${root}/${image.file}`);
    assert.equal(bytes.subarray(1,4).toString(),'PNG',`illustration PNG ${topic.id}`);
    assert.equal(bytes.readUInt32BE(16),image.width,`illustration width ${topic.id}`);
    assert.equal(bytes.readUInt32BE(20),image.height,`illustration height ${topic.id}`);
    assert(image.alt&&image.credit&&image.reading&&image.scenario&&image.steps.length,`illustration context ${topic.id}`);
    assert(html.includes(image.file)&&html.includes(image.scenario),`illustration on topic ${topic.id}`);
  }
}
for(const category of ['english','quiz']){context.location.hash='#'+category;vm.runInContext('navigate()',context);assert(els.get('#main').innerHTML.includes('href="#visual-english"'),`visual entry ${category}`)}
vm.runInContext("runSearch('ABEAM')",context);assert(els.get('#search-results').innerHTML.includes('#visual-english/holding'),'visual glossary searchable');
for(const expr of ["alignText('ABC','ABC').rate===100","alignText('ABC','AC').del===1","alignText('ABC','ABXC').ins===1","alignText('ABC','ADC').sub===1","alignText('ABC','').del===3","alignText('','ABC').ins===3","normalize('a b, 12.3!')==='AB123'"])assert(vm.runInContext(expr,context),expr);
assert.equal(new Set(db.transmitExamples.map(item=>item.id)).size,db.transmitExamples.length,'송신 예제 ID 중복');
assert.equal(db.transmitExamples.length,30,'송신 예제 30개');
for(const item of db.transmitExamples){assert(item.title&&item.meaning&&item.focus&&item.group,`송신 예제 설명 ${item.id}`);assert(/\d/.test(item.text),`송신 예제 숫자 ${item.id}`);assert.equal(item.text,item.text.toUpperCase());}
context.assert=assert;
vm.runInContext(`(() => {
  const before=JSON.stringify(state),seconds=transmitSeconds;
  assert.equal(transmitExampleGroups().length,6);
  for(const example of DB.transmitExamples){
    assert.equal(makeTransmitExercise('example:'+example.id).text,example.text);
    assert(setTransmitExercise('example:'+example.id));
    assert.equal($('#transmit-text').textContent,example.text);
    assert($('#transmit-info').innerHTML.includes(esc(example.meaning)));
  }
  for(const group of transmitExampleGroups()){
    transmitGroup=group;
    assert.equal((transmitExampleCards().match(/data-action="transmit-example"/g)||[]).length,5);
  }
  for(const sample of DB.samples){assert(setTransmitExercise(sample.id));assert.equal($('#transmit-text').textContent,sample.answer);}
  assert(setTransmitExercise('mixed'));
  const lines=currentTransmitExercise().text.split('\\n');
  assert.equal(lines.length,6);
  assert.equal(new Set(lines.map(line=>DB.transmitExamples.find(item=>item.text===line).group)).size,6);
  assert(transmitPage().includes('숫자·단위 예제 30개'));
  const previous=$('#transmit-text').textContent;
  assert.equal(setTransmitExercise('example:missing'),false);
  assert.equal($('#transmit-text').textContent,previous);
  assert(setTransmitExercise('random'));
  assert.equal(normalize($('#transmit-text').textContent).length,150);
  assert.equal(JSON.stringify(state),before,'송신 예제 선택은 CBT·학습 기록과 독립적');
  assert.equal(transmitSeconds,seconds,'송신 예제 선택은 타이머를 변경하지 않음');
})()`,context);
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
console.log(JSON.stringify({status:'passed',chapters:db.chapters.length,questions:db.questions.length,vocabulary:db.vocabulary.length,visualTopics:db.visualEnglish.topics.length,visualTerms:db.visualEnglish.topics.reduce((n,t)=>n+t.terms.length,0),samples:db.samples.length,materials:db.materials.length,articles:db.legalBooks.reduce((n,b)=>n+b.articles.length,0),checks:'그림 개념 경로·출처·이미지·검색, 데이터·출처·파일 참조, 모든 화면 렌더링, 실기 문자 비교, 과목·단원 문제 배정, 정답 확인·재시도, CBT 기록 독립성'},null,2));
