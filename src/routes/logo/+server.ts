import { serveUpload } from '$lib/server/guild-form';
import { getGuild } from '$lib/server/settings';

export const GET = () => serveUpload(getGuild()?.logo);
