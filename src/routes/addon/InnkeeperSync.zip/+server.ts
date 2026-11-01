import lua from '../../../../addon/InnkeeperSync/InnkeeperSync.lua?raw';
import toc from '../../../../addon/InnkeeperSync/InnkeeperSync.toc?raw';
import tocForever from '../../../../addon/InnkeeperSync/InnkeeperSync_Camelot.toc?raw';
import { zip } from '$lib/server/zip';

// L'addon d'export, à décompresser dans World of Warcraft/_retail_ (ou le dossier de Forever)/Interface/AddOns.
const archive = zip([
	{ path: 'InnkeeperSync/InnkeeperSync.toc', content: toc },
	// Variante chargée par Forever (type de jeu « Camelot »), identique à la première.
	{ path: 'InnkeeperSync/InnkeeperSync_Camelot.toc', content: tocForever },
	{ path: 'InnkeeperSync/InnkeeperSync.lua', content: lua }
]);

export const GET = () =>
	new Response(new Uint8Array(archive), {
		headers: {
			'Content-Type': 'application/zip',
			'Content-Disposition': 'attachment; filename="InnkeeperSync.zip"',
			'Cache-Control': 'no-cache'
		}
	});
