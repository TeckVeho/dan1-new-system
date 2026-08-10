-- Diet types (食種) master
CREATE TABLE `diet_types` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(20) NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `deleted_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `diet_types_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `diet_types` (`code`, `name`, `sort_order`, `is_active`, `updated_at`) VALUES
    ('normal', '常食', 1, true, NOW(3)),
    ('light_taste', '薄味', 2, true, NOW(3)),
    ('no_soup', '汁無し', 3, true, NOW(3)),
    ('swallow', '嚥下食', 4, true, NOW(3));

-- Document output rules: meal_type_code -> diet_type_code
ALTER TABLE `document_output_rules` DROP INDEX `document_output_rules_meal_type_code_document_type_key`;

ALTER TABLE `document_output_rules`
    CHANGE COLUMN `meal_type_code` `diet_type_code` VARCHAR(20) NOT NULL;

UPDATE `document_output_rules` SET `diet_type_code` = 'normal' WHERE `diet_type_code` IN ('breakfast', 'lunch', 'dinner');

ALTER TABLE `document_output_rules`
    ADD COLUMN `valid_from` DATE NOT NULL DEFAULT '2020-01-01' AFTER `sort_order`,
    ADD COLUMN `valid_to` DATE NULL AFTER `valid_from`;

ALTER TABLE `document_output_rules`
    ADD UNIQUE INDEX `dor_diet_doc_from_key`(`diet_type_code`, `document_type`, `valid_from`),
    ADD CONSTRAINT `dor_diet_type_code_fkey` FOREIGN KEY (`diet_type_code`) REFERENCES `diet_types`(`code`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Menu template last used timestamp
ALTER TABLE `menu_templates` ADD COLUMN `last_used_at` DATETIME(3) NULL AFTER `use_count`;
