import React, { useEffect, useRef, useState } from 'react';

function burn(ms) {
  const start = performance.now();
  while (performance.now() - start < ms) Math.log(Math.random() + 1);
}

export function RenderStorm() {
  const [tick, setTick] = useState(0);
  const timerRef = useRef(null);
  burn(tick > 0 ? 18 : 0);

  function startStorm() {
    clearInterval(timerRef.current);
    let count = 0;
    timerRef.current = setInterval(() => {
      count += 1;
      setTick(value => value + 1);
      if (count >= 14) clearInterval(timerRef.current);
    }, 24);
  }

  useEffect(() => () => clearInterval(timerRef.current), []);

  return (
    <section className="scenario-card" data-scenario="render-storm">
      <div className="scenario-badge benchmark-gap">Benchmark exact component source</div>
      <h2>Render storm</h2>
      <p>Fourteen plain React state updates cause repeated ~18 ms renders. No tracked-state helper is used.</p>
      <button onClick={startStorm}>Run render storm</button>
      <output>render tick {tick}</output>
    </section>
  );
}
