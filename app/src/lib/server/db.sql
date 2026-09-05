-- CREATE DATABASE gateqr;
-- USE gateqr;
-- myuser mypassword

-- Create user table
CREATE TABLE IF NOT EXISTS `user` (
    `auto_id` INT AUTO_INCREMENT,
    `email` VARCHAR(255) NOT NULL UNIQUE,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`auto_id`)
) ENGINE=InnoDB;

-- Create department table
CREATE TABLE IF NOT EXISTS `department` (
    `auto_id` INT AUTO_INCREMENT,
    `email` VARCHAR(255) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`auto_id`)
) ENGINE=InnoDB;

-- Create registration table
CREATE TABLE IF NOT EXISTS `registration` (
    `vehicle_id` INT AUTO_INCREMENT,
    `user_id` INT NOT NULL,
    `department_id` INT NULL, -- NULL for visitors
    `id` CHAR(20) NULL,
    `role` ENUM('student', 'employee', 'visitor', 'concessionaire') NOT NULL,
    `vehicle_type` ENUM('2-Wheeler / Motorcycle', '4-Wheeler / Car') NOT NULL,
    `campus` ENUM('Liceo Main', 'RNP', 'PASEO') NOT NULL DEFAULT 'Liceo Main',
    `year_level` VARCHAR(50) NULL,
    `first_name` VARCHAR(100) NOT NULL,
    `last_name` VARCHAR(100) NOT NULL,
    `contact_number` VARCHAR(20) NOT NULL,
    `facebook` VARCHAR(255) NULL,
    `vehicle_make` VARCHAR(100) NOT NULL,
    `vehicle_plate` VARCHAR(50) NOT NULL,
    `is_owner` BOOLEAN NOT NULL,
    `status` ENUM('dept_val', 'osa_val', 'osa_dist', 'revoked', 'rejected', 'expired') NOT NULL,
    `invalid_reason` VARCHAR(255) NULL,
    `dept_val_at` TIMESTAMP NULL,
    `osa_val_at` TIMESTAMP NULL,
    `osa_dist_at` TIMESTAMP NULL,
    `dist_sched` DATETIME NULL,
    `expires_at` TIMESTAMP NULL,
    `revoked_at` TIMESTAMP NULL,
    `rejected_at` TIMESTAMP NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `doc_id` VARCHAR(255) NULL,
    `doc_load` VARCHAR(255) NULL,
    `doc_qr` VARCHAR(255) NULL,
    `doc_or` VARCHAR(255) NOT NULL,
    `doc_cr` VARCHAR(255) NOT NULL,
    `doc_license` VARCHAR(255) NOT NULL,
    `doc_letter` VARCHAR(255) NULL,
    PRIMARY KEY (`vehicle_id`),
    CONSTRAINT `fk_registration_user` 
        FOREIGN KEY (`user_id`) REFERENCES `user` (`auto_id`) 
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_registration_department` 
        FOREIGN KEY (`department_id`) REFERENCES `department` (`auto_id`) 
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Create Vehicle_Log table
CREATE TABLE IF NOT EXISTS `Vehicle_Log` (
    `auto_id` INT AUTO_INCREMENT,
    `registration_id` INT NOT NULL,
    `in` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `pic_in` VARCHAR(255) NULL,
    `out` TIMESTAMP NULL,
    `pic_out` VARCHAR(255) NULL,
    `reason` VARCHAR(500) NULL,            -- reason for anomalous entry
    `logged_status` VARCHAR(255) NULL,     -- status at time of IN
    `logged_status_out` VARCHAR(255) NULL, -- status at time of OUT (independent)
    PRIMARY KEY (`auto_id`),
    CONSTRAINT `fk_Vehicle_Log_registration` 
        FOREIGN KEY (`registration_id`) REFERENCES `registration` (`vehicle_id`) 
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Create guestlog table (unregistered / manual entries)
CREATE TABLE IF NOT EXISTS `guestlog` (
    `auto_id` INT AUTO_INCREMENT,
    `ticket_no` VARCHAR(50) NOT NULL,
    `make_model` VARCHAR(200) NOT NULL,
    `plate` VARCHAR(50) NOT NULL,
    `reason` VARCHAR(500) NULL,
    `in` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `pic_in` VARCHAR(255) NULL,
    `out` TIMESTAMP NULL,
    `pic_out` VARCHAR(255) NULL,
    `logged_status` VARCHAR(255) NULL,
    `logged_status_out` VARCHAR(255) NULL,
    PRIMARY KEY (`auto_id`)
) ENGINE=InnoDB;

-- Create otp_codes table
CREATE TABLE IF NOT EXISTS `otp_codes` (
    `auto_id` INT AUTO_INCREMENT,
    `email` VARCHAR(255) NOT NULL,
    `otp` VARCHAR(6) NOT NULL,
    `expires_at` TIMESTAMP NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`auto_id`)
) ENGINE=InnoDB;

-- Create complaint table
CREATE TABLE IF NOT EXISTS `complaint` (
    `id` INT AUTO_INCREMENT,
    `user_email` VARCHAR(255) NOT NULL,
    `message` TEXT NOT NULL,
    `is_read` BOOLEAN DEFAULT FALSE,
    `schedule` DATETIME NULL,
    `status` ENUM('pending', 'resolved') DEFAULT 'pending',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB;

-- Create settings table
CREATE TABLE IF NOT EXISTS `settings` (
    `id` INT PRIMARY KEY,
    `max_capacity` INT DEFAULT -1
) ENGINE=InnoDB;

INSERT IGNORE INTO `settings` (`id`, `max_capacity`) VALUES (1, -1);

-- Create vip_log table
CREATE TABLE IF NOT EXISTS `vip_log` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `type` ENUM('in', 'out') NOT NULL,
    `timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;