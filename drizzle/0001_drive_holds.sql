CREATE TABLE `drive_holds` (
	`lead_id` text PRIMARY KEY NOT NULL,
	`car_id` text NOT NULL,
	`starts_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `drive_holds_car_time_unique` ON `drive_holds` (`car_id`,`starts_at`);