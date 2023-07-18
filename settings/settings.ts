import { App, Setting, PluginSettingTab } from "obsidian";
import DefinitionsPlugin from "../main";
import { FolderSuggest } from "utils/folder-suggester";

export class DefinitionsSettingTab extends PluginSettingTab {
	plugin: DefinitionsPlugin;

	constructor(app: App, plugin: DefinitionsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl("h1", {
			text: "Definitions Plugin Settings",
		});

		this.addFolderSetting();
	}

	addFolderSetting(): void {
		new Setting(this.containerEl)
			.setName("Definitions folder location")
			.setDesc("Files in this folder will used as definitions")
			.addSearch((cb) => {
				new FolderSuggest(cb.inputEl);
				cb.setPlaceholder("Example: definitions")
					.setValue(this.plugin.settings.definitionsFolder)
					.onChange((new_folder) => {
						this.plugin.settings.definitionsFolder = new_folder;
						this.plugin.saveSettings();
					});
			});
	}
}
