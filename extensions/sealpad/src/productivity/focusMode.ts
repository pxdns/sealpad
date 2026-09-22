import * as vscode from 'vscode';

interface FocusSession {
	startTime: number;
	durationMinutes: number;
	goal: string;
}

export class FocusMode {
	private session: FocusSession | null = null;
	private timer: ReturnType<typeof setTimeout> | null = null;
	private statusItem: vscode.StatusBarItem;

	constructor(context: vscode.ExtensionContext) {
		this.statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 50);
		this.statusItem.command = 'sealpad.endFocus';
		context.subscriptions.push(this.statusItem);
	}

	isActive(): boolean {
		return this.session !== null;
	}

	async startSession(): Promise<void> {
		if (this.session) {
			vscode.window.showWarningMessage('Focus session already active. End it first.');
			return;
		}

		const goal = await vscode.window.showInputBox({
			prompt: 'What are you focusing on?',
			placeHolder: 'e.g. Fix auth bug, write tests…',
		});
		if (!goal) { return; }

		const durationStr = await vscode.window.showQuickPick(
			['15 min', '25 min', '45 min', '60 min', '90 min'],
			{ placeHolder: 'Focus duration' }
		);
		if (!durationStr) { return; }

		const minutes = parseInt(durationStr, 10);
		this.session = { startTime: Date.now(), durationMinutes: minutes, goal };

		this._applyFocusLayout();
		this._updateStatusBar();
		this._scheduleEnd(minutes * 60_000);

		vscode.window.showInformationMessage(`Focus: ${goal} (${minutes}m)`);
	}

	endSession(): void {
		if (!this.session) { return; }
		const elapsed = Math.round((Date.now() - this.session.startTime) / 60_000);
		vscode.window.showInformationMessage(
			`Focus session ended. ${elapsed}m on: ${this.session.goal}`
		);
		this.session = null;
		if (this.timer) { clearTimeout(this.timer); this.timer = null; }
		this._restoreLayout();
		this.statusItem.hide();
	}

	private _applyFocusLayout(): void {
		vscode.commands.executeCommand('workbench.action.closeSidebar');
		vscode.commands.executeCommand('workbench.action.closePanel');
	}

	private _restoreLayout(): void {
		// Restore sidebar — user can re-open panel manually
		vscode.commands.executeCommand('workbench.view.explorer');
	}

	private _updateStatusBar(): void {
		if (!this.session) { return; }
		const elapsed = Math.round((Date.now() - this.session.startTime) / 60_000);
		const remaining = this.session.durationMinutes - elapsed;
		this.statusItem.text = `$(clock) Focus: ${remaining}m left`;
		this.statusItem.tooltip = `Goal: ${this.session.goal}\nClick to end session`;
		this.statusItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
		this.statusItem.show();

		// Tick every minute
		setTimeout(() => {
			if (this.session) { this._updateStatusBar(); }
		}, 60_000);
	}

	private _scheduleEnd(ms: number): void {
		this.timer = setTimeout(() => {
			if (this.session) {
				vscode.window.showInformationMessage(
					`Focus session complete: ${this.session.goal}`
				);
				this.endSession();
			}
		}, ms);
	}
}
