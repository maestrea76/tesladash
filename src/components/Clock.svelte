<script lang="ts">
	let locale = $state('en');
	let time = $state('--:--');
	let date = $state('');
	let zoom = $state(80);

	const ZOOM_KEY = 'tesdash-zoom';
	const ZOOM_MIN = 50, ZOOM_MAX = 200, ZOOM_STEP = 10;
	const clampZoom = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));

	function applyZoom(z: number) {
		const zc = clampZoom(z);
		zoom = zc;
		document.documentElement.style.setProperty('zoom', String(zc / 100));
		try { localStorage.setItem(ZOOM_KEY, String(zc)); } catch {}
	}
	const zoomIn = () => applyZoom(zoom + ZOOM_STEP);
	const zoomOut = () => applyZoom(zoom - ZOOM_STEP);

	$effect(() => {
		// Init zoom from localStorage (client-only)
		let saved = 80;
		try {
			const r = parseInt(localStorage.getItem(ZOOM_KEY) || '80', 10);
			if (!Number.isNaN(r)) saved = r;
		} catch {}
		applyZoom(saved);
	});

	$effect(() => {
		// Charger cards (Google Maps searches) → open centered on the user's live GPS location.
		// Falls back to the plain search if GPS is unavailable or the user denies permission.
		const MAPS_SEARCH_RE = /\/maps\/search\//;
		const HAS_COORDS_RE = /\/@-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?/;

		const onClick = (e: MouseEvent) => {
			if (e.defaultPrevented || e.button !== 0) return;
			if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
			const el = e.target as HTMLElement;
			if (el.closest('.card-menu')) return; // edit button, handled elsewhere
			const card = el.closest('a.card') as HTMLAnchorElement | null;
			if (!card) return;
			const href = card.href;
			if (!MAPS_SEARCH_RE.test(href) || HAS_COORDS_RE.test(href)) return;
			if (!('geolocation' in navigator)) return; // let the plain search open

			e.preventDefault();
			// Open the tab synchronously to keep the user gesture (avoids popup blocking),
			// then redirect it once we have the coordinates.
			const win = window.open('', '_blank');
			if (win) {
				try {
					win.document.write('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Localizando…</title><body style="margin:0;height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;background:#111;color:#eee"><p>📍 Localizando…</p></body>');
				} catch {}
			}
			const base = href.replace(/\/+$/, '');
			navigator.geolocation.getCurrentPosition(
				(pos) => {
					const { latitude, longitude } = pos.coords;
					const url = `${base}/@${latitude.toFixed(6)},${longitude.toFixed(6)},13z`;
					if (win) win.location.href = url; else window.open(url, '_blank');
				},
				() => {
					if (win) win.location.href = href; else window.open(href, '_blank');
				},
				{ enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
			);
		};

		document.addEventListener('click', onClick, true);
		return () => document.removeEventListener('click', onClick, true);
	});

	$effect(() => {
		// Init from localStorage (client-only)
		const saved = localStorage.getItem('tesdash-lang');
		locale = saved || navigator.language.split('-')[0] || 'en';

		const handler = (e: Event) => {
			const detail = (e as CustomEvent<{ lang: string }>).detail;
			if (detail?.lang) locale = detail.lang;
		};
		window.addEventListener('tesdash:langchange', handler);
		return () => window.removeEventListener('tesdash:langchange', handler);
	});

	$effect(() => {
		const currentLocale = locale;
		const update = () => {
			const d = new Date();
			time = d.toLocaleTimeString(currentLocale, { hour: '2-digit', minute: '2-digit', hour12: false });
			date = d.toLocaleDateString(currentLocale, { weekday: 'long', day: 'numeric', month: 'long' });
		};
		update();
		const interval = setInterval(update, 1000);
		return () => clearInterval(interval);
	});
</script>

<div class="clock-wrap">
	<div class="zoom-control" title="Zoom">
		<button class="zoom-btn" type="button" aria-label="Zoom out" onclick={zoomOut}>&#8722;</button>
		<span class="zoom-value">{zoom}%</span>
		<button class="zoom-btn" type="button" aria-label="Zoom in" onclick={zoomIn}>+</button>
	</div>
	<div class="clock">
		<p class="time">{time}</p>
		<p class="date">{date}</p>
	</div>
</div>

<style>
	.clock-wrap {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.5rem;
	}

	.zoom-control {
		display: inline-flex;
		align-items: center;
		gap: 0.1rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 999px;
		padding: 0.2rem 0.3rem;
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
	}

	.zoom-btn {
		font-family: inherit;
		font-size: 1.05rem;
		font-weight: 600;
		line-height: 1;
		width: 1.7rem;
		height: 1.7rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border: none;
		background: transparent;
		color: var(--muted);
		cursor: pointer;
		border-radius: 999px;
		transition: color 150ms ease, background 150ms ease, transform 150ms ease;
	}

	.zoom-btn:hover {
		color: var(--text);
		background: var(--border);
	}

	.zoom-btn:active { transform: scale(0.9); }

	.zoom-value {
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.03em;
		color: var(--text);
		min-width: 2.7rem;
		text-align: center;
		font-variant-numeric: tabular-nums;
		user-select: none;
	}

	.clock {
		text-align: right;
	}

	.time {
		font-size: 2.8rem;
		font-weight: 700;
		color: var(--text);
		font-variant-numeric: tabular-nums;
		letter-spacing: 0.05em;
		line-height: 1;
	}

	.date {
		font-size: 1.05rem;
		color: var(--text);
		opacity: 0.75;
		text-transform: capitalize;
		margin-top: 0.25rem;
		letter-spacing: 0.05em;
	}
</style>
