-- CreateTable
CREATE TABLE `meal_count_adjustments` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `customer_id` BIGINT UNSIGNED NOT NULL,
    `service_date` DATE NOT NULL,
    `meal_type_id` BIGINT UNSIGNED NOT NULL,
    `adjust_meals` INTEGER NOT NULL,
    `reason` VARCHAR(255) NULL,
    `version` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` BIGINT UNSIGNED NULL,
    `updated_by` BIGINT UNSIGNED NULL,

    UNIQUE INDEX `meal_count_adjustments_customer_id_service_date_meal_type_id_key`(`customer_id`, `service_date`, `meal_type_id`),
    INDEX `meal_count_adjustments_service_date_idx`(`service_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inquiry_threads` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `customer_id` BIGINT UNSIGNED NOT NULL,
    `subject` VARCHAR(200) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'open',
    `last_message_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_type` VARCHAR(20) NULL,
    `created_by_id` BIGINT UNSIGNED NULL,

    INDEX `inquiry_threads_customer_id_status_idx`(`customer_id`, `status`),
    INDEX `inquiry_threads_last_message_at_idx`(`last_message_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inquiry_messages` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `thread_id` BIGINT UNSIGNED NOT NULL,
    `sender_type` VARCHAR(20) NOT NULL,
    `sender_user_id` BIGINT UNSIGNED NULL,
    `body` TEXT NOT NULL,
    `read_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `inquiry_messages_thread_id_created_at_idx`(`thread_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `invoices` ADD COLUMN `pdf_file_id` BIGINT UNSIGNED NULL;

-- AddForeignKey
ALTER TABLE `meal_count_adjustments` ADD CONSTRAINT `meal_count_adjustments_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `meal_count_adjustments` ADD CONSTRAINT `meal_count_adjustments_meal_type_id_fkey` FOREIGN KEY (`meal_type_id`) REFERENCES `meal_types`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inquiry_threads` ADD CONSTRAINT `inquiry_threads_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inquiry_messages` ADD CONSTRAINT `inquiry_messages_thread_id_fkey` FOREIGN KEY (`thread_id`) REFERENCES `inquiry_threads`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_pdf_file_id_fkey` FOREIGN KEY (`pdf_file_id`) REFERENCES `files`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
