import { describe, expect, it } from 'vitest';
import { ROLES } from '$lib/roles';
import { CLASSES, PROFESSIONS, RACES, RAID_HELPER, racesFor } from './forever';

const classIds = CLASSES.map((c) => c.id);

describe('données de jeu Forever', () => {
	it('chaque race ne propose que des classes existantes', () => {
		for (const race of RACES) for (const c of race.classes) expect(classIds, `${race.id} → ${c}`).toContain(c);
	});

	it('chaque classe est jouable par au moins une race de chaque faction', () => {
		for (const c of classIds) {
			expect(RACES.some((r) => r.faction === 'horde' && r.classes.includes(c)), `${c} côté Horde`).toBe(true);
			expect(RACES.some((r) => r.faction === 'alliance' && r.classes.includes(c)), `${c} côté Alliance`).toBe(true);
		}
	});

	it('respecte les combinaisons annoncées pour Forever', () => {
		const race = (id: string) => RACES.find((r) => r.id === id)!;
		expect(race('undead').classes).toContain('paladin');
		expect(race('dwarf').classes).toContain('shaman');
		expect(race('tauren').classes).not.toContain('mage');
		for (const id of ['skyborne-horde', 'skyborne-alliance']) {
			for (const c of ['paladin', 'priest', 'warlock']) expect(race(id).classes).not.toContain(c);
		}
		expect(race('skyborne-horde').classes).toContain('shaman');
		expect(race('skyborne-alliance').classes).toContain('mage');
	});

	it('chaque spé a au moins un rôle valide, et les identifiants sont uniques', () => {
		for (const c of CLASSES) {
			expect(new Set(c.specs.map((s) => s.id)).size).toBe(c.specs.length);
			for (const s of c.specs) {
				expect(s.roles.length).toBeGreaterThan(0);
				for (const r of s.roles) expect(ROLES).toContain(r);
			}
		}
		expect(new Set(RACES.map((r) => r.id)).size).toBe(RACES.length);
		expect(new Set(PROFESSIONS.map((p) => p.id)).size).toBe(PROFESSIONS.length);
	});

	it('la correspondance Raid-Helper pointe vers des classes et spés existantes', () => {
		for (const [rh, target] of Object.entries(RAID_HELPER.specs)) {
			const gameClass = CLASSES.find((c) => c.id === target.class);
			expect(gameClass, rh).toBeDefined();
			if (target.spec) expect(gameClass!.specs.map((s) => s.id), rh).toContain(target.spec);
		}
		for (const role of Object.values(RAID_HELPER.roles)) expect(ROLES).toContain(role);
	});

	it('filtre les races selon la faction de la guilde', () => {
		expect(racesFor('horde').every((r) => r.faction === 'horde')).toBe(true);
		expect(racesFor('alliance').every((r) => r.faction === 'alliance')).toBe(true);
		expect(racesFor('both')).toHaveLength(RACES.length);
	});
});
