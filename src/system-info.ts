import os from 'node:os';
import si from 'systeminformation';
import {type SystemInfo} from './types.ts';
import {execSync} from 'node:child_process';

export const getCpuTemperature = async (): Promise<number | undefined> => {
	try {
		const temp = await si.cpuTemperature();
		if (typeof temp.main === 'number' && temp.main > 0) {
			return temp.main;
		}
		if (Array.isArray(temp.cores) && temp.cores.length > 0) {
			const validCores = temp.cores.filter((c) => typeof c === 'number' && c > 0);
			if (validCores.length > 0) {
				return Math.max(...validCores);
			}
		}

		// Fallback for macOS (Apple Silicon)
		if (process.platform === 'darwin') {
			try {
				const output = execSync('ioreg -rn AppleSmartBattery | grep -i Temperature', {encoding: 'utf8'});
				const match = /"Temperature" = (\d+)/.exec(output);
				if (match) {
					return Number(match[1]) / 100;
				}
			} catch {
				// ignore
			}
		}
	} catch {
		// ignore
	}
	return undefined;
};

export const getGpuTemperature = async (): Promise<number | undefined> => {
	try {
		const graphics = await si.graphics();
		if (Array.isArray(graphics.controllers) && graphics.controllers.length > 0) {
			const temps = graphics.controllers.map((c) => c.temperatureGpu).filter((t): t is number => typeof t === 'number' && t > 0);
			if (temps.length > 0) {
				return Math.max(...temps);
			}
		}
	} catch {
		// ignore
	}
	return undefined;
};

export const getSystemInfo = async (): Promise<SystemInfo> => {
	const cpu = await si.cpu();
	const osInfo = await si.osInfo();
	const graphics = await si.graphics();
	const cpuTemp = await getCpuTemperature();
	const gpuTemp = await getGpuTemperature();

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
		...(cpuTemp !== undefined ? {cpu_temp: cpuTemp} : {}),
		...(gpuTemp !== undefined ? {gpu_temp: gpuTemp} : {}),
	};
};
