-- CreateTable
CREATE TABLE `unit_prices` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `customer_id` BIGINT UNSIGNED NULL,
    `menu_kind_id` BIGINT UNSIGNED NOT NULL,
    `price` DECIMAL(12, 2) NOT NULL,
    `valid_from` DATE NOT NULL,
    `valid_to` DATE NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `unit_prices_customer_id_menu_kind_id_valid_from_idx`(`customer_id`, `menu_kind_id`, `valid_from`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tax_rates` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `rate` DECIMAL(5, 2) NOT NULL,
    `valid_from` DATE NOT NULL,
    `valid_to` DATE NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `tax_rates_valid_from_idx`(`valid_from`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `unit_prices` ADD CONSTRAINT `unit_prices_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `unit_prices` ADD CONSTRAINT `unit_prices_menu_kind_id_fkey` FOREIGN KEY (`menu_kind_id`) REFERENCES `menu_kinds`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
