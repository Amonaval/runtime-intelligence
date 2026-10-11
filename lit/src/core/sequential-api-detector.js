/**
 * SequentialApiDetector — detects sequential request chains without treating
 * unrelated concurrent requests in the same burst as part of one chain.
 */

const SEQ_GAP_MS  = 80;
const PARALLEL_MS = 50;
const MIN_CALLS   = 3;
const MAX_OPPS    = 50;
const FLUSH_MS    = 250;

export class SequentialApiDetector {
    #network;
    #onOpportunity;
    #minCalls;
    #unsubscribe   = null;
    #buffer        = [];
    #flushTimer    = null;
    #opportunities = [];

    constructor({ network, onOpportunity, minCalls = MIN_CALLS }) {
        if (!network || typeof network.subscribe !== 'function') {
            throw new TypeError('SequentialApiDetector requires a network object with subscribe()');
        }
        this.#network       = network;
        this.#onOpportunity = onOpportunity;
        this.#minCalls      = minCalls;
    }

    start() {
        if (this.#unsubscribe) return;
        this.#unsubscribe = this.#network.subscribe(entry => this.#onEntry(entry));
    }

    stop() {
        this.#unsubscribe?.();
        this.#unsubscribe = null;
        clearTimeout(this.#flushTimer);
    }

    getOpportunities() { return [...this.#opportunities]; }

    #onEntry(entry) {
        if (!entry?.url) return;
        const fallbackEnd = entry.ts ? new Date(entry.ts).getTime() : Date.now();
        const endTs = Number.isFinite(entry.endedAt) ? entry.endedAt : fallbackEnd;
        const startTs = Number.isFinite(entry.startedAt)
            ? entry.startedAt
            : endTs - (Number.isFinite(entry.durationMs) ? entry.durationMs : 0);
        const callStack = this.#parseStack(entry.callStack ?? '');

        this.#buffer.push({
            startTs,
            endTs,
            durationMs: entry.durationMs ?? 0,
            url: entry.url ?? '',
            callStack,
            originKey: callStack[0] || '(unknown-origin)',
        });

        clearTimeout(this.#flushTimer);
        this.#flushTimer = setTimeout(() => this.#flush(), FLUSH_MS);
    }

    #flush() {
        const calls = this.#buffer.slice();
        this.#buffer = [];
        if (calls.length < this.#minCalls) return;

        // Analyze each originating callsite independently. A noisy run may contain
        // slow/error/large requests in parallel with one real sequential loop.
        const byOrigin = new Map();
        for (const call of calls) {
            const list = byOrigin.get(call.originKey) || [];
            list.push(call);
            byOrigin.set(call.originKey, list);
        }

        for (const group of byOrigin.values()) this.#analyzeGroup(group);
    }

    #analyzeGroup(input) {
        const calls = input.slice().sort((a, b) => a.startTs - b.startTs);
        if (calls.length < this.#minCalls) return;

        // Scan for sequential subsequences so one unrelated timing anomaly does not
        // suppress an otherwise valid chain.
        let chain = [calls[0]];
        const flushChain = () => {
            if (chain.length >= this.#minCalls) this.#emitChain(chain);
            chain = [];
        };

        for (let i = 1; i < calls.length; i++) {
            const prev = chain.at(-1);
            const current = calls[i];
            const gap = prev ? current.startTs - prev.endTs : Infinity;
            if (prev && gap >= -10 && gap <= SEQ_GAP_MS) {
                chain.push(current);
            } else {
                flushChain();
                chain = [current];
            }
        }
        flushChain();
    }

    #emitChain(calls) {
        const startSpan = calls.at(-1).startTs - calls[0].startTs;
        if (startSpan < PARALLEL_MS) return;

        const originator = this.#findLCA(calls.map(c => c.callStack));
        const totalMs = calls.reduce((sum, call) => sum + call.durationMs, 0);
        const maxMs = Math.max(...calls.map(call => call.durationMs));
        const savedMs = Math.max(0, totalMs - maxMs);

        const opp = Object.freeze({
            id: `seq-${calls[0].startTs}-${calls.length}`,
            callerFn: originator.fn,
            callerFile: originator.file,
            callerLine: originator.line,
            callCount: calls.length,
            urls: calls.map(call => call.url),
            totalMs,
            estimatedSavingsMs: savedMs,
            avgDurationMs: totalMs / calls.length,
            timestamp: calls[0].startTs,
        });

        this.#opportunities.push(opp);
        if (this.#opportunities.length > MAX_OPPS) this.#opportunities.shift();
        try { this.#onOpportunity?.(opp); } catch {}
    }

    #parseStack(raw) {
        return String(raw ?? '').split('\n')
            .map(value => value.trim())
            .filter(value =>
                value.startsWith('at ') &&
                !value.includes('<anonymous>') &&
                !value.includes('sequential-api-detector') &&
                !value.includes('network.js')
            )
            .slice(0, 15);
    }

    #findLCA(stacks) {
        const empty = { fn: 'unknown', file: '', line: '' };
        if (!stacks.length || !stacks[0].length) return empty;
        for (const frame of stacks[0]) {
            if (stacks.every(stack => stack.includes(frame))) return this.#parseFrame(frame);
        }
        return empty;
    }

    #parseFrame(frame) {
        const match = frame.match(/at\s+(?:(\S+)\s+\()?([^)]+):(\d+):\d+\)?/);
        if (!match) return { fn: frame, file: '', line: '' };
        const file = match[2] ?? '';
        return { fn: match[1] ?? file.split('/').pop() ?? 'unknown', file, line: match[3] ?? '' };
    }
}
