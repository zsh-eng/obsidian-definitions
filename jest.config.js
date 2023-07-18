const config = {
	transformIgnorePatterns: [
		"node_modules/?!(unified)", // See https://github.com/jestjs/jest/issues/2488
	],
};

module.exports = config;
