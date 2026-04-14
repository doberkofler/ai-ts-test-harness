import os from 'node:os';
import si from 'systeminformation';
import {type SystemInfo} from './types.ts';

export const getSystemInfo = async (): Promise<SystemInfo> => {
	const cpu = await si.cpu();
	const osInfo = await si.osInfo();
	const graphics = await si.graphics();

	const cpuModel = `${cpu.manufacturer} ${cpu.brand} (${cpu.cores} cores)`.trim();
	const osString = `${osInfo.platform} ${osInfo.release} (${osInfo.arch})`;

	let gpuString: string | undefined = undefined;
	if (Array.isArray(graphics.controllers) && graphics.controllers.length > 0) {
		const gpus = graphics.controllers.map((c) => {
			let name = `${c.vendor} ${c.model}`.trim();
			if (typeof c.vram === 'number' && c.vram > 0) {
				name += ` (${c.vram} MB VRAM)`;
			}
			return name;
		});
		gpuString = gpus.join(', ');
	}

	return {
		hostname: os.hostname(),
		os: osString,
		cpu: cpuModel,
		ram_gb: Math.round(os.totalmem() / 1024 / 1024 / 1024),
		...(gpuString !== undefined ? {gpu: gpuString} : {}),
	};
};
