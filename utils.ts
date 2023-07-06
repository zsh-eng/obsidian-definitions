import { EditorPosition } from "obsidian";

export const DOCUMENT_START: EditorPosition = {
	line: 0,
	ch: 0,
};

export const DOCUMENT_END: EditorPosition = {
	line: Infinity,
	ch: Infinity,
};

export const SAME_CAPTURE_GROUP = "$&";

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
