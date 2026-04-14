import {defineImplementProblem} from '#problem-api';

type PublicKey = {n: bigint; e: bigint};
type PrivateKey = {n: bigint; d: bigint};

export default defineImplementProblem({
	name: 'toy-rsa-bigint',
	description: [
		'Implement toy RSA using bigint arithmetic: key generation, encrypt, and decrypt.',
		'Given primes p and q, public exponent e, and message m < n, return keys + cipher + decrypted message.',
	],
	signature:
		'function toyRsaBigint(p: bigint, q: bigint, e: bigint, message: bigint): {publicKey: {n: bigint; e: bigint}; privateKey: {n: bigint; d: bigint}; cipher: bigint; decrypted: bigint}',
	solution: function toyRsaBigint(
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
	},
	tests: ({assert, implementation, code}) => {
		const isResult = (value: unknown): value is {publicKey: PublicKey; privateKey: PrivateKey; cipher: bigint; decrypted: bigint} => {
			if (typeof value !== 'object' || value === null) {
				return false;
			}
			if (!('publicKey' in value) || !('privateKey' in value) || !('cipher' in value) || !('decrypted' in value)) {
				return false;
			}

			const {publicKey, privateKey, cipher, decrypted} = value as {
				publicKey: unknown;
				privateKey: unknown;
				cipher: unknown;
				decrypted: unknown;
			};

			if (typeof publicKey !== 'object' || publicKey === null || typeof privateKey !== 'object' || privateKey === null) {
				return false;
			}

			return (
				'n' in publicKey &&
				'e' in publicKey &&
				'n' in privateKey &&
				'd' in privateKey &&
				typeof (publicKey as {n: unknown}).n === 'bigint' &&
				typeof (publicKey as {e: unknown}).e === 'bigint' &&
				typeof (privateKey as {n: unknown}).n === 'bigint' &&
				typeof (privateKey as {d: unknown}).d === 'bigint' &&
				typeof cipher === 'bigint' &&
				typeof decrypted === 'bigint'
			);
		};

		const result = implementation(61n, 53n, 17n, 65n);
		if (!isResult(result)) {
			throw new TypeError('toyRsaBigint must return key material and bigint cipher/decrypted values');
		}

		assert.strictEqual(result.publicKey.n, 3233n);
		assert.strictEqual(result.publicKey.e, 17n);
		assert.strictEqual(result.privateKey.n, 3233n);
		assert.strictEqual(result.privateKey.d, 2753n);
		assert.strictEqual(result.cipher, 2790n);
		assert.strictEqual(result.decrypted, 65n);

		const another = implementation(17n, 11n, 7n, 42n);
		if (!isResult(another)) {
			throw new TypeError('toyRsaBigint must return key material and bigint cipher/decrypted values');
		}
		assert.strictEqual(another.decrypted, 42n);
		assert.match(code.result, /bigint|\d+n|BigInt/, 'solution should use bigint arithmetic');
	},
});
