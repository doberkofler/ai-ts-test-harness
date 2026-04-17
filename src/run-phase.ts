export type RunPhase = 'thinking' | 'running' | 'testing';

export const RUN_PHASE_LABELS: Record<RunPhase, string> = {
	thinking: 'Thinking',
	running: 'Running',
	testing: 'Testing',
};
