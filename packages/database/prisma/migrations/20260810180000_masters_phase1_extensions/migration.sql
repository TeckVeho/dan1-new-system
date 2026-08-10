-- AlterTable: order_types
ALTER TABLE `order_types`
    ADD COLUMN `links_to_production_reports` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `links_to_sales` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable: long_holidays
ALTER TABLE `long_holidays`
    ADD COLUMN `name` VARCHAR(100) NULL;

-- AlterTable: production_patterns
ALTER TABLE `production_patterns`
    ADD COLUMN `pickup_offset_d0` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `pickup_offset_d1` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `pickup_offset_d2` INTEGER NOT NULL DEFAULT 2,
    ADD COLUMN `pickup_offset_d3` INTEGER NOT NULL DEFAULT 3,
    ADD COLUMN `arrival_offset_d1` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `arrival_offset_d2` INTEGER NOT NULL DEFAULT 2,
    ADD COLUMN `arrival_offset_d3` INTEGER NOT NULL DEFAULT 3,
    ADD COLUMN `carrier_code` VARCHAR(20) NULL;
