type PublicKey = {n: bigint; e: bigint};

type PrivateKey = {n: bigint; d: bigint};

const __legacySolution = (function toyRsaBigint(
		p: bigint,
		q: bigint,
		e: bigint,
		message: bigint,
	): {publicKey: PublicKey; privateKey: PrivateKey; cipher: bigint; decrypted: bigint} {
		const gcd = (a: bigint, b: bigint): bigint => {
			let x = a;
			let y = b;
			while (y !== 0n) {
				const next = x % y;
				x = y;
				y = next;
			}
			return x;
		};

		const modPow = (base: bigint, exp: bigint, mod: bigint): bigint => {
			let result = 1n;
			let x = ((base % mod) + mod) % mod;
			let power = exp;
			while (power > 0n) {
				if ((power & 1n) === 1n) {
					result = (result * x) % mod;
				}
				x = (x * x) % mod;
				power >>= 1n;
			}
			return result;
		};

		const extendedGcd = (a: bigint, b: bigint): {g: bigint; x: bigint; y: bigint} => {
			if (b === 0n) {
				return {g: a, x: 1n, y: 0n};
			}

			const {g, x, y} = extendedGcd(b, a % b);
			return {g, x: y, y: x - (a / b) * y};
		};

		const modInverse = (value: bigint, modulus: bigint): bigint => {
			const {g, x} = extendedGcd(value, modulus);
			if (g !== 1n) {
				throw new RangeError('e must be coprime to phi(n)');
			}
			return ((x % modulus) + modulus) % modulus;
		};

		const n = p * q;
		const phi = (p - 1n) * (q - 1n);
		if (gcd(e, phi) !== 1n) {
			throw new RangeError('e must be coprime to phi(n)');
		}
		if (message < 0n || message >= n) {
			throw new RangeError('message must satisfy 0 <= message < n');
		}

		const d = modInverse(e, phi);
		const cipher = modPow(message, e, n);
		const decrypted = modPow(cipher, d, n);

		return {
			publicKey: {n, e},
			privateKey: {n, d},
			cipher,
			decrypted,
		};
	});
export const toyRsaBigint = __legacySolution;
