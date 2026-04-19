import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import vm from 'node:vm';
import {describe, it} from 'vitest';

type EventListener = (...args: readonly unknown[]) => unknown;

type EventBusInstance = {
	_events: Record<string, Array<{fn: EventListener & {_fn?: EventListener}; ctx: unknown; once: boolean}>>;
	on: (eventName: string, listener: EventListener, context?: unknown) => EventBusInstance;
	once: (eventName: string, listener: EventListener, context?: unknown) => EventBusInstance;
	emit: (eventName: string, ...args: readonly unknown[]) => EventBusInstance;
	off: (eventName: string, listener?: EventListener) => EventBusInstance;
	clear: () => EventBusInstance;
};

type EventBusConstructor = new () => EventBusInstance;

const resolveExistingFileUrl = (relativePaths: readonly string[]): URL => {
	for (const relativePath of relativePaths) {
		const candidate = new URL(relativePath, import.meta.url);
		if (existsSync(candidate)) {
			return candidate;
		}
	}

	throw new TypeError(`Unable to resolve file from candidates: ${relativePaths.join(', ')}`);
};

const loadEventBusConstructor = (sourceCode: string): EventBusConstructor => {
	const context = {
		module: {exports: undefined as unknown},
		exports: {},
		define: undefined,
	};

	vm.runInNewContext(sourceCode, context);
	const constructorCandidate = context.module.exports;
	if (typeof constructorCandidate !== 'function') {
		throw new TypeError('Expected UMD module to export an EventBus constructor');
	}

	return constructorCandidate as EventBusConstructor;
};

const runScenario = (EventBus: EventBusConstructor) => {
	const primaryBus = new EventBus();
	const firstContext = {name: 'first-context'};
	const secondContext = {name: 'second-context'};
	const trace: string[] = [];

	const onListener = function (this: {name?: string}, firstArg: number, secondArg: number): void {
		trace.push(`on:${this.name ?? 'event-bus'}:${firstArg + secondArg}`);
	};

	const onceListener = function (this: {name?: string}, value: number): void {
		trace.push(`once:${this.name ?? 'event-bus'}:${value}`);
	};

	const onReturnSelf = primaryBus.on('sum', onListener, firstContext) === primaryBus;
	const onceReturnSelf = primaryBus.once('sum', onceListener, secondContext) === primaryBus;
	const emitWithoutListenersReturnsSelf = primaryBus.emit('missing-event', 123) === primaryBus;

	primaryBus.emit('sum', 2, 5);
	primaryBus.emit('sum', 3, 4);
	primaryBus.off('sum', onListener);
	primaryBus.emit('sum', 1, 1);
	primaryBus.on('temporary', onListener, firstContext);
	primaryBus.off('temporary');

	const secondBus = new EventBus();
	const onceRemovedByOriginalListenerTrace: string[] = [];
	const removableOnceListener = function (this: {name?: string}, value: number): void {
		onceRemovedByOriginalListenerTrace.push(`removable:${this.name ?? 'event-bus'}:${value}`);
	};
	secondBus.once('only-once', removableOnceListener, firstContext);
	secondBus.off('only-once', removableOnceListener);
	secondBus.emit('only-once', 42);

	const clearReturnsSelf = primaryBus.clear() === primaryBus;

	return {
		onReturnSelf,
		onceReturnSelf,
		emitWithoutListenersReturnsSelf,
		clearReturnsSelf,
		trace,
		onceRemovedByOriginalListenerTrace,
		remainingEventsAfterClear: Object.keys(primaryBus._events),
	};
};

describe('legacy migrated tests', () => {
	it('preserves EventBus behavior and enforces readability constraints', () => {
		const originalPath = resolveExistingFileUrl(['./original.ts', '../original.ts', '../files/original.ts']);
		const transformedPath = resolveExistingFileUrl(['./input.ts', '../input.ts', '../files/input.ts']);
		const originalSource = readFileSync(originalPath, 'utf8');
		const transformedSource = readFileSync(transformedPath, 'utf8');

		const OriginalEventBus = loadEventBusConstructor(originalSource);
		const TransformedEventBus = loadEventBusConstructor(transformedSource);

		assert.deepStrictEqual(runScenario(TransformedEventBus), runScenario(OriginalEventBus));

		assert.ok(transformedSource.split('\n').length >= 40, 'result must be formatted and multi-line');
		assert.match(transformedSource, /\/\*\*[\s\S]*?\*\/\s*EventBus\.prototype\.on\s*=/, 'on method must include JSDoc');
		assert.match(transformedSource, /\/\*\*[\s\S]*?\*\/\s*EventBus\.prototype\.once\s*=/, 'once method must include JSDoc');
		assert.match(transformedSource, /\/\*\*[\s\S]*?\*\/\s*EventBus\.prototype\.emit\s*=/, 'emit method must include JSDoc');
		assert.match(transformedSource, /\/\*\*[\s\S]*?\*\/\s*EventBus\.prototype\.off\s*=/, 'off method must include JSDoc');
		assert.match(transformedSource, /\/\*\*[\s\S]*?\*\/\s*EventBus\.prototype\.clear\s*=/, 'clear method must include JSDoc');
		assert.match(transformedSource, /\beventName\b/, 'eventName parameter should be descriptive');
		assert.match(transformedSource, /\blistener\b/, 'listener parameter should be descriptive');
		assert.match(transformedSource, /\bcontext\b/, 'context parameter should be descriptive');
		assert.doesNotMatch(transformedSource, /prototype\.on=function\(e,t,n\)/, 'minified parameter names should be expanded');
	});
});
