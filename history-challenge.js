import {createChallengeStore, challengePoints, earnedRewards, CHALLENGE_STORAGE_KEY} from './history-challenge-store.js?v=2';

const loadBank = {
  1: () => import('./history-challenge-prehistory.js?v=1'),
  2: () => import('./history-challenge-xia-shang-zhou.js?v=1'),
  3: () => import('./history-challenge-qin-han.js?v=1'),
  4: () => import('./history-challenge-three-kingdoms.js?v=1'),
};
const directory = '#/book/g7a';

export async function prepareHistoryChallenge(unit) {
  const bank = await loadBank[unit.no]();
  const storageKey = unit.no === 3 ? CHALLENGE_STORAGE_KEY : `${CHALLENGE_STORAGE_KEY}_g7a_${unit.no}`;
  return root => mountHistoryChallenge(root, unit, bank, storageKey);
}

const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);
const tag = (action, label, secondary = false, extra = '') =>
  `<button type="button" class="${secondary ? 'challenge-secondary' : 'challenge-primary'}" data-action="${action}" ${extra}>${label}</button>`;
const runKey = (round, pace) => pace === 'practice' ? `${round.id}-practice` : round.id;
const minuteSeconds = (question, pace) => (question.material ? 60 : 30) * (pace === 'extended' ? 1.5 : 1);
const paceLabels = {standard: '标准限时', extended: '延长限时', practice: '不限时练习'};

function mountHistoryChallenge(root, unit, {rounds, collection, hook}, storageKey) {
  const store = createChallengeStore(undefined, storageKey);
  let state = store.read();
  let screen = 'hub';
  let roundIndex = 0;
  let pace = Object.hasOwn(paceLabels, state.lastPace) ? state.lastPace : 'standard';
  let reviewIndex = 0;
  let deadline = 0;
  let interval = 0;
  let savedSeconds = null;

  const round = () => rounds[roundIndex];
  const key = () => runKey(round(), pace);
  const activeRun = () => state.runs[key()];
  const complete = index => ['standard', 'practice'].some(mode =>
    state.runs[runKey(rounds[index], mode)]?.index >= rounds[index].items.length);
  const unlocked = index => index === 0 || complete(index - 1);
  const items = () => round().items;
  const roundOrder = () => `${roundIndex + 1} / ${rounds.length}`;

  function refresh() {
    state = store.read();
  }

  function save(update) {
    state = store.update(update);
    const message = root.querySelector('.challenge-storage');
    if (message) message.hidden = store.persisted();
  }

  function display(body, backLabel = '← 本册目录') {
    const back = screen === 'hub'
      ? `<a class="challenge-back" href="${directory}">${backLabel}</a>`
      : `<button type="button" class="challenge-back" data-action="hub">${backLabel}</button>`;
    root.innerHTML = `<div class="challenge-bar">${back}<span>七年级上册 · ${escape(unit.name)}</span></div>
      <p class="challenge-storage" role="status"${store.persisted() ? ' hidden' : ''}>浏览器暂时无法保存闯关记录。你可以继续做题，关闭或刷新后本次记录可能丢失。</p>${body}`;
    const heading = root.querySelector('[data-focus]');
    window.scrollTo({top: 0, behavior: 'instant'});
    heading?.focus({preventScroll: true});
  }

  function collectionPanel(points) {
    const cards = collection.slice(0, earnedRewards(state));
    return `<details class="challenge-fold"><summary>历史收藏卡 · ${cards.length} / ${collection.length}</summary>
      ${cards.length ? `<ol class="challenge-cards">${cards.map(([title, text]) => `<li><strong>${escape(title)}</strong><p>${escape(text)}</p></li>`).join('')}</ol>` : '<p>在这个单元每攒满 10 分，收藏一张历史卡。</p>'}
      ${cards.length > 0 && cards.length < collection.length ? `<p>再得 ${10 - points % 10} 分解锁下一张。</p>` : ''}</details>`;
  }

  function renderHub() {
    screen = 'hub';
    const points = challengePoints(state);
    const roundsMarkup = rounds.map((candidate, index) => `<li data-round-status="${index}">
      <span class="challenge-number">${index + 1}</span><span>${escape(candidate.title)}</span>
      <small></small></li>`).join('');
    const modeFields = Object.entries(paceLabels).map(([value, label]) =>
      `<label><input type="radio" name="challenge-pace" value="${value}"${pace === value ? ' checked' : ''}> ${label}</label>`).join('');
    const visited = rounds.flatMap((candidate, index) => {
      const choices = ['standard', 'practice'].filter(mode => state.runs[runKey(candidate, mode)]?.index >= candidate.items.length);
      return choices.map(mode => `<option value="${index}:${mode}">${index + 1}. ${escape(candidate.title)}${mode === 'practice' ? '（不限时）' : '（限时）'}</option>`);
    });
    display(`<div class="challenge-hub"><aside class="challenge-rounds" aria-label="关卡进度"><h2>${rounds.length} 个关卡</h2><ol>${roundsMarkup}</ol></aside><div class="challenge-hub-intro">
      <h1 data-focus tabindex="-1">${escape(unit.challenge)}</h1>
      <p class="challenge-lede">${escape(hook)}</p>
      <p>每关 10 题，每题最多得 1 分。本单元每积满 10 分，领一张收藏卡。答错时可以在原题旁看线索，再选一次。</p>
      <p class="challenge-points"><strong>${points}</strong> 分 · 已完成 ${rounds.filter((_, index) => complete(index)).length} / ${rounds.length} 关</p>
      <fieldset class="challenge-modes"><legend>做题节奏</legend>${modeFields}<p>标准限时每题 30 秒，材料题 60 秒。延长限时多一半时间。不限时练习可解锁下一关。已开始的题会保留剩余时间。</p></fieldset>
      ${tag('start', '开始第 1 关')}
      <p class="challenge-all-done" hidden>这个模式的 ${rounds.length} 关已经做完了。</p>
      ${visited.length ? `<details class="challenge-fold"><summary>回看已做完的关卡</summary>
        <label class="challenge-review-select">选择关卡 <select aria-label="选择关卡">${visited.join('')}</select></label>
        ${tag('open-summary', '查看答题结果', true)}</details>` : ''}
      ${collectionPanel(points)}</div></div>`);
    updateStartButton();
  }

  function updateStartButton() {
    const button = root.querySelector('[data-action="start"]');
    if (!button) return;
    const selectedPace = root.querySelector('[name="challenge-pace"]:checked').value;
    const target = rounds.findIndex((candidate, index) => unlocked(index) &&
      (state.runs[runKey(candidate, selectedPace)]?.index ?? 0) < candidate.items.length);
    root.querySelectorAll('[data-round-status]').forEach(row => {
      const index = Number(row.dataset.roundStatus);
      const run = state.runs[runKey(rounds[index], selectedPace)];
      row.querySelector('small').textContent = run?.index >= rounds[index].items.length ? '已做完'
        : run ? '进行中' : unlocked(index) ? '可开始' : '待解锁';
      if (index === target) row.setAttribute('aria-current', 'step');
      else row.removeAttribute('aria-current');
    });
    button.hidden = target < 0;
    root.querySelector('.challenge-all-done').hidden = target >= 0;
    if (target < 0) return;
    button.dataset.round = target;
    const label = state.runs[runKey(rounds[target], selectedPace)] ? '继续' : '开始';
    button.textContent = `${label}第 ${target + 1} 关`;
  }

  function start(index, selectedPace) {
    if (!rounds[index] || !unlocked(index)) return;
    roundIndex = index;
    pace = selectedPace;
    save(draft => {
      draft.lastPace = pace;
      draft.runs[key()] ??= {index: 0, mode: pace === 'practice' ? 'untimed' : 'timed', pace, remainingMs: null, answers: {}};
      const run = draft.runs[key()];
      if (run.mode === 'timed' && run.index < items().length) {
        run.pace = pace;
      }
    });
    pace = activeRun().pace;
    if (activeRun().index >= items().length) renderSummary();
    else renderQuestion('run', activeRun().index);
  }

  function progress(index, phase) {
    const run = activeRun();
    const count = run.index;
    const running = phase === 'run' && run.mode === 'timed' && !run.answers[items()[index]?.id];
    return `<aside class="challenge-progress" aria-label="当前关卡进度">
      <p class="challenge-eyebrow">第 ${roundOrder()} 关</p><h2>${escape(round().title)}</h2>
      <p>${phase === 'run' ? `第 <strong>${index + 1}</strong> / ${items().length} 题` : phase === 'variant' ? `第 ${index + 1} 题 · 换题验证` : phase === 'review' ? `第 ${index + 1} 题 · 回看` : '关卡完成'}</p>
      <ol class="challenge-markers" aria-label="题目进度">${items().map((item, position) => {
        const answer = run.answers[item.id];
        let status = '还没做到';
        if (answer) status = answer.first === 'correct' ? '首答正确' : answer.revision === 'correct' ? '已订正' : '待复习';
        const current = index === position && phase !== 'summary';
        const marker = answer && position < count ? (status === '待复习' ? 'is-pending' : 'is-seen') : '';
        return `<li class="${marker}"${current ? ' aria-current="step"' : ''}>
          <span aria-hidden="true">${position + 1}</span><span class="challenge-sr">第 ${position + 1} 题，${current ? '当前题，' : ''}${status}</span></li>`;
      }).join('')}</ol>
      <p class="challenge-pace">${paceLabels[pace]}</p>
      <p class="challenge-timer" ${running ? '' : 'hidden'} aria-label="剩余时间" aria-live="off"></p>
    </aside>`;
  }

  function renderQuestion(phase, index) {
    screen = phase;
    reviewIndex = index;
    const item = items()[index];
    const question = phase === 'variant' ? item.variant : item;
    const run = activeRun();
    const first = run.answers[item.id];
    const variant = state.variants[item.id];
    const isVariant = phase === 'variant';
    const resolved = isVariant ? Boolean(variant) : first?.first === 'correct' || first?.revision === 'correct';
    const correcting = !isVariant && Boolean(first) && !resolved;
    const chosen = isVariant ? variant?.choice : resolved ? question.answer : first?.choice;
    const result = isVariant ? variant : first;
    let successLabel = '这次改对了。';
    if (first?.first === 'correct') {
      successLabel = run.mode !== 'timed' ? '答对了。' : first.needsVariant ? '答对了。关末可用新题验证得分。' : '答对了，获得 1 分。';
    }
    if (isVariant) successLabel = variant?.passed ? '答对了，获得 1 分。' : '这次还没答对。';
    const feedback = !result ? '' : resolved
      ? `<div class="challenge-feedback ${isVariant && !variant.passed ? 'is-hint' : 'is-right'}"><strong>${successLabel}</strong>
          ${isVariant && !variant.passed ? `<p>${escape(question.feedback[variant.choice])}</p>` : ''}<p>${escape(question.explanation)}</p></div>`
      : `<div class="challenge-feedback is-hint"><strong>${first.first === 'timeout' ? '时间到了，接着不限时订正。' : '这次需要再想一想。'}</strong>
          ${first.choice != null ? `<p>${escape(question.feedback[first.choice])}</p>` : ''}<p><b>线索</b> ${escape(question.hint)}</p></div>`;
    const choices = question.options.map((option, value) => `<label class="challenge-choice"><input type="radio" name="challenge-answer" value="${value}"${value === chosen ? ' checked' : ''}${resolved ? ' disabled' : ''}><span>${escape(option)}</span></label>`).join('');
    const actions = resolved
      ? tag('advance', phase !== 'run' ? '回到关卡结果' : index === items().length - 1 ? '看本关结果' : '下一题')
      : `${tag('submit', correcting ? '核对订正' : '提交答案')}${correcting ? tag('defer', phase === 'review' ? '稍后再订正' : '留到关末订正', true) : ''}`;
    display(`<div class="challenge-layout">${progress(index, phase)}<section class="challenge-task" aria-label="当前题目">
      <p class="challenge-eyebrow">${isVariant ? '换题验证' : question.type === 'judgment' ? '判断题' : '单项选择'}</p>
      <h1 id="challenge-question" data-focus tabindex="-1"${feedback ? ' aria-describedby="challenge-feedback"' : ''}>${escape(question.prompt)}</h1>
      ${question.material ? `<aside class="challenge-material" aria-label="材料"><strong>材料</strong><p>${escape(question.material)}</p></aside>` : ''}
      ${feedback ? `<div id="challenge-feedback">${feedback}</div>` : ''}
      <fieldset class="challenge-choices${correcting ? ' is-correcting' : ''}" aria-labelledby="challenge-question"><legend class="challenge-sr">选择一项答案</legend>${choices}</fieldset>
      <p class="challenge-input-message" role="status" hidden></p><div class="challenge-actions">${actions}</div></section></div>`, '← 暂停回关卡');
    if (phase === 'run' && run.mode === 'timed' && !first) startTimer(index);
  }

  function summaryRows() {
    const run = activeRun();
    return items().map((item, index) => {
      const answer = run.answers[item.id];
      const variant = state.variants[item.id];
      const pending = answer && answer.first !== 'correct' && answer.revision !== 'correct';
      const needsVariant = run.mode === 'timed' && answer && (answer.first !== 'correct' || answer.needsVariant);
      const canVerify = needsVariant && !pending && !variant;
      const status = pending ? '待订正' : canVerify ? '可换题验证' : needsVariant ? (variant?.passed ? '换题答对' : '换题待复习') : answer ? '首答正确' : '待复习';
      return {index, item, answer, pending, canVerify, status};
    });
  }

  function renderSummary() {
    screen = 'summary';
    const run = activeRun();
    const rows = summaryRows();
    const firstRight = rows.filter(row => row.answer?.first === 'correct').length;
    const pending = rows.filter(row => row.pending).length;
    const needsCheck = rows.filter(row => row.canVerify).length;
    const next = rows.find(row => row.pending) || rows.find(row => row.canVerify);
    const results = rows.map(({index, item, answer, status}) => `<li><span>${index + 1}. ${escape(item.topic)}</span><span>${answer?.first === 'timeout' ? '超时 · ' : ''}${status}</span></li>`).join('');
    const continueButton = roundIndex < rounds.length - 1
      ? tag('next-round', `进入第 ${roundIndex + 2} 关`, Boolean(next))
      : tag('hub', '回闯关首页', Boolean(next));
    const reviewButton = next ? tag(next.pending ? 'review' : 'variant', next.pending ? `订正第 ${next.index + 1} 题` : `试做第 ${next.index + 1} 题的换题`, false, `data-index="${next.index}"`) : '';
    display(`<div class="challenge-layout">${progress(-1, 'summary')}<section class="challenge-task">
      <h1 data-focus tabindex="-1">第 ${roundIndex + 1} 关做完了</h1>
      <p class="challenge-lede">${firstRight} / ${items().length} 题首答正确${pending ? ` · ${pending} 题待订正` : ''}${needsCheck ? ` · ${needsCheck} 题可换题验证` : ''}</p>
      <p>${run.mode === 'timed' ? `单元累计 ${challengePoints(state)} 分，已收藏 ${earnedRewards(state)} 张历史卡。` : '这是不限时练习，做题记录已和限时闯关分开保存。'}</p>
      <div class="challenge-actions">${reviewButton}${continueButton}</div>
      <details class="challenge-fold"><summary>查看本关 ${items().length} 题记录</summary><ol class="challenge-review-list">${results}</ol></details>
      ${collectionPanel(challengePoints(state))}</section></div>`, '← 回关卡');
  }

  function startTimer(index) {
    const timer = root.querySelector('.challenge-timer');
    if (!timer || interval) return;
    if (document.hidden) {
      timer.textContent = '计时已暂停';
      return;
    }
    const run = activeRun();
    const item = items()[index];
    const remaining = run.remainingMs ?? minuteSeconds(item, run.pace) * 1000;
    deadline = performance.now() + remaining;
    savedSeconds = run.remainingMs === null ? null : Math.ceil(remaining / 1000);
    interval = window.setInterval(tick, 200);
    tick();
  }

  function writeRemaining(remaining) {
    const expected = activeRun()?.index;
    save(draft => {
      const run = draft.runs[key()];
      if (!run || run.index !== expected || run.answers[items()[expected]?.id]) return;
      run.remainingMs = run.remainingMs == null ? remaining : Math.min(run.remainingMs, remaining);
    });
  }

  function pauseTimer(checkpoint = true) {
    if (!interval) return;
    window.clearInterval(interval);
    interval = 0;
    const remaining = Math.max(0, Math.ceil(deadline - performance.now()));
    deadline = 0;
    if (checkpoint) writeRemaining(remaining);
  }

  function tick() {
    const timer = root.querySelector('.challenge-timer');
    if (!timer || document.hidden) return;
    const milliseconds = Math.max(0, Math.ceil(deadline - performance.now()));
    const seconds = Math.ceil(milliseconds / 1000);
    timer.textContent = `${seconds} 秒`;
    if (seconds !== savedSeconds) {
      savedSeconds = seconds;
      writeRemaining(milliseconds);
    }
    if (milliseconds === 0) finishFirst(null);
  }

  function finishFirst(choice) {
    const index = reviewIndex;
    const item = items()[index];
    const expired = deadline && performance.now() >= deadline;
    pauseTimer(false);
    save(draft => {
      const run = draft.runs[key()];
      if (!run || run.index !== index || run.answers[item.id]) return;
      const answer = expired || choice === null ? null : choice;
      const first = answer === null ? 'timeout' : answer === item.answer ? 'correct' : 'wrong';
      const practised = draft.runs[runKey(round(), 'practice')]?.answers[item.id];
      run.answers[item.id] = {first, choice: answer, revision: null, needsVariant: run.mode === 'timed' && Boolean(practised)};
      run.remainingMs = null;
    });
    if (!activeRun()) renderHub();
    else if (activeRun().index >= items().length) renderSummary();
    else renderQuestion('run', activeRun().index);
  }

  function inputMessage(message) {
    const output = root.querySelector('.challenge-input-message');
    output.hidden = false;
    output.textContent = message;
  }

  function submit() {
    const input = root.querySelector('[name="challenge-answer"]:checked');
    if (!input) {
      inputMessage('先选一个答案，再提交。');
      root.querySelector('[name="challenge-answer"]')?.focus();
      return;
    }
    const index = reviewIndex;
    const item = items()[index];
    const chosen = Number(input.value);
    if (screen === 'variant') {
      save(draft => {
        const original = draft.runs[key()]?.answers[item.id];
        if (original && (original.revision === 'correct' || (original.first === 'correct' && original.needsVariant))) {
          draft.variants[item.id] ??= {choice: chosen, passed: chosen === item.variant.answer};
        }
      });
      if (activeRun()) renderQuestion('variant', index);
      else renderHub();
      return;
    }
    if (!activeRun().answers[item.id]) {
      finishFirst(chosen);
      return;
    }
    if (chosen !== item.answer) {
      inputMessage(`${item.feedback[chosen]} 再用上面的线索试一次。`);
      return;
    }
    save(draft => {
      const answer = draft.runs[key()]?.answers[item.id];
      if (answer) answer.revision = 'correct';
    });
    if (activeRun()) renderQuestion(screen, index);
    else renderHub();
  }

  function advance() {
    if (screen !== 'run') {
      renderSummary();
      return;
    }
    const index = reviewIndex;
    save(draft => {
      const run = draft.runs[key()];
      if (run?.index === index && run.answers[items()[index].id]) {
        run.index++;
        run.remainingMs = null;
      }
    });
    if (!activeRun()) renderHub();
    else if (activeRun().index >= items().length) renderSummary();
    else renderQuestion('run', activeRun().index);
  }

  function onClick(event) {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    if (action === 'hub') {
      pauseTimer();
      refresh();
      renderHub();
    } else if (action === 'start') {
      refresh();
      start(Number(button.dataset.round), root.querySelector('[name="challenge-pace"]:checked').value);
    } else if (action === 'next-round') {
      start(roundIndex + 1, pace);
    } else if (action === 'open-summary') {
      const selected = root.querySelector('.challenge-review-select select').value.split(':');
      start(Number(selected[0]), selected[1]);
    } else if (action === 'submit') {
      submit();
    } else if (action === 'advance' || action === 'defer') {
      advance();
    } else if (action === 'review' || action === 'variant') {
      renderQuestion(action, Number(button.dataset.index));
    }
  }

  function onChange(event) {
    if (event.target.name === 'challenge-pace') updateStartButton();
    if (event.target.name === 'challenge-answer') root.querySelector('.challenge-input-message').hidden = true;
  }

  function onVisibility() {
    if (screen !== 'run' || activeRun()?.mode !== 'timed' || activeRun()?.answers[items()[reviewIndex].id]) return;
    if (document.hidden) {
      pauseTimer();
      root.querySelector('.challenge-timer').textContent = '计时已暂停';
    } else {
      startTimer(reviewIndex);
    }
  }

  function onStorage(event) {
    if (event.key !== storageKey && event.key !== null) return;
    const previous = activeRun()?.answers[items()[reviewIndex]?.id];
    const previousState = state;
    refresh();
    if (screen === 'hub') {
      const progressChanged = rounds.some(candidate => ['standard', 'practice'].some(mode => {
        const run = runKey(candidate, mode);
        return previousState.runs[run]?.index !== state.runs[run]?.index;
      }));
      if (progressChanged || challengePoints(previousState) !== challengePoints(state)) {
        pace = root.querySelector('[name="challenge-pace"]:checked')?.value ?? pace;
        renderHub();
      }
      return;
    }
    const run = activeRun();
    if (!run) {
      pauseTimer(false);
      renderHub();
      return;
    }
    if (screen !== 'run') return;
    const next = run.answers[items()[reviewIndex].id];
    if (run.index !== reviewIndex || previous?.first !== next?.first || previous?.revision !== next?.revision) {
      pauseTimer(false);
      if (run.index >= items().length) renderSummary();
      else renderQuestion('run', run.index);
    } else if (interval && Number.isFinite(run.remainingMs)) {
      deadline = Math.min(deadline, performance.now() + run.remainingMs);
    }
  }

  function onPageHide() {
    pauseTimer();
  }

  function onPageShow(event) {
    if (event.persisted) onVisibility();
  }

  root.addEventListener('click', onClick);
  root.addEventListener('change', onChange);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', onPageHide);
  window.addEventListener('pageshow', onPageShow);
  window.addEventListener('storage', onStorage);
  renderHub();

  return () => {
    pauseTimer();
    store.destroy();
    root.removeEventListener('click', onClick);
    root.removeEventListener('change', onChange);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', onPageHide);
    window.removeEventListener('pageshow', onPageShow);
    window.removeEventListener('storage', onStorage);
  };
}
