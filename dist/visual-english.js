'use strict';

function visualEnglishPage(topicId = '') {
  const guide = DB.visualEnglish;
  const selected = guide.topics.find(topic => topic.id === topicId);
  const topics = selected ? [selected] : guide.topics;
  return `${pageHead('VISUAL AVIATION ENGLISH', '그림으로 이해하는 항공영어', '영어 용어를 위치·방향·움직임으로 연결해 보세요. 그림을 보고, 짧은 설명을 읽은 뒤 관련 단원으로 이어집니다.', '<a class="btn secondary" href="#english">항공영어 목차</a><a class="btn" href="#quiz">CBT 연습하기</a>')}
    <nav class="visual-topic-nav" aria-label="그림 개념 주제">
      <a class="btn secondary small" href="#visual-english" ${!selected ? 'aria-current="page"' : ''}>전체 보기</a>
      ${guide.topics.map(topic => `<a class="btn secondary small" href="#visual-english/${topic.id}" ${selected?.id === topic.id ? 'aria-current="page"' : ''}>${esc(topic.title)}</a>`).join('')}
    </nav>
    <div class="visual-guide-note"><span>${guide.topics.length}개 그림 · 영어 용어와 한국어 풀이</span><span>그림·용어 확인 ${esc(guide.verified.replaceAll('-', '.'))}</span></div>
    <div class="visual-topic-list">${topics.map(topic => visualTopic(topic, guide.topics.indexOf(topic))).join('<hr class="visual-divider">')}</div>
    <p class="visual-footnote">원본 교육 그림과 용어 이해를 위한 요약입니다. FAA 자료의 운용 예시는 국가·공항별 절차와 차이가 있을 수 있으며, 실제 운항에는 해당 지역의 현행 절차와 관제 지시를 확인합니다.</p>`;
}

function visualTopic(topic, index) {
  const image = topic.image;
  return `<section class="visual-topic" aria-labelledby="visual-title-${topic.id}">
    <div class="visual-topic-title"><span class="badge-number">${String(index + 1).padStart(2, '0')}</span><div><h2 id="visual-title-${topic.id}">${esc(topic.title)}</h2><p>${esc(topic.summary)}</p></div></div>
    <div class="visual-topic-layout">
      <div class="visual-picture-column"><figure class="visual-figure"><img src="${esc(image.file)}" alt="${esc(image.alt)}" loading="lazy" decoding="async"><figcaption>${esc(image.credit)}</figcaption></figure>
        <button class="btn secondary small" data-action="visual-image" data-id="${topic.id}">${icon('search', 14)} 그림 크게 보기</button>
        <div class="visual-reading"><strong>그림 읽는 순서</strong><p>${esc(image.reading)}</p></div>
      </div>
      <dl class="visual-terms">${topic.terms.map(term => `<div><dt><span lang="en">${esc(term.en)}</span><span class="visual-ko">${esc(term.ko)}</span></dt><dd>${esc(term.meaning)}</dd></div>`).join('')}</dl>
    </div>
    <div class="visual-explainer"><p><strong>비유로 기억하기</strong>${esc(topic.analogy)}</p><p><strong>헷갈리지 않기</strong>${esc(topic.watch)}</p><p><strong>표현 예시</strong><span lang="en" class="visual-example">${esc(topic.example.en)}</span>${esc(topic.example.ko)}</p></div>
    <div class="visual-topic-footer"><div class="actions">${topic.chapters.map(id => { const chapter = DB.chapters.find(c => c.id === id); return `<a class="text-link" href="#chapter/${id}">${esc(chapter.title)} ${icon('arrow', 13)}</a>`; }).join('')}</div><details class="visual-sources"><summary>그림·설명 출처</summary><a href="${esc(image.source)}" target="_blank" rel="noopener">${esc(image.credit)} ${icon('external', 11)}</a><a href="${esc(image.url)}" target="_blank" rel="noopener">원본 그림 열기 ${icon('external', 11)}</a>${image.reference ? `<a href="${esc(image.reference)}" target="_blank" rel="noopener">관련 용어·절차 확인 ${icon('external', 11)}</a>` : ''}</details></div>
  </section>`;
}

function showVisualImage(id) {
  const topic = DB.visualEnglish.topics.find(item => item.id === id);
  if (!topic) return;
  const image = topic.image;
  openModal(`<div class="modal-header visual-image-header"><h2>${esc(image.title)}</h2><button data-action="close-modal" class="modal-close" aria-label="닫기">×</button></div><div class="modal-body visual-image-view"><img src="${esc(image.file)}" alt="${esc(image.alt)}"><p>${esc(image.reading)}</p><a href="${esc(image.file)}" target="_blank" rel="noopener">원본 크기로 열기 ${icon('external', 12)}</a><div class="tiny muted">${esc(image.credit)}</div></div>`);
}
