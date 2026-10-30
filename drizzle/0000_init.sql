CREATE TABLE `characters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`surname` text,
	`race` text,
	`class` text NOT NULL,
	`spec` text,
	`role` text NOT NULL,
	`is_main` integer DEFAULT false NOT NULL,
	`level` integer DEFAULT 1 NOT NULL,
	`professions` text DEFAULT '[]' NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`discord_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `characters_user_idx` ON `characters` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`discord_id` text PRIMARY KEY NOT NULL,
	`discord_username` text NOT NULL,
	`display_name` text NOT NULL,
	`avatar` text,
	`roles` text DEFAULT '[]' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`last_login` integer DEFAULT (unixepoch()) NOT NULL
);
