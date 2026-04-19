type Schema<T> = {
	parse(input: unknown): T;
	optional(): Schema<T | undefined>;
	nullable(): Schema<T | null>;
};

function string(): Schema<string> {
	return {
		parse(input) {
			if (typeof input !== 'string') {
				throw new TypeError(`Expected string, got ${typeof input}`);
			}
			return input;
		},
		optional() {
			return optional(this);
		},
		nullable() {
			return nullable(this);
		},
	};
}

function optional<T>(schema: Schema<T>): Schema<T | undefined> {
	return {
		parse(input) {
			return input === undefined ? undefined : schema.parse(input);
		},
		optional() {
			return this;
		},
		nullable() {
			return nullable(this);
		},
	};
}

function nullable<T>(schema: Schema<T>): Schema<T | null> {
	return {
		parse(input) {
			return input === null ? null : schema.parse(input);
		},
		optional() {
			return optional(this);
		},
		nullable() {
			return this;
		},
	};
}

export {string, optional, nullable};
