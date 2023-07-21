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
	parseDefinitions,
	replaceDefinitions,
} from "utils";

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

	// Test function for generating markdown links
	generateMarkdownLinks(sourcePath: string): string[] {
		const { vault, fileManager } = this.app;

		const links = vault.getMarkdownFiles().map((file) => {
			const link = fileManager.generateMarkdownLink(
				file,
				sourcePath,
				"",
				file.basename.toUpperCase()
			);
			return link;
		});

		return links;
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
				console.log("hello");
				if (this.settings.addLinksOnSave) {
					const editor = this.getEditor();
					if (!editor) {
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

	async openDefinition(definition: Definition) {
		console.log(definition.filename)
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
			id: "search-definitions",
			name: "Search definitions",
			callback: () => {
				const definitionFiles = this.getDefinitionFiles();

				if (definitionFiles.length === 0) {
					new Notice("No definition files found");
					return;
				}

				new DefinitionsModal(this.app, this).open();
			},
		});

		// Adds definitions to the current file
		this.addCommand({
			id: "add-definitions-current-file",
			name: "Add definitions for current file",
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				// Refresh definitions if command is run manually
				await this.refreshDefinitions();
				await this.replaceDefinitionsInEditor(editor);
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

	constructor(app: App, plugin: DefinitionsPlugin) {
		super(app);
		this.plugin = plugin;
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
		evt: MouseEvent | KeyboardEvent
	) {
		new Notice(`You picked: ${definition.heading}`);
		this.plugin.openDefinition(definition);
	}
}
