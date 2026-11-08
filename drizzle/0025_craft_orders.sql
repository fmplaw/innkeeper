CREATE TABLE `craft_orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`requester_id` text NOT NULL,
	`profession` text NOT NULL,
	`recipe_id` integer NOT NULL,
	`recipe_name` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`materials` integer DEFAULT false NOT NULL,
	`comment` text,
	`commission` integer,
	`budget` integer,
	`price` integer,
	`quoted_by` text,
	`artisan_id` text,
	`status` text DEFAULT 'open' NOT NULL,
	`taken_by` text,
	`closed_note` text,
	`discord_channel_id` text,
	`discord_message_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`closed_at` integer,
	FOREIGN KEY (`requester_id`) REFERENCES `users`(`discord_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`quoted_by`) REFERENCES `users`(`discord_id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`artisan_id`) REFERENCES `users`(`discord_id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`taken_by`) REFERENCES `users`(`discord_id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `craft_orders_status_idx` ON `craft_orders` (`status`);--> statement-breakpoint
CREATE INDEX `craft_orders_requester_idx` ON `craft_orders` (`requester_id`);--> statement-breakpoint
ALTER TABLE `users` ADD `craft_alerts` integer DEFAULT false NOT NULL;