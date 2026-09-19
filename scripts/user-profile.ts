/**
 * Crea o actualiza un perfil cifrado en public/users/<id>.enc
 *
 *   bun run user:profile -- --user antonio --apps src/data/private-apps.yml
 *
 * Contraseña: env TESLADASH_PROFILE_PASSWORD (recomendado) o prompt.
 * El YAML en claro no se sube a git.
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import yaml from 'js-yaml';
import { encryptProfile, profileId, type ProfileApp } from '../src/lib/profile-crypto.ts';

type AppsFile = { categories: { name: string; apps: ProfileApp[] }[] };

function arg(name: string): string | undefined {
	const i = process.argv.indexOf(`--${name}`);
	if (i === -1) return undefined;
	return process.argv[i + 1];
}

async function readPassword(): Promise<string> {
	const fromEnv = process.env.TESLADASH_PROFILE_PASSWORD;
	if (fromEnv) return fromEnv;
	if (!input.isTTY) throw new Error('define TESLADASH_PROFILE_PASSWORD o ejecuta en una terminal');
	const rl = createInterface({ input, output });
	const a = await rl.question('Contraseña (mín. 16, no se muestra en git): ');
	const b = await rl.question('Repite la contraseña: ');
	rl.close();
	if (a !== b) throw new Error('las contraseñas no coinciden');
	return a;
}

const user = arg('user');
const appsPath = arg('apps') ?? join('src', 'data', 'private-apps.yml');
if (!user) {
	console.error('Uso: bun run user:profile -- --user <nombre> [--apps src/data/private-apps.yml]');
	process.exit(1);
}

const raw = readFileSync(appsPath, 'utf-8');
const doc = yaml.load(raw) as AppsFile;
if (!doc || !Array.isArray(doc.categories)) throw new Error(`${appsPath} no tiene categories`);

const password = await readPassword();
const env = await encryptProfile(user, password, { categories: doc.categories });
const id = await profileId(user);
const out = join('public', 'users', `${id}.enc`);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(env), 'utf-8');
console.log(`Perfil cifrado: ${out}`);
console.log('Siguiente: git add public/users && git commit && git push');
console.log('No subas el YAML en claro ni la contraseña.');
