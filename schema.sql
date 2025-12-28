USE cyber-stream_db_cs_main;

-- 1.subscription_levels
CREATE TABLE IF NOT EXISTS `subscription_levels` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `max_devices` int(11) DEFAULT 1,
  `quality` varchar(20) DEFAULT 'HD',
  `time_limit_mins` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;

-- 2. categories
CREATE TABLE IF NOT EXISTS `categories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `section` enum('pelicula','serie','musica') NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_category_section` (`name`, `section`)
) ENGINE=InnoDB;

-- 3. users
CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `full_name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `profile_pic` varchar(255) DEFAULT 'default_user.png',
  `role` enum('admin','user') DEFAULT 'user',
  `sub_level_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`sub_level_id`) REFERENCES `subscription_levels` (`id`)
) ENGINE=InnoDB;

-- 4. media_content
CREATE TABLE IF NOT EXISTS `media_content` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tmdb_id` int(11) DEFAULT NULL,
  `title` varchar(150) NOT NULL,
  `description` text,
  `section` varchar(255) DEFAULT NULL,
  `category_id` int(11) NOT NULL,
  `category` enum('pelicula','serie','musica') NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `thumbnail_path` varchar(255) DEFAULT NULL,
  `duration_mins` int(11) DEFAULT NULL,
  `release_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `rating_avg` decimal(3,1) DEFAULT 0.0,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_media_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`)
) ENGINE=InnoDB;

-- 5. logs_users
CREATE TABLE IF NOT EXISTS `logs_users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user` varchar(255) NOT NULL,
  `action` varchar(255) NOT NULL,
  `detail` varchar(255) DEFAULT NULL,
  `date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;

-- 6. Otras tablas de interacción
CREATE TABLE IF NOT EXISTS `my_list` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11),
  `media_id` int(11),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `offline_downloads` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `media_id` int(11) NOT NULL,
  `device_id` varchar(255) NOT NULL,
  `status` enum('active','expired','deleted') DEFAULT 'active',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `ratings_reviews` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `media_id` int(11) NOT NULL,
  `rating` int(1),
  `comment` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;

-- DATOS SEMILLA PARA LOS TESTS
INSERT IGNORE INTO `subscription_levels` (id, name) VALUES (1, 'Premium');
INSERT IGNORE INTO `categories` (id, name, section) VALUES (1, 'Acción', 'pelicula');
INSERT IGNORE INTO `users` (id, full_name, email, password, role, sub_level_id) 
VALUES (1, 'Administrador', 'admin@cyberstream.com', '123', 'admin', 1);
INSERT IGNORE INTO `media_content` (id, title, section, category_id, category, file_path) 
VALUES (1, 'Pelicula Test', 'pelicula', 1, 'pelicula', 'media/test.mp4');