CREATE TABLE `leads` (
	`id` text PRIMARY KEY NOT NULL,
	`client_ref` text NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`car_id` text,
	`car_slug` text,
	`car_title` text,
	`car_price_eur` integer,
	`source_path` text NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`email` text,
	`message` text,
	`details` text DEFAULT '{}' NOT NULL,
	`photo_keys` text DEFAULT '[]' NOT NULL,
	`consent_at` integer NOT NULL,
	`consent_version` text NOT NULL,
	`notified_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `leads_client_ref_unique` ON `leads` (`client_ref`);--> statement-breakpoint
CREATE INDEX `leads_created_idx` ON `leads` (`created_at`);