ALTER TABLE `account` MODIFY COLUMN `account_id` varchar(191) NOT NULL;--> statement-breakpoint
ALTER TABLE `account` ADD `issuer` varchar(191) NOT NULL;--> statement-breakpoint
ALTER TABLE `account` ADD CONSTRAINT `account_issuer_accountId_uidx` UNIQUE(`issuer`,`account_id`);