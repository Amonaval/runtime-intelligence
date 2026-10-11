async function readJson(response) {
  const payload = await response.json();
  if (!response.ok) {
    const error = new Error(payload?.message || `HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return payload;
}

export async function loadOrderWorkspace(orderId) {
  const order = await fetch(`/api/uninstrumented/order?requestId=${orderId}&ms=140`).then(readJson);
  const customer = await fetch(`/api/uninstrumented/customer?requestId=${orderId}&ms=130`).then(readJson);
  const pricing = await fetch(`/api/uninstrumented/pricing?requestId=${orderId}&ms=120`).then(readJson);
  return { order, customer, pricing };
}

export async function loadReport() {
  return fetch('/api/uninstrumented/large-report').then(readJson);
}

export async function loadSearchResult(term, delayMs) {
  return fetch(`/api/uninstrumented/search?requestId=${encodeURIComponent(term)}&ms=${delayMs}`).then(readJson);
}

export async function hitFailingDependency() {
  return fetch('/api/uninstrumented/fail').then(readJson);
}
