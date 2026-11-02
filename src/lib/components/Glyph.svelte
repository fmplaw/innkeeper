<script lang="ts" module>
	// Une seule famille d'icônes pour tout le site.
	import {
		ArrowLeft, ArrowRight, ArrowUpDown, Beer, BookOpen, Calendar, Check, ChartColumn, ChevronDown, ChevronRight, CircleAlert, Clipboard, ClipboardList,
		Copy, Cross, Crosshair, Download, Drama, Eye, EyeOff, ExternalLink, FileText, Flame, Hash, House, Inbox, Info, KeyRound, ListChecks, Lock, LogIn,
		LogOut, Menu, MessageCircle, MoreHorizontal, Package, Palette, Pencil, Plug, Plus, Puzzle, RefreshCw, ScrollText, Search, Settings2, Shield,
		Sparkles, Star, Swords, ThumbsDown, ThumbsUp, Trash2, TriangleAlert, Upload, User, UserCheck, UserPlus, Users, X
	} from '@lucide/svelte';

	const ICONS = {
		'arrow-left': ArrowLeft, 'arrow-right': ArrowRight, sort: ArrowUpDown, beer: Beer, book: BookOpen, calendar: Calendar, check: Check,
		chart: ChartColumn, 'chevron-down': ChevronDown, 'chevron-right': ChevronRight, alert: CircleAlert, clipboard: Clipboard, list: ClipboardList,
		copy: Copy, cross: Cross, crosshair: Crosshair, download: Download, drama: Drama, eye: Eye, 'eye-off': EyeOff, external: ExternalLink, file: FileText,
		flame: Flame, hash: Hash, home: House, inbox: Inbox, info: Info, key: KeyRound, checks: ListChecks, lock: Lock, login: LogIn, logout: LogOut,
		menu: Menu, message: MessageCircle, more: MoreHorizontal, package: Package, palette: Palette, pencil: Pencil, plug: Plug, plus: Plus, puzzle: Puzzle,
		refresh: RefreshCw, scroll: ScrollText, search: Search, settings: Settings2, shield: Shield, sparkles: Sparkles, star: Star, swords: Swords,
		'thumbs-down': ThumbsDown, 'thumbs-up': ThumbsUp, trash: Trash2, warning: TriangleAlert, upload: Upload, user: User, 'user-check': UserCheck,
		'user-plus': UserPlus, users: Users, x: X
	} as const;

	export type GlyphName = keyof typeof ICONS;
</script>

<script lang="ts">
	let { name, size = 18 }: { name: GlyphName; size?: number } = $props();
	const Icon = $derived(ICONS[name]);
</script>

<Icon {size} strokeWidth={1.75} aria-hidden="true" />
