export function toyRsaBigint(p: bigint, q: bigint, e: bigint, message: bigint): {publicKey: {n: bigint; e: bigint}; privateKey: {n: bigint; d: bigint}; cipher: bigint; decrypted: bigint} {
	void p;
	void q;
	void e;
	void message;
	throw new Error('Not implemented');
}
