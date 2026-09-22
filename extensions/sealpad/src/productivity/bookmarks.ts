import * as vscode from 'vscode';
import * as path from 'path';

export interface SealpadBookmark {
	id: string;
	filePath: string;
	line: number;
	label: string;
	created: number;
}

const STORAGE_KEY = 'sealpad.bookmarks';

export class BookmarkManager {
	constructor(private readonly context: vscode.ExtensionContext) {}

	getAll(): SealpadBookmark[] {
		return this.context.globalState.get<SealpadBookmark[]>(STORAGE_KEY, []);
	}

	add(filePath: string, line: number, label: string): SealpadBookmark {
		const existing = this.getAll();
		const dup = existing.find(b => b.filePath === filePath && b.line === line);
		if (dup) { return dup; }
		const bm: SealpadBookmark = {
			id: `bm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
			filePath,
			line,
			label: label.trim() || `${path.basename(filePath)}:${line + 1}`,
			created: Date.now(),
		};
		this.context.globalState.update(STORAGE_KEY, [...existing, bm]);
		return bm;
	}

	remove(id: string): void {
		this.context.globalState.update(STORAGE_KEY, this.getAll().filter(b => b.id !== id));
	}

	async toggleAtCursor(): Promise<void> {
		const editor = vscode.window.activeTextEditor;
		if (!editor) { return; }
		const line = editor.selection.active.line;
		const fp = editor.document.uri.fsPath;
		const existing = this.getAll().find(b => b.filePath === fp && b.line === line);
		if (existing) {
			this.remove(existing.id);
			vscode.window.showInformationMessage(`Bookmark removed: ${existing.label}`);
		} else {
			const lineText = editor.document.lineAt(line).text.trim().slice(0, 60);
			const bm = this.add(fp, line, lineText);
			vscode.window.showInformationMessage(`Bookmark added: ${bm.label}`);
		}
	}
}

export class BookmarksTreeProvider implements vscode.TreeDataProvider<SealpadBookmark> {
	private readonly _onDidChangeTreeData = new vscode.EventEmitter<SealpadBookmark | undefined>();
	readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

	constructor(private readonly bm: BookmarkManager) {}

	refresh(): void {
		this._onDidChangeTreeData.fire(undefined);
	}

	getTreeItem(element: SealpadBookmark): vscode.TreeItem {
		const item = new vscode.TreeItem(
			element.label,
			vscode.TreeItemCollapsibleState.None
		);
		item.description = `${path.basename(element.filePath)}:${element.line + 1}`;
		item.tooltip = `${element.filePath}:${element.line + 1}`;
		item.command = {
			command: 'sealpad.gotoBookmark',
			title: 'Go to Bookmark',
			arguments: [element],
		};
		item.contextValue = 'sealpadBookmark';
		return item;
	}

	getChildren(): SealpadBookmark[] {
		return this.bm.getAll().sort((a, b) => a.filePath.localeCompare(b.filePath) || a.line - b.line);
	}
}
