CREATE TABLE `application_votes` (
	`application_id` integer NOT NULL,
	`voter_id` text NOT NULL,
	`voter_name` text NOT NULL,
	`value` integer NOT NULL,
	`comment` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`application_id`, `voter_id`),
	FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `applications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`character` text NOT NULL,
	`answers` text NOT NULL,
	`decided_by` text,
	`decided_at` integer,
	`decision_message` text,
	`invite_url` text,
	`role_assigned_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`discord_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `applications_user_idx` ON `applications` (`user_id`);--> statement-breakpoint
CREATE INDEX `applications_status_idx` ON `applications` (`status`);