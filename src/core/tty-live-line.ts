import {clearLine, cursorTo} from 'node:readline';

export const supportsLiveLine = (stream: NodeJS.WriteStream): boolean => stream.isTTY;

export const writeLiveLine = (stream: NodeJS.WriteStream, text: string): void => {
	stream.write(text);
};

export const replaceLiveLine = (stream: NodeJS.WriteStream, text: string): void => {
	cursorTo(stream, 0);
	clearLine(stream, 0);
	stream.write(text);
};

export const clearLiveLine = (stream: NodeJS.WriteStream): void => {
	cursorTo(stream, 0);
	clearLine(stream, 0);
};
