import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const data = {window:{}};
vm.runInNewContext(fs.readFileSync('dist/data.js','utf8'), data);
const elements = new Map();
const element = () => ({innerHTML:'',textContent:'',hidden:true,value:'',focus(){},classList:{remove(){},add(){},toggle(){}},querySelector(){return null},querySelectorAll(){return []}});
let saved;
const context = {window:{STUDY_DATA:data.window.STUDY_DATA,addEventListener(){},scrollTo(){}},document:{body:{classList:{toggle(){}}},querySelector(selector){if(!elements.has(selector))elements.set(selector,element());return elements.get(selector)},querySelectorAll(){return []},addEventListener(){},activeElement:null},localStorage:{getItem(){return null},setItem(key,value){saved=value}},location:{hash:''},setInterval(){return 1},clearInterval(){},setTimeout(){},clearTimeout(){},console,Date,Math,URL,Blob,assert};
vm.createContext(context);
for (const file of ['concept-practice.js','visual-english.js','app.js']) vm.runInContext(fs.readFileSync('dist/'+file,'utf8'), context);
vm.runInContext(`(() => {
  const q = DB.questions[0];
  const createSession = () => ({ids:[q.id],answers:{},flags:[],graded:[],explanationOpen:[],revealed:[],index:0,label:'한 문항 검증',started:Date.now(),deadline:0,finished:false});
  state.quiz = createSession();
  const globalBefore = JSON.stringify({wrong:state.wrong,history:state.history});
  assert.equal(updateQuizAnswer(state.quiz,q,'grade'),false,'미응답은 채점할 수 없음');
  assert.equal(updateQuizAnswer(state.quiz,q,'explanation'),false,'채점 전 해설 공개 방지');
  assert.equal(updateQuizAnswer(state.quiz,q,'answer',-1),false,'잘못된 답 번호 차단');
  assert(activeQuiz().includes('id="quiz-explanation" hidden'),'처음에는 해설 숨김');
  assert.equal(updateQuizAnswer(state.quiz,q,'answer',(q.answer+1)%4),true);
  assert.equal(updateQuizAnswer(state.quiz,q,'grade'),true);
  assert.equal(updateQuizAnswer(state.quiz,q,'grade'),false,'중복 채점 방지');
  assert.equal(updateQuizAnswer(state.quiz,q,'answer',q.answer),false,'채점 후 답 변경 방지');
  let html = activeQuiz();
  assert(html.includes('오답입니다. 정답은 '+(q.answer+1)+'번입니다.'));
  assert(!html.includes(q.explanation),'채점만으로 해설은 공개하지 않음');
  assert.equal(updateQuizAnswer(state.quiz,q,'explanation'),true);
  assert(activeQuiz().includes(q.explanation),'해설 버튼으로 설명 공개');
  assert.equal(updateQuizAnswer(state.quiz,q,'explanation'),true);
  assert(!activeQuiz().includes(q.explanation),'해설 접기');
  assert.equal(JSON.stringify({wrong:state.wrong,history:state.history}),globalBefore,'문항 채점은 최종 기록과 독립적');
  save();
  state.quiz = JSON.parse(JSON.stringify(state.quiz));
  assert(activeQuiz().includes('채점 완료'),'새로고침 복원 가능한 채점 상태');
  finishQuiz();
  assert(state.wrong.includes(q.id));
  assert.equal(state.history.length,1);
  finishQuiz();
  assert.equal(state.history.length,1,'최종 제출 중복 기록 방지');
  state.quiz = createSession();
  updateQuizAnswer(state.quiz,q,'answer',q.answer);
  updateQuizAnswer(state.quiz,q,'grade');
  assert(activeQuiz().includes('정답입니다.'));
  finishQuiz();
  assert(!state.wrong.includes(q.id),'맞힌 오답은 최종 제출 때 해제');
  const legacy = {ids:[q.id],answers:{[q.id]:q.answer},flags:[],revealed:[q.id],index:0,finished:false,label:'이전 연습'};
  state.quiz=legacy;
  assert(activeQuiz().includes(q.explanation),'기존 정답 확인 상태 호환');
  assert.equal(updateQuizAnswer(state.quiz,q,'answer',(q.answer+1)%4),false);
  const synthetic = [
    {id:'eligible-law',category:'law'},
    {id:'past-law',category:'law',kind:'past-exam'},
    {id:'eligible-English',category:'english'},
    {id:'past-English',category:'english',kind:'past-exam'},
    {id:'excluded-English',category:'english',examEligible:false}
  ];
  const originalQuestions = DB.questions;
  DB.questions=synthetic;
  for(const bank of ['priority','past','concept','all'])assert(!quizQuestionPool('all',bank).some(q=>q.id==='excluded-English'));
  assert.equal(quizQuestionPool('all','past').length,2);
  assert.equal(quizQuestionPool('all','concept').length,2);
  const selected = selectQuizQuestions(quizQuestionPool('all','priority'),2,'all','priority');
  assert(selected.every(q=>q.kind==='past-exam'),'기출 우선 배정');
  assert.equal(new Set(selected.map(q=>q.category)).size,2,'혼합 연습 두 과목 균형');
  assert.equal(selectQuizQuestions(synthetic.slice(0,4),999,'all','priority').length,4,'가용 문항 수로 제한');
  DB.questions=originalQuestions;
})()`, context);
assert(saved && JSON.parse(saved).quiz, '자동 저장 가능');
console.log('CBT 검증 통과: 개별 채점·해설 토글·답 확정·저장 복원·기존 연습 호환·최종 제출·기출 우선·출제 제외');
