CREATE TABLE `outing_templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`channel_id` text,
	`weekday` integer,
	`time` text,
	`roster_id` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`roster_id`) REFERENCES `rosters`(`id`) ON UPDATE no action ON DELETE set null
);
