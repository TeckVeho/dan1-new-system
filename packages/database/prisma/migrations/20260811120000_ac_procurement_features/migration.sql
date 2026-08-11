-- A+C 実装: 原体フラグ・ピッキング出力先・袋設計

ALTER TABLE `stock_items`
  ADD COLUMN `is_raw_material` BOOLEAN NOT NULL DEFAULT false AFTER `unit`;

CREATE INDEX `stock_items_is_raw_material_idx` ON `stock_items`(`is_raw_material`);

CREATE TABLE `picking_destination_rules` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `stock_item_id` BIGINT UNSIGNED NOT NULL,
  `destination` VARCHAR(50) NOT NULL,
  `note` VARCHAR(255) NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `picking_destination_rules_stock_item_id_key`(`stock_item_id`),
  CONSTRAINT `picking_destination_rules_stock_item_id_fkey`
    FOREIGN KEY (`stock_item_id`) REFERENCES `stock_items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `bag_designs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `customer_id` BIGINT UNSIGNED NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `facility_number` INT NULL,
  `max_units` INT NOT NULL DEFAULT 4,
  `max_meals` INT NOT NULL DEFAULT 20,
  `sort_order` INT NOT NULL DEFAULT 0,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `deleted_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `bag_designs_customer_id_idx`(`customer_id`),
  CONSTRAINT `bag_designs_customer_id_fkey`
    FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `bag_design_units` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `bag_design_id` BIGINT UNSIGNED NOT NULL,
  `unit_id` BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `bag_design_units_bag_design_id_unit_id_key`(`bag_design_id`, `unit_id`),
  CONSTRAINT `bag_design_units_bag_design_id_fkey`
    FOREIGN KEY (`bag_design_id`) REFERENCES `bag_designs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `bag_design_units_unit_id_fkey`
    FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
