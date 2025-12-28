-- 1. Tablas Maestras (Sin dependencias)
CREATE TABLE IF NOT EXISTS `subscription_levels` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `max_devices` int(11) DEFAULT 1,
  `quality` varchar(20) DEFAULT 'HD',
  `time_limit_mins` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `categories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `section` enum('pelicula','serie','musica') NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_category_section` (`name`, `section`)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `logs_users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user` varchar(255) NOT NULL,
  `action` varchar(255) NOT NULL,
  `detail` varchar(255) DEFAULT NULL,
  `date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE = InnoDB;

-- 2. Tablas con Dependencias Simples
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
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `media_content` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tmdb_id` int(11) DEFAULT NULL,
  `title` varchar(150) NOT NULL,
  `description` text,
  `section` varchar(255) DEFAULT NULL,
  `category_id` int(11) NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `thumbnail_path` varchar(255) DEFAULT NULL,
  `duration_mins` int(11) DEFAULT NULL,
  `rating_avg` decimal(3, 1) DEFAULT 0.0,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_media_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`)
) ENGINE = InnoDB;

-- 3. Tablas de Relación Compleja
CREATE TABLE IF NOT EXISTS `my_list` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `media_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `my_list_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `my_list_ibfk_2` FOREIGN KEY (`media_id`) REFERENCES `media_content` (`id`)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `ratings_reviews` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `media_id` int(11) NOT NULL,
  `rating` int(1) DEFAULT NULL,
  `comment` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_rating` (`user_id`, `media_id`),
  CONSTRAINT `ratings_reviews_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `ratings_reviews_ibfk_2` FOREIGN KEY (`media_id`) REFERENCES `media_content` (`id`)
) ENGINE = InnoDB;