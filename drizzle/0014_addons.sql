CREATE TABLE `addons` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`importance` text NOT NULL,
	`usage` text NOT NULL,
	`classes` text DEFAULT '[]' NOT NULL,
	`roles` text DEFAULT '[]' NOT NULL,
	`description` text,
	`curseforge_url` text,
	`wago_url` text,
	`other_url` text,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
