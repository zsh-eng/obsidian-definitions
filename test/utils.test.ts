import { replaceExceptBrackets } from "../utils";

describe("replaceExceptBrackets", () => {
	test("empty string is not replaced", () => {
		const from = "hello";
		const to = "goodbye";
		const content = "";
		expect(replaceExceptBrackets(from, to, content)).toBe("");
	});

	test("replaces a string outside brackets", () => {
		const from = "world";
		const to = "Universe";
		const content = "Hello, world! [Another world]";
		const expected = "Hello, Universe! [Another world]";
		const result = replaceExceptBrackets(from, to, content);
		expect(result).toBe(expected);
	});

	test("does not replace a string inside brackets", () => {
		const from = "world";
		const to = "Universe";
		const content = "Hello, [world]!";
		const expected = "Hello, [world]!";
		const result = replaceExceptBrackets(from, to, content);
		expect(result).toBe(expected);
	});

	test("replaces multiple instances outside brackets", () => {
		const from = "world";
		const to = "Universe";
		const content = "Hello, world! Another world! [Yet another world]";
		const expected =
			"Hello, Universe! Another Universe! [Yet another world]";
		const result = replaceExceptBrackets(from, to, content);
		expect(result).toBe(expected);
	});

	test("handles special characters in the string to replace", () => {
		const from = "(special)";
		const to = "replacement";
		const content = "This is a (special) case";
		const expected = "This is a replacement case";
		const result = replaceExceptBrackets(from, to, content);
		expect(result).toBe(expected);
	});

	test("handles special characters in the replacement string", () => {
		const from = "world";
		const to = "[Universe]";
		const content = "Hello, world!";
		const expected = "Hello, [Universe]!";
		const result = replaceExceptBrackets(from, to, content);
		expect(result).toBe(expected);
	});

	test("handles nested brackets", () => {
		const from = "hello";
		const to = "world";
		const content = "[[sometext]hello]";
		const expected = "[[sometext]hello]";
		const result = replaceExceptBrackets(from, to, content);
		expect(result).toBe(expected);
	});

	test("handles adjacent brackets", () => {
		const from = "hello";
		const to = "world";
		const content = "[]hello[]";
		const expected = "[]world[]";
		const result = replaceExceptBrackets(from, to, content);
		expect(result).toBe(expected);
	});

	test("case-insensitive matching", () => {
		const from = "hello";
		const to = "world";
		const content = "HELLO";
		const expected = "world";
		const result = replaceExceptBrackets(from, to, content);
		expect(result).toBe(expected);
	});

	test("allows for capture groups in the replacement", () => {
		const from = "heLLo";
		const to = "$&";
		const content = "HELLO";
		const expected = content;
		const result = replaceExceptBrackets(from, to, content);
		expect(result).toBe(expected);
	});
});
