-- MealOrder: lifecycle and proxy-order tracking
ALTER TABLE `meal_orders`
  ADD COLUMN `provisional_quantity` INT NULL AFTER `quantity`,
  ADD COLUMN `confirmed_at` DATETIME(3) NULL AFTER `status`,
  ADD COLUMN `ordered_by_type` VARCHAR(20) NULL AFTER `confirmed_at`,
  ADD COLUMN `ordered_by_id` BIGINT UNSIGNED NULL AFTER `ordered_by_type`;

-- OrderChangeLog: reason and actor type
ALTER TABLE `order_change_logs`
  ADD COLUMN `reason` VARCHAR(255) NULL AFTER `after_value`,
  ADD COLUMN `changed_by_type` VARCHAR(20) NULL AFTER `changed_by`;

-- Announcement: targeting and display
ALTER TABLE `announcements`
  ADD COLUMN `severity` VARCHAR(20) NOT NULL DEFAULT 'info' AFTER `category`,
  ADD COLUMN `is_pinned` BOOLEAN NOT NULL DEFAULT false AFTER `severity`,
  ADD COLUMN `target_scope_type` VARCHAR(20) NOT NULL DEFAULT 'all' AFTER `audience`,
  ADD COLUMN `target_scope_id` BIGINT UNSIGNED NULL AFTER `target_scope_type`;

-- Announcement reads
CREATE TABLE `announcement_reads` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `announcement_id` BIGINT UNSIGNED NOT NULL,
  `reader_type` VARCHAR(20) NOT NULL,
  `reader_id` BIGINT UNSIGNED NOT NULL,
  `read_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `announcement_reads_announcement_id_reader_type_reader_id_key`(`announcement_id`, `reader_type`, `reader_id`),
  INDEX `announcement_reads_reader_type_reader_id_idx`(`reader_type`, `reader_id`),
  CONSTRAINT `announcement_reads_announcement_id_fkey` FOREIGN KEY (`announcement_id`) REFERENCES `announcements`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Long holidays (facility or global)
CREATE TABLE `long_holidays` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `customer_id` BIGINT UNSIGNED NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `reason` VARCHAR(255) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `long_holidays_customer_id_start_date_end_date_idx`(`customer_id`, `start_date`, `end_date`),
  CONSTRAINT `long_holidays_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Order alert handling status
CREATE TABLE `order_alert_statuses` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `customer_id` BIGINT UNSIGNED NOT NULL,
  `service_date` DATE NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'unhandled',
  `handled_by` BIGINT UNSIGNED NULL,
  `handled_at` DATETIME(3) NULL,
  `note` VARCHAR(500) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `order_alert_statuses_customer_id_service_date_key`(`customer_id`, `service_date`),
  INDEX `order_alert_statuses_status_idx`(`status`),
  CONSTRAINT `order_alert_statuses_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Notifications: facility user targeting
ALTER TABLE `notifications`
  ADD COLUMN `customer_user_id` BIGINT UNSIGNED NULL AFTER `user_id`,
  ADD INDEX `notifications_customer_user_id_is_read_idx`(`customer_user_id`, `is_read`);
