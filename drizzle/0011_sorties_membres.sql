CREATE TABLE `outings` (
	`event_id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`created_by` text,
	`title` text NOT NULL,
	`activity` text,
	`instance_id` text,
	`start_time` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `outings_created_by_idx` ON `outings` (`created_by`);