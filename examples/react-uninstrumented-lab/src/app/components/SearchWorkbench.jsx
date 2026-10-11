import React, { useMemo, useState } from 'react';

const catalog = Array.from({ length: 4200 }, (_, index) => ({
  id: index + 1,
  name: `Product ${String(index + 1).padStart(4, '0')}`,
  family: ['Home', 'Beauty', 'Food', 'Electronics'][index % 4],
}));

function burn(ms) {
  const start = performance.now();
  while (performance.now() - start < ms) {
    Math.sqrt(Math.random() * 100000);
  }
}

export function SearchWorkbench() {
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);

  const filtered = useMemo(() => {
    if (query) burn(75);
    const normalized = query.trim().toLowerCase();
    return catalog.filter(item => !normalized || item.name.toLowerCase().includes(normalized));
  }, [query]);

  const visible = showAll ? filtered.slice(0, 900) : filtered.slice(0, 24);

  return (
    <section className="scenario-card" data-scenario="slow-render">
      <div className="scenario-badge benchmark-gap">Benchmark exact component source</div>
      <h2>Slow render + unvirtualized expansion</h2>
      <p>Typing performs ~75 ms of synchronous render work. Expanding renders 900 plain rows.</p>
      <input
        aria-label="Catalog search"
        value={query}
        onChange={event => setQuery(event.target.value)}
        placeholder="Type 12 or Product…"
      />
      <button onClick={() => setShowAll(value => !value)}>
        {showAll ? 'Show 24 rows' : 'Render 900 rows'}
      </button>
      <div className="result-list">
        {visible.map(item => <div className="result-row" key={item.id}>{item.name} · {item.family}</div>)}
      </div>
    </section>
  );
}
