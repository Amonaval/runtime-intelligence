import React, { useEffect, useState } from 'react';

function LeakyChild() {
  const [resizes, setResizes] = useState(0);

  useEffect(() => {
    const onResize = () => setResizes(value => value + 1);
    window.addEventListener('resize', onResize);
    const timer = setInterval(() => {
      window.__UNINSTRUMENTED_LEAK_TICKS__ = (window.__UNINSTRUMENTED_LEAK_TICKS__ || 0) + 1;
    }, 30000);

    return () => {
      // Deliberately wrong: the business component forgets to release both resources.
      // Refresh the lab after exercising this scenario to clear the synthetic leak.
      void timer;
      void onResize;
    };
  }, []);

  return <div className="leak-box">Leaky workspace mounted · observed resizes {resizes}</div>;
}

export function LeakyWorkspace() {
  const [mounted, setMounted] = useState(false);
  return (
    <section className="scenario-card" data-scenario="resource-leak">
      <div className="scenario-badge known-gap">Known Level 0 ownership gap</div>
      <h2>Timer + listener leak</h2>
      <p>The component leaks a resize listener and interval, but does not use Runtime Intelligence resource hooks.</p>
      <button onClick={() => setMounted(value => !value)}>{mounted ? 'Unmount leaky child' : 'Mount leaky child'}</button>
      {mounted && <LeakyChild />}
    </section>
  );
}
