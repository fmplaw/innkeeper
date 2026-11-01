import { redirect } from '@sveltejs/kit';
import { signOut } from '../../auth';
import { demoEnabled, leaveDemo } from '$lib/server/demo';
import type { Actions } from './$types';

export const actions: Actions = {
	default: (event) => {
		if (!demoEnabled()) return signOut(event);
		leaveDemo(event.cookies);
		redirect(303, '/connexion');
	}
};
