import {
	App,
	Editor,
	MarkdownView,
	Notice,
	Plugin,
	SuggestModal,
	TAbstractFile,
	TFile,
	TFolder,
} from "obsidian";
import { DefinitionsSettingTab } from "settings/settings";
import {
	DOCUMENT_END,
	DOCUMENT_START,
	Definition,
	checkDuplicateDefinitions,
	parseDefinitions,
	replaceDefinitions,
} from "utils/utils";

interface DefinitionsPluginSettings {
	mySetting: string;
	definitionsFolder: string;
	addLinksOnSave: boolean;
}

const DEFAULT_SETTINGS: DefinitionsPluginSettings = {
	mySetting: "default",
	definitionsFolder: "definitions",
	addLinksOnSave: true,
};

export default class DefinitionsPlugin extends Plugin {
	settings: DefinitionsPluginSettings;
	definitions: Definition[];

	/**
	 * Gets the current markdown editor if it exists
	 * https://github.com/chrisgrieser/obsidian-smarter-paste/blob/master/main.ts#L37-L41|Obsidian Smarter Paste Source
	 */
	private getEditor(): Editor | undefined {
		const activeLeaf = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeLeaf) return undefined;
		return activeLeaf.editor;
	}

	// Test function for the average file length
	async averageFileLength(): Promise<number> {
		const { vault } = this.app;
		const fileContents: string[] = await Promise.all(
			vault.getMarkdownFiles().map((file) => vault.cachedRead(file))
		);

		let totalLength = 0;
		fileContents.forEach((content) => {
			totalLength += content.length;
		});
		return totalLength / fileContents.length;
	}

	// Generates the link for a single definition
	generateDefinitionLink(definition: Definition): string {
		const { filename, heading } = definition;
		return `[[${filename}#${heading}|${heading}]]`;
	}

	// Get the files from the definitions folder
	getDefinitionFiles(): TFile[] {
		const folder = this.app.vault.getAbstractFileByPath(
			this.settings.definitionsFolder
		);

		const isTFile = (file: TAbstractFile): file is TFile =>
			file instanceof TFile;

		if (folder instanceof TFolder) {
			const files: TFile[] = folder.children.filter(isTFile);
			return files;
		}

		console.log(`Folder ${this.settings.definitionsFolder} not found`);
		return [];
	}

	makeNoticeIfDuplicateDefinitions() {
		const duplicates = checkDuplicateDefinitions(this.definitions);
		if (Object.keys(duplicates).length == 0) {
			return;
		}
		let message = "Duplicate definitions found:";

		for (const [alias, definitions] of Object.entries(duplicates)) {
			const definitionsString = definitions
				.map((d) => d.heading)
				.join(", ");
			message += `\n\nThe alias "${alias}" is duplicated for the following:\n${definitionsString}`;
		}

		new Notice(message);
	}

	// Parse the definitions from the files
	async refreshDefinitions(): Promise<void> {
		const definitionFiles = this.getDefinitionFiles();
		const definitionFilesContent = await Promise.all(
			definitionFiles.map((file) => this.app.vault.cachedRead(file))
		);

		const definitions = definitionFilesContent.flatMap((content, index) => {
			const filename = definitionFiles[index].path;
			return parseDefinitions(filename, content);
		});
		this.definitions = definitions;

		this.makeNoticeIfDuplicateDefinitions();
		return;
	}

	// Get and replace definitions in current file
	async replaceDefinitionsInEditor(editor: Editor): Promise<void> {
		if (this.definitions.length === 0) {
			new Notice("No definitions found");
			return;
		}

		const currentFileContent = editor.getValue();
		const newContent = replaceDefinitions(
			this.definitions,
			currentFileContent
		);

		editor.replaceRange(newContent, DOCUMENT_START, DOCUMENT_END);

		new Notice("success");
		return;
	}

	// Adds callback to run the replaceDefinitionsInEditor function when the file is saved
	// From obsidian-linter
	async registerSaveCallback() {
		const saveCommandDefinition =
			this.app.commands?.commands?.["editor:save-file"];
		const save = saveCommandDefinition?.callback;

		if (typeof save === "function") {
			saveCommandDefinition.callback = async () => {
				if (this.settings.addLinksOnSave) {
					const editor = this.getEditor();
					if (!editor) {
						return;
					}

					const file = this.app.workspace.getActiveFile();
					if (!file) {
						return;
					}
					// Don't replace in the definitions folder
					if (file.path.startsWith(this.settings.definitionsFolder)) {
						console.log("in definitions folder");
						return;
					}

					await this.replaceDefinitionsInEditor(editor);
				}
			};
		}

		// defines the vim command for saving a file and lets the linter run on save for it
		// accounts for https://github.com/platers/obsidian-linter/issues/19
		const that = this;
		window.CodeMirrorAdapter.commands.save = () => {
			that.app.commands.executeCommandById("editor:save-file");
		};
	}

	// Opens a definition in a new tab
	async openDefinition(definition: Definition) {
		const file = this.app.vault.getAbstractFileByPath(definition.filename);

		if (file instanceof TFile) {
			const newLeaf = true;
			await this.app.workspace.getLeaf(newLeaf).openFile(file);
		}
	}

	async onload() {
		await this.loadSettings();
		this.registerSaveCallback();
		await this.refreshDefinitions();

		this.addSettingTab(new DefinitionsSettingTab(this.app, this));

		// This command reads the file from a specific folder
		this.addCommand({
			id: "open-definition-in-new-tab",
			name: "Open definition in new tab",
			callback: () => {
				const definitionFiles = this.getDefinitionFiles();

				if (definitionFiles.length === 0) {
					new Notice("No definition files found");
					return;
				}

				const onChooseCallBack = (definition: Definition) => {
					new Notice(`You picked: ${definition.heading}`);
					this.openDefinition(definition);
				};

				new DefinitionsModal(this.app, this, onChooseCallBack).open();
			},
		});

		// Adds definitions to the current file
		this.addCommand({
			id: "Link-definitions-current-file",
			name: "Link definitions for current file",
			editorCallback: async (editor: Editor, _view: MarkdownView) => {
				// Refresh definitions if command is run manually
				await this.refreshDefinitions();
				await this.replaceDefinitionsInEditor(editor);
			},
		});

		// Replaces the current selection with a link to a definition
		this.addCommand({
			id: "add-link-to-definition",
			name: "Add link to definition",
			editorCallback: async (editor: Editor, _view: MarkdownView) => {
				const onChooseCallBack = (definition: Definition) => {
					new Notice(`You picked: ${definition.heading}`);
					const link = this.generateDefinitionLink(definition);
					editor.replaceSelection(link);
				};

				new DefinitionsModal(this.app, this, onChooseCallBack).open();
			},
		});

		// Forces a refresh of the definitions by parsing the files again
		this.addCommand({
			id: "refresh-definitions",
			name: "Refresh definitions",
			callback: async () => {
				await this.refreshDefinitions();
				new Notice("Definitions updated!");
			},
		});
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class DefinitionsModal extends SuggestModal<Definition> {
	plugin: DefinitionsPlugin;

	constructor(
		app: App,
		plugin: DefinitionsPlugin,
		onChooseCallBack?: (
			definition: Definition,
			evt: MouseEvent | KeyboardEvent
		) => void
	) {
		super(app);
		this.plugin = plugin;

		if (onChooseCallBack) {
			this.onChooseSuggestion = onChooseCallBack;
		}
	}

	getSuggestions(inputStr: string): Definition[] {
		if (inputStr === "") return this.plugin.definitions;

		return this.plugin.definitions.filter((definition) =>
			definition.aliases.some((alias) =>
				alias.toLowerCase().includes(inputStr.toLowerCase())
			)
		);
	}

	renderSuggestion(definition: Definition, el: HTMLElement) {
		el.createEl("div", { text: definition.heading });
		el.createEl("small", {
			text: "Aliases: " + definition.aliases.join(", "),
		});
	}

	onChooseSuggestion(
		definition: Definition,
		_evt: MouseEvent | KeyboardEvent
	) {
		new Notice(`You picked: ${definition.heading}`);
		this.plugin.openDefinition(definition);
	}
}
