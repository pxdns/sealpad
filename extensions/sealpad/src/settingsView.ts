import * as vscode from 'vscode';

export class SealpadSettingsViewProvider implements vscode.WebviewViewProvider {
	static readonly viewId = 'sealpad.settings';

	constructor(private readonly context: vscode.ExtensionContext) {}

	resolveWebviewView(webviewView: vscode.WebviewView): void {
		webviewView.webview.options = { enableScripts: true };
		webviewView.webview.html = this._html();

		// Send current settings to webview on focus/reveal
		webviewView.onDidChangeVisibility(() => {
			if (webviewView.visible) {
				this._syncSettings(webviewView.webview);
			}
		});
		this._syncSettings(webviewView.webview);

		// Handle messages from the webview
		webviewView.webview.onDidReceiveMessage(async (msg: { type: string; value: string }) => {
			if (msg.type === 'setCursorStyle') {
				await vscode.workspace.getConfiguration('terminal.integrated').update(
					'cursorStyle',
					msg.value,
					vscode.ConfigurationTarget.Global
				);
			}
		});

		// Sync whenever the setting changes externally
		const disposable = vscode.workspace.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration('terminal.integrated.cursorStyle')) {
				this._syncSettings(webviewView.webview);
			}
		});
		webviewView.onDidDispose(() => disposable.dispose());
	}

	private _syncSettings(webview: vscode.Webview): void {
		const cursorStyle = vscode.workspace.getConfiguration('terminal.integrated').get<string>('cursorStyle', 'block');
		webview.postMessage({ type: 'settingsSync', cursorStyle });
	}

	private _html(): string {
		return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body {
    padding: 12px;
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    color: var(--vscode-foreground);
    background: transparent;
  }
  h3 {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--vscode-descriptionForeground);
    margin: 0 0 8px;
  }
  .toggle-row {
    display: flex;
    gap: 6px;
    margin-bottom: 16px;
  }
  button {
    flex: 1;
    padding: 8px 0;
    border: 1px solid var(--vscode-button-border, var(--vscode-contrastBorder, transparent));
    border-radius: 4px;
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
    cursor: pointer;
    font-family: inherit;
    font-size: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    transition: background 0.1s;
  }
  button:hover {
    background: var(--vscode-button-secondaryHoverBackground);
  }
  button.active {
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border-color: var(--vscode-focusBorder, transparent);
  }
  .cursor-preview {
    width: 18px;
    height: 14px;
    display: flex;
    align-items: flex-end;
    justify-content: center;
  }
  .cursor-block {
    width: 10px;
    height: 14px;
    background: currentColor;
    opacity: 0.85;
  }
  .cursor-line {
    width: 2px;
    height: 14px;
    background: currentColor;
    opacity: 0.85;
  }
  .cursor-underline {
    width: 10px;
    height: 2px;
    background: currentColor;
    opacity: 0.85;
  }
</style>
</head>
<body>
<h3>Terminal Cursor</h3>
<div class="toggle-row">
  <button id="btn-block" onclick="setCursor('block')">
    <div class="cursor-preview"><div class="cursor-block"></div></div>
    Block
  </button>
  <button id="btn-line" onclick="setCursor('line')">
    <div class="cursor-preview"><div class="cursor-line"></div></div>
    Line
  </button>
  <button id="btn-underline" onclick="setCursor('underline')">
    <div class="cursor-preview"><div class="cursor-underline"></div></div>
    Underline
  </button>
</div>
<script>
  const vscode = acquireVsCodeApi();
  function setCursor(style) {
    vscode.postMessage({ type: 'setCursorStyle', value: style });
  }
  window.addEventListener('message', e => {
    if (e.data.type === 'settingsSync') {
      ['block','line','underline'].forEach(s => {
        document.getElementById('btn-' + s).classList.toggle('active', e.data.cursorStyle === s);
      });
    }
  });
</script>
</body>
</html>`;
	}
}
