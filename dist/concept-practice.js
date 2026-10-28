// 개념 연습의 답안은 시간제 CBT 및 학습 기록과 독립적으로 관리한다.
const conceptPracticeSessions = new Map();

function pickConceptQuestions(pool, previous = [], count = 3) {
  const fresh = pool.filter(question => !previous.includes(question.id));
  const candidates = fresh.length >= Math.min(count, pool.length) ? fresh : pool;
  const groups = new Map();
  for (const question of candidates) {
    const chapter = DB.chapters.find(item => item.id === question.chapterId);
    const group = chapter?.section || question.chapterId;
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(question);
  }
  const queues = shuffle([...groups.values()]).map(shuffle);
  const selected = [];
  while (selected.length < Math.min(count, candidates.length)) {
    for (const queue of queues) {
      if (queue.length && selected.length < count) selected.push(queue.pop().id);
    }
  }
  return selected;
}

function conceptPracticePool(category, chapterId) {
  return DB.questions.filter(question => question.category === category && (!chapterId || question.chapterId === chapterId));
}

function conceptPracticeSession(category, chapterId = '') {
  const scope = chapterId ? `chapter-${chapterId}` : `subject-${category}`;
  if (!conceptPracticeSessions.has(scope)) {
    const pool = conceptPracticePool(category, chapterId);
    conceptPracticeSessions.set(scope, { scope, category, chapterId, ids: pickConceptQuestions(pool), answers: {}, revealed: [] });
  }
  return conceptPracticeSessions.get(scope);
}

function conceptQuestionCard(question, session, index) {
  const chapter = DB.chapters.find(item => item.id === question.chapterId);
  const selected = session.answers[question.id];
  const revealed = session.revealed.includes(question.id);
  const correct = selected === question.answer;
  return `<div class="concept-question-heading"><span class="concept-number">${String(index + 1).padStart(2, '0')}</span><span class="tiny muted">${esc(chapter.section.replace(/^\d+\s*/, ''))}</span></div>
    <div class="concept-summary"><span class="concept-label">연결 개념</span><a href="#chapter/${chapter.id}">${esc(chapter.title)} ${icon('arrow', 12)}</a><p>${esc(chapter.summary)}</p></div>
    <h3 id="concept-prompt-${question.id}">${esc(question.prompt)}</h3>
    <div class="concept-options" role="group" aria-labelledby="concept-prompt-${question.id}">${question.options.map((option, optionIndex) => `<button type="button" class="answer-option ${selected === optionIndex ? 'selected' : ''} ${revealed && optionIndex === question.answer ? 'correct' : ''} ${revealed && selected === optionIndex && !correct ? 'incorrect' : ''}" data-concept-action="answer" data-scope="${session.scope}" data-question="${question.id}" data-option="${optionIndex}" aria-pressed="${selected === optionIndex}" ${revealed ? 'disabled' : ''}><span class="option-no">${optionIndex + 1}</span><span>${esc(option)}</span></button>`).join('')}</div>
    <div class="concept-question-actions">${revealed ? `<button type="button" class="btn secondary small" data-concept-action="retry" data-scope="${session.scope}" data-question="${question.id}">다시 풀기</button>` : `<button type="button" class="btn small" data-concept-action="reveal" data-scope="${session.scope}" data-question="${question.id}">정답 확인</button>`}<a class="text-link" href="#chapter/${chapter.id}">개념 자세히 읽기 ${icon('arrow', 13)}</a></div>
    <div class="concept-feedback" aria-live="polite">${revealed ? `<div class="explanation"><strong class="${correct ? 'correct-text' : 'wrong-text'}">${correct ? '정답입니다.' : `정답은 ${question.answer + 1}번입니다.`}</strong><p><b>${esc(question.options[question.answer])}</b></p><p>${esc(question.explanation)}</p><div class="source-links">${(question.sourceIds || []).map(sourceLink).join('<br>')}</div></div>` : ''}</div>`;
}

function conceptPracticeCards(session) {
  return session.ids.map((id, index) => {
    const question = DB.questions.find(item => item.id === id);
    return `<article class="concept-question" data-concept-card="${id}" data-scope="${session.scope}">${conceptQuestionCard(question, session, index)}</article>`;
  }).join('');
}

function conceptPracticeSection(category, chapterId = '') {
  if (!['law', 'english'].includes(category)) return '';
  const pool = conceptPracticePool(category, chapterId);
  if (!pool.length) return '';
  const session = conceptPracticeSession(category, chapterId);
  return `<section class="concept-practice" id="concept-practice-${session.scope}" aria-labelledby="concept-title-${session.scope}">
    <div class="section-head"><div><div class="eyebrow">CONCEPT & PRACTICE</div><h2 id="concept-title-${session.scope}">${chapterId ? '이 단원 문제로 확인하기' : '개념과 함께 풀어보기'} <span class="pill">${session.ids.length}문항</span></h2></div>${pool.length > session.ids.length ? `<button type="button" class="btn secondary small" data-concept-action="refresh" data-scope="${session.scope}">${icon('refresh', 14)} 다른 문제 보기</button>` : ''}</div>
    <p class="section-note">${chapterId ? '방금 읽은 개념을 적용하고 정답의 이유를 확인하세요.' : '관련 개념을 읽고 답을 골라보세요. 해설에서 원문과 상세 단원까지 이어집니다.'}</p>
    <div class="concept-question-list" data-concept-list="${session.scope}">${conceptPracticeCards(session)}</div>
    <p class="concept-practice-note">부담 없이 확인하는 개념 연습입니다. 답안은 새로고침하면 초기화되며 CBT 점수와 오답 기록에는 합산되지 않습니다.</p>
  </section>`;
}

function updateConceptAnswer(session, question, action, option) {
  if (!session || !question || !session.ids.includes(question.id)) return false;
  if (action === 'answer') {
    if (session.revealed.includes(question.id) || !Number.isInteger(option) || option < 0 || option >= question.options.length) return false;
    session.answers[question.id] = option;
  } else if (action === 'reveal') {
    if (session.answers[question.id] === undefined) return false;
    if (!session.revealed.includes(question.id)) session.revealed.push(question.id);
  } else if (action === 'retry') {
    delete session.answers[question.id];
    session.revealed = session.revealed.filter(id => id !== question.id);
  } else return false;
  return true;
}

document.addEventListener('click', event => {
  const button = event.target.closest('[data-concept-action]');
  if (!button) return;
  const session = conceptPracticeSessions.get(button.dataset.scope);
  if (!session) return;
  const action = button.dataset.conceptAction;
  if (action === 'refresh') {
    session.ids = pickConceptQuestions(conceptPracticePool(session.category, session.chapterId), session.ids);
    session.answers = {};
    session.revealed = [];
    document.querySelector(`[data-concept-list="${session.scope}"]`).innerHTML = conceptPracticeCards(session);
    toast('다른 개념 문제를 준비했습니다.');
    return;
  }
  const question = DB.questions.find(item => item.id === button.dataset.question);
  const option = Number(button.dataset.option);
  if (!updateConceptAnswer(session, question, action, option)) {
    if (action === 'reveal') toast('답을 먼저 선택해 주세요.');
    return;
  }
  const card = button.closest('[data-concept-card]');
  card.innerHTML = conceptQuestionCard(question, session, session.ids.indexOf(question.id));
  const focusSelector = action === 'answer' ? `[data-concept-action="answer"][data-option="${option}"]` : action === 'reveal' ? '[data-concept-action="retry"]' : '[data-concept-action="answer"]';
  card.querySelector(focusSelector)?.focus({ preventScroll: true });
});
