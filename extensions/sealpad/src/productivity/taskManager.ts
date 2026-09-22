import * as vscode from 'vscode';

export type TaskPriority = 'high' | 'medium' | 'low';
export type TaskStatus = 'todo' | 'done';

export interface SealpadTask {
	id: string;
	text: string;
	status: TaskStatus;
	priority: TaskPriority;
	created: number;
	completed?: number;
	tags: string[];
}

const STORAGE_KEY = 'sealpad.tasks';

export class TaskManager {
	constructor(private readonly context: vscode.ExtensionContext) {}

	getAll(): SealpadTask[] {
		return this.context.globalState.get<SealpadTask[]>(STORAGE_KEY, []);
	}

	getActive(): SealpadTask[] {
		return this.getAll()
			.filter(t => t.status === 'todo')
			.sort((a, b) => {
				const order: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };
				return order[a.priority] - order[b.priority] || a.created - b.created;
			});
	}

	add(text: string, priority: TaskPriority = 'medium', tags: string[] = []): SealpadTask {
		const tasks = this.getAll();
		const task: SealpadTask = {
			id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
			text: text.trim(),
			status: 'todo',
			priority,
			created: Date.now(),
			tags,
		};
		this.context.globalState.update(STORAGE_KEY, [...tasks, task]);
		return task;
	}

	complete(id: string): void {
		const tasks = this.getAll();
		const idx = tasks.findIndex(t => t.id === id);
		if (idx !== -1) {
			tasks[idx] = { ...tasks[idx], status: 'done', completed: Date.now() };
			this.context.globalState.update(STORAGE_KEY, tasks);
		}
	}

	reopen(id: string): void {
		const tasks = this.getAll();
		const idx = tasks.findIndex(t => t.id === id);
		if (idx !== -1) {
			tasks[idx] = { ...tasks[idx], status: 'todo', completed: undefined };
			this.context.globalState.update(STORAGE_KEY, tasks);
		}
	}

	remove(id: string): void {
		this.context.globalState.update(STORAGE_KEY, this.getAll().filter(t => t.id !== id));
	}

	clearCompleted(): void {
		this.context.globalState.update(STORAGE_KEY, this.getAll().filter(t => t.status !== 'done'));
	}
}

export class TaskViewProvider implements vscode.WebviewViewProvider {
	static readonly viewId = 'sealpad.tasks';
	private view?: vscode.WebviewView;

	constructor(
		_context: vscode.ExtensionContext,
		private readonly tm: TaskManager
	) {}

	resolveWebviewView(webviewView: vscode.WebviewView): void {
		this.view = webviewView;
		webviewView.webview.options = { enableScripts: true };
		this._render(webviewView.webview);

		webviewView.onDidChangeVisibility(() => {
			if (webviewView.visible) { this._render(webviewView.webview); }
		});

		webviewView.webview.onDidReceiveMessage(async (msg: { type: string; id?: string; text?: string; priority?: string }) => {
			switch (msg.type) {
				case 'add':
					if (msg.text) { this.tm.add(msg.text, (msg.priority as TaskPriority) || 'medium'); }
					break;
				case 'complete':
					if (msg.id) { this.tm.complete(msg.id); }
					break;
				case 'reopen':
					if (msg.id) { this.tm.reopen(msg.id); }
					break;
				case 'remove':
					if (msg.id) { this.tm.remove(msg.id); }
					break;
				case 'clearDone':
					this.tm.clearCompleted();
					break;
			}
			this._render(webviewView.webview);
		});
	}

	refresh(): void {
		if (this.view?.visible) { this._render(this.view.webview); }
	}

	private _render(webview: vscode.Webview): void {
		const active = this.tm.getActive();
		const done = this.tm.getAll().filter(t => t.status === 'done').slice(-5).reverse();

		const priorityDot: Record<TaskPriority, string> = {
			high: '#EE4444',
			medium: '#EE9944',
			low: '#44AAEE',
		};

		const row = (t: SealpadTask, isDone: boolean) => `
			<div class="task-row ${isDone ? 'done' : ''}" data-id="${t.id}">
				<button class="check-btn" data-id="${t.id}" data-done="${isDone}">
					${isDone ? '<svg viewBox="0 0 12 12" fill="currentColor"><path d="M1 6l4 4 6-7"/></svg>' : ''}
				</button>
				<span class="task-text">${escapeHtml(t.text)}</span>
				${!isDone ? `<span class="prio-dot" style="background:${priorityDot[t.priority]}"></span>` : ''}
				<button class="del-btn" data-id="${t.id}">×</button>
			</div>`;

		webview.html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
* { box-sizing: border-box; }
body { padding: 0; margin: 0; font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); color: var(--vscode-foreground); background: transparent; }
.add-row { display: flex; gap: 4px; padding: 8px 8px 6px; }
.add-input { flex: 1; padding: 5px 8px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border, transparent); border-radius: 3px; font-family: inherit; font-size: 11px; outline: none; }
.add-input::placeholder { color: var(--vscode-input-placeholderForeground); }
.add-input:focus { border-color: var(--vscode-focusBorder); }
.prio-sel { padding: 5px 4px; background: var(--vscode-input-background); color: var(--vscode-foreground); border: 1px solid var(--vscode-input-border, transparent); border-radius: 3px; font-size: 10px; cursor: pointer; }
.add-btn { padding: 5px 8px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 3px; cursor: pointer; font-size: 11px; font-family: inherit; }
.task-list { padding: 0 6px 6px; }
.task-row { display: flex; align-items: center; gap: 6px; padding: 5px 4px; border-radius: 3px; transition: background 0.1s; }
.task-row:hover { background: var(--vscode-list-hoverBackground); }
.task-row.done .task-text { opacity: 0.4; text-decoration: line-through; }
.check-btn { width: 16px; height: 16px; flex-shrink: 0; background: none; border: 1px solid var(--vscode-input-border, rgba(255,255,255,0.2)); border-radius: 3px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--vscode-foreground); padding: 0; }
.check-btn svg { width: 10px; height: 10px; fill: none; stroke: currentColor; stroke-width: 1.5; }
.done .check-btn { background: var(--vscode-badge-background); border-color: transparent; color: var(--vscode-badge-foreground); }
.task-text { flex: 1; font-size: 11px; line-height: 1.4; }
.prio-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }
.del-btn { background: none; border: none; color: var(--vscode-foreground); opacity: 0; cursor: pointer; font-size: 13px; padding: 0 3px; border-radius: 2px; }
.task-row:hover .del-btn { opacity: 0.4; }
.del-btn:hover { opacity: 1 !important; }
.section-label { font-size: 10px; font-weight: 600; letter-spacing: 0.07em; opacity: 0.45; padding: 8px 10px 2px; text-transform: uppercase; }
.clear-btn { float: right; font-size: 9px; padding: 1px 5px; background: none; border: 1px solid currentColor; border-radius: 3px; opacity: 0.5; cursor: pointer; color: inherit; text-transform: uppercase; letter-spacing: 0.04em; }
.clear-btn:hover { opacity: 0.9; }
.empty { padding: 14px 10px; text-align: center; opacity: 0.35; font-size: 11px; }
</style>
</head>
<body>
<div class="add-row">
	<input class="add-input" id="new-task" placeholder="New task…" maxlength="200">
	<select class="prio-sel" id="prio">
		<option value="high">!</option>
		<option value="medium" selected>·</option>
		<option value="low">↓</option>
	</select>
	<button class="add-btn" id="add-btn">+</button>
</div>
<div class="task-list" id="active-list">
	${active.length ? active.map(t => row(t, false)).join('') : '<div class="empty">All clear.</div>'}
</div>
${done.length ? `<div class="section-label">Done <button class="clear-btn" id="clear-done">Clear</button></div>
<div class="task-list">${done.map(t => row(t, true)).join('')}</div>` : ''}
<script>
const vscode = acquireVsCodeApi();
function send(msg) { vscode.postMessage(msg); }

document.getElementById('add-btn').addEventListener('click', () => {
	const t = document.getElementById('new-task').value.trim();
	const p = document.getElementById('prio').value;
	if (t) { send({ type: 'add', text: t, priority: p }); }
});
document.getElementById('new-task').addEventListener('keydown', e => {
	if (e.key === 'Enter') document.getElementById('add-btn').click();
});
document.querySelectorAll('.check-btn').forEach(btn => {
	btn.addEventListener('click', () => {
		const isDone = btn.dataset.done === 'true';
		send({ type: isDone ? 'reopen' : 'complete', id: btn.dataset.id });
	});
});
document.querySelectorAll('.del-btn').forEach(btn => {
	btn.addEventListener('click', () => send({ type: 'remove', id: btn.dataset.id }));
});
const clearBtn = document.getElementById('clear-done');
if (clearBtn) clearBtn.addEventListener('click', () => send({ type: 'clearDone' }));
</script>
</body>
</html>`;
	}
}

function escapeHtml(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
