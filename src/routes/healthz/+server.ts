import { sql } from 'drizzle-orm';
import { db } from '$lib/server/db';

export function GET() {
	db().run(sql`select 1`);
	return new Response('ok');
}
