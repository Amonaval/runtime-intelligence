class RuntimeCorrelationContext {
  #interaction = null;
  #maxAgeMs;

  constructor({ maxInteractionAgeMs = 1500 } = {}) {
    this.#maxAgeMs = Number.isFinite(maxInteractionAgeMs) && maxInteractionAgeMs > 0
      ? maxInteractionAgeMs
      : 1500;
  }

  noteInteraction(interactionId, timestamp = Date.now()) {
    if (!interactionId) return null;
    this.#interaction = { id: String(interactionId), timestamp: Number.isFinite(timestamp) ? timestamp : Date.now() };
    return this.#interaction.id;
  }

  currentInteraction(timestamp = Date.now()) {
    if (!this.#interaction) return null;
    const at = Number.isFinite(timestamp) ? timestamp : Date.now();
    if (at < this.#interaction.timestamp || at - this.#interaction.timestamp > this.#maxAgeMs) return null;
    return this.#interaction.id;
  }

  correlation(timestamp = Date.now()) {
    const interactionId = this.currentInteraction(timestamp);
    return interactionId ? { interactionId } : undefined;
  }

  clear() { this.#interaction = null; }
}

export { RuntimeCorrelationContext };
