-- ====================================================
-- SkillSwap - Safe Demo Seed Data
-- Idempotent insertions with demo test credentials
-- Default Password for test accounts: Password123!
-- ====================================================

-- ----------------------------------------------------
-- 1. Default Skills Catalog
-- ----------------------------------------------------
INSERT IGNORE INTO `skills` (`id`, `name`, `category`, `description`) VALUES
(1, 'JavaScript', 'Programming', 'Modern ES6+, Node.js, and browser APIs'),
(2, 'Python', 'Programming', 'Backend automation, scripting, and data analysis'),
(3, 'React', 'Programming', 'Component architecture, state hooks, and web apps'),
(4, 'Node.js', 'Programming', 'Server-side runtime, Express APIs, and microservices'),
(5, 'UI/UX Design', 'Design', 'User research, wireframing, and Figma prototyping'),
(6, 'Graphic Design', 'Design', 'Brand identity, typography, and visual assets'),
(7, 'Spanish', 'Languages', 'Conversational Spanish grammar and pronunciation'),
(8, 'Digital Marketing', 'Marketing', 'Search engine optimization, content, and growth');

-- ----------------------------------------------------
-- 2. Default Test Accounts
-- Passwords hashed with bcrypt (10 rounds): Password123!
-- ----------------------------------------------------
INSERT IGNORE INTO `users` (`id`, `name`, `email`, `password_hash`, `role`, `bio`, `location`, `availability`, `is_public`, `is_active`) VALUES
(1, 'Platform Admin', 'admin@skillswap.com', '$2a$10$eZVjpMf31.n2IVdvb3pzMuBUxgv0Weq44zu7NILPpr2bHFjefWxDe', 'admin', 'SkillSwap system administrator and community steward.', 'San Francisco, CA', 'Full-time', 1, 1),
(2, 'Sarah Chen', 'sarah.chen@example.com', '$2a$10$eZVjpMf31.n2IVdvb3pzMuBUxgv0Weq44zu7NILPpr2bHFjefWxDe', 'user', 'Senior full-stack engineer passionate about mentoring and learning new languages.', 'San Francisco, CA', 'Weekday evenings (6-9 PM)', 1, 1),
(3, 'Marcus Vance', 'marcus.vance@example.com', '$2a$10$eZVjpMf31.n2IVdvb3pzMuBUxgv0Weq44zu7NILPpr2bHFjefWxDe', 'user', 'Product designer with 7 years of design system experience in Figma.', 'New York, NY', 'Weekends & Evenings', 1, 1),
(4, 'Elena Rostova', 'elena.rostova@example.com', '$2a$10$eZVjpMf31.n2IVdvb3pzMuBUxgv0Weq44zu7NILPpr2bHFjefWxDe', 'user', 'Native Spanish speaker and linguist looking to learn web development.', 'Austin, TX', 'Flexible', 1, 1),
(5, 'David Kim', 'david.kim@example.com', '$2a$10$eZVjpMf31.n2IVdvb3pzMuBUxgv0Weq44zu7NILPpr2bHFjefWxDe', 'user', 'Content marketer specializing in SEO and newsletter growth strategies.', 'Seattle, WA', 'Weekends', 1, 1);

-- ----------------------------------------------------
-- 3. User Skill Offerings and Learning Goals
-- ----------------------------------------------------
INSERT IGNORE INTO `user_skills` (`user_id`, `skill_id`, `type`, `proficiency_level`, `description`) VALUES
(2, 1, 'offered', 'expert', 'JavaScript and web architecture'),
(2, 4, 'offered', 'advanced', 'Node.js and Express backend development'),
(2, 5, 'wanted', 'beginner', 'Wants to improve design and layout skills'),
(2, 7, 'wanted', 'beginner', 'Eager to practice conversational Spanish'),
(3, 5, 'offered', 'expert', 'UI/UX Design, wireframing, and Figma components'),
(3, 6, 'offered', 'advanced', 'Brand design and vector illustration'),
(3, 1, 'wanted', 'intermediate', 'Wants to learn full-stack frontend development'),
(4, 7, 'offered', 'expert', 'Native Spanish tutoring and conversation practice'),
(4, 2, 'wanted', 'beginner', 'Wants to learn Python scripting'),
(5, 8, 'offered', 'advanced', 'SEO strategies and content marketing campaigns'),
(5, 1, 'wanted', 'beginner', 'Wants to understand basics of JavaScript');

-- ----------------------------------------------------
-- 4. Initial Demonstration Swaps
-- ----------------------------------------------------
INSERT IGNORE INTO `swap_requests` (`id`, `requester_id`, `receiver_id`, `offered_skill_id`, `requested_skill_id`, `status`, `message`) VALUES
(1, 2, 3, 1, 5, 'completed', 'Hi Marcus, would love to trade Node.js tips for UI design feedback!'),
(2, 4, 2, 7, 1, 'accepted', 'Hola Sarah! I can teach Spanish in exchange for learning JavaScript basics.'),
(3, 5, 2, 8, 4, 'pending', 'Hey Sarah, interested in trading SEO consulting for Node.js guidance?');

-- ----------------------------------------------------
-- 5. Verified Demonstration Reviews
-- ----------------------------------------------------
INSERT IGNORE INTO `reviews` (`id`, `swap_id`, `reviewer_id`, `reviewee_id`, `rating`, `comment`) VALUES
(1, 1, 2, 3, 5, 'Marcus is an exceptional design mentor! He gave actionable Figma feedback.'),
(2, 1, 3, 2, 5, 'Sarah explained backend architecture clearly and patiently. Highly recommended!');

-- ----------------------------------------------------
-- 6. Initial Welcome Notifications
-- ----------------------------------------------------
INSERT IGNORE INTO `notifications` (`user_id`, `type`, `title`, `message`, `is_read`) VALUES
(2, 'swap_request', 'New Swap Proposal', 'David Kim proposed a skill swap with you.', 0),
(2, 'swap_accepted', 'Swap Accepted', 'Elena Rostova accepted your swap proposal.', 1);

-- ----------------------------------------------------
-- 7. Initial Demonstration Sessions
-- ----------------------------------------------------
INSERT IGNORE INTO `swap_sessions` (`id`, `swap_id`, `creator_id`, `title`, `topic`, `session_date`, `duration_minutes`, `agenda`, `meeting_url`, `status`) VALUES
(1, 2, 4, 'Introductory Spanish & JavaScript Planning', 'Spanish Basics & JS Syntax', DATE_ADD(NOW(), INTERVAL 2 DAY), 60, '1. Review basic Spanish conversational phrases\n2. Set up JavaScript development environment', 'https://meet.google.com/demo-swap-session', 'confirmed'),
(2, 2, 2, 'Follow-up Practice: Verbs & Async Code', 'Spanish Verbs & Promises', DATE_ADD(NOW(), INTERVAL 5 DAY), 45, 'Practice irregular verbs and review Promises/async-await in Node.', 'https://meet.google.com/demo-swap-session', 'pending');

-- ----------------------------------------------------
-- 8. Initial Demonstration Reports
-- ----------------------------------------------------
INSERT IGNORE INTO `reports` (`id`, `reporter_id`, `reported_user_id`, `reported_swap_id`, `reason`, `details`, `status`, `admin_notes`) VALUES
(1, 3, 5, NULL, 'Spam / Commercial solicitation', 'User is sending promotional messages for unrelated commercial SEO services.', 'pending', NULL);
