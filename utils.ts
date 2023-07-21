import { EditorPosition } from "obsidian";
import { Position } from "unist";
import { visit } from "unist-util-visit";
import { fromMarkdown } from "mdast-util-from-markdown";
// @ts-ignore
import { syntax } from "micromark-extension-wiki-link";
// @ts-ignore
import * as wikiLink from "mdast-util-wiki-link";
import QuickLRU from "quick-lru";
import { Root } from "mdast-util-from-markdown/lib";

export const DOCUMENT_START: EditorPosition = {
	line: 0,
	ch: 0,
};

export const DOCUMENT_END: EditorPosition = {
	line: Infinity,
	ch: Infinity,
};

export type Definition = {
	filename: string;
	heading: string;
	aliases: string[];
};

export type ConflictingDefinitionsResult = Record<string, Definition[]>;

export const SAME_CAPTURE_GROUP = "$&";

export function checkDuplicateDefinitions(
	definitions: Definition[]
): ConflictingDefinitionsResult {
	const conflictingDefinitions: ConflictingDefinitionsResult = {};
	const aliasToDefinitions: Map<string, Definition[]> = new Map();

	for (const definition of definitions) {
		for (const alias of definition.aliases) {
			if (aliasToDefinitions.has(alias)) {
				const existingDefinitions = aliasToDefinitions.get(alias);

				// Not possible as aliasToDefinitions[alias] is initialised to [definition] if seen before
				// Added to satisfy TypeScript
				if (existingDefinitions === undefined) continue;

				existingDefinitions.push(definition);
				conflictingDefinitions[alias] = existingDefinitions; // Referring to the same array
			} else {
				aliasToDefinitions.set(alias, [definition]);
			}
		}
	}

	return conflictingDefinitions;
}

// Extracts the definitions from the definitions file
export function parseDefinitions(
	filename: string,
	content: string
): Definition[] {
	// Matches anything that comes after "aliases" immediately after an H1 heading
	const definitionsRegex = /^# (.+)(?:\r?\n|\n)aliases:([\w\s,]+\w)/gm;
	const matches = [...content.matchAll(definitionsRegex)];
	const definitions: Definition[] = matches.map((match) => {
		const heading = match[1].trim();
		const alias = match[2];

		return {
			filename,
			heading,
			aliases: [
				heading,
				...alias.split(",").map((alias) => alias.trim()),
			],
		};
	});
	return definitions;
}

// Replaces the text with the specified definitions
export function replaceDefinitions(
	definitions: Definition[],
	content: string
): string {
	const positions = getPositions(content);
	if (positions.length === 0) return content;

	// Slightly different implementation from obsidian-linter
	// to avoid having to compute changes in positioning
	const out: string[] = [];
	let prev = 0;

	// Assumes that positions are sorted
	for (const position of positions) {
		out.push(content.substring(prev, position.start.offset as number));
		let str = content.substring(
			position.start.offset as number,
			position.end.offset
		);

		for (const definition of definitions) {
			for (const alias of definition.aliases) {
				const link = `[[${definition.filename}#${definition.heading}|${SAME_CAPTURE_GROUP}]]`;
				str = replaceExceptBrackets(alias, link, str);
			}
		}

		out.push(str);
		prev = position.end.offset as number;
	}
	out.push(content.substring(prev));

	return out.join("");
}

// Hash function from https://stackoverflow.com/a/52171480/8353749
export function hashString(str: string, seed: number = 0): number {
	let h1 = 0xdeadbeef ^ seed;
	let h2 = 0x41c6ce57 ^ seed;
	for (let i = 0, ch; i < str.length; i++) {
		ch = str.charCodeAt(i);
		h1 = Math.imul(h1 ^ ch, 2654435761);
		h2 = Math.imul(h2 ^ ch, 1597334677);
	}

	h1 =
		Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
		Math.imul(h2 ^ (h2 >>> 13), 3266489909);
	h2 =
		Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
		Math.imul(h1 ^ (h1 >>> 13), 3266489909);

	return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

// Cache for storing the ASTs of markdown strings
const LRU = new QuickLRU<number, Root>({ maxSize: 200 });

// Parses the markdown string into an mdast
function stringToAST(content: string): Root {
	const textHash = hashString(content);
	if (LRU.has(textHash)) {
		const ast = LRU.get(textHash);

		if (ast !== undefined) {
			return ast;
		}
	}

	const ast = fromMarkdown(content, {
		extensions: [syntax({ aliasDivider: "|" })],
		mdastExtensions: [wikiLink.fromMarkdown()], // Parse Obsidian [[wikiLinks]]
	});

	LRU.set(textHash, ast);
	return ast;
}

// Returns the positions of all text (i.e. non codeblocks, wikilinks, etc.) in the markdown string
export function getPositions(content: string): Position[] {
	const ast = stringToAST(content);
	const positions: Position[] = [];

	visit(ast, "text", (node, index, parent) => {
		// Skip links
		if (parent && parent.type === "link") {
			return;
		}

		if (node && node.position) {
			positions.push(node.position);
		}
	});

	return positions;
}

// From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#escaping
function escapeRegExp(str: string): string {
	// Do not escape dollar signs to match the whole group
	return str.replace(/[.*+?^{}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

// Replaces all instances of a string except those inside brackets.
export function replaceExceptBrackets(
	from: string,
	to: string,
	content: string
): string {
	/* (?!\\[ Uses negative lookahead to check for opening brackets
		[^\\]]* Uses a negated character class to match zero or more occurrences
		of any character except ]
	*/
	const escapedFrom = escapeRegExp(from);
	const pattern = new RegExp(
		`(?!\\[[^\\]]*)${escapedFrom}(?![^\\[]*\\])`,
		"gi"
	);
	const replaced = content.replace(pattern, to);

	return replaced;
}
