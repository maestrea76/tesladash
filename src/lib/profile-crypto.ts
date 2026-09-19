/** Perfil de usuario cifrado: Argon2id + AES-256-GCM. El blob puede ser público; sin la contraseña no hay plaintext. */

export const PROFILE_VERSION = 1 as const;
export const KDF_NAME = 'argon2id' as const;

/** 32 MiB, 3 pases, 1 hilo. Coste alto para fuerza bruta GPU; asumible en el Tesla. */
export const ARGON2 = {
	parallelism: 1,
	iterations: 3,
	memorySize: 32_768,
	hashLength: 32,
} as const;

export type Envelope = {
	v: typeof PROFILE_VERSION;
	kdf: typeof KDF_NAME;
	kdfParams: typeof ARGON2;
	salt: string;
	iv: string;
	ct: string;
};

export type ProfileApp = {
	name: string;
	url: string;
	logo: string;
	color?: string;
	invert?: boolean;
	scale?: number;
};

export type ProfilePayload = {
	user: string;
	updatedAt: string;
	categories: { name: string; apps: ProfileApp[] }[];
};

export function normalizeUser(user: string): string {
	return user.normalize('NFKC').trim().toLowerCase();
}

export function assertStrongPassword(user: string, password: string): void {
	const n = normalizeUser(user);
	const p = password.normalize('NFKC');
	if (p.length < 16) throw new Error('la contraseña debe tener al menos 16 caracteres');
	if (n && p.toLowerCase().includes(n)) throw new Error('la contraseña no puede contener el usuario');
	if (/^(.)\1+$/.test(p)) throw new Error('la contraseña no puede ser un solo carácter repetido');
	const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(p)).length;
	if (p.length < 20 && classes < 3) {
		throw new Error('usa al menos 20 caracteres, o 16 con mayúsculas, minúsculas y números/símbolo');
	}
}

function b64(u8: Uint8Array): string {
	let s = '';
	for (const x of u8) s += String.fromCharCode(x);
	return btoa(s);
}

function unb64(s: string): Uint8Array {
	const bin = atob(s);
	const out = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
	return out;
}

function aadFor(userNorm: string): Uint8Array {
	return new TextEncoder().encode(`tesladash:v1:${userNorm}`);
}

export async function profileId(user: string): Promise<string> {
	const n = normalizeUser(user);
	const data = new TextEncoder().encode(`tesladash:v1:user:${n}`);
	const hash = await crypto.subtle.digest('SHA-256', data);
	return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

async function argon2Raw(
	password: string,
	salt: Uint8Array,
	params: { parallelism: number; iterations: number; memorySize: number; hashLength: number } = ARGON2,
): Promise<Uint8Array> {
	const { argon2id } = await import('hash-wasm');
	return argon2id({
		password,
		salt,
		parallelism: params.parallelism,
		iterations: params.iterations,
		memorySize: params.memorySize,
		hashLength: params.hashLength,
		outputType: 'binary',
	});
}

async function aesKey(raw: Uint8Array): Promise<CryptoKey> {
	return crypto.subtle.importKey('raw', raw as BufferSource, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encryptProfile(user: string, password: string, payload: Omit<ProfilePayload, 'user' | 'updatedAt'>): Promise<Envelope> {
	const n = normalizeUser(user);
	if (n.length < 2) throw new Error('usuario demasiado corto');
	assertStrongPassword(n, password);

	const salt = crypto.getRandomValues(new Uint8Array(16));
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const raw = await argon2Raw(password, salt);
	const key = await aesKey(raw);
	const body: ProfilePayload = { user: n, updatedAt: new Date().toISOString(), categories: payload.categories };
	const pt = new TextEncoder().encode(JSON.stringify(body));
	const ct = new Uint8Array(
		await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aadFor(n), tagLength: 128 }, key, pt),
	);
	return {
		v: PROFILE_VERSION,
		kdf: KDF_NAME,
		kdfParams: { ...ARGON2 },
		salt: b64(salt),
		iv: b64(iv),
		ct: b64(ct),
	};
}

export async function decryptProfile(user: string, password: string, env: Envelope): Promise<ProfilePayload> {
	const n = normalizeUser(user);
	if (env.v !== PROFILE_VERSION || env.kdf !== KDF_NAME) throw new Error('usuario o contraseña incorrectos');
	const params = env.kdfParams ?? ARGON2;
	const raw = await argon2Raw(password, unb64(env.salt), params);
	const key = await aesKey(raw);
	try {
		const pt = await crypto.subtle.decrypt(
			{ name: 'AES-GCM', iv: unb64(env.iv) as BufferSource, additionalData: aadFor(n), tagLength: 128 },
			key,
			unb64(env.ct) as BufferSource,
		);
		const payload = JSON.parse(new TextDecoder().decode(pt)) as ProfilePayload;
		if (normalizeUser(payload.user) !== n) throw new Error('mismatch');
		return payload;
	} catch {
		throw new Error('usuario o contraseña incorrectos');
	}
}

/** Iguala el tiempo de un 404 al de un descifrado fallido (no filtrar si el usuario existe). */
export async function dummyKdf(password: string): Promise<void> {
	await argon2Raw(password || 'x', new Uint8Array(16));
}
