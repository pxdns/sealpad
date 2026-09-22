import * as vscode from 'vscode';
import { SealpadAuthProvider } from './auth/authProvider';
import { SealpadSettingsViewProvider } from './settingsView';
import { ProjectManager, ProjectLauncherProvider } from './projects/projectManager';
import { TaskManager, TaskViewProvider } from './productivity/taskManager';
import { BookmarkManager, BookmarksTreeProvider } from './productivity/bookmarks';
import { FocusMode } from './productivity/focusMode';
import { WorkflowManager, WorkflowViewProvider } from './workflows/workflowManager';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
	// ── Auth ─────────────────────────────────────────────────────────────────
	const authProvider = new SealpadAuthProvider(context.secrets);
	context.subscriptions.push(
		vscode.authentication.registerAuthenticationProvider(
			'sealpad', 'Sealpad', authProvider, { supportsMultipleAccounts: false }
		),
		authProvider
	);

	// ── Projects (Phase 3) ───────────────────────────────────────────────────
	const pm = new ProjectManager(context);
	const projectLauncher = new ProjectLauncherProvider(context, pm);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(ProjectLauncherProvider.viewId, projectLauncher)
	);

	// Auto-register current workspace
	pm.registerCurrentWorkspace().catch(() => { /* ignore if no workspace */ });

	// ── Tasks (Phase 4) ──────────────────────────────────────────────────────
	const tm = new TaskManager(context);
	const taskView = new TaskViewProvider(context, tm);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(TaskViewProvider.viewId, taskView)
	);

	// ── Bookmarks (Phase 4) ──────────────────────────────────────────────────
	const bm = new BookmarkManager(context);
	const bookmarksTree = new BookmarksTreeProvider(bm);
	context.subscriptions.push(
		vscode.window.registerTreeDataProvider('sealpad.bookmarks', bookmarksTree)
	);

	// ── Focus Mode (Phase 4) ─────────────────────────────────────────────────
	const focusMode = new FocusMode(context);

	// ── Workflows (Phase 5) ──────────────────────────────────────────────────
	const wm = new WorkflowManager(context);
	const workflowView = new WorkflowViewProvider(context, wm);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(WorkflowViewProvider.viewId, workflowView)
	);

	// ── Settings (Phase 6) ───────────────────────────────────────────────────
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			SealpadSettingsViewProvider.viewId,
			new SealpadSettingsViewProvider(context)
		)
	);

	// ── Commands ─────────────────────────────────────────────────────────────
	context.subscriptions.push(
		// Auth
		vscode.commands.registerCommand('sealpad.signIn', async () => {
			try {
				await vscode.authentication.getSession('sealpad', [], { createIfNone: true });
			} catch { /* user cancelled */ }
		}),
		vscode.commands.registerCommand('sealpad.signUp', async () => {
			try {
				await vscode.authentication.getSession('sealpad', [], { createIfNone: true });
			} catch { /* user cancelled */ }
		}),
		vscode.commands.registerCommand('sealpad.signOut', async () => {
			const sessions = await authProvider.getSessions();
			for (const s of sessions) { await authProvider.removeSession(s.id); }
		}),

		// Projects
		vscode.commands.registerCommand('sealpad.pinCurrentProject', async () => {
			const p = await pm.registerCurrentWorkspace();
			if (p) {
				vscode.window.showInformationMessage(`Pinned: ${p.name}`);
				projectLauncher.refresh();
			} else {
				vscode.window.showWarningMessage('No workspace folder open');
			}
		}),

		// Tasks / Quick Capture
		vscode.commands.registerCommand('sealpad.quickCapture', async () => {
			const text = await vscode.window.showInputBox({
				prompt: 'Capture a task',
				placeHolder: 'What needs to be done?',
			});
			if (text?.trim()) {
				tm.add(text);
				taskView.refresh();
				vscode.window.showInformationMessage(`Task captured: ${text.slice(0, 50)}`);
			}
		}),

		// Bookmarks
		vscode.commands.registerCommand('sealpad.toggleBookmark', async () => {
			await bm.toggleAtCursor();
			bookmarksTree.refresh();
		}),
		vscode.commands.registerCommand('sealpad.gotoBookmark', async (bookmark) => {
			try {
				const doc = await vscode.workspace.openTextDocument(bookmark.filePath);
				const editor = await vscode.window.showTextDocument(doc);
				const pos = new vscode.Position(bookmark.line, 0);
				editor.selection = new vscode.Selection(pos, pos);
				editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
			} catch {
				vscode.window.showErrorMessage(`Could not open: ${bookmark.filePath}`);
			}
		}),
		vscode.commands.registerCommand('sealpad.removeBookmark', (bookmark) => {
			bm.remove(bookmark.id);
			bookmarksTree.refresh();
		}),

		// Focus Mode
		vscode.commands.registerCommand('sealpad.startFocus', () => focusMode.startSession()),
		vscode.commands.registerCommand('sealpad.endFocus', () => focusMode.endSession()),

		// Workflows
		vscode.commands.registerCommand('sealpad.runWorkflow', () => wm.pickAndRun()),

		// Legacy stubs (kept for backward compat)
		vscode.commands.registerCommand('sealpad.openDM', () =>
			vscode.window.showInformationMessage('Sealpad: messaging features removed in this build')
		),
		vscode.commands.registerCommand('sealpad.createExpiringLink', () =>
			vscode.window.showInformationMessage('Sealpad: sharing features removed in this build')
		),
	);

	// ── Keybindings registered via contributes.keybindings in package.json ──

	// Restore session state on startup
	const existing = await authProvider.getSessions();
	await vscode.commands.executeCommand('setContext', 'sealpad.authenticated', existing.length > 0);
}

export function deactivate(): void {}
