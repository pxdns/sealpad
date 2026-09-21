import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Public anon key — safe to commit. Row-level security on the server restricts data access.
const SUPABASE_URL = process.env['SEALPAD_SUPABASE_URL'] ?? 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = process.env['SEALPAD_SUPABASE_ANON_KEY'] ?? 'YOUR_ANON_KEY';

let _client: SupabaseClient | undefined;

export function getSupabaseClient(): SupabaseClient {
	if (!_client) {
		_client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
			auth: {
				storage: undefined,
				autoRefreshToken: false,
				persistSession: false,
			},
		});
	}
	return _client;
}

export function resetSupabaseClient(): void {
	_client = undefined;
}
