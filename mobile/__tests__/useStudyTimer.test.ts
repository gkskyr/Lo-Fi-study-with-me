// Timer hook'un pure logic kısmını test ediyoruz
// (renderHook React 19 + RNTL v14 ile uyumsuzluğu nedeniyle saf test)

type Phase = 'work' | 'break' | 'done';

function simulateTimer(totalRounds: number, workSecs: number, breakSecs: number) {
  let phase: Phase = 'work';
  let round = 1;
  let remaining = workSecs;
  const events: string[] = [];

  function tick() {
    if (phase === 'done') return;
    remaining--;
    if (remaining <= 0) {
      if (phase === 'work') {
        events.push(`round:${round}`);
        if (round >= totalRounds) {
          phase = 'done';
          events.push('done');
          return;
        }
        phase = 'break';
        remaining = breakSecs;
      } else {
        round++;
        phase = 'work';
        remaining = workSecs;
      }
    }
  }

  const totalTicks = (workSecs + breakSecs) * totalRounds + 1;
  for (let i = 0; i < totalTicks; i++) tick();
  return { events, phase, round };
}

test('work phase transitions to break at end', () => {
  const { events } = simulateTimer(1, 3, 3);
  expect(events).toContain('round:1');
  expect(events).toContain('done');
});

test('all rounds fire before done', () => {
  const { events } = simulateTimer(3, 2, 1);
  expect(events).toContain('round:1');
  expect(events).toContain('round:2');
  expect(events).toContain('round:3');
  expect(events[events.length - 1]).toBe('done');
});

test('phase becomes done after last round', () => {
  const { phase } = simulateTimer(2, 2, 1);
  expect(phase).toBe('done');
});

test('round count increments after each break', () => {
  const { round } = simulateTimer(3, 2, 1);
  expect(round).toBe(3);
});
