export const CHALLENGE_STORAGE_KEY = 'zg_challenge_v1';

function freshState() {
  return {version: 1, runs: {}, variants: {}};
}

function record(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function entriesOf(value, normalize) {
  return Object.fromEntries(Object.entries(record(value)).flatMap(([id, item]) => {
    const entry = normalize(record(item));
    return entry === null ? [] : [[id, entry]];
  }));
}

function normalizeState(value) {
  const data = record(value);
  return {
    ...data,
    version: 1,
    runs: entriesOf(data.runs, run => typeof run.mode === 'string' ? {
      ...run,
      index: Number.isSafeInteger(run.index) && run.index >= 0 ? run.index : 0,
      answers: entriesOf(run.answers, answer => ['correct', 'wrong', 'timeout'].includes(answer.first) ? {
        ...answer,
        choice: Number.isSafeInteger(answer.choice) && answer.choice >= 0 ? answer.choice : null,
        revision: answer.revision === 'correct' ? 'correct' : null,
      } : null),
    } : null),
    variants: entriesOf(data.variants, variant => typeof variant.passed === 'boolean' &&
      Number.isSafeInteger(variant.choice) && variant.choice >= 0 ? {...variant} : null),
  };
}

function decodeState(raw) {
  try {
    const data = record(JSON.parse(raw));
    if (data.version === undefined || data.version === 0 || data.version === 1) {
      return normalizeState(data);
    }
    return null;
  } catch {
    return freshState();
  }
}

function keepEarlier(primary, other) {
  const primaryOrder = typeof primary.submission === 'string' ? primary.submission : '';
  const otherOrder = typeof other.submission === 'string' ? other.submission : '';
  return otherOrder < primaryOrder ? other : primary;
}

function keepProgress(primary, other) {
  const runs = {...primary.runs};
  for (const [id, otherRun] of Object.entries(other.runs)) {
    const run = Object.hasOwn(runs, id) ? runs[id] : otherRun;
    const answers = {...run.answers};
    for (const [slot, otherAnswer] of Object.entries(otherRun.answers)) {
      const answer = Object.hasOwn(answers, slot) ? answers[slot] : otherAnswer;
      const earliest = keepEarlier(answer, otherAnswer);
      const revised = answer.revision === 'correct' || otherAnswer.revision === 'correct';
      answers[slot] = {...earliest, revision: revised ? 'correct' : null};
    }
    runs[id] = {...run, answers};
  }

  const variants = {...primary.variants};
  for (const [slot, variant] of Object.entries(other.variants)) {
    variants[slot] = Object.hasOwn(variants, slot) ? keepEarlier(variants[slot], variant) : variant;
  }
  return {...primary, runs, variants};
}

function browserStorage() {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

export function createChallengeStore(storage = browserStorage()) {
  let state = freshState();
  let lastRaw;
  let saved = false;
  let dirty = false;
  let writable = true;
  let sequence = 0;
  const writer = Math.random().toString(36).slice(2);

  function sync() {
    if (!storage) return;
    try {
      const raw = storage.getItem(CHALLENGE_STORAGE_KEY);
      if (raw === null && lastRaw != null) {
        state = freshState();
        dirty = false;
      } else if (raw !== null && raw !== lastRaw) {
        const external = decodeState(raw);
        writable = external !== null;
        if (external) {
          state = keepProgress(external, state);
          dirty = JSON.stringify(state) !== JSON.stringify(external);
        }
      }
      if (raw === null) writable = true;
      lastRaw = raw;
      saved = writable && !dirty;
    } catch {
      saved = false;
    }
  }

  function save() {
    if (!storage || !writable) return;
    try {
      const raw = JSON.stringify(state);
      storage.setItem(CHALLENGE_STORAGE_KEY, raw);
      lastRaw = raw;
      dirty = false;
      saved = true;
    } catch {
      saved = false;
    }
  }

  function read() {
    sync();
    return structuredClone(state);
  }

  function update(mutator) {
    sync();
    const draft = structuredClone(state);
    mutator(draft);
    const next = normalizeState(draft);
    const submission = `${String(Date.now()).padStart(16, '0')}-${writer}-${String(sequence++).padStart(8, '0')}`;
    for (const [id, run] of Object.entries(next.runs)) {
      const previous = state.runs[id]?.answers;
      for (const [slot, answer] of Object.entries(run.answers)) {
        const original = previous && Object.hasOwn(previous, slot) ? previous[slot] : null;
        run.answers[slot] = original ? {
          ...answer,
          first: original.first,
          choice: original.choice,
          needsVariant: original.needsVariant,
          submission: original.submission,
        } : {...answer, submission};
      }
    }
    for (const [slot, variant] of Object.entries(next.variants)) {
      next.variants[slot] = Object.hasOwn(state.variants, slot) ? state.variants[slot] : {...variant, submission};
    }
    state = keepProgress(next, state);
    dirty = true;
    saved = false;
    save();
    return structuredClone(state);
  }

  function onStorage(event) {
    if (event.storageArea !== storage || (event.key !== null && event.key !== CHALLENGE_STORAGE_KEY)) return;
    sync();
    if (dirty) save();
  }

  sync();
  if (storage) globalThis.addEventListener?.('storage', onStorage);
  return {
    read,
    update,
    persisted: () => saved,
    destroy: () => globalThis.removeEventListener?.('storage', onStorage),
  };
}

export function challengePoints(state) {
  const earned = new Set();
  for (const run of Object.values(record(state?.runs))) {
    if (run?.mode !== 'timed') continue;
    for (const [slot, answer] of Object.entries(record(run.answers))) {
      const correct = answer?.first === 'correct';
      const revised = ['wrong', 'timeout'].includes(answer?.first) && answer.revision === 'correct';
      const passedVariant = state.variants?.[slot]?.passed === true;
      if ((correct && answer.needsVariant !== true) || ((correct || revised) && passedVariant)) earned.add(slot);
    }
  }
  return earned.size;
}

export function earnedRewards(state) {
  return Math.floor(challengePoints(state) / 10);
}
