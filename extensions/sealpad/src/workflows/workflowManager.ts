import * as vscode from 'vscode';
import * as path from 'path';

export interface WorkflowStep {
	type: 'terminal' | 'command' | 'open';
	label: string;
	value: string;
}

export interface SealpadWorkflow {
	id: string;
	name: string;
	description: string;
	steps: WorkflowStep[];
	created: number;
}

const STORAGE_KEY = 'sealpad.workflows';

const BUILTIN_WORKFLOWS: SealpadWorkflow[] = [
	{
		id: 'builtin_git_status',
		name: 'Git Status',
		description: 'Show git status and recent commits',
		steps: [
			{ type: 'terminal', label: 'git status', value: 'git status' },
			{ type: 'terminal', label: 'git log --oneline -10', value: 'git log --oneline -10' },
		],
		created: 0,
	},
	{
		id: 'builtin_npm_dev',
		name: 'Start Dev Server',
		description: 'Install deps and start development server',
		steps: [
			{ type: 'terminal', label: 'npm install', value: 'npm install' },
			{ type: 'terminal', label: 'npm run dev', value: 'npm run dev' },
		],
		created: 0,
	},
	{
		id: 'builtin_test_watch',
		name: 'Test Watch',
		description: 'Run tests in watch mode',
		steps: [
			{ type: 'terminal', label: 'npm test -- --watch', value: 'npm test -- --watch' },
		],
		created: 0,
	},
];

export class WorkflowManager {
	constructor(private readonly context: vscode.ExtensionContext) {}

	getAll(): SealpadWorkflow[] {
		const custom = this.context.globalState.get<SealpadWorkflow[]>(STORAGE_KEY, []);
		return [...BUILTIN_WORKFLOWS, ...custom];
	}

	getCustom(): SealpadWorkflow[] {
		return this.context.globalState.get<SealpadWorkflow[]>(STORAGE_KEY, []);
	}

	add(workflow: Omit<SealpadWorkflow, 'id' | 'created'>): SealpadWorkflow {
		const wf: SealpadWorkflow = {
			...workflow,
			id: `wf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
			created: Date.now(),
		};
		const custom = this.getCustom();
		this.context.globalState.update(STORAGE_KEY, [...custom, wf]);
		return wf;
	}

	remove(id: string): void {
		if (id.startsWith('builtin_')) { return; }
		this.context.globalState.update(STORAGE_KEY, this.getCustom().filter(w => w.id !== id));
	}

	async run(workflow: SealpadWorkflow): Promise<void> {
		const terminal = vscode.window.createTerminal({
			name: workflow.name,
			cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
		});
		terminal.show();

		for (const step of workflow.steps) {
			switch (step.type) {
				case 'terminal':
					terminal.sendText(step.value);
					break;
				case 'command':
					await vscode.commands.executeCommand(step.value);
					break;
				case 'open': {
					const fp = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
					const uri = fp ? vscode.Uri.file(path.join(fp, step.value)) : vscode.Uri.parse(step.value);
					await vscode.window.showTextDocument(uri);
					break;
				}
			}
		}
	}

	async pickAndRun(): Promise<void> {
		const workflows = this.getAll();
		const pick = await vscode.window.showQuickPick(
			workflows.map(w => ({
				label: w.name,
				description: w.description,
				detail: w.steps.map(s => s.label).join(' → '),
				workflow: w,
			})),
			{ placeHolder: 'Select workflow to run', matchOnDescription: true }
		);
		if (pick) { await this.run(pick.workflow); }
	}
}

export class WorkflowViewProvider implements vscode.WebviewViewProvider {
	static readonly viewId = 'sealpad.workflows';
	constructor(
		_context: vscode.ExtensionContext,
		private readonly wm: WorkflowManager
	) {}

	resolveWebviewView(webviewView: vscode.WebviewView): void {
		webviewView.webview.options = { enableScripts: true };
		this._render(webviewView.webview);

		webviewView.onDidChangeVisibility(() => {
			if (webviewView.visible) { this._render(webviewView.webview); }
		});

		webviewView.webview.onDidReceiveMessage(async (msg: { type: string; id?: string }) => {
			switch (msg.type) {
				case 'run': {
					const all = this.wm.getAll();
					const wf = all.find(w => w.id === msg.id);
					if (wf) { await this.wm.run(wf); }
					break;
				}
				case 'remove':
					if (msg.id) { this.wm.remove(msg.id); }
					this._render(webviewView.webview);
					break;
			}
		});
	}

	private _render(webview: vscode.Webview): void {
		const workflows = this.wm.getAll();
		const rows = workflows.map(w => `
			<div class="wf-row" data-id="${w.id}">
				<div class="wf-info">
					<div class="wf-name">${escapeHtml(w.name)}</div>
					<div class="wf-desc">${escapeHtml(w.description)}</div>
				</div>
				<div class="wf-actions">
					<button class="run-btn" data-id="${w.id}">▶</button>
					${!w.id.startsWith('builtin_') ? `<button class="del-btn" data-id="${w.id}">×</button>` : ''}
				</div>
			</div>`).join('');

		webview.html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8">
<style>
* { box-sizing: border-box; }
body { padding: 0; margin: 0; font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); color: var(--vscode-foreground); background: transparent; }
.wf-row { display: flex; align-items: center; gap: 8px; padding: 7px 10px; border-radius: 3px; transition: background 0.1s; }
.wf-row:hover { background: var(--vscode-list-hoverBackground); }
.wf-info { flex: 1; min-width: 0; }
.wf-name { font-size: 12px; font-weight: 500; }
.wf-desc { font-size: 10px; opacity: 0.45; margin-top: 1px; }
.wf-actions { display: flex; gap: 4px; }
.run-btn { padding: 3px 7px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 3px; cursor: pointer; font-size: 10px; }
.run-btn:hover { background: var(--vscode-button-hoverBackground); }
.del-btn { padding: 2px 5px; background: none; border: none; color: var(--vscode-foreground); opacity: 0.4; cursor: pointer; font-size: 13px; border-radius: 2px; }
.del-btn:hover { opacity: 1; background: var(--vscode-list-hoverBackground); }
</style>
</head>
<body>
${rows || '<div style="padding:16px;text-align:center;opacity:.4;font-size:11px">No workflows yet.</div>'}
<script>
const vscode = acquireVsCodeApi();
document.querySelectorAll('.run-btn').forEach(b => b.addEventListener('click', () => vscode.postMessage({ type: 'run', id: b.dataset.id })));
document.querySelectorAll('.del-btn').forEach(b => b.addEventListener('click', () => vscode.postMessage({ type: 'remove', id: b.dataset.id })));
</script>
</body>
</html>`;
	}
}

function escapeHtml(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
