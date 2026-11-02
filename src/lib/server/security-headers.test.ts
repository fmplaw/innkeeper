import { describe, expect, it } from 'vitest';
import { withSecurityHeaders } from './security-headers';

describe('en-têtes de sécurité', () => {
	it('interdit l’intégration dans une autre page et le reniflage des types', () => {
		const res = withSecurityHeaders(new Response('ok', { headers: { 'Content-Type': 'text/html' } }));
		expect(res.headers.get('X-Frame-Options')).toBe('DENY');
		expect(res.headers.get('Content-Security-Policy')).toBe("frame-ancestors 'none'");
		expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
		expect(res.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
		expect(res.headers.get('Content-Type')).toBe('text/html');
	});

	it('fonctionne aussi sur une redirection aux en-têtes figés (Response.redirect)', async () => {
		const res = withSecurityHeaders(Response.redirect('https://discord.com/oauth2/authorize', 302));
		expect(res.status).toBe(302);
		expect(res.headers.get('Location')).toBe('https://discord.com/oauth2/authorize');
		expect(res.headers.get('X-Frame-Options')).toBe('DENY');
	});

	it('impose HTTPS au navigateur (HSTS) seulement quand le site est servi en HTTPS', () => {
		const https = withSecurityHeaders(new Response('ok'), { https: true });
		expect(https.headers.get('Strict-Transport-Security')).toBe('max-age=31536000');
		const http = withSecurityHeaders(new Response('ok'), { https: false });
		expect(http.headers.has('Strict-Transport-Security')).toBe(false);
		expect(withSecurityHeaders(new Response('ok')).headers.has('Strict-Transport-Security')).toBe(false);
	});

	it('ajoute HSTS aussi sur une redirection aux en-têtes figés', () => {
		const res = withSecurityHeaders(Response.redirect('https://discord.com/oauth2/authorize', 302), { https: true });
		expect(res.headers.get('Strict-Transport-Security')).toBe('max-age=31536000');
	});

	it('garde une politique de contenu déjà posée', () => {
		const res = withSecurityHeaders(new Response('', { headers: { 'Content-Security-Policy': "default-src 'self'" } }));
		expect(res.headers.get('Content-Security-Policy')).toBe("default-src 'self'");
	});
});
