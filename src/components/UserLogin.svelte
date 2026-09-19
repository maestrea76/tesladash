<script lang="ts">
	import {
		decryptProfile,
		dummyKdf,
		normalizeUser,
		profileId,
		type Envelope,
		type ProfilePayload,
	} from '../lib/profile-crypto';

	let { base = '' }: { base?: string } = $props();

	const SESSION_KEY = 'tesdash-profile-session';

	let open = $state(false);
	let user = $state('');
	let password = $state('');
	let busy = $state(false);
	let error = $state('');
	let sessionUser = $state('');

	function emit(payload: ProfilePayload | null) {
		window.dispatchEvent(new CustomEvent('tesdash:profile', { detail: payload }));
	}

	$effect(() => {
		try {
			const raw = sessionStorage.getItem(SESSION_KEY);
			if (!raw) return;
			const payload = JSON.parse(raw) as ProfilePayload;
			if (payload?.user && payload.categories) {
				sessionUser = payload.user;
				emit(payload);
			}
		} catch {}
	});

	async function unlock() {
		error = '';
		const u = normalizeUser(user);
		if (u.length < 2 || password.length < 1) {
			error = 'usuario o contraseña incorrectos';
			return;
		}
		busy = true;
		try {
			const id = await profileId(u);
			const res = await fetch(`${base}/users/${id}.enc`, { cache: 'no-store' });
			if (!res.ok) {
				await dummyKdf(password);
				error = 'usuario o contraseña incorrectos';
				return;
			}
			const env = (await res.json()) as Envelope;
			const payload = await decryptProfile(u, password, env);
			sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
			sessionUser = payload.user;
			password = '';
			open = false;
			emit(payload);
		} catch {
			error = 'usuario o contraseña incorrectos';
		} finally {
			busy = false;
		}
	}

	function logout() {
		sessionStorage.removeItem(SESSION_KEY);
		sessionUser = '';
		user = '';
		password = '';
		emit(null);
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Enter' && !busy) unlock();
	}
</script>

{#if sessionUser}
	<button class="header-btn profile-btn" type="button" onclick={logout} title="Cerrar sesión">
		{sessionUser}
	</button>
{:else}
	<button class="header-btn profile-btn" type="button" onclick={() => (open = true)} title="Perfil">
		Perfil
	</button>
{/if}

{#if open}
	<div class="overlay" role="dialog" aria-modal="true" aria-labelledby="profile-title">
		<div class="box">
			<button class="close" type="button" onclick={() => (open = false)} aria-label="Cerrar">&times;</button>
			<h2 id="profile-title" class="title">Perfil</h2>
			<p class="hint">Apps privadas cifradas. Nadie las ve en el dash público.</p>
			<label class="lab" for="profile-user">Usuario</label>
			<input id="profile-user" class="inp" autocomplete="username" bind:value={user} onkeydown={onKey} />
			<label class="lab" for="profile-pass">Contraseña</label>
			<input
				id="profile-pass"
				class="inp"
				type="password"
				autocomplete="current-password"
				bind:value={password}
				onkeydown={onKey}
			/>
			{#if error}
				<p class="err">{error}</p>
			{/if}
			<button class="go" type="button" onclick={unlock} disabled={busy}>
				{busy ? 'Comprobando…' : 'Entrar'}
			</button>
		</div>
	</div>
{/if}

<style>
	.profile-btn {
		font-family: inherit;
		text-transform: none;
		letter-spacing: 0.02em;
	}

	.overlay {
		position: fixed;
		inset: 0;
		z-index: 80;
		background: rgba(0, 0, 0, 0.55);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}

	.box {
		position: relative;
		width: min(26rem, 100%);
		background: var(--surface, #1a1a1f);
		border: 1px solid var(--border, #333);
		border-radius: 1rem;
		padding: 1.4rem 1.3rem 1.2rem;
		color: var(--text, #eee);
	}

	.close {
		position: absolute;
		top: 0.6rem;
		right: 0.8rem;
		background: none;
		border: 0;
		color: var(--muted, #888);
		font-size: 1.6rem;
		cursor: pointer;
	}

	.title {
		margin: 0 0 0.35rem;
		font-size: 1.15rem;
	}

	.hint {
		margin: 0 0 1rem;
		font-size: 0.8rem;
		color: var(--muted, #888);
	}

	.lab {
		display: block;
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--muted, #888);
		margin: 0.7rem 0 0.3rem;
	}

	.inp {
		width: 100%;
		box-sizing: border-box;
		font: inherit;
		font-size: 1.05rem;
		padding: 0.7rem 0.8rem;
		border-radius: 0.6rem;
		border: 1px solid var(--border, #444);
		background: var(--bg, #111);
		color: inherit;
	}

	.err {
		margin: 0.7rem 0 0;
		color: #f87171;
		font-size: 0.85rem;
	}

	.go {
		margin-top: 1rem;
		width: 100%;
		font: inherit;
		font-weight: 650;
		padding: 0.8rem;
		border: 0;
		border-radius: 0.6rem;
		background: var(--red, #cc0000);
		color: #fff;
		cursor: pointer;
	}

	.go:disabled {
		opacity: 0.65;
		cursor: wait;
	}
</style>
