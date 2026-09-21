import * as vscode from 'vscode';
import { SealpadAuthProvider } from './auth/authProvider';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
	const authProvider = new SealpadAuthProvider(context.secrets);

	context.subscriptions.push(
		vscode.authentication.registerAuthenticationProvider(
			'sealpad',
			'Sealpad',
			authProvider,
			{ supportsMultipleAccounts: false }
		),
		authProvider
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('sealpad.signIn', async () => {
			try {
				await vscode.authentication.getSession('sealpad', [], { createIfNone: true });
			} catch {
				// user cancelled
			}
		}),
		vscode.commands.registerCommand('sealpad.signUp', async () => {
			try {
				await vscode.authentication.getSession('sealpad', [], { createIfNone: true });
			} catch {
				// user cancelled
			}
		}),
		vscode.commands.registerCommand('sealpad.signOut', async () => {
			const sessions = await authProvider.getSessions();
			for (const s of sessions) {
				await authProvider.removeSession(s.id);
			}
		}),
		vscode.commands.registerCommand('sealpad.openDM', () => {
			vscode.window.showInformationMessage('Sealpad: DMs coming in Phase 2');
		}),
		vscode.commands.registerCommand('sealpad.createExpiringLink', () => {
			vscode.window.showInformationMessage('Sealpad: Expiring links coming in Phase 4');
		})
	);

	// Restore session state on startup
	const existing = await authProvider.getSessions();
	await vscode.commands.executeCommand('setContext', 'sealpad.authenticated', existing.length > 0);
}

export function deactivate(): void {}
