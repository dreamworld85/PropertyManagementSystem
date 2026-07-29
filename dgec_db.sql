-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jul 28, 2026 at 05:11 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `dgec_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `admin`
--

CREATE TABLE `admin` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `uuid` char(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` varchar(50) DEFAULT 'admin',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `admin`
--

INSERT INTO `admin` (`id`, `uuid`, `name`, `username`, `email`, `password`, `role`, `created_at`) VALUES
(1, 'u_oulnvld', 'Administrator', 'admin', 'admin@dgec.com', '$2b$10$34tNYyZTvvIzr/a/Uv6Pcuo27Z3cBNqhIBFul.3Z1M/wcKxtx6/dm', 'admin', '2026-07-27 06:44:27');

-- --------------------------------------------------------

--
-- Table structure for table `clients`
--

CREATE TABLE `clients` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `uuid` char(36) NOT NULL,
  `name` varchar(150) NOT NULL,
  `sector` varchar(100) DEFAULT NULL,
  `contact_name` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `username` varchar(50) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `role` varchar(50) DEFAULT 'Client',
  `phone` varchar(30) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `password_hash` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `clients`
--

INSERT INTO `clients` (`id`, `uuid`, `name`, `sector`, `contact_name`, `email`, `username`, `password`, `role`, `phone`, `address`, `created_at`, `updated_at`, `password_hash`) VALUES
(783, 'cyfrut7', 'Google', 'Development', 'Google', 'google123@gmail.com', 'google', '$2b$10$4R9p3NR8D5.Gront3JNn9.t3q0bwwGTf2el6OzsHDrrqLfMHTdcsK', 'Client', '123456789', NULL, '2026-07-28 07:54:38', '2026-07-28 07:54:38', NULL),
(784, '783', 'Google', 'Development', 'Google', 'google123@gmail.com', NULL, NULL, 'Client', '123456789', NULL, '2026-07-28 07:57:43', '2026-07-28 07:57:43', NULL),
(786, '784', 'Google', 'Development', 'Google', 'google123@gmail.com', NULL, NULL, 'Client', '123456789', NULL, '2026-07-28 08:15:31', '2026-07-28 08:15:31', NULL),
(787, '786', 'Google', 'Development', 'Google', 'google123@gmail.com', NULL, NULL, 'Client', '123456789', NULL, '2026-07-28 08:15:40', '2026-07-28 08:15:40', NULL),
(788, '787', 'Google', 'Development', 'Google', 'google123@gmail.com', NULL, NULL, 'Client', '123456789', NULL, '2026-07-28 08:18:58', '2026-07-28 08:18:58', NULL),
(800, '788', 'Google', 'Development', 'Google', 'google123@gmail.com', NULL, NULL, 'Client', '123456789', NULL, '2026-07-28 08:19:49', '2026-07-28 08:19:49', NULL),
(802, '800', 'Google', 'Development', 'Google', 'google123@gmail.com', NULL, NULL, 'Client', '123456789', NULL, '2026-07-28 08:20:02', '2026-07-28 08:20:02', NULL),
(814, '802', 'Google', 'Development', 'Google', 'google123@gmail.com', NULL, NULL, 'Client', '123456789', NULL, '2026-07-28 08:24:02', '2026-07-28 08:24:02', NULL),
(815, 'ca3fg2u', 'Microsoft', 'design', 'Microsoft', 'micro@gmail.com', 'micro', '$2b$10$L5URZf0iI5QV7evwEQEXuOnDeEsD5DKWk1I2/ZZ64gZQzcTPI.3Ge', 'Client', '789456123', NULL, '2026-07-28 10:18:13', '2026-07-28 10:18:13', NULL),
(816, '815', 'Microsoft', 'design', 'Microsoft', 'micro@gmail.com', NULL, NULL, 'Client', '789456123', NULL, '2026-07-28 10:19:10', '2026-07-28 10:19:10', NULL),
(817, '814', 'Google', 'Development', 'Google', 'google123@gmail.com', NULL, NULL, 'Client', '123456789', NULL, '2026-07-28 10:19:10', '2026-07-28 10:19:10', NULL),
(820, '817', 'Google', 'Development', 'Google', 'google123@gmail.com', NULL, NULL, 'Client', '123456789', NULL, '2026-07-28 10:19:18', '2026-07-28 10:19:18', NULL),
(822, '816', 'Microsoft', 'design', 'Microsoft', 'micro@gmail.com', NULL, NULL, 'Client', '789456123', NULL, '2026-07-28 10:19:18', '2026-07-28 10:19:18', NULL),
(824, '822', 'Microsoft', 'design', 'Microsoft', 'micro@gmail.com', NULL, NULL, 'Client', '789456123', NULL, '2026-07-28 10:19:27', '2026-07-28 10:19:27', NULL),
(826, '820', 'Google', 'Development', 'Google', 'google123@gmail.com', NULL, NULL, 'Client', '123456789', NULL, '2026-07-28 10:19:27', '2026-07-28 10:19:27', NULL),
(836, '826', 'Google', 'Development', 'Google', 'google123@gmail.com', NULL, NULL, 'Client', '123456789', NULL, '2026-07-28 10:19:35', '2026-07-28 10:19:35', NULL),
(838, '824', 'Microsoft', 'design', 'Microsoft', 'micro@gmail.com', NULL, NULL, 'Client', '789456123', NULL, '2026-07-28 10:19:35', '2026-07-28 10:19:35', NULL),
(844, '838', 'Microsoft', 'design', 'Microsoft', 'micro@gmail.com', NULL, NULL, 'Client', '789456123', NULL, '2026-07-28 11:29:38', '2026-07-28 11:29:38', NULL),
(845, '836', 'Google', 'Development', 'Google', 'google123@gmail.com', NULL, NULL, 'Client', '123456789', NULL, '2026-07-28 11:29:38', '2026-07-28 11:29:38', NULL),
(856, '845', 'Google', 'Development', 'Google', 'google123@gmail.com', NULL, NULL, 'Client', '123456789', NULL, '2026-07-28 11:30:03', '2026-07-28 11:30:03', NULL),
(858, '844', 'Microsoft', 'design', 'Microsoft', 'micro@gmail.com', NULL, NULL, 'Client', '789456123', NULL, '2026-07-28 11:30:03', '2026-07-28 11:30:03', NULL),
(860, '858', 'Microsoft', 'design', 'Microsoft', 'micro@gmail.com', NULL, NULL, 'Client', '789456123', NULL, '2026-07-28 11:30:07', '2026-07-28 11:30:07', NULL),
(862, '856', 'Google', 'Development', 'Google', 'google123@gmail.com', NULL, NULL, 'Client', '123456789', NULL, '2026-07-28 11:30:07', '2026-07-28 11:30:07', NULL),
(864, '862', 'Google', 'Development', 'Google', 'google123@gmail.com', NULL, NULL, 'Client', '123456789', NULL, '2026-07-28 11:39:26', '2026-07-28 11:39:26', NULL),
(865, '860', 'Microsoft', 'design', 'Microsoft', 'micro@gmail.com', NULL, NULL, 'Client', '789456123', NULL, '2026-07-28 11:39:26', '2026-07-28 11:39:26', NULL),
(868, '865', 'Microsoft', 'design', 'Microsoft', 'micro@gmail.com', NULL, NULL, 'Client', '789456123', NULL, '2026-07-28 11:39:32', '2026-07-28 11:39:32', NULL),
(869, '864', 'Google', 'Development', 'Google', 'google123@gmail.com', NULL, NULL, 'Client', '123456789', NULL, '2026-07-28 11:39:32', '2026-07-28 11:39:32', NULL),
(872, '869', 'Google', 'Development', 'Google', 'google123@gmail.com', NULL, NULL, 'Client', '123456789', NULL, '2026-07-28 11:39:35', '2026-07-28 11:39:35', NULL),
(873, '868', 'Microsoft', 'design', 'Microsoft', 'micro@gmail.com', NULL, NULL, 'Client', '789456123', NULL, '2026-07-28 11:39:35', '2026-07-28 11:39:35', NULL),
(876, '873', 'Microsoft', 'design', 'Microsoft', 'micro@gmail.com', NULL, NULL, 'Client', '789456123', NULL, '2026-07-28 11:40:04', '2026-07-28 11:40:04', NULL),
(877, '872', 'Google', 'Development', 'Google', 'google123@gmail.com', NULL, NULL, 'Client', '123456789', NULL, '2026-07-28 11:40:04', '2026-07-28 11:40:04', NULL),
(880, '877', 'Google', 'Development', 'Google', 'google123@gmail.com', NULL, NULL, 'Client', '123456789', NULL, '2026-07-28 12:00:00', '2026-07-28 12:00:00', NULL),
(881, '876', 'Microsoft', 'design', 'Microsoft', 'micro@gmail.com', NULL, NULL, 'Client', '789456123', NULL, '2026-07-28 12:00:00', '2026-07-28 12:00:00', NULL),
(882, '881', 'Microsoft', 'design', 'Microsoft', 'micro@gmail.com', NULL, NULL, 'Client', '789456123', NULL, '2026-07-28 12:00:03', '2026-07-28 12:00:03', NULL),
(883, '880', 'Google', 'Development', 'Google', 'google123@gmail.com', NULL, NULL, 'Client', '123456789', NULL, '2026-07-28 12:00:03', '2026-07-28 12:00:03', NULL),
(886, '883', 'Google', 'Development', 'Google', 'google123@gmail.com', NULL, NULL, 'Client', '123456789', NULL, '2026-07-28 12:00:46', '2026-07-28 12:00:46', NULL),
(887, '882', 'Microsoft', 'design', 'Microsoft', 'micro@gmail.com', NULL, NULL, 'Client', '789456123', NULL, '2026-07-28 12:00:46', '2026-07-28 12:00:46', NULL),
(888, '887', 'Microsoft', 'design', 'Microsoft', 'micro@gmail.com', NULL, NULL, 'Client', '789456123', NULL, '2026-07-28 12:17:10', '2026-07-28 12:17:10', NULL),
(890, '886', 'Google', 'Development', 'Google', 'google123@gmail.com', NULL, NULL, 'Client', '123456789', NULL, '2026-07-28 12:17:10', '2026-07-28 12:17:10', NULL),
(892, '890', 'Google', 'Development', 'Google', 'google123@gmail.com', NULL, NULL, 'Client', '123456789', NULL, '2026-07-28 12:17:14', '2026-07-28 12:17:14', NULL),
(893, '888', 'Microsoft', 'design', 'Microsoft', 'micro@gmail.com', NULL, NULL, 'Client', '789456123', NULL, '2026-07-28 12:17:14', '2026-07-28 12:17:14', NULL),
(896, '893', 'Microsoft', 'design', 'Microsoft', 'micro@gmail.com', NULL, NULL, 'Client', '789456123', NULL, '2026-07-28 12:17:16', '2026-07-28 12:17:16', NULL),
(897, '892', 'Google', 'Development', 'Google', 'google123@gmail.com', NULL, NULL, 'Client', '123456789', NULL, '2026-07-28 12:17:16', '2026-07-28 12:17:16', NULL),
(900, '897', 'Google', 'Development', 'Google', 'google123@gmail.com', NULL, NULL, 'Client', '123456789', NULL, '2026-07-28 12:17:53', '2026-07-28 12:17:53', NULL),
(902, '896', 'Microsoft', 'design', 'Microsoft', 'micro@gmail.com', NULL, NULL, 'Client', '789456123', NULL, '2026-07-28 12:17:53', '2026-07-28 12:17:53', NULL),
(904, '902', 'Microsoft', 'design', 'Microsoft', 'micro@gmail.com', NULL, NULL, 'Client', '789456123', NULL, '2026-07-28 12:18:21', '2026-07-28 12:18:21', NULL),
(906, '900', 'Google', 'Development', 'Google', 'google123@gmail.com', NULL, NULL, 'Client', '123456789', NULL, '2026-07-28 12:18:21', '2026-07-28 12:18:21', NULL),
(912, '906', 'Google', 'Development', 'Google', 'google123@gmail.com', NULL, NULL, 'Client', '123456789', NULL, '2026-07-28 12:28:58', '2026-07-28 12:28:58', NULL),
(913, '904', 'Microsoft', 'design', 'Microsoft', 'micro@gmail.com', NULL, NULL, 'Client', '789456123', NULL, '2026-07-28 12:28:58', '2026-07-28 12:28:58', NULL),
(930, '913', 'Microsoft', 'design', 'Microsoft', 'micro@gmail.com', NULL, NULL, 'Client', '789456123', NULL, '2026-07-28 14:35:39', '2026-07-28 14:35:39', NULL),
(931, '912', 'Google', 'Development', 'Google', 'google123@gmail.com', NULL, NULL, 'Client', '123456789', NULL, '2026-07-28 14:35:39', '2026-07-28 14:35:39', NULL),
(934, '931', 'Google', 'Development', 'Google', 'google123@gmail.com', NULL, NULL, 'Client', '123456789', NULL, '2026-07-28 14:40:10', '2026-07-28 14:40:10', NULL),
(935, '930', 'Microsoft', 'design', 'Microsoft', 'micro@gmail.com', NULL, NULL, 'Client', '789456123', NULL, '2026-07-28 14:40:10', '2026-07-28 14:40:10', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `history`
--

CREATE TABLE `history` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `uuid` char(36) NOT NULL,
  `user_name` varchar(150) NOT NULL,
  `action` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `invoices`
--

CREATE TABLE `invoices` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `uuid` char(36) NOT NULL,
  `project_id` bigint(20) UNSIGNED NOT NULL,
  `invoice_no` varchar(50) NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `status` enum('Pending','Paid','Cancelled') NOT NULL DEFAULT 'Pending',
  `issued_at` date NOT NULL,
  `due_at` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `projects`
--

CREATE TABLE `projects` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `uuid` char(36) NOT NULL,
  `client_id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(150) NOT NULL,
  `desc` text DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'Planned',
  `progress` tinyint(3) UNSIGNED NOT NULL DEFAULT 0,
  `approval_status` varchar(50) NOT NULL DEFAULT 'Required',
  `doc_numbers` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`doc_numbers`)),
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `aor` varchar(50) DEFAULT 'DGEC',
  `description` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `projects`
--

INSERT INTO `projects` (`id`, `uuid`, `client_id`, `name`, `desc`, `category`, `status`, `progress`, `approval_status`, `doc_numbers`, `start_date`, `end_date`, `created_at`, `updated_at`, `aor`, `description`) VALUES
(567, 'p_5wivbfl', 783, 'G-recovery', NULL, 'Full Engineering', 'Active', 55, 'Approved', '[\"5002\"]', '2026-06-08', '2026-12-31', '2026-07-28 07:57:42', '2026-07-28 14:40:10', 'DGEC', ''),
(909, 'p_6qf7v16', 815, 'Micro-Design', NULL, 'Full Engineering', 'Active', 90, 'Approved', NULL, '2026-06-08', '2026-12-31', '2026-07-28 10:19:09', '2026-07-28 11:40:04', 'DGEC', '');

-- --------------------------------------------------------

--
-- Table structure for table `project_comments`
--

CREATE TABLE `project_comments` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `uuid` char(36) NOT NULL,
  `project_id` bigint(20) UNSIGNED NOT NULL,
  `user_name` varchar(150) NOT NULL,
  `text` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `settings`
--

CREATE TABLE `settings` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `key` varchar(100) NOT NULL,
  `value_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`value_json`)),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `staff`
--

CREATE TABLE `staff` (
  `id` int(11) NOT NULL,
  `uuid` varchar(100) NOT NULL,
  `name` varchar(255) NOT NULL,
  `contact_number` varchar(50) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `role` varchar(100) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `staff`
--

INSERT INTO `staff` (`id`, `uuid`, `name`, `contact_number`, `email`, `role`, `created_at`, `updated_at`) VALUES
(1, 's_d0tld6e', 'Ahmed Al-Kindi', '+968 9123 7890', 'ahmed.kindi@dgec.com', 'Senior Structural Engineer', '2026-07-27 18:15:58', '2026-07-27 18:15:58'),
(2, 's_fdevqc4', 'David', '789456123', 'daviid@gmail.com', 'MEP Lead', '2026-07-27 18:17:51', '2026-07-27 18:17:51'),
(3, 's_g3mhxpl', 'Boby', '963322145', 'boby@gmail.com', 'Architect Lead', '2026-07-28 03:56:59', '2026-07-28 03:56:59');

-- --------------------------------------------------------

--
-- Table structure for table `tasks`
--

CREATE TABLE `tasks` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `uuid` char(36) NOT NULL,
  `project_id` bigint(20) UNSIGNED NOT NULL,
  `title` varchar(200) NOT NULL,
  `description` text DEFAULT NULL,
  `assignee_id` bigint(20) UNSIGNED DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'Not Started',
  `percent` tinyint(3) UNSIGNED NOT NULL DEFAULT 0,
  `target_date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `discipline` varchar(100) DEFAULT NULL,
  `assignee` varchar(100) DEFAULT NULL,
  `start_date` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tasks`
--

INSERT INTO `tasks` (`id`, `uuid`, `project_id`, `title`, `description`, `assignee_id`, `status`, `percent`, `target_date`, `created_at`, `updated_at`, `discipline`, `assignee`, `start_date`) VALUES
(569, 't5xctgo', 567, 'ria - Project Work', NULL, NULL, 'In Progress', 60, '2026-12-31', '2026-07-28 07:57:49', '2026-07-28 08:20:27', 'Architecture', '93', '2026-06-08'),
(571, 't41szkb', 567, 'Saurabh M. - Project Work', NULL, NULL, 'In Progress', 0, '2026-12-31', '2026-07-28 07:57:49', '2026-07-28 07:57:49', 'MEP', '4', '2026-06-08'),
(573, 'tzfwa0j', 567, 'kiran - Project Work', NULL, NULL, 'In Progress', 93, '2026-12-31', '2026-07-28 07:57:49', '2026-07-28 14:40:11', 'Architecture', '117', '2026-06-08'),
(1003, 'tq0zsqx', 567, 'plumbing', NULL, NULL, 'In Progress', 35, '2026-06-30', '2026-07-28 08:24:05', '2026-07-28 12:18:25', 'Architecture', '93', '2026-06-08'),
(1004, 'tia6bl2', 909, 'ui design', NULL, NULL, 'In Progress', 0, '2026-12-31', '2026-07-28 10:19:12', '2026-07-28 10:19:12', 'MEP Lead', '179', '2026-06-08'),
(1006, 'tces8pt', 909, 'Ux design', NULL, NULL, 'Done', 95, '2026-12-31', '2026-07-28 10:19:12', '2026-07-28 12:17:18', 'Structure', '199', '2026-06-08'),
(1394, 'tyokknn', 567, ' complete design ', NULL, NULL, 'In Progress', 85, '2026-06-30', '2026-07-28 12:00:01', '2026-07-28 12:00:05', 'Architecture', '179', '2026-06-08'),
(1501, 't_vwm073s', 909, 'Structural Calculation & Drawing Review', '', 93, 'In Progress', 60, '2026-12-31', '2026-07-28 12:27:17', '2026-07-28 12:27:17', 'Structure', 'ria', '2026-06-08'),
(1502, 'ti6h6he', 909, 'Workflow making', '', 117, 'In Progress', 70, '2026-06-30', '2026-07-28 12:28:58', '2026-07-28 14:35:41', 'Architecture', '117', '2026-06-08');

-- --------------------------------------------------------

--
-- Table structure for table `teammates`
--

CREATE TABLE `teammates` (
  `id` int(11) NOT NULL,
  `uuid` varchar(100) NOT NULL,
  `project_id` int(11) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `role` varchar(100) NOT NULL,
  `discipline` varchar(100) NOT NULL,
  `task_name` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `teammates`
--

INSERT INTO `teammates` (`id`, `uuid`, `project_id`, `user_id`, `name`, `role`, `discipline`, `task_name`, `email`, `phone`, `created_at`, `updated_at`) VALUES
(1, 'uggi9cc', NULL, NULL, 'ria', 'Staff', 'Architecture', 'General Engineering Task', 'ria@dgec.com', '+968 9400 0000', '2026-07-27 16:30:24', '2026-07-27 16:30:24');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `uuid` char(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `role` enum('admin','project_manager','client','staff') NOT NULL,
  `discipline` varchar(100) DEFAULT NULL,
  `user_type` enum('admin','project_manager','client','staff') NOT NULL,
  `password_hash` char(60) NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `last_login_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `uuid`, `name`, `username`, `email`, `phone`, `role`, `discipline`, `user_type`, `password_hash`, `is_active`, `created_at`, `updated_at`, `last_login_at`) VALUES
(1, 'u_iix3vbv', 'Administrator', 'admin', 'admin@dgec.com', NULL, 'admin', 'Management', 'staff', '$2b$10$wWZp9mBDKe110WENiEeiEOPHxVSHSU5z6K.B3rgXzqY7ciOqroq4i', 1, '2026-07-27 06:44:27', '2026-07-28 08:08:52', NULL),
(4, 'u_vrat7l8', 'Saurabh M.', 'projectmanager', 'pm@dgec.com', '+968 9412 8899', 'staff', 'MEP', 'staff', '$2b$10$wWZp9mBDKe110WENiEeiEOPHxVSHSU5z6K.B3rgXzqY7ciOqroq4i', 1, '2026-07-27 06:44:27', '2026-07-28 08:08:52', NULL),
(93, 'uggi9cc', 'ria', 'ria', 'ria@dgec.com', '+968 9400 0000', 'staff', 'Architecture', 'staff', '$2b$10$wWZp9mBDKe110WENiEeiEOPHxVSHSU5z6K.B3rgXzqY7ciOqroq4i', 1, '2026-07-27 16:30:24', '2026-07-28 08:08:52', NULL),
(94, 'c1geemq', 'anjana', 'anjana', '', '', 'client', 'Structure', 'staff', '$2b$10$wWZp9mBDKe110WENiEeiEOPHxVSHSU5z6K.B3rgXzqY7ciOqroq4i', 1, '2026-07-27 16:31:20', '2026-07-28 12:17:10', NULL),
(117, 'uixyirz', 'kiran', 'kiran', 'kiran@dgec.com', '7012021221', 'staff', 'Architecture', 'staff', '$2b$10$wWZp9mBDKe110WENiEeiEOPHxVSHSU5z6K.B3rgXzqY7ciOqroq4i', 1, '2026-07-27 18:14:14', '2026-07-28 08:08:52', NULL),
(118, 'u7', 'John Doe', 'john', 'john.doe@dgec.com', '+968 9876 5432', 'staff', 'Structure', 'staff', '$2b$10$.Ra4xRWm8h8Lab1zqG9HxetrtVvXNEREw5iN991XYTGaeHP/XCJQy', 1, '2026-07-27 18:15:29', '2026-07-28 12:28:59', NULL),
(126, 'u_p8udz02', 'Ahmed Al-Kindi', 'ahmedal-kindi', 'ahmed.kindi@dgec.com', '+968 9123 7890', 'staff', 'Structure', 'staff', '$2b$10$wWZp9mBDKe110WENiEeiEOPHxVSHSU5z6K.B3rgXzqY7ciOqroq4i', 1, '2026-07-27 18:34:54', '2026-07-28 08:08:52', NULL),
(170, 'cryl1gh', 'Peter', 'peter', 'peter@gmail.com', '', 'client', 'Structure', 'staff', '$2b$10$wWZp9mBDKe110WENiEeiEOPHxVSHSU5z6K.B3rgXzqY7ciOqroq4i', 1, '2026-07-27 18:46:16', '2026-07-28 12:17:11', NULL),
(179, 'u_mijhw6e', 'David', 'david', 'daviid@gmail.com', '789456123', 'staff', 'MEP Lead', 'staff', '$2b$10$wWZp9mBDKe110WENiEeiEOPHxVSHSU5z6K.B3rgXzqY7ciOqroq4i', 1, '2026-07-27 18:47:28', '2026-07-28 08:08:52', NULL),
(199, 'u_0xgkvc8', 'lana', 'lana', 'lana@gmail.com', '9645123630', 'staff', 'Structure', 'staff', '$2b$10$wWZp9mBDKe110WENiEeiEOPHxVSHSU5z6K.B3rgXzqY7ciOqroq4i', 1, '2026-07-27 18:53:26', '2026-07-28 08:08:52', NULL),
(253, 'u_rvnlk2i', 'Boby', 'boby', 'boby@gmail.com', '963322145', 'staff', 'Architect Lead', 'staff', '$2b$10$wWZp9mBDKe110WENiEeiEOPHxVSHSU5z6K.B3rgXzqY7ciOqroq4i', 1, '2026-07-28 04:09:45', '2026-07-28 08:08:52', NULL),
(546, 'cjzwanu', 'KERA TRADE', 'kera', 'kera@gmail.com', '7045653253', 'client', 'Structure', 'staff', '$2b$10$wWZp9mBDKe110WENiEeiEOPHxVSHSU5z6K.B3rgXzqY7ciOqroq4i', 1, '2026-07-28 05:42:29', '2026-07-28 12:17:12', NULL),
(775, 'cyfrut7', 'Google', 'google', 'google123@gmail.com', '123456789', 'client', 'Structure', 'staff', '$2b$10$wWZp9mBDKe110WENiEeiEOPHxVSHSU5z6K.B3rgXzqY7ciOqroq4i', 1, '2026-07-28 07:54:38', '2026-07-28 12:17:12', NULL),
(1179, 'ca3fg2u', 'Microsoft', 'micro', 'micro@gmail.com', '789456123', 'client', 'Structure', 'staff', '$2b$10$L5URZf0iI5QV7evwEQEXuOnDeEsD5DKWk1I2/ZZ64gZQzcTPI.3Ge', 1, '2026-07-28 10:18:13', '2026-07-28 12:17:12', NULL);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admin`
--
ALTER TABLE `admin`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uuid` (`uuid`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `clients`
--
ALTER TABLE `clients`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uuid` (`uuid`);

--
-- Indexes for table `history`
--
ALTER TABLE `history`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uuid` (`uuid`);

--
-- Indexes for table `invoices`
--
ALTER TABLE `invoices`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uuid` (`uuid`),
  ADD KEY `project_id` (`project_id`);

--
-- Indexes for table `projects`
--
ALTER TABLE `projects`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uuid` (`uuid`),
  ADD KEY `client_id` (`client_id`);

--
-- Indexes for table `project_comments`
--
ALTER TABLE `project_comments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uuid` (`uuid`),
  ADD KEY `project_id` (`project_id`);

--
-- Indexes for table `settings`
--
ALTER TABLE `settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `key` (`key`);

--
-- Indexes for table `staff`
--
ALTER TABLE `staff`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uuid` (`uuid`);

--
-- Indexes for table `tasks`
--
ALTER TABLE `tasks`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uuid` (`uuid`),
  ADD KEY `project_id` (`project_id`),
  ADD KEY `assignee_id` (`assignee_id`);

--
-- Indexes for table `teammates`
--
ALTER TABLE `teammates`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uuid` (`uuid`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uuid` (`uuid`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admin`
--
ALTER TABLE `admin`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `clients`
--
ALTER TABLE `clients`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=936;

--
-- AUTO_INCREMENT for table `history`
--
ALTER TABLE `history`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `invoices`
--
ALTER TABLE `invoices`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `projects`
--
ALTER TABLE `projects`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1286;

--
-- AUTO_INCREMENT for table `project_comments`
--
ALTER TABLE `project_comments`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `settings`
--
ALTER TABLE `settings`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `staff`
--
ALTER TABLE `staff`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `tasks`
--
ALTER TABLE `tasks`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1611;

--
-- AUTO_INCREMENT for table `teammates`
--
ALTER TABLE `teammates`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2020;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `invoices`
--
ALTER TABLE `invoices`
  ADD CONSTRAINT `invoices_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `projects`
--
ALTER TABLE `projects`
  ADD CONSTRAINT `projects_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `project_comments`
--
ALTER TABLE `project_comments`
  ADD CONSTRAINT `project_comments_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `tasks`
--
ALTER TABLE `tasks`
  ADD CONSTRAINT `tasks_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `tasks_ibfk_2` FOREIGN KEY (`assignee_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
