import {
	replaceExceptBrackets,
	parseDefinitions,
	Definition,
	replaceDefinitions,
	checkDuplicateDefinitions,
} from "../utils/utils";

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
	// Add test case for markdown links
	test("replaces with markdown internal link successfully", () => {
		const from = "hello";
		const to = "[[test.md#hello]]";
		const content = "hello";
		const expected = "[[test.md#hello]]";
		const result = replaceExceptBrackets(from, to, content);
		expect(result).toBe(expected);
	});
});

describe("parseDefinitions", () => {
	const filename = "sample.md";

	test("parses a single definition", () => {
		const content = `# Term\naliases: Alias1, Alias2`;

		const expected = [
			{
				filename,
				heading: "Term",
				aliases: ["Term", "Alias1", "Alias2"],
			},
		];

		const result = parseDefinitions(filename, content);

		expect(result).toEqual(expected);
	});

	test("parses multiple definitions", () => {
		const content = `# Term1\naliases: Alias1, Alias2
# Term2\naliases: Alias3, Alias4`;
		const expected = [
			{
				filename,
				heading: "Term1",
				aliases: ["Term1", "Alias1", "Alias2"],
			},
			{
				filename,
				heading: "Term2",
				aliases: ["Term2", "Alias3", "Alias4"],
			},
		];

		const result = parseDefinitions(filename, content);
		expect(result).toEqual(expected);
	});

	test("handles extra whitespace in heading and aliases", () => {
		const content = `#   Term   \naliases:   Alias1 ,   Alias2  `;
		const expected = [
			{
				filename,
				heading: "Term",
				aliases: ["Term", "Alias1", "Alias2"],
			},
		];

		const result = parseDefinitions(filename, content);

		expect(result).toEqual(expected);
	});

	test("handles different newline characters", () => {
		const content = `# Term1\r\naliases: Alias1, Alias2\n# Term2\naliases: Alias3, Alias4`;

		const expected = [
			{
				filename,
				heading: "Term1",
				aliases: ["Term1", "Alias1", "Alias2"],
			},
			{
				filename,
				heading: "Term2",
				aliases: ["Term2", "Alias3", "Alias4"],
			},
		];

		const result = parseDefinitions(filename, content);
		expect(result).toEqual(expected);
	});

	test("ignores headings with depth greater than 1", () => {
		const content = `## Heading\naliases: Alias1, Alias2`;

		const expected: Definition[] = [];

		const result = parseDefinitions(filename, content);

		expect(result).toEqual(expected);
	});

	test("ignores match when there are blank lines between heading and aliases", () => {
		const content = `# Term1\n\naliases: Alias1, Alias2`;

		const expected: Definition[] = [];

		const result = parseDefinitions(filename, content);

		expect(result).toEqual(expected);
	});
});

describe("parseMarkdownFile", () => {
	const content = `
	# Obsidian

	aliases:Obsidian.md,Note-taking,Markdown
	
	## What is Obsidian?
	Obsidian is a powerful knowledge base that works on top of a local folder of plain text Markdown files.
	`;
	// TODO Test multiple headings
	// TODO Test missing heading
	// TODO Test missing aliases
	// TODO Test missing content
	// TODO Test Markdown formatting (e.g. Admonitions in Obsidian)
});

describe("replaceDefinitions", () => {
	const testContent = `
# Term1
aliases: Alias1, Alias2
  `;

	// Note that the text cannot be indented
	const testFileContent = `
What's up with Term1 and Alias2 ?

\`\`\`
Some code block here Term1
\`\`\`

[Link to Term1](#term1)

Test test 
  `;
	test("replaces successfully", () => {
		const fileContent = `What's up with Term1 and Alias2 ?`;
		// Alias which is the same name as the heading will still be an alias
		const out = `What's up with [[test.md#Term1|Term1]] and [[test.md#Term1|Alias2]] ?`;
		const definitions = parseDefinitions("test.md", testContent);
		expect(definitions.length).toEqual(1);
		expect(definitions[0].aliases.length).toEqual(3);

		const replaced = replaceDefinitions(definitions, fileContent);
		expect(replaced).toEqual(out);
	});

	test("does not replace code blocks", () => {
		const definitions = parseDefinitions("test.md", testContent);

		const replaced = replaceDefinitions(definitions, testFileContent);
		expect(replaced).toContain("Some code block here Term1");
	});

	test("does not replace links", () => {
		const definitions = parseDefinitions("test.md", testContent);

		const replaced = replaceDefinitions(definitions, testFileContent);
		expect(replaced).toContain("[Link to Term1](#term1)");
	});

	test("replaces at start of file", () => {
		const fileContent = "Term1";
		const definitions = parseDefinitions("test.md", testContent);
		const replaced = replaceDefinitions(definitions, fileContent);
		expect(replaced).toEqual("[[test.md#Term1|Term1]]");
	});

	test("replaces bolded text", () => {
		const fileContent = "**Term1**";
		const definitions = parseDefinitions("test.md", testContent);
		const replaced = replaceDefinitions(definitions, fileContent);
		expect(replaced).toEqual("**[[test.md#Term1|Term1]]**");
	});

	test("replaces text in bolded text", () => {
		const fileContent = `
# Test

**Term1**

Test test

**Alias1**
		`;
		const definitions = parseDefinitions("test.md", testContent);
		const replaced = replaceDefinitions(definitions, fileContent);
		expect(replaced).toContain("[[test.md#Term1|Term1]]");
	});
});

describe("checkDuplicateDefinitions", () => {
	test("should return an empty object for no conflicts", () => {
		const definitions: Definition[] = [
			{
				filename: "file1",
				heading: "Heading 1",
				aliases: ["alias1", "alias2"],
			},
			{ filename: "file2", heading: "Heading 2", aliases: ["alias3"] },
		];

		const result = checkDuplicateDefinitions(definitions);
		expect(result).toEqual({});
	});

	test("should return conflicting definitions for duplicate aliases", () => {
		const definitions: Definition[] = [
			{
				filename: "file1",
				heading: "Heading 1",
				aliases: ["alias1", "alias2"],
			},
			{
				filename: "file2",
				heading: "Heading 2",
				aliases: ["alias2", "alias3"],
			},
			{
				filename: "file3",
				heading: "Heading 3",
				aliases: ["alias3", "alias4"],
			},
			{
				filename: "file4",
				heading: "Heading 4",
				aliases: ["alias1", "alias5"],
			},
			{ filename: "file5", heading: "Heading 5", aliases: ["alias5"] },
		];

		const result = checkDuplicateDefinitions(definitions);

		expect(result).toEqual({
			alias1: [
				{
					filename: "file1",
					heading: "Heading 1",
					aliases: ["alias1", "alias2"],
				},
				{
					filename: "file4",
					heading: "Heading 4",
					aliases: ["alias1", "alias5"],
				},
			],
			alias2: [
				{
					filename: "file1",
					heading: "Heading 1",
					aliases: ["alias1", "alias2"],
				},
				{
					filename: "file2",
					heading: "Heading 2",
					aliases: ["alias2", "alias3"],
				},
			],
			alias3: [
				{
					filename: "file2",
					heading: "Heading 2",
					aliases: ["alias2", "alias3"],
				},
				{
					filename: "file3",
					heading: "Heading 3",
					aliases: ["alias3", "alias4"],
				},
			],
			alias5: [
				{
					filename: "file4",
					heading: "Heading 4",
					aliases: ["alias1", "alias5"],
				},
				{
					filename: "file5",
					heading: "Heading 5",
					aliases: ["alias5"],
				},
			],
		});
	});
});
