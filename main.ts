import {
	App,
	Command,
	Editor,
	EditorPosition,
	FileManager,
	FuzzySuggestModal,
	MarkdownView,
	Menu,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	SuggestModal,
} from "obsidian";
import {
	DOCUMENT_END,
	DOCUMENT_START,
	SAME_CAPTURE_GROUP,
	replaceExceptBrackets,
} from "utils";

// Remember to rename these classes and interfaces!

interface DefinitionsPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: DefinitionsPluginSettings = {
	mySetting: "default",
};

const addDefinitionCommand: Command = {
	id: "add-definition",
	name: "Add Definition",
	editorCallback: (editor: Editor, view: MarkdownView) => {
		console.log(editor.getSelection());
		editor.replaceSelection("Sample Editor Command");
	},
};

export default class DefinitionsPlugin extends Plugin {
	settings: DefinitionsPluginSettings;

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

	async onload() {
		console.log("loading plugin");
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon(
			"documents",
			"Definitions Plugin",
			(evt: MouseEvent) => {
				// Called when the user clicks the icon.
				new Notice("Hello World!");
			}
		);
		// Perform additional things with the ribbon
		ribbonIconEl.addClass("my-plugin-ribbon-class");

		const sampleRibbonMenu = this.addRibbonIcon(
			"dice",
			"Definitions - Open Menu",
			(evt: MouseEvent) => {
				const menu = new Menu();
				menu.addItem((item) => {
					item.setTitle("Calculate average file length")
						.setIcon("documents")
						.onClick(async () => {
							const fileLength = await this.averageFileLength();
							new Notice(
								`The average file length is: ${fileLength} characters`
							);
						});
				});

				menu.addItem((item) => {
					item.setTitle("Paste definition")
						.setIcon("paste")
						.onClick(() => {
							new Notice("Definition pasted!");
						});
				});

				menu.showAtMouseEvent(evt);
			}
		);

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText("Status Bar Text");

		this.addCommand(addDefinitionCommand);

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: "open-sample-modal-simple",
			name: "Open sample modal (simple)",
			callback: () => {
				new SampleModal(this.app, (res) => {
					new Notice(`Got result: ${res}`);
				}).open();
			},
		});

		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: "link-to-all-files",
			name: "Links to all files",
			editorCallback: (editor: Editor, view: MarkdownView) => {
				const links = this.generateMarkdownLinks(view.file.path);
				editor.replaceSelection(links.join("\n"));
			},
		});

		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: "open-sample-modal-complex",
			name: "Open sample modal (complex)",
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView =
					this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleSuggestModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			},
		});

		this.addCommand({
			id: "open-sample-modal-fuzzy",
			name: "Open sample modal (fuzzy)",
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView =
					this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleFuzzyModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			},
		});

		this.addCommand({
			id: "replace-with-backlinks",
			name: "Replace with backlinks",
			editorCallback: (editor: Editor, view: MarkdownView) => {
				const { fileManager, vault } = this.app;

				const files = vault.getMarkdownFiles();
				const fileContents = editor.getValue();

				let res = fileContents;
				for (const file of files) {
					const link = fileManager.generateMarkdownLink(
						file,
						view.file.path,
						"",
						SAME_CAPTURE_GROUP
					);

					res = replaceExceptBrackets(file.basename, link, res);
				}

				editor.replaceRange(res, DOCUMENT_START, DOCUMENT_END);
				new Notice("Success!");
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new DefinitionsSettingTab(this.app, this));

		// // If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// // Using this function will automatically remove the event listener when this plugin is disabled.
		// this.registerDomEvent(document, "click", (evt: MouseEvent) => {
		// 	console.log("click", evt);
		// });

		// // When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		// this.registerInterval(
		// 	window.setInterval(() => console.log("setInterval"), 5 * 60 * 1000)
		// );
	}

	onunload() {
		console.log("unloading plugin");
	}

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

class SampleModal extends Modal {
	result: string;
	onSubmit: (result: string) => void;

	constructor(app: App, onSubmit: (result: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl("h1", {
			text: "Sample Modal for the Definitions Plugin",
		});
		contentEl.setText("Woah!");

		new Setting(contentEl).setName("Setting #1").addText((text) =>
			text.onChange((value) => {
				this.result = value;
			})
		);

		new Setting(contentEl).addButton((btn) => {
			btn.setButtonText("Save")
				.setCta()
				.onClick(() => {
					this.close();
					this.onSubmit(this.result);
				});
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

interface Definition {
	word: string;
	aliases: string[];
}

const ALL_DEFINITIONS: Definition[] = [
	{
		word: "abduct",
		aliases: ["abduct"],
	},
	{
		word: "aberrant",
		aliases: ["aberrant", "deviant", "deviate", "pervert"],
	},
	{
		word: "abdominal",
		aliases: ["abdominal", "abdominal muscle", "abdominals"],
	},
];

class SampleSuggestModal extends SuggestModal<Definition> {
	constructor(app: App) {
		super(app);
	}

	getSuggestions(inputStr: string): Definition[] {
		return ALL_DEFINITIONS.filter((def) =>
			def.aliases.some((alias) => alias.includes(inputStr.toLowerCase()))
		);
	}

	renderSuggestion(item: Definition, el: HTMLElement) {
		el.createEl("div", { text: item.word });
		el.createEl("small", { text: item.aliases.join(", ") });
	}

	onChooseSuggestion(item: Definition, evt: MouseEvent | KeyboardEvent) {
		new Notice(`You picked: ${item.word}`);
	}
}

class SampleFuzzyModal extends FuzzySuggestModal<Definition> {
	constructor(app: App) {
		super(app);
	}

	getItems(): Definition[] {
		return ALL_DEFINITIONS;
	}

	getItemText(item: Definition): string {
		return item.word;
	}

	onChooseItem(item: Definition, evt: MouseEvent | KeyboardEvent) {
		new Notice(`You picked: ${item.word}`);
	}
}

class DefinitionsSettingTab extends PluginSettingTab {
	plugin: DefinitionsPlugin;

	constructor(app: App, plugin: DefinitionsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl("h1", {
			text: "Settings for my Definitions plugin.",
		});

		new Setting(containerEl)
			.setName("Setting #1")
			.setDesc("It's a secret")
			.addText((text) =>
				text
					.setPlaceholder("Enter your secret")
					.setValue(this.plugin.settings.mySetting)
					.onChange(async (value) => {
						console.log("Secret: " + value);
						this.plugin.settings.mySetting = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
