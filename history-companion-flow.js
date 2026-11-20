'use strict';

function updateHistoryCatalogExtras() {
  const catalog = document.getElementById('historyCatalogExtras');
  const list = document.getElementById('historyExtrasList');
  const groups = [
    ['动手专题', 'activity', Object.entries(TOPIC_NAME)],
    ['跨课话题', 'thread', THREADS.map(({id,name})=>[id,name])],
    ['3D 观察', '3d', Object.entries(S3D_META).map(([id,scene])=>[id,scene.name])],
  ];
  list.replaceChildren();
  for (const [name, kind, entries] of groups) {
    if (!entries.length) continue;
    const section = document.createElement('section');
    const heading = document.createElement('h3');
    heading.textContent = name;
    const links = entries.map(([id,label])=>{
      const link = document.createElement('a');
      link.href = '#/book/' + currentBookId + '/' + kind + '/' + id;
      link.textContent = label;
      return link;
    });
    section.append(heading, ...links);
    list.append(section);
  }
  catalog.hidden = !list.childElementCount;
  catalog.open = false;
}

function historyCompanionLayout(view, content, title, labels, step) {
  let layout = content.parentElement;
  if (!layout.classList.contains('history-companion-layout')) {
    const heading = document.createElement('h2');
    heading.className = 'history-companion-title';
    layout = document.createElement('div');
    layout.className = 'history-layout history-companion-layout';
    const side = document.createElement('aside');
    side.className = 'history-progress';
    side.setAttribute('aria-label', '学习进度');
    side.innerHTML = '<h3>学习进度</h3><p class="history-position"><span></span><span></span></p><ol role="list"></ol>';
    view.insertBefore(heading, content);
    content.before(layout);
    layout.append(side, content);
    content.classList.add('history-content');
  }
  view.querySelector('.history-companion-title').textContent = title;
  const side = layout.querySelector('.history-progress');
  const position = side.querySelector('.history-position');
  position.children[0].textContent = '第 ' + (step + 1) + ' / ' + labels.length + ' 步';
  position.children[1].textContent = labels[step];
  side.querySelector('ol').replaceChildren(...labels.map((label, index) => {
    const item = document.createElement('li');
    const marker = document.createElement('span');
    marker.className = 'history-step-number';
    marker.setAttribute('aria-hidden', 'true');
    marker.textContent = index + 1;
    item.append(marker, document.createTextNode(label));
    if (index === step) item.setAttribute('aria-current', 'step');
    return item;
  }));
}

function historyCompanionActions(container, back, nextLabel, next) {
  const make = (label, primary, handler) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = primary ? 'history-action' : 'history-secondary';
    button.textContent = label;
    button.addEventListener('click', handler);
    return button;
  };
  container.replaceChildren();
  if (next) {
    const button = make(nextLabel, true, next);
    button.dataset.companionNext = '';
    container.append(button);
  }
  if (back) {
    const button = make('← 上一步', false, back);
    button.dataset.companionBack = '';
    container.append(button);
  }
  container.hidden = !container.childElementCount;
}

function focusHistoryCompanion(element) {
  if (!element) return;
  element.tabIndex = -1;
  element.focus({preventScroll:true});
  if (innerHeight > 500) window.scrollTo({top:0,behavior:'instant'});
  else element.scrollIntoView({block:'start',behavior:'instant'});
}

const HISTORY_TOPIC_STEPS = {
  paper: {
    title: '蔡伦以前，汉朝人真的没有纸吗？',
    labels: ['挑一件能作证的材料','分清有纸与改进造纸','用新残片判断有没有纸','说清一张纸不能证明什么','记下辨证办法'],
    parts: [
      ['.paper-claim','.evidence-grid','.ev-ask','.ev-answers','#evFeedback'],
      ['#cailunDeep'],
      ['#paperTransfer'],
      ['#paperTransfer'],
      ['#paperWarmup','#paperReset','.companion-method'],
    ],
    limit: () => paperEv !== true ? 0 : paperQ1 !== true ? 2 : paperQ2 !== true ? 3 : 4,
    method: '先辨认东西是什么，再核对它的年代。出土一张麻纸，可以说明那个时期已有纸；要证明纸张是否普及，还要找不同地方的出土记录。',
  },
  tuen: {
    title: '一个王国，分完以后，谁说了算？',
    labels: ['分一次地，观察归属','沿管辖线找依据','说清变了哪项权力','读新文书，选归属和依据'],
    parts: [
      ['.question','#btnRow','.stage','#hintAfter','#belong'],
      ['#ruleCompare'],
      ['#reveal','#longview','.companion-method'],
      ['#tuenTransfer'],
    ],
    limit: () => tuenJudge === true ? 3 : seenKing && seenHou ? 1 : 0,
    method: '判断权力从哪里移到哪里，要看谁有权批、谁直接管。图上地块的大小仅作示意，新的侯国归汉郡管才是变化。',
  },
  silk: {
    title: '一匹丝绸，怎么走到欧洲？',
    labels: ['送丝绸走一条路','辨认两方向的交换','用另一条路验证'],
    parts: [
      ['.companion-map-details','#silkMap','#silkNow','#silkChoices'],
      ['#silkReturn'],
      ['#silkCompare','#silkGan','#silkReset','.companion-method'],
    ],
    limit: () => silkTrials.length && document.getElementById('silkReturn').classList.contains('show') ? 2 : 0,
    method: '看贸易路线时，逐站追踪谁把货交给了谁，再分开看往西去与往东来的东西。换一条路线，对比哪些环节相同，哪些不同。',
  },
};

let companionTopicKey = null;
let companionTopicStep = 0;
const mountedTopicPanes = new Set();

function prepareHistoryTopic(pane, key) {
  if (mountedTopicPanes.has(pane)) return;
  mountedTopicPanes.add(pane);
  pane.classList.add('history-companion-topic');
  pane.querySelectorAll(':is(.question,.exp-card) > :is(h2,.tag)').forEach(node => { node.hidden = true; });
  const method = document.createElement('p');
  method.className = 'history-method companion-method';
  method.textContent = HISTORY_TOPIC_STEPS[key].method;
  pane.append(method);
  const foot = document.createElement('div');
  foot.className = 'lesson-foot companion-actions';
  pane.append(foot);
  if (key === 'silk') {
    const details = document.createElement('details');
    details.className = 'companion-map-details';
    const summary = document.createElement('summary');
    summary.textContent = '查看路线示意与史料范围';
    const orientation = pane.querySelector('.silk-orient');
    const explanation = pane.querySelector('.silk-schematic');
    orientation.before(details);
    details.append(summary, pane.querySelector('#silkExp > p'), orientation, explanation);
  }
  if (key === 'tuen') {
    foot.after(pane.querySelector('#resetBtn'));
  }
}

function enterHistoryCompanionTopic(key) {
  companionTopicKey = key;
  const view = document.getElementById('topicView');
  const panes = view.querySelectorAll('.topic-pane');
  let content = view.querySelector('.history-topic-content');
  if (!content) {
    content = document.createElement('div');
    content.className = 'history-topic-content';
    panes[0].before(content);
    content.append(...panes);
  }
  const pane = document.getElementById('pane-' + key);
  prepareHistoryTopic(pane, key);
  const saved = store.topicStepOf('companion:' + key)?.step;
  const limit = HISTORY_TOPIC_STEPS[key].limit();
  companionTopicStep = Number.isInteger(saved) ? Math.min(Math.max(saved, 0), limit) : limit ? Math.min(limit, 2) : 0;
  updateHistoryCompanionTopic();
}

function changeHistoryCompanionTopic(step, focus = true) {
  companionTopicStep = step;
  store.setTopicStepOf('companion:' + companionTopicKey,{step});
  updateHistoryCompanionTopic();
  if (focus) {
    const pane = document.getElementById('pane-' + companionTopicKey);
    focusHistoryCompanion(pane.querySelector('.companion-stage-heading'));
  }
}

function updateHistoryCompanionTopic() {
  if (!companionTopicKey || !document.getElementById('topicView').classList.contains('active')) return;
  const key = companionTopicKey;
  const pane = document.getElementById('pane-' + key);
  const spec = HISTORY_TOPIC_STEPS[key];
  const step = companionTopicStep;
  const active = new Set(spec.parts[step]);
  const parts = new Set(spec.parts.flat());
  for (const selector of parts) {
    const node = pane.querySelector(selector);
    if (node) node.hidden = !active.has(selector);
  }
  let heading = pane.querySelector('.companion-stage-heading');
  if (!heading) {
    heading = document.createElement('h3');
    heading.className = 'companion-stage-heading';
    pane.prepend(heading);
  }
  heading.textContent = spec.labels[step];
  if (key === 'paper' && (step === 2 || step === 3)) {
    document.getElementById('tq1').hidden = step !== 2;
    document.getElementById('tq2').hidden = step !== 3;
    paintPaperTransferFeedback(step - 2);
  }
  if (key === 'tuen') {
    const reset = pane.querySelector('#resetBtn');
    reset.hidden = step !== spec.labels.length - 1 || !['independent','supported'].includes(tuenTransferState(tuenTransfer));
  }
  historyCompanionLayout(document.getElementById('topicView'), pane.parentElement, spec.title, spec.labels, step);
  const finalStep = step === spec.labels.length - 1;
  const replay = key === 'silk' && finalStep && silkTrials.length < 2;
  const tuenPass = key === 'tuen' && finalStep && ['independent','supported'].includes(tuenTransferState(tuenTransfer));
  const next = finalStep ? replay ? () => {
    resetForAnother();
    changeHistoryCompanionTopic(0);
  } : key==='tuen' ? tuenPass ? () => { markTopicDone('tuen'); closeTopic(); } : null : closeTopic
    : step < spec.limit() ? () => changeHistoryCompanionTopic(step + 1) : null;
  const actions = pane.querySelector('.companion-actions');
  historyCompanionActions(actions, step > 0 ? () => changeHistoryCompanionTopic(step - 1) : null,
    finalStep ? replay ? '试另一条路线' : '完成专题' : spec.labels[step + 1], next);
  if (key === 'tuen' && finalStep && !tuenPass) {
    const skip = document.createElement('button');
    skip.type = 'button';
    skip.className = 'history-secondary';
    skip.textContent = '暂时跳过';
    skip.addEventListener('click', closeTopic);
    actions.prepend(skip);
  }
}

function bindHistoryCompanionTopics() {
  document.getElementById('topicView').addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button || !companionTopicKey) return;
    if (['resetBtn','paperReset','silkReset'].includes(button.id)) {
      changeHistoryCompanionTopic(0);
    } else if (button.id === 'silkEnd') {
      changeHistoryCompanionTopic(1);
    } else if (button.matches('.ev-answer,.t-answer,.plot,.rc-answer,[data-tuen-line],[data-tuen-conclusion],[data-tuen-proof]')) {
      updateHistoryCompanionTopic();
    }
  });
}

let paperTransferReplies = [null, null];
function paintPaperTransferFeedback(index) {
  const selected = index === 0 ? paperQ1 : paperQ2;
  tFeedback.className = 't-feedback';
  tFeedback.textContent = '';
  if (typeof selected !== 'boolean') return;
  tFeedback.classList.add('show', selected ? 'ok' : 'no');
  tFeedback.textContent = paperTransferReplies[index] || (index === 0
    ? selected ? '这张麻纸比蔡伦早，能支持西汉已经有纸。' : '再核对麻纸的年代。出土一张纸说明有纸，还不足以说明普及。'
    : selected ? '一张纸不足以说明当时有多少人在用。' : '这件材料已标明是麻纸。想一想，出土一张能不能说明普及。');
}

let companionSceneStep = 0;
const HISTORY_SCENE_TASKS = {
  coins: [['对照正面的钱文',[0,1]],['观察两枚钱的厚度',[3]],['翻到背面核对形制',[2]]],
  dujiangyan: [['看三处怎样配合',[3,1]],['沿鱼嘴找内江和外江',[0]],['看宝瓶口怎样引水',[2]]],
};

function startHistoryCompanionScene(key, preserve) {
  const saved = store.topicStepOf('companion:3d:' + key)?.step;
  companionSceneStep = preserve ? companionSceneStep :
    Number.isInteger(saved) && HISTORY_SCENE_TASKS[key][saved] ? saved : 0;
  paintHistoryCompanionScene(key);
}

function paintHistoryCompanionScene(key) {
  const tasks = HISTORY_SCENE_TASKS[key];
  const [label, indices] = tasks[companionSceneStep];
  const scope = document.getElementById('view3d');
  const notes = scope.querySelector('#notes3d');
  const buttons = scope.querySelector('#viewBtns3d');
  const question = key === 'coins' ? '两枚钱哪里相同，哪里不同？' : '都江堰怎样分水、排沙和引水？';
  historyCompanionLayout(scope, scope.querySelector('.s3d-wrap'), question, tasks.map(task => task[0]), companionSceneStep);
  const heading = document.createElement('h3');
  heading.className = 'companion-stage-heading';
  heading.textContent = label;
  const blocks = indices.map(i => {
    const note = S3D_UI[key].notes[i];
    const article = document.createElement('article');
    article.className = 's3d-note';
    article.innerHTML = '<h4>' + practiceText(note.title) + '</h4><p>' + practiceText(note.text) + '</p>';
    if (note.cmp) {
      const chips = document.createElement('div');
      chips.className = 'cmp';
      chips.innerHTML = note.cmp.map(chip=>'<span>'+practiceText(chip)+'</span>').join('');
      article.append(chips);
    }
    return article;
  });
  const fallback = document.getElementById('historySceneFallback');
  fallback.src = './assets/scene-' + key + '-' + companionSceneStep + '.webp';
  fallback.alt = '模型静态画面：' + label;
  scope.querySelector('#back3dLesson').hidden = Boolean(historySupplement || fromNode3d != null || companionSceneStep !== tasks.length - 1);
  notes.replaceChildren(heading, ...blocks);
  const shift = delta => {
    companionSceneStep += delta;
    store.setTopicStepOf('companion:3d:' + key,{step:companionSceneStep});
    paintHistoryCompanionScene(key);
    focusHistoryCompanion(notes.querySelector('.companion-stage-heading'));
  };
  const next = tasks[companionSceneStep + 1];
  historyCompanionActions(buttons, companionSceneStep > 0 ? () => shift(-1) : null,
    next ? next[0] : '完成观察', next ? () => shift(1) : close3D);
  current3d?.setView(S3D_UI[key].views[companionSceneStep][0]);
}

let companionThreadStep = 0;
const HISTORY_THREAD_METHOD = {
  money: {criterion:'先选同一个角度，如形状或谁能铸钱。再用每一段材料里相同的项目，说明它怎样变。',question:'两枚钱都是圆形方孔，能仅凭形状判断它们由同一个朝代铸造吗？',choices:['能，看起来一样就够了','还要对照钱文、年代和铸造记录'],answer:1,reply:'相同的形制跨越了多个朝代。判断铸造时间需要钱文、年代等更多线索。'},
  reform: {criterion:'先看哪项权力，再比较改革前后由谁掌握。任命、管理和监督，需要分开看。',question:'想判断一项改革有没有收回任命地方官的权力，优先对照什么？',choices:['改革前后地方官分别由谁任命','改革前后官服的颜色'],answer:0,reply:'任命人与题目的权力同一项，官服颜色无法说明任命权的变化。'},
  writing: {criterion:'分开观察写字用的材料、字的形状和实际用途。一个方面变了，另一个方面还需要证据。',question:'新出土的木片有墨书，能用它直接断定这种字已经在全国通用吗？',choices:['木片证明这种字当时全国通用','还要找别处的文字记录来比较'],answer:1,reply:'一件木片能说明那一处写过这种字。普及范围还要结合其他地点的材料。'},
};

function startHistoryCompanionThread(t) {
  const saved = store.topicStepOf('companion:thread:' + t.id)?.step;
  companionThreadStep = Number.isInteger(saved) ? Math.min(Math.max(saved, 0), t.beads.length) : 0;
  paintHistoryCompanionThread(t);
}

function paintHistoryCompanionThread(t) {
  const labels = t.beads.map(b => NODES[nodeIndexById(b.node)].title).concat('换一份材料试试');
  const study = HISTORY_THREAD_METHOD[t.id];
  historyCompanionLayout(threadView, threadBody, t.name + ' · ' + t.ask, labels, companionThreadStep);
  const atEnd = companionThreadStep === t.beads.length;
  if (!atEnd) {
    const bead = t.beads[companionThreadStep];
    const node = NODES[nodeIndexById(bead.node)];
    const image = IMG_META[bead.node];
    threadBody.innerHTML = '<article class="history-companion-bead"><div><p class="history-date">' + practiceText(node.yearLabel) +
      '</p><h3 class="companion-stage-heading">' + practiceText(node.title) + '</h3><p>' + practiceText(bead.change) + '</p></div>' +
      (image ? '<figure><img src="' + practiceText(image.img) + '" alt="' + practiceText(image.name) + '"><figcaption>' + practiceText(image.name) + '</figcaption></figure>' : '') + '</article>';
  } else {
    threadBody.innerHTML = '<p class="history-method">' + practiceText(study.criterion) + '</p>' +
      '<div class="history-practice-data companion-thread-task"><fieldset><legend class="companion-stage-heading">' + practiceText(study.question) +
      '</legend><div class="history-practice-choices">' + historyTryButtons({choices:study.choices.map(text=>({text}))}) +
      '</div></fieldset><p class="history-practice-feedback" role="status"></p></div>';
  }
  const foot = document.createElement('div');
  foot.className = 'lesson-foot companion-actions';
  threadBody.append(foot);
  const move = amount => {
    companionThreadStep += amount;
    const key = 'companion:thread:' + t.id;
    store.setTopicStepOf(key,{...store.topicStepOf(key),step:companionThreadStep});
    paintHistoryCompanionThread(t);
    focusHistoryCompanion(threadBody.querySelector('.companion-stage-heading'));
  };
  const back = companionThreadStep > 0 ? () => move(-1) : null;
  if (!atEnd) {
    const nextLabel = companionThreadStep === t.beads.length - 1 ? '换一份材料试试' : '看' + labels[companionThreadStep + 1];
    historyCompanionActions(foot, back, nextLabel, () => move(1));
    return;
  }
  const task = threadBody.querySelector('.companion-thread-task');
  const key = 'companion:thread:' + t.id;
  const show = index => {
    const selected = study.choices[index];
    task.querySelectorAll('button').forEach((button,i)=>button.setAttribute('aria-pressed',String(index===i)));
    if (selected) {
      task.dataset.result = index === study.answer ? 'correct' : 'retry';
      task.querySelector('[role="status"]').textContent = (index === study.answer ? '对了。' : '再核对一次。') + study.reply;
    }
    historyCompanionActions(foot, back, '完成比较', index === study.answer ? closeThread : null);
  };
  task.querySelectorAll('button').forEach((button,index)=>button.addEventListener('click',()=>{
    store.setTopicStepOf(key,{step:companionThreadStep,answer:index});
    show(index);
  }));
  show(store.topicStepOf(key)?.answer);
}

function paintHistoryWarProgress(t) {
  const labels = ['先读一场战争的线索', ...t.beads.map(b => NODES[nodeIndexById(b.node)].title), '整理归类的方法'];
  const step = warStage === 'brief' ? 0 : warStage === 'done' ? labels.length - 1 : warIdx + 1;
  historyCompanionLayout(threadView, threadBody, t.name + ' · 按最直接的变化归类', labels, step);
  if (warStage === 'brief') return;
  const foot = document.createElement('div');
  foot.className = 'lesson-foot companion-actions';
  threadBody.append(foot);
  historyCompanionActions(foot, () => {
    if (warStage === 'done') {
      warStage = 'cases';
      warIdx = warBeads.length - 1;
      warChoice = warBeads[warIdx].cat;
    } else if (warIdx === 0) {
      warStage = 'brief';
      warChoice = null;
    } else {
      warIdx--;
      warChoice = warBeads[warIdx].cat;
    }
    saveWarStep();
    paintClassify(t);
  }, '完成分类', warStage === 'done' ? closeThread : null);
}
