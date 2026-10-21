-- ====================================================
-- SkillSwap - Safe Demo Seed Data (Indian / Gujarat Community)
-- Idempotent insertions with demo test credentials
-- Default Password for test accounts: Password123!
-- ====================================================

-- ----------------------------------------------------
-- 1. Default Skills Catalog
-- ----------------------------------------------------
INSERT IGNORE INTO `skills` (`id`, `name`, `category`, `description`) VALUES
(1, 'JavaScript & Node.js', 'Programming', 'Backend automation, Express APIs, and modern ES6+'),
(2, 'Figma UI/UX Design', 'Design', 'User research, wireframing, and interactive prototyping'),
(3, 'Digital Photography', 'Creative Arts', 'Studio lighting, camera techniques, and photo retouching'),
(4, 'Acoustic Guitar Lessons', 'Music', 'Acoustic chords, rhythm techniques, and fingerstyle'),
(5, 'Conversational Spanish', 'Languages', 'Conversational Spanish grammar and pronunciation'),
(6, 'Video Editing & Premiere Pro', 'Media', 'Video production, motion cuts, and Adobe Premiere Pro'),
(7, 'Python for Data Analysis', 'Programming', 'Data cleaning, Pandas, visualizations, and scripting'),
(8, 'Public Speaking & Presentation', 'Personal Growth', 'Confident speaking, pitch decks, and vocal delivery'),
(9, 'Advanced Excel & Financial Modeling', 'Business', 'Data analysis, pivot tables, dashboard creation, and financial models'),
(10, 'Digital Marketing & SEO', 'Marketing', 'Organic SEO optimization, social media marketing, and conversion funnel strategies'),
(11, 'Graphic Design & Branding', 'Design', 'Logo design, Adobe Illustrator vectors, typography, and brand identity'),
(12, 'Machine Learning & AI Fundamentals', 'Technology', 'Supervised learning models, Scikit-Learn, data preprocessing, and AI pipelines'),
(13, 'Spoken English & Business Communication', 'Languages', 'Professional email etiquette, executive presentation, and business dialogue'),
(14, 'React & Frontend Development', 'Programming', 'Modern React components, state hooks, routing, and responsive web applications');

-- ----------------------------------------------------
-- 2. Default Test Accounts (Admin & Indian / Gujarat Community)
-- Passwords hashed with bcrypt (10 rounds): Password123!
-- ----------------------------------------------------
INSERT INTO `users` (`id`, `name`, `email`, `password_hash`, `role`, `bio`, `location`, `availability`, `is_public`, `is_active`) VALUES
(1, 'SkillSwap Admin', 'admin@skillswap.com', '$2a$10$eZVjpMf31.n2IVdvb3pzMuBUxgv0Weq44zu7NILPpr2bHFjefWxDe', 'admin', 'Platform Administrator & Community Overseer.', 'Vadodara, CA', 'Full-time', 1, 1),
(2, 'Priya Patel', 'priya.patel@gmail.com', '$2a$10$eZVjpMf31.n2IVdvb3pzMuBUxgv0Weq44zu7NILPpr2bHFjefWxDe', 'user', 'Senior full-stack MERN engineer and tech mentor from Ahmedabad. Passionate about clean code, scalable Node.js architectures, and learning UI/UX design.', 'Ahmedabad, Gujarat', 'Weekday evenings (6-9 PM)', 1, 1),
(3, 'Rohan Joshi', 'rohan.joshi@gmail.com', '$2a$10$eZVjpMf31.n2IVdvb3pzMuBUxgv0Weq44zu7NILPpr2bHFjefWxDe', 'user', 'Senior product designer with 6+ years experience in Figma, design systems, and UX research. Eager to connect designs directly with JavaScript & web apps.', 'Vadodara, Gujarat', 'Weekends & Evenings', 1, 1),
(4, 'Ananya Desai', 'ananya.desai@gmail.com', '$2a$10$eZVjpMf31.n2IVdvb3pzMuBUxgv0Weq44zu7NILPpr2bHFjefWxDe', 'user', 'Commercial photographer and digital content creator based in Surat. Looking to master Python for data analysis, automation, and modern web portfolios.', 'Surat, Gujarat', 'Flexible (Afternoons & Weekends)', 1, 1),
(5, 'Kavya Mehta', 'kavya.mehta@gmail.com', '$2a$10$eZVjpMf31.n2IVdvb3pzMuBUxgv0Weq44zu7NILPpr2bHFjefWxDe', 'user', 'Acoustic and classical guitarist for 10+ years, independent music instructor in Rajkot. Excited to learn digital photography, video editing, and marketing.', 'Rajkot, Gujarat', 'Weekends', 1, 1),
(6, 'Mitesh Tank', 'tankmtiesh143@gmail.com', '$2a$10$l5mHBkLCVecwe.E8Go0gXuwb1yVybc6TNzBQLukQgmIeEz13NZxj.', 'user', 'Full-stack web developer and UI designer from Dhandhuka, Gujarat. Passionate about building high-performance web applications and mastering AI tools.', 'Dhandhuka, Gujarat', 'Weekends & Evenings', 1, 1),
(7, 'Bhavin Shah', 'bhavin.shah@gmail.com', '$2a$10$eZVjpMf31.n2IVdvb3pzMuBUxgv0Weq44zu7NILPpr2bHFjefWxDe', 'user', 'Data analytics consultant and corporate trainer in Gandhinagar. Expert in Python data analysis and executive public speaking; learning full-stack JS.', 'Gandhinagar, Gujarat', 'Weekdays & Weekends', 1, 1)
ON DUPLICATE KEY UPDATE 
  `name` = VALUES(`name`),
  `email` = VALUES(`email`),
  `password_hash` = VALUES(`password_hash`),
  `bio` = VALUES(`bio`),
  `location` = VALUES(`location`),
  `availability` = VALUES(`availability`);

-- ----------------------------------------------------
-- 3. User Skill Offerings and Learning Goals
-- ----------------------------------------------------
INSERT IGNORE INTO `user_skills` (`user_id`, `skill_id`, `type`, `proficiency_level`, `description`) VALUES
-- Priya Patel (Ahmedabad)
(2, 1, 'offered', 'expert', 'Specialized in building REST APIs, Express backends, and full-stack architectures.'),
(2, 14, 'offered', 'advanced', 'Modern React components, state hooks, and client-side web applications.'),
(2, 2, 'wanted', 'beginner', 'Looking to improve visual aesthetics and wireframe modern web applications in Figma.'),
(2, 12, 'wanted', 'beginner', 'Eager to understand foundational machine learning concepts and predictive models.'),
(2, 9, 'wanted', 'beginner', 'Wants to learn structured financial modeling and business spreadsheets.'),

-- Rohan Joshi (Vadodara)
(3, 2, 'offered', 'expert', 'Can teach end-to-end UX flows, design systems, and responsive Figma components.'),
(3, 11, 'offered', 'advanced', 'Brand identity design, vector typography, and visual assets in Adobe Illustrator.'),
(3, 6, 'offered', 'intermediate', 'Practical video editing, pacing, and motion cuts in Adobe Premiere Pro.'),
(3, 1, 'wanted', 'intermediate', 'Wants to connect design mockups directly to running Node.js and Express apps.'),
(3, 14, 'wanted', 'beginner', 'Interested in implementing designs using interactive React frontend components.'),

-- Ananya Desai (Surat)
(4, 3, 'offered', 'expert', 'Commercial portrait photography, studio lighting techniques, and Lightroom retouching.'),
(4, 6, 'offered', 'advanced', 'Video editing, color grading, and social reel production in Premiere Pro.'),
(4, 1, 'wanted', 'beginner', 'Need to build my personal photography and digital portfolio website from scratch.'),
(4, 7, 'wanted', 'beginner', 'Wants to learn Python scripting for organizing and analyzing photo metadata.'),
(4, 10, 'wanted', 'intermediate', 'Seeking guidance on organic SEO and Instagram growth for creative studios.'),

-- Kavya Mehta (Rajkot)
(5, 4, 'offered', 'expert', '10+ years acoustic and classical guitar. Chords, fingerpicking, and rhythm instruction.'),
(5, 8, 'offered', 'advanced', 'Stage presence, vocal delivery, and confident presentation skills.'),
(5, 3, 'wanted', 'intermediate', 'Want to shoot better promotional photos and concert videos for music workshops.'),
(5, 6, 'wanted', 'beginner', 'Want to edit performance videos and YouTube tutorials cleanly.'),
(5, 10, 'wanted', 'beginner', 'Wants to promote online music lessons and build an audience.'),

-- Mitesh Tank (Dhandhuka)
(6, 2, 'offered', 'intermediate', 'Figma UI design, layout wireframes, and responsive design systems.'),
(6, 1, 'offered', 'intermediate', 'JavaScript web development, DOM manipulation, and frontend architecture.'),
(6, 7, 'wanted', 'beginner', 'Wants to learn Python for data scripting and automated tools.'),
(6, 12, 'wanted', 'beginner', 'Interested in exploring artificial intelligence concepts and machine learning.'),

-- Bhavin Shah (Gandhinagar)
(7, 7, 'offered', 'expert', 'Python programming, Pandas data wrangling, data visualization, and automation.'),
(7, 8, 'offered', 'expert', 'Corporate presentations, keynote speaking, and effective technical storytelling.'),
(7, 9, 'offered', 'advanced', 'Advanced Excel formulas, pivot models, and automated reporting dashboards.'),
(7, 1, 'wanted', 'intermediate', 'Wants to master full-stack JavaScript and deploy interactive web applications.'),
(7, 2, 'wanted', 'beginner', 'Looking to learn modern Figma UI/UX prototyping to design dashboard interfaces.');

-- ----------------------------------------------------
-- 4. Initial Demonstration Swaps
-- ----------------------------------------------------
INSERT IGNORE INTO `swap_requests` (`id`, `requester_id`, `receiver_id`, `offered_skill_id`, `requested_skill_id`, `status`, `message`) VALUES
(1, 2, 3, 1, 2, 'completed', 'Hi Rohan! Would love to swap 3 hours of Express.js backend coaching for Figma UX guidance.'),
(2, 4, 2, 3, 1, 'accepted', 'Hi Priya, can you help me set up a portfolio layout? I can teach you studio camera lighting in exchange!'),
(3, 5, 4, 4, 3, 'pending', 'Hey Ananya! Interested in swapping acoustic guitar lessons for portrait photography tips?');

-- ----------------------------------------------------
-- 5. Verified Demonstration Reviews
-- ----------------------------------------------------
INSERT IGNORE INTO `reviews` (`id`, `swap_id`, `reviewer_id`, `reviewee_id`, `rating`, `comment`) VALUES
(1, 1, 2, 3, 5, 'Rohan was an amazing tutor! He completely leveled up my design intuition and Figma shortcuts.'),
(2, 1, 3, 2, 5, 'Priya explained Express and database pooling so clearly. 10/10 exchange experience!');

-- ----------------------------------------------------
-- 6. Initial Welcome Notifications
-- ----------------------------------------------------
INSERT IGNORE INTO `notifications` (`user_id`, `type`, `title`, `message`, `is_read`) VALUES
(2, 'swap_request', 'New Swap Proposal', 'Kavya Mehta proposed a skill swap with you.', 0),
(2, 'swap_accepted', 'Swap Accepted', 'Ananya Desai accepted your swap proposal.', 1);

-- ----------------------------------------------------
-- 7. Initial Demonstration Sessions
-- ----------------------------------------------------
INSERT IGNORE INTO `swap_sessions` (`id`, `swap_id`, `creator_id`, `title`, `topic`, `session_date`, `duration_minutes`, `agenda`, `meeting_url`, `status`) VALUES
(1, 2, 4, 'Introductory Photography & JavaScript Planning', 'Studio Lighting & JS Syntax', DATE_ADD(NOW(), INTERVAL 2 DAY), 60, '1. Review studio photography lighting basics\n2. Set up JavaScript development environment', 'https://meet.google.com/demo-swap-session', 'confirmed'),
(2, 2, 2, 'Follow-up Practice: Lighting & Async Code', 'Lighting Ratios & Promises', DATE_ADD(NOW(), INTERVAL 5 DAY), 45, 'Practice camera lighting setup and review Promises/async-await in Node.', 'https://meet.google.com/demo-swap-session', 'pending');

-- ----------------------------------------------------
-- 8. Initial Demonstration Reports
-- ----------------------------------------------------
INSERT IGNORE INTO `reports` (`id`, `reporter_id`, `reported_user_id`, `reported_swap_id`, `reason`, `details`, `status`, `admin_notes`) VALUES
(1, 3, 5, NULL, 'Session Reschedule', 'Kavya was 15 minutes late to our prep chat, but resolved amicably afterwards.', 'resolved', 'User contacted both parties; schedule agreed upon.');
