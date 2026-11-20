ALTER TABLE `drive_holds` ADD `phone_key` text;--> statement-breakpoint
ALTER TABLE `drive_holds` ADD `email_key` text;--> statement-breakpoint
CREATE UNIQUE INDEX `drive_holds_phone_car_unique` ON `drive_holds` (`phone_key`,`car_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `drive_holds_email_car_unique` ON `drive_holds` (`email_key`,`car_id`);