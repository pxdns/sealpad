import * as vscode from 'vscode';
import * as path from 'path';

export interface SealpadProject {
	id: string;
	name: string;
	rootPath: string;
	lastOpened: number;
	color?: string;
	description?: string;
}

const STORAGE_KEY = 'sealpad.projects';

export class ProjectManager {
	private readonly context: vscode.ExtensionContext;

	constructor(context: vscode.ExtensionContext) {
		this.context = context;
	}

	getAll(): SealpadProject[] {
		return this.context.globalState.get<SealpadProject[]>(STORAGE_KEY, []);
	}

	getRecent(limit = 8): SealpadProject[] {
		return this.getAll()
			.sort((a, b) => b.lastOpened - a.lastOpened)
			.slice(0, limit);
	}

	add(project: Omit<SealpadProject, 'id' | 'lastOpened'>): SealpadProject {
		const projects = this.getAll();
		const existing = projects.find(p => p.rootPath === project.rootPath);
		if (existing) {
			return this.touch(existing.id);
		}
		const p: SealpadProject = {
			...project,
			id: `proj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
			lastOpened: Date.now(),
		};
		this.context.globalState.update(STORAGE_KEY, [...projects, p]);
		return p;
	}

	remove(id: string): void {
		const projects = this.getAll().filter(p => p.id !== id);
		this.context.globalState.update(STORAGE_KEY, projects);
	}

	touch(id: string): SealpadProject {
		const projects = this.getAll();
		const idx = projects.findIndex(p => p.id === id);
		if (idx === -1) { throw new Error(`Project ${id} not found`); }
		projects[idx] = { ...projects[idx], lastOpened: Date.now() };
		this.context.globalState.update(STORAGE_KEY, projects);
		return projects[idx];
	}

	async openProject(project: SealpadProject): Promise<void> {
		this.touch(project.id);
		const uri = vscode.Uri.file(project.rootPath);
		await vscode.commands.executeCommand('vscode.openFolder', uri, { forceNewWindow: false });
	}

	async registerCurrentWorkspace(): Promise<SealpadProject | undefined> {
		const ws = vscode.workspace.workspaceFolders;
		if (!ws || ws.length === 0) { return undefined; }
		const root = ws[0].uri.fsPath;
		const name = path.basename(root);
		return this.add({ name, rootPath: root });
	}
}

export class ProjectLauncherProvider implements vscode.WebviewViewProvider {
	static readonly viewId = 'sealpad.projects';
	private view?: vscode.WebviewView;

	constructor(
		_context: vscode.ExtensionContext,
		private readonly pm: ProjectManager
	) {}

	resolveWebviewView(webviewView: vscode.WebviewView): void {
		this.view = webviewView;
		webviewView.webview.options = { enableScripts: true };
		this._render(webviewView.webview);

		webviewView.onDidChangeVisibility(() => {
			if (webviewView.visible) { this._render(webviewView.webview); }
		});

		webviewView.webview.onDidReceiveMessage(async (msg: { type: string; id?: string; path?: string }) => {
			switch (msg.type) {
				case 'open': {
					const projects = this.pm.getAll();
					const p = projects.find(x => x.id === msg.id);
					if (p) { await this.pm.openProject(p); }
					break;
				}
				case 'remove':
					if (msg.id) { this.pm.remove(msg.id); }
					this._render(webviewView.webview);
					break;
				case 'addFolder': {
					const uris = await vscode.window.showOpenDialog({
						canSelectFiles: false,
						canSelectFolders: true,
						canSelectMany: false,
						title: 'Add Project Folder',
					});
					if (uris && uris.length > 0) {
						const rootPath = uris[0].fsPath;
						this.pm.add({ name: path.basename(rootPath), rootPath });
						this._render(webviewView.webview);
					}
					break;
				}
				case 'pinCurrent':
					await this.pm.registerCurrentWorkspace();
					this._render(webviewView.webview);
					break;
			}
		});
	}

	refresh(): void {
		if (this.view?.visible) {
			this._render(this.view.webview);
		}
	}

	private _render(webview: vscode.Webview): void {
		const projects = this.pm.getRecent(12);
		const fmt = (ts: number) => {
			const d = Date.now() - ts;
			if (d < 60_000) { return 'just now'; }
			if (d < 3_600_000) { return `${Math.floor(d / 60_000)}m ago`; }
			if (d < 86_400_000) { return `${Math.floor(d / 3_600_000)}h ago`; }
			return `${Math.floor(d / 86_400_000)}d ago`;
		};
		const rows = projects.map(p => `
			<div class="project-row" data-id="${p.id}">
				<div class="project-icon">${p.name.charAt(0).toUpperCase()}</div>
				<div class="project-info">
					<div class="project-name">${escapeHtml(p.name)}</div>
					<div class="project-path">${escapeHtml(p.rootPath)}</div>
				</div>
				<div class="project-meta">${fmt(p.lastOpened)}</div>
				<button class="remove-btn" data-id="${p.id}" title="Remove">×</button>
			</div>`).join('');

		webview.html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
body { padding: 0; margin: 0; font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); color: var(--vscode-foreground); background: transparent; }
.toolbar { display: flex; gap: 6px; padding: 8px 10px; border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border, rgba(255,255,255,0.06)); }
.toolbar-btn { flex: 1; padding: 5px 6px; background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); border: none; border-radius: 3px; cursor: pointer; font-size: 11px; font-family: inherit; transition: background 0.1s; }
.toolbar-btn:hover { background: var(--vscode-button-secondaryHoverBackground); }
.project-list { padding: 4px 6px; }
.project-row { display: flex; align-items: center; gap: 8px; padding: 6px 6px; border-radius: 4px; cursor: pointer; transition: background 0.1s; position: relative; }
.project-row:hover { background: var(--vscode-list-hoverBackground); }
.project-icon { width: 26px; height: 26px; border-radius: 5px; background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600; flex-shrink: 0; }
.project-info { flex: 1; min-width: 0; }
.project-name { font-size: 12px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.project-path { font-size: 10px; opacity: 0.45; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 1px; }
.project-meta { font-size: 10px; opacity: 0.4; white-space: nowrap; }
.remove-btn { background: none; border: none; color: var(--vscode-foreground); opacity: 0; cursor: pointer; font-size: 14px; padding: 2px 4px; border-radius: 3px; transition: opacity 0.1s; }
.project-row:hover .remove-btn { opacity: 0.5; }
.remove-btn:hover { opacity: 1 !important; background: var(--vscode-list-hoverBackground); }
.empty { padding: 20px 10px; text-align: center; opacity: 0.4; font-size: 11px; }
</style>
</head>
<body>
<div class="toolbar">
	<button class="toolbar-btn" id="pin-btn">Pin Current</button>
	<button class="toolbar-btn" id="add-btn">Add Folder</button>
</div>
<div class="project-list">
	${rows || '<div class="empty">No projects yet.<br>Pin a folder to get started.</div>'}
</div>
<script>
const vscode = acquireVsCodeApi();
document.getElementById('pin-btn').addEventListener('click', () => vscode.postMessage({ type: 'pinCurrent' }));
document.getElementById('add-btn').addEventListener('click', () => vscode.postMessage({ type: 'addFolder' }));
document.querySelectorAll('.project-row').forEach(row => {
	row.addEventListener('click', e => {
		if (e.target.classList.contains('remove-btn')) return;
		vscode.postMessage({ type: 'open', id: row.dataset.id });
	});
});
document.querySelectorAll('.remove-btn').forEach(btn => {
	btn.addEventListener('click', e => {
		e.stopPropagation();
		vscode.postMessage({ type: 'remove', id: btn.dataset.id });
	});
});
</script>
</body>
</html>`;
	}
}

function escapeHtml(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
