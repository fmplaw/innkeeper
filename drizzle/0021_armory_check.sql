ALTER TABLE `characters` ADD `armory_status` text;--> statement-breakpoint
ALTER TABLE `characters` ADD `armory_checked_at` integer;--> statement-breakpoint
ALTER TABLE `characters` ADD `declared_new` integer DEFAULT false NOT NULL;