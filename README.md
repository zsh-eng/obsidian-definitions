# Obsidian Definitions Plugin

## Introduction

This plugin allows you to define terms and link to their definitions.
The plugin is similar to [obsidian-note-linker](https://github.com/AlexW00/obsidian-note-linker) (which seems to have been abandoned),
but it is more focused on linking to specific headings rather than notes.

## Usage

Store all your definitions in the same folder (default is `definitions/`).
Then, you can link to any definitions by running the command `Link to definition` from the Command Palette.

### Defining terms

To define a term, create a note in the definitions folder.
Add a h1 heading with the term as the heading text.
Add aliases for your term by adding a comma-separated list of aliases beneath the heading.
After that, you can add any other content you want to the note.
For example, the following note defines the term "Obsidian":

```markdown
# Obsidian

aliases:Obsidian.md,Note-taking,Markdown
```

## How it works

The plugin uses the `remark` library to parse markdown files.
It then searches for h1 headings with the term as the heading text.
If the term is not found, it searches for aliases.
If the term is still not found, it searches for the term in the note's filename.

The term is replaced with a link to the definition, keeping the alias.
