import * as vscode from 'vscode';
import type { Session } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabaseClient';
import { showSignInWebview } from './authWebview';

const SESSION_KEY = 'sealpad.auth.session';

export class SealpadAuthProvider implements vscode.AuthenticationProvider, vscode.Disposable {
	private readonly _onDidChangeSessions =
		new vscode.EventEmitter<vscode.AuthenticationProviderAuthenticationSessionsChangeEvent>();
	readonly onDidChangeSessions = this._onDidChangeSessions.event;

	constructor(private readonly secrets: vscode.SecretStorage) {}

	async getSessions(_scopes?: readonly string[]): Promise<vscode.AuthenticationSession[]> {
		const raw = await this.secrets.get(SESSION_KEY);
		if (!raw) { return []; }
		try {
			const session: Session = JSON.parse(raw);
			return [this._toVSCodeSession(session)];
		} catch {
			await this.secrets.delete(SESSION_KEY);
			return [];
		}
	}

	async createSession(_scopes: readonly string[]): Promise<vscode.AuthenticationSession> {
		const session = await showSignInWebview();
		await this.secrets.store(SESSION_KEY, JSON.stringify(session));
		const vsSession = this._toVSCodeSession(session);
		this._onDidChangeSessions.fire({ added: [vsSession], removed: [], changed: [] });
		vscode.commands.executeCommand('setContext', 'sealpad.authenticated', true);
		return vsSession;
	}

	async removeSession(sessionId: string): Promise<void> {
		await getSupabaseClient().auth.signOut();
		await this.secrets.delete(SESSION_KEY);
		this._onDidChangeSessions.fire({ added: [], removed: [{ id: sessionId } as vscode.AuthenticationSession], changed: [] });
		vscode.commands.executeCommand('setContext', 'sealpad.authenticated', false);
	}

	private _toVSCodeSession(s: Session): vscode.AuthenticationSession {
		return {
			id: s.user.id,
			accessToken: s.access_token,
			account: { id: s.user.id, label: s.user.email ?? s.user.id },
			scopes: [],
		};
	}

	dispose(): void {
		this._onDidChangeSessions.dispose();
	}
}
