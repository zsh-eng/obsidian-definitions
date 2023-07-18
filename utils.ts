import { EditorPosition } from "obsidian";
import { Position } from "unist";
import { visit } from "unist-util-visit";
import { fromMarkdown } from "mdast-util-from-markdown";
// @ts-ignore
import { syntax } from "micromark-extension-wiki-link";
// @ts-ignore
import * as wikiLink from "mdast-util-wiki-link";

export type Definition = {
	filename: string;
	heading: string;
	aliases: string[];
};

export const DOCUMENT_START: EditorPosition = {
	line: 0,
	ch: 0,
};

export const DOCUMENT_END: EditorPosition = {
	line: Infinity,
	ch: Infinity,
};

export const SAME_CAPTURE_GROUP = "$&";

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

// Returns the positions of all text (i.e. non codeblocks, wikilinks, etc.) in the markdown string
export function getPositions(content: string): Position[] {
	const ast = fromMarkdown(content, {
		extensions: [syntax({ aliasDivider: "|" })],
		mdastExtensions: [wikiLink.fromMarkdown()], // Parse Obsidian [[wikiLinks]]
	});

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
