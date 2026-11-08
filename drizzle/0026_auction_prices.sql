CREATE TABLE `auction_prices` (
	`item_id` integer PRIMARY KEY NOT NULL,
	`unit_price` integer NOT NULL,
	`min_price` integer NOT NULL,
	`quantity` integer NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
