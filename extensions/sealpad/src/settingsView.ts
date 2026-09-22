import * as vscode from 'vscode';

export class SealpadSettingsViewProvider implements vscode.WebviewViewProvider {
	static readonly viewId = 'sealpad.settings';

	constructor(_context: vscode.ExtensionContext) {}

	resolveWebviewView(webviewView: vscode.WebviewView): void {
		webviewView.webview.options = { enableScripts: true };
		webviewView.webview.html = this._html();

		webviewView.onDidChangeVisibility(() => {
			if (webviewView.visible) { this._sync(webviewView.webview); }
		});
		this._sync(webviewView.webview);

		webviewView.webview.onDidReceiveMessage(async (msg: { type: string; value?: string; key?: string }) => {
			switch (msg.type) {
				case 'setCursorStyle':
					await vscode.workspace.getConfiguration('terminal.integrated').update(
						'cursorStyle', msg.value, vscode.ConfigurationTarget.Global
					);
					break;
				case 'setFontLigatures':
					await vscode.workspace.getConfiguration('editor').update(
						'fontLigatures', msg.value === 'true', vscode.ConfigurationTarget.Global
					);
					break;
				case 'setWordWrap':
					await vscode.workspace.getConfiguration('editor').update(
						'wordWrap', msg.value, vscode.ConfigurationTarget.Global
					);
					break;
				case 'setMinimap':
					await vscode.workspace.getConfiguration('editor').update(
						'minimap.enabled', msg.value === 'true', vscode.ConfigurationTarget.Global
					);
					break;
				case 'setBreadcrumbs':
					await vscode.workspace.getConfiguration('breadcrumbs').update(
						'enabled', msg.value === 'true', vscode.ConfigurationTarget.Global
					);
					break;
				case 'setRenderWhitespace':
					await vscode.workspace.getConfiguration('editor').update(
						'renderWhitespace', msg.value, vscode.ConfigurationTarget.Global
					);
					break;
				case 'setTabSize':
					if (msg.value) {
						await vscode.workspace.getConfiguration('editor').update(
							'tabSize', parseInt(msg.value, 10), vscode.ConfigurationTarget.Global
						);
					}
					break;
			}
			this._sync(webviewView.webview);
		});

		const disposable = vscode.workspace.onDidChangeConfiguration(() => {
			if (webviewView.visible) { this._sync(webviewView.webview); }
		});
		webviewView.onDidDispose(() => disposable.dispose());
	}

	private _sync(webview: vscode.Webview): void {
		const editor = vscode.workspace.getConfiguration('editor');
		const terminal = vscode.workspace.getConfiguration('terminal.integrated');
		const breadcrumbs = vscode.workspace.getConfiguration('breadcrumbs');
		webview.postMessage({
			type: 'sync',
			cursorStyle: terminal.get<string>('cursorStyle', 'block'),
			fontLigatures: editor.get<boolean>('fontLigatures', false),
			wordWrap: editor.get<string>('wordWrap', 'off'),
			minimap: editor.get<boolean>('minimap.enabled', true),
			breadcrumbs: breadcrumbs.get<boolean>('enabled', true),
			renderWhitespace: editor.get<string>('renderWhitespace', 'none'),
			tabSize: editor.get<number>('tabSize', 4),
		});
	}

	private _html(): string {
		return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
* { box-sizing: border-box; }
body {
	padding: 0 0 24px;
	font-family: var(--vscode-font-family);
	font-size: var(--vscode-font-size);
	color: var(--vscode-foreground);
	background: transparent;
	margin: 0;
}
.section { padding: 12px 12px 0; }
.section-title {
	font-size: 10px;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.09em;
	color: var(--vscode-descriptionForeground);
	margin: 0 0 10px;
	opacity: 0.7;
}
.row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 8px;
	gap: 8px;
}
.row-label { font-size: 11px; flex: 1; }
.toggle-group { display: flex; gap: 4px; }
.toggle-group button {
	padding: 4px 8px;
	background: var(--vscode-button-secondaryBackground);
	color: var(--vscode-button-secondaryForeground);
	border: 1px solid transparent;
	border-radius: 3px;
	cursor: pointer;
	font-family: inherit;
	font-size: 11px;
	transition: background 0.1s;
}
.toggle-group button:hover { background: var(--vscode-button-secondaryHoverBackground); }
.toggle-group button.active {
	background: var(--vscode-button-background);
	color: var(--vscode-button-foreground);
	border-color: var(--vscode-focusBorder, transparent);
}
/* Cursor style row special layout */
.cursor-group { display: flex; gap: 5px; }
.cursor-btn {
	flex: 1;
	padding: 6px 0;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 4px;
	background: var(--vscode-button-secondaryBackground);
	color: var(--vscode-button-secondaryForeground);
	border: 1px solid transparent;
	border-radius: 3px;
	cursor: pointer;
	font-family: inherit;
	font-size: 11px;
}
.cursor-btn:hover { background: var(--vscode-button-secondaryHoverBackground); }
.cursor-btn.active { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
.cursor-icon { width: 20px; height: 13px; display: flex; align-items: flex-end; justify-content: center; }
.cursor-block { width: 10px; height: 13px; background: currentColor; opacity: 0.85; }
.cursor-line  { width: 2px;  height: 13px; background: currentColor; opacity: 0.85; }
.cursor-ul    { width: 10px; height: 2px;  background: currentColor; opacity: 0.85; }
.divider { border: none; border-top: 1px solid var(--vscode-sideBarSectionHeader-border, rgba(255,255,255,0.07)); margin: 10px 0 0; }
.number-input {
	width: 48px;
	padding: 3px 6px;
	background: var(--vscode-input-background);
	color: var(--vscode-input-foreground);
	border: 1px solid var(--vscode-input-border, transparent);
	border-radius: 3px;
	font-family: inherit;
	font-size: 11px;
	text-align: center;
}
</style>
</head>
<body>

<div class="section">
	<div class="section-title">Terminal</div>
	<div class="cursor-group">
		<button class="cursor-btn" id="cur-block" data-val="block">
			<div class="cursor-icon"><div class="cursor-block"></div></div>Block
		</button>
		<button class="cursor-btn" id="cur-line" data-val="line">
			<div class="cursor-icon"><div class="cursor-line"></div></div>Line
		</button>
		<button class="cursor-btn" id="cur-underline" data-val="underline">
			<div class="cursor-icon"><div class="cursor-ul"></div></div>Under
		</button>
	</div>
</div>

<hr class="divider">

<div class="section">
	<div class="section-title">Editor</div>
	<div class="row">
		<span class="row-label">Ligatures</span>
		<div class="toggle-group" data-key="setFontLigatures">
			<button data-val="true">On</button>
			<button data-val="false">Off</button>
		</div>
	</div>
	<div class="row">
		<span class="row-label">Word Wrap</span>
		<div class="toggle-group" data-key="setWordWrap">
			<button data-val="on">On</button>
			<button data-val="off">Off</button>
		</div>
	</div>
	<div class="row">
		<span class="row-label">Minimap</span>
		<div class="toggle-group" data-key="setMinimap">
			<button data-val="true">On</button>
			<button data-val="false">Off</button>
		</div>
	</div>
	<div class="row">
		<span class="row-label">Breadcrumbs</span>
		<div class="toggle-group" data-key="setBreadcrumbs">
			<button data-val="true">On</button>
			<button data-val="false">Off</button>
		</div>
	</div>
	<div class="row">
		<span class="row-label">Whitespace</span>
		<div class="toggle-group" data-key="setRenderWhitespace">
			<button data-val="none">None</button>
			<button data-val="boundary">Edge</button>
			<button data-val="all">All</button>
		</div>
	</div>
	<div class="row">
		<span class="row-label">Tab Size</span>
		<input type="number" class="number-input" id="tab-size" min="1" max="8" step="1">
	</div>
</div>

<script>
const vscode = acquireVsCodeApi();

// Terminal cursor
document.querySelectorAll('.cursor-btn').forEach(btn => {
	btn.addEventListener('click', () => vscode.postMessage({ type: 'setCursorStyle', value: btn.dataset.val }));
});

// Toggle groups
document.querySelectorAll('.toggle-group').forEach(group => {
	group.querySelectorAll('button').forEach(btn => {
		btn.addEventListener('click', () => vscode.postMessage({ type: group.dataset.key, value: btn.dataset.val }));
	});
});

// Tab size
document.getElementById('tab-size').addEventListener('change', e => {
	vscode.postMessage({ type: 'setTabSize', value: e.target.value });
});

window.addEventListener('message', e => {
	if (e.data.type !== 'sync') return;
	const d = e.data;

	// Cursor
	['block','line','underline'].forEach(s =>
		document.getElementById('cur-' + s)?.classList.toggle('active', d.cursorStyle === s));

	// Toggles
	const mark = (key, val) => {
		const group = document.querySelector('[data-key="' + key + '"]');
		if (!group) return;
		group.querySelectorAll('button').forEach(btn =>
			btn.classList.toggle('active', btn.dataset.val === String(val)));
	};
	mark('setFontLigatures', d.fontLigatures);
	mark('setWordWrap', d.wordWrap);
	mark('setMinimap', d.minimap);
	mark('setBreadcrumbs', d.breadcrumbs);
	mark('setRenderWhitespace', d.renderWhitespace);

	document.getElementById('tab-size').value = d.tabSize;
});
</script>
</body>
</html>`;
	}
}
