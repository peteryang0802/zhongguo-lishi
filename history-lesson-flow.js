'use strict';

const HISTORY_METHODS = {
  evidence: {
    title: '先找证据，再下结论',
    steps: ['说清材料里直接记下了什么。', '追问它能说明到哪一步，还有没有别的解释。'],
  },
  chronology: {
    title: '先排时间，再说变化',
    steps: ['在材料上标出事件和时间。', '按发生顺序排好，再找转折前后各变了什么。'],
  },
  cause: {
    title: '先找条件，再说它怎样起作用',
    steps: ['找在事情发生前已经存在的条件。', '说出这个条件怎样促成变化。遇到好几个原因，可以分别说。'],
  },
  compare: {
    title: '先定同一项，再比较差别',
    steps: ['说清要比较的是哪一项。', '从两份材料里各找一条能回答同一问题的记录。'],
  },
  geography: {
    title: '把人和事放回地图',
    steps: ['在地图上找到起点、终点和经过的地方。', '把路线与材料对照，看看不同地点各起了什么作用。'],
  },
  source: {
    title: '先认出处，再决定能用它判断什么',
    steps: ['在图注或题记找作者、制作年代和材料类型。', '区分现场留下的记录与后来的摹本、纪念品或想象。'],
  },
  policy: {
    title: '分开看写下的计划和真正做过的事',
    steps: ['圈出文件里的目标、要求或约定。', '再找执行记录，核对落实了多少、什么时候落实。'],
  },
};

// Each item follows the method used to check that lesson’s first claim.
const HISTORY_METHOD_BY_LESSON = {
  g7a: ['evidence','cause','evidence','compare','evidence','cause','evidence','evidence','compare','chronology','compare','compare','chronology','source','chronology','chronology','chronology','cause','compare','source','evidence'],
  g7b: ['chronology','evidence','evidence','cause','source','geography','cause','compare','cause','chronology','chronology','source','source','source','cause','evidence','chronology','chronology','evidence','cause','chronology','evidence'],
  g8a: ['cause','cause','policy','chronology','compare','compare','compare','compare','chronology','chronology','chronology','geography','geography','cause','cause','source','chronology','compare','chronology','policy','geography','source'],
  g8b: ['source','policy','evidence','compare','policy','evidence','chronology','cause','evidence','evidence','policy','policy','compare','evidence','policy','compare','evidence','chronology','evidence','evidence','geography','source','source','evidence'],
};

const historyPreview = {id:'opening-preview', choices:[{text:'对'},{text:'错'},{text:'还拿不准'}]};
const empowermentPreview = ['原王还能管', '原王不能直接管', '还拿不准'];
const unsavedHistorySteps = new Map();
let historyStep = 0;
let historySupplement = null;

function historyStepKey(no) {
  return practiceKey(no) + 'lesson-stage-v3';
}

function saveHistoryStep(no, step) {
  const key = historyStepKey(no);
  if (safeSet(key, String(step))) unsavedHistorySteps.delete(key);
  else unsavedHistorySteps.set(key, step);
}

function focusHistoryStage() {
  const heading = document.querySelector('#lessonView [data-study-heading]');
  heading?.focus({preventScroll:true});
  if (innerHeight > 500) window.scrollTo({top:0,behavior:'instant'});
  else heading?.scrollIntoView({block:'start',behavior:'instant'});
}

function historyStages(lesson, practices) {
  const sources = lesson.nodes.map(node => ({kind:'source', node, label:NODES[node].title}));
  const check = index => ({kind:'check', index, label:index===0?'核对开场的判断':'用另一份材料核对'});
  const first = sources.find(source => source.node === practices[0]?.node) || sources[0];
  return [{kind:'opening', label:'先做一个猜测'}, first, check(0),
    ...sources.filter(source => source !== first), check(1), {kind:'transfer', label:'用新材料试一次'}];
}

function changeHistoryStep(no, step) {
  historyStep = step;
  saveHistoryStep(no, step);
  renderHistoryStage(no);
  focusHistoryStage();
}

function enterHistoryStage(lesson) {
  const practice = lessonPractice(lesson.no);
  const key = historyStepKey(lesson.no);
  const stored = unsavedHistorySteps.get(key) ?? safeGet(key);
  let step = stored == null ? 0 : Number(stored);
  if (practice.length && stored == null) {
    const stages = historyStages(lesson, practice);
    const previousVersion = safeGet(practiceKey(lesson.no) + 'lesson-stage-v2');
    const previousNodes = lesson.nodes.filter(node => !NODES[node].newMaterial);
    if (previousVersion != null) {
      const old = historyStages({...lesson, nodes: previousNodes}, practice)[Number(previousVersion)];
      if (old) step = stages.findIndex(entry => entry.kind === old.kind && entry.node === old.node && entry.index === old.index);
    } else {
      const legacy = safeGet(practiceKey(lesson.no) + 'lesson-stage');
      const oldStep = legacy == null ? 0 : Number(legacy);
      const oldNode = legacy == null ? pendingResumeNode : oldStep > 0 ? previousNodes[oldStep - 1] : null;
      if (oldNode != null) step = stages.findIndex(entry => entry.kind === 'source' && entry.node === oldNode);
      else if (oldStep === previousNodes.length + 1) step = 2;
      else if (oldStep === previousNodes.length + 2) step = stages.length - 2;
      else if (oldStep === previousNodes.length + 3) step = stages.length - 1;
    }
  }
  pendingResumeNode = null;
  historyStep = Number.isInteger(step) && step >= 0 && step <= lesson.nodes.length + 3 ? step : 0;
  renderHistoryStage(lesson.no);
}

function paintHistoryProgress(plan) {
  const steps = plan.map(entry => entry.label);
  document.getElementById('historyStepLabel').textContent = '第 ' + (historyStep + 1) + ' / ' + steps.length + ' 步';
  document.getElementById('historyCurrentLabel').textContent = steps[historyStep];
  const list = document.getElementById('historyProgressList');
  list.replaceChildren(...steps.map((label, index) => {
    const item = document.createElement('li');
    const number = document.createElement('span');
    number.className = 'history-step-number';
    number.textContent = index + 1;
    number.setAttribute('aria-hidden', 'true');
    item.append(number, document.createTextNode(label));
    if (index === historyStep) item.setAttribute('aria-current', 'step');
    return item;
  }));
}

function historyTryButtons(item) {
  return item.choices.map((choice, index) => '<button type="button" data-history-try="' + index +
    '" aria-pressed="false">' + practiceText(choice.text) + '</button>').join('');
}

function bindHistoryOpening(stage, no, draw) {
  const buttons = Array.from(stage.querySelectorAll('[data-history-try]'));
  function paint(record) {
    buttons.forEach((button, index) => button.setAttribute('aria-pressed', String(index === record.selected)));
    draw(historyPreview.choices[record.selected]);
  }
  paint(readPracticeAnswer(no, historyPreview));
  buttons.forEach((button, index) => button.addEventListener('click', () => {
    const record = readPracticeAnswer(no, historyPreview);
    noteHistoryAnswer(record, index);
    writePracticeAnswer(no, historyPreview, record);
    P.setLast({type:'lesson',no});
    paint(record);
  }));
}

function renderHistoryOpening(stage, no, first, following) {
  const empowerment = currentBookId === 'g7a' && no === 12;
  stage.innerHTML = '<article class="history-opening-task">' +
    '<section class="history-core"><h3 data-study-heading tabindex="-1">' +
    practiceText(empowerment ? '封地分给几个儿子，原来的王还能管所有新侯国吗？' : first.title) + '</h3></section>' +
    '<p class="history-instruction">先猜一猜。下一步看一份材料，找一个能支持判断的地方。</p>' +
    '<div class="history-practice-choices is-judgment is-preview" role="group" aria-label="开场判断">' +
    historyTryButtons(historyPreview) + '</div></article>';
  if (empowerment) {
    stage.querySelectorAll('[data-history-try]').forEach((button,index) => { button.textContent = empowermentPreview[index]; });
  }
  const forward = paintHistoryActions(no, empowerment ? '找出谁管新侯国' : '看' + following.label + '的材料', 1);
  bindHistoryOpening(stage, no, choice => { forward.hidden = !choice; });
}

function historyTransferItem(no) {
  const row = typeof HISTORY_TRANSFER_PRACTICE === 'undefined' ? null : HISTORY_TRANSFER_PRACTICE[currentBookId]?.[no - 1];
  if (!row) return null;
  const [question, right, wrong, proof, firstDecoy, secondDecoy, evidenceWhy] = row;
  const offset = no + Object.keys(HISTORY_METHOD_BY_LESSON).indexOf(currentBookId);
  const choices = [{text:right,correct:true},{text:wrong,correct:false}];
  const proofs = [{text:proof,correct:true},{text:firstDecoy,correct:false},{text:secondDecoy,correct:false}];
  if (offset % 2) choices.reverse();
  for (let i = 0; i < offset % 3; i++) proofs.push(proofs.shift());
  return {id:'new-archive-pair-v2', question, choices, proofs, evidenceWhy,
    ...HISTORY_METHODS[HISTORY_METHOD_BY_LESSON[currentBookId]?.[no - 1]]};
}

function historyReviewOldTransfer(no) {
  const choices = historyPreview.choices.slice(0, 2);
  return ['method-transfer','new-archive-pair'].some(id => readPracticeAnswer(no, {id, choices}).first !== null);
}

function renderHistoryReview(stage, no, practices) {
  const transfer = historyTransferItem(no);
  if (!transfer) {
    stage.innerHTML = '<h3 data-study-heading tabindex="-1">这课的新档案暂未加载</h3><p>可以重试，已经答过的题会保留。</p>';
    const reload = document.createElement('button');
    reload.type = 'button';
    reload.className = 'history-action';
    reload.textContent = '重新加载本课';
    reload.addEventListener('click', () => location.reload());
    stage.append(reload);
    paintHistoryActions(no, '', null, true);
    return;
  }
  stage.innerHTML = '<section class="history-core"><h3 data-study-heading tabindex="-1">用新材料试一次</h3>' +
    '<p class="history-recall">课堂模拟档案。用刚练过的方法，先判断，再选一条支持它的记录。</p></section>' +
    '<div class="history-practice-data history-transfer"><fieldset><legend>' + practiceText(transfer.question) + '</legend>' +
    '<div class="history-practice-choices history-transfer-claims">' + historyTryButtons(transfer) + '</div></fieldset>' +
    '<fieldset class="history-transfer-proofs"><legend>三条档案记录</legend><div class="history-practice-choices">' +
    transfer.proofs.map((proof, index) => '<button type="button" data-history-proof="' + index + '" aria-pressed="false">' +
      practiceText(proof.text) + '</button>').join('') + '</div></fieldset>' +
    '<p class="history-practice-feedback" role="status" aria-atomic="true"></p>' +
    '<details class="history-explanation" data-transfer-hint><summary>想不起来时，看方法提示</summary>' +
    '<p>' + practiceText(transfer.title) + '</p><ol>' +
    transfer.steps.map(step => '<li>' + practiceText(step) + '</li>').join('') + '</ol></details></div>' +
    '<p class="history-completion" data-lesson-verification></p>';
  const next = lessonByNo(no + 1);
  const completionLabel = next ? '开始下一课 · ' + next.title : '回到本册目录';
  const summary = historyLessonCheckSummary(no, practices);
  const pendingCheck = summary.core.findIndex(value => value === 'unanswered' || value === 'retry');
  const retryStep = historyStages(lessonByNo(no), practices).findIndex(entry => entry.kind === 'check' && entry.index === pendingCheck);
  const forward = paintHistoryActions(no, retryStep >= 0 ? '先完成待核对的题' : completionLabel,
    retryStep >= 0 ? retryStep : null, true);
  const task = stage.querySelector('.history-transfer');
  const helper = task.querySelector('[data-transfer-hint]');
  const claimButtons = [...task.querySelectorAll('[data-history-try]')];
  const proofButtons = [...task.querySelectorAll('[data-history-proof]')];
  const feedback = task.querySelector('[role="status"]');
  const status = stage.querySelector('[data-lesson-verification]');
  function paint() {
    const record = readPracticeAnswer(no, transfer);
    const choice = transfer.choices[record.selected];
    const proof = transfer.proofs[record.proof];
    const summary = historyLessonCheckSummary(no, practices);
    const checked = summary.core.filter(value => value !== 'unanswered' && value !== 'retry').length;
    const done = ['independent','supported'].includes(summary.state);
    status.textContent = '课内已核对 ' + checked + ' / ' + practices.length + ' · 新材料 ' +
      (summary.state === 'unanswered' ? (historyReviewOldTransfer(no) ? '旧题已答，本题待验证' : '待验证') : historyCheckLabels[summary.state]);
    claimButtons.forEach((button,index) => {
      button.setAttribute('aria-pressed', String(index === record.selected));
      button.disabled = record.awaitingProof;
    });
    proofButtons.forEach((button,index) => {
      button.setAttribute('aria-pressed', String(index === record.proof));
      button.disabled = !choice || (!choice.correct && !record.awaitingProof);
    });
    if (done) {
      task.dataset.result = 'correct';
      feedback.textContent = historyCheckLabels[summary.state] + '。你选出的记录能支持这个判断。';
    } else if (summary.state === 'retry') {
      task.dataset.result = 'retry';
      feedback.textContent = proof && !proof.correct
        ? '这条记录还不足以支持判断。' + transfer.evidenceWhy
        : record.awaitingProof
          ? '先别换答案。回到三条记录，点出你用来判断的那一条。'
          : '你已找到相关记录。用它核对后，重选判断。';
    } else {
      delete task.dataset.result;
      feedback.textContent = choice ? '再点一条能支持判断的记录。' : '';
    }
    updateHistoryForward(forward, done);
  }
  helper.addEventListener('toggle', () => {
    const record = readPracticeAnswer(no, transfer);
    if (helper.open && !(transfer.choices[record.selected]?.correct && transfer.proofs[record.proof]?.correct)) {
      record.checkedBeforeAnswer = true;
      writePracticeAnswer(no, transfer, record);
    }
  });
  claimButtons.forEach((button,index) => button.addEventListener('click', () => {
    const record = readPracticeAnswer(no, transfer);
    if (helper.open && !(transfer.choices[record.selected]?.correct && transfer.proofs[record.proof]?.correct)) {
      record.checkedBeforeAnswer = true;
    }
    noteHistoryAnswer(record,index);
    record.awaitingProof = !transfer.choices[index].correct && !transfer.proofs[record.proof]?.correct;
    writePracticeAnswer(no, transfer, record);
    paint();
    if (!transfer.choices[index].correct && record.awaitingProof) proofButtons[0].focus({preventScroll:true});
  }));
  proofButtons.forEach((button,index) => button.addEventListener('click', () => {
    const record = readPracticeAnswer(no, transfer);
    if (helper.open && !(transfer.choices[record.selected]?.correct && transfer.proofs[record.proof]?.correct)) {
      record.checkedBeforeAnswer = true;
    }
    record.firstProof ??= index;
    record.proof = index;
    if (transfer.proofs[index].correct) record.awaitingProof = false;
    writePracticeAnswer(no, transfer, record);
    paint();
    if (transfer.proofs[index].correct && !transfer.choices[record.selected]?.correct) {
      claimButtons[record.selected]?.focus({preventScroll:true});
    }
  }));
  paint();
}

function renderHistoryStage(no) {
  const lesson = lessonByNo(no);
  const practice = lessonPractice(no);
  const stage = document.getElementById('historyStudy');
  stage.replaceChildren();
  historyPractice.replaceChildren();
  historyPractice.hidden = true;
  lessonFoot.replaceChildren();
  if (practice.length < 2) {
    renderUnavailableHistoryPractice(no);
    return;
  }
  const plan = historyStages(lesson, practice);
  const current = plan[historyStep];
  const following = plan[historyStep + 1];
  paintHistoryProgress(plan);
  if (current.kind === 'opening') {
    renderHistoryOpening(stage, no, practice[0], following);
  } else if (current.kind === 'source') {
    renderHistoryMaterial(stage, current.node, no);
    if (historyStep === 1 && lesson.themeOrder) {
      const note = document.createElement('p');
      note.className = 'history-instruction';
      note.textContent = '先读能回答开场问题的材料，再按本课主题继续。';
      stage.prepend(note);
    }
    const label = following.kind === 'source' ? '看' + following.label + '的材料' : following.label;
    const forward = paintHistoryActions(no, label, historyStep + 1);
    bindHistoryMaterialCheck(stage, no, NODES[current.node], forward);
  } else if (current.kind === 'check') {
    renderHistoryPractice(no, practice[current.index], current.index);
    const label = following.kind === 'source' ? '看' + following.label + '的材料' : following.label;
    paintHistoryActions(no, label, historyStep + 1, !historyPractice.querySelector('[data-result="correct"]'));
  } else {
    renderHistoryReview(stage, no, practice);
  }
}

function updateHistoryForward(button, ready) {
  button.hidden = !ready;
  button.textContent = button.dataset.nextLabel;
}

function paintHistoryActions(no, label, next, waiting = false) {
  const main = document.createElement('button');
  main.type = 'button';
  main.className = 'history-action';
  main.dataset.studyNext = '';
  main.dataset.nextLabel = label;
  updateHistoryForward(main, !waiting);
  main.addEventListener('click', () => {
    if (next != null) changeHistoryStep(no, next);
    else go(lessonByNo(no + 1) ? '/lesson/' + (no + 1) : '/');
  });
  lessonFoot.append(main);
  if (historyStep > 0) {
    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'history-secondary';
    back.dataset.studyBack = '';
    back.textContent = '← 上一步';
    back.addEventListener('click', () => changeHistoryStep(no, historyStep - 1));
    lessonFoot.append(back);
  }
  return main;
}

function renderHistoryMaterial(container, node, no) {
  const card = NODES[node];
  const meta = IMG_META[card.id];
  const badge = meta ? evidenceOf(card, meta.kind) : null;
  const date = card.approx && !card.yearLabel.includes('约') ? card.yearLabel + '（约）' : card.yearLabel;
  container.innerHTML = '<article class="history-material"><p class="history-date">' +
    practiceText(date) + '</p><h3 data-study-heading tabindex="-1">' + practiceText(card.title) + '</h3>' +
    (NODE_META[node] ? '<p class="history-date">' + practiceText(NODE_META[node]) + '</p>' : '') +
    '<div class="history-material-body' + (meta ? ' has-image' : '') + '">' +
    '<div class="history-reading"><p>' + practiceText(card.story) + '</p><ul>' +
    card.points.map(point => '<li>' + practiceText(point) + '</li>').join('') + '</ul>' +
    (card.reference ? '<p class="history-attribution">' + practiceText(card.reference) + '</p>' : '') + '</div>' +
    (meta ? '<figure class="history-picture"><img src="' + practiceText(toWebp(meta.img)) + '" alt="' + practiceText(meta.name) + '">' +
      '<figcaption><strong>' + practiceText(meta.name) + '</strong> · ' + practiceText(badge.label) + '<br>' +
      practiceText(meta.era) + ' · ' + practiceText(meta.source) + ' · ' + practiceText(meta.kind) +
      '</figcaption><button class="history-secondary" type="button" data-history-zoom>放大读图</button></figure>' : '') + '</div></article>';
  const article = container.firstElementChild;
  const img = article.querySelector('img');
  if (img) {
    const zoom = article.querySelector('[data-history-zoom]');
    zoom.addEventListener('click', () => openHistoryImageZoom(img, zoom));
    const fallback = document.createElement('p');
    fallback.className = 'history-image-error';
    fallback.hidden = true;
    fallback.textContent = '这张图暂时没有加载出来，可以先读史料文字。';
    const onError = () => {
      if (img.getAttribute('src') !== meta.img) img.src = meta.img;
      else {img.hidden = true;fallback.hidden = false;zoom.hidden = true;}
    };
    img.addEventListener('error', onError);
    img.after(fallback);
    if (img.complete && !img.naturalWidth) onError();
  }
  addHistorySupplement(article, node);
  P.setLast({type:'lesson',no,nodeIndex:node,nodeTitle:card.title});
  if (!P.isNodeSeen(node)) {
    P.markNodeSeen(node);
    maybeLessonDone(no);
  }
}

function bindHistoryMaterialCheck(stage, no, card, forward) {
  if (!card.check) return;
  const [question, answer, choices] = card.check;
  const item = {id:'material-check-' + card.id,
    choices:choices.map(([text, reply], index) => ({text, reply, correct:index === answer}))};
  const task = document.createElement('section');
  task.className = 'history-material-check';
  task.innerHTML = '<fieldset><legend>' + practiceText(question) + '</legend>' +
    '<div class="history-practice-choices">' + historyTryButtons(item) + '</div></fieldset>' +
    '<p class="history-practice-feedback" role="status"></p>';
  stage.append(task);
  const buttons = [...task.querySelectorAll('[data-history-try]')];
  const feedback = task.querySelector('[role="status"]');
  function paint(record) {
    const selected = item.choices[record.selected];
    const correct = selected?.correct === true;
    buttons.forEach((button, index) => {
      button.setAttribute('aria-pressed', String(index === record.selected));
      button.disabled = correct;
    });
    feedback.textContent = selected ? selected.reply : '';
    if (selected) feedback.dataset.result = correct ? 'correct' : 'retry';
    updateHistoryForward(forward, correct);
  }
  buttons.forEach((button, index) => button.addEventListener('click', () => {
    const record = readPracticeAnswer(no, item);
    noteHistoryAnswer(record, index);
    writePracticeAnswer(no, item, record);
    paint(record);
  }));
  paint(readPracticeAnswer(no, item));
}

function addHistorySupplement(article, node) {
  const topic = TOPIC_MAP[node];
  const model = NODE_3D_MAP[node];
  const threads = THREAD_MAP[NODES[node].id] || [];
  if (!topic && !model && !OBSERVE_MAP[node] && !threads.length) return;
  const extras = document.createElement('details');
  extras.className = 'history-extras';
  extras.innerHTML = '<summary>延伸观察（可选）</summary>';
  if (OBSERVE_MAP[node]) {
    const observe = document.createElement('div');
    observe.className = 'observe history-observe';
    extras.append(observe);
    renderObserve(node, observe);
  }
  function add(title, action) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'history-secondary';
    button.textContent = title;
    button.addEventListener('click',() => {
      historySupplement = {book:currentBookId,no:currentLessonNo};
      action();
    });
    extras.append(button);
  }
  if (topic) add(TOPIC_NAME[topic], () => openTopic(topic));
  if (model) add(S3D_META[model].name, () => open3D(model,node));
  threads.forEach(id => {
    const thread = THREADS.find(item => item.id === id);
    if (thread) add('跨课话题 · ' + thread.name, () => go('/thread/' + id));
  });
  article.append(extras);
}

function returnHistorySupplement() {
  if (!historySupplement) return false;
  go('/book/' + historySupplement.book + '/lesson/' + historySupplement.no);
  return true;
}
