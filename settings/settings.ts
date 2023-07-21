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

		this.addFolderSetting();
		this.addSaveSetting();
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

	addSaveSetting(): void {
		new Setting(this.containerEl)
			.setName("Add links on save")
			.setDesc("Add links to definitions when saving a file")
			.addToggle((cb) => {
				cb.setValue(this.plugin.settings.addLinksOnSave).onChange(
					(value) => {
						this.plugin.settings.addLinksOnSave = value;
						this.plugin.saveSettings();
					}
				);
			});
	}
}
