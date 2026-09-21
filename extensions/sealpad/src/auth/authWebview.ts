import * as vscode from 'vscode';
import type { Session } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabaseClient';

export function showSignInWebview(): Promise<Session> {
	return new Promise((resolve, reject) => {
		const panel = vscode.window.createWebviewPanel(
			'sealpadSignIn',
			'Sign in to Sealpad',
			vscode.ViewColumn.Active,
			{ enableScripts: true, retainContextWhenHidden: false }
		);

		panel.webview.html = getSignInHtml();

		panel.webview.onDidReceiveMessage(async (msg: { command: string; email: string; password: string }) => {
			if (msg.command === 'signIn') {
				const { data, error } = await getSupabaseClient().auth.signInWithPassword({
					email: msg.email,
					password: msg.password,
				});
				if (error || !data.session) {
					panel.webview.postMessage({ command: 'error', message: error?.message ?? 'Sign-in failed' });
					return;
				}
				panel.dispose();
				resolve(data.session);
			} else if (msg.command === 'signUp') {
				const { error } = await getSupabaseClient().auth.signUp({
					email: msg.email,
					password: msg.password,
				});
				if (error) {
					panel.webview.postMessage({ command: 'error', message: error.message });
					return;
				}
				panel.webview.postMessage({ command: 'checkEmail' });
			}
		});

		panel.onDidDispose(() => reject(new Error('Sign-in cancelled')));
	});
}

function getSignInHtml(): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline';">
  <title>Sign in to Sealpad</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .card {
      width: 340px;
      padding: 32px;
      background: var(--vscode-sideBar-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 12px;
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 24px;
    }
    .logo svg { width: 32px; height: 32px; }
    .logo h1 { font-size: 18px; font-weight: 600; }
    label {
      display: block;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 4px;
    }
    input {
      width: 100%;
      padding: 8px 10px;
      margin-bottom: 14px;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border, transparent);
      border-radius: 6px;
      font-family: inherit;
      font-size: inherit;
    }
    input:focus { outline: 1px solid var(--vscode-focusBorder); border-color: var(--vscode-focusBorder); }
    .btn {
      width: 100%;
      padding: 9px;
      border: none;
      border-radius: 6px;
      font-family: inherit;
      font-size: inherit;
      cursor: pointer;
      margin-bottom: 8px;
      font-weight: 500;
    }
    .btn-primary {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }
    .btn-primary:hover { background: var(--vscode-button-hoverBackground); }
    .btn-secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    .btn-secondary:hover { background: var(--vscode-button-secondaryHoverBackground); }
    .msg {
      font-size: 12px;
      margin-top: 10px;
      min-height: 18px;
      text-align: center;
    }
    .msg.error { color: var(--vscode-errorForeground); }
    .msg.info { color: var(--vscode-notificationsInfoIcon-foreground); }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">
      <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="32" rx="8" fill="url(#g)"/>
        <path d="M16 7C13.24 7 11 9.24 11 12v2H9.5A1.5 1.5 0 008 15.5v8A1.5 1.5 0 009.5 25h13a1.5 1.5 0 001.5-1.5v-8A1.5 1.5 0 0022.5 14H21v-2c0-2.76-2.24-5-5-5zm0 2c1.65 0 3 1.35 3 3v2h-6v-2c0-1.65 1.35-3 3-3zm0 8a2 2 0 110 4 2 2 0 010-4z" fill="white"/>
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop stop-color="#5E17EB"/>
            <stop offset="1" stop-color="#00B4D8"/>
          </linearGradient>
        </defs>
      </svg>
      <h1>Sealpad</h1>
    </div>
    <label for="email">Email</label>
    <input id="email" type="email" placeholder="you@example.com" autocomplete="email">
    <label for="password">Password</label>
    <input id="password" type="password" placeholder="••••••••" autocomplete="current-password">
    <button class="btn btn-primary" onclick="signIn()">Sign In</button>
    <button class="btn btn-secondary" onclick="signUp()">Create Account</button>
    <div id="msg" class="msg"></div>
  </div>
  <script>
    const vscode = acquireVsCodeApi();
    const msg = document.getElementById('msg');
    document.addEventListener('keydown', e => { if (e.key === 'Enter') signIn(); });
    function signIn() {
      msg.textContent = '';
      vscode.postMessage({ command: 'signIn',
        email: document.getElementById('email').value,
        password: document.getElementById('password').value });
    }
    function signUp() {
      msg.textContent = '';
      vscode.postMessage({ command: 'signUp',
        email: document.getElementById('email').value,
        password: document.getElementById('password').value });
    }
    window.addEventListener('message', e => {
      if (e.data.command === 'error') {
        msg.className = 'msg error';
        msg.textContent = e.data.message;
      } else if (e.data.command === 'checkEmail') {
        msg.className = 'msg info';
        msg.textContent = 'Check your email to confirm your account.';
      }
    });
  </script>
</body>
</html>`;
}
