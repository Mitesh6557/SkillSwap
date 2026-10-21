# SkillSwap REST API Documentation

This document describes all REST API endpoints provided by the SkillSwap backend.

## Base URL
```text
http://localhost:5000/api
```

## Authentication Header
All protected endpoints require a standard JSON Web Token (JWT) sent via the HTTP `Authorization` header:
```text
Authorization: Bearer <your_jwt_token>
```

---

## 1. Authentication Endpoints (`/api/auth`)

### Register User
- **Method:** `POST`
- **Route:** `/api/auth/register`
- **Access:** Public (Rate-limited: 20 req/15min)
- **Request Body:**
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "Password123!",
    "location": "San Francisco, CA",
    "bio": "Product designer and UX consultant.",
    "availability": "Weekends & Evenings",
    "is_public": true
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "User registered successfully",
    "data": {
      "user": {
        "id": 6,
        "name": "Jane Doe",
        "email": "jane@example.com",
        "role": "user",
        "avatar_url": null,
        "availability": "Weekends & Evenings",
        "is_public": 1
      },
      "token": "eyJhbGciOi..."
    }
  }
  ```

### Login User
- **Method:** `POST`
- **Route:** `/api/auth/login`
- **Access:** Public (Rate-limited: 20 req/15min)
- **Request Body:**
  ```json
  {
    "email": "priya.patel@example.com",
    "password": "Password123!"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "user": {
        "id": 2,
        "name": "Priya Patel",
        "email": "priya.patel@example.com",
        "role": "user",
        "avatar_url": null,
        "availability": "Weekday evenings (6-9 PM)",
        "is_public": 1
      },
      "token": "eyJhbGciOi..."
    }
  }
  ```

### Get Current Authenticated User Profile
- **Method:** `GET`
- **Route:** `/api/auth/me`
- **Access:** Protected (Requires JWT)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "id": 2,
      "name": "Priya Patel",
      "email": "priya.patel@example.com",
      "role": "user",
      "location": "Ahmedabad, Gujarat",
      "bio": "Senior full-stack MERN engineer and tech mentor from Ahmedabad. Passionate about clean code, scalable Node.js architectures, and learning UI/UX design.",
      "avatar_url": null,
      "availability": "Weekday evenings (6-9 PM)",
      "is_public": 1,
      "status": "active",
      "created_at": "2026-10-17T00:00:00.000Z"
    }
  }
  ```

---

## 2. User Discovery & Profiles (`/api/users`)

### Search & Discover Users
- **Method:** `GET`
- **Route:** `/api/users`
- **Access:** Public (Only returns public profiles where `is_public = 1` and `status = 'active'`)
- **Query Parameters:**
  - `q`: Search keyword across name and bio
  - `skill`: Filter by skill name offered
  - `wanted_skill`: Filter by skill name wanted
  - `location`: Filter by location
  - `availability`: Filter by availability string
  - `page`: Page number (default: `1`)
  - `limit`: Results per page (default: `12`)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "users": [
        {
          "id": 2,
          "name": "Sarah Chen",
          "location": "San Francisco, CA",
          "bio": "Full-stack engineer with 6+ years experience...",
          "avatar_url": null,
          "availability": "Weekday evenings (6-9 PM)",
          "avg_rating": 4.9,
          "total_reviews": 12,
          "offered_skills": ["JavaScript", "Python"],
          "wanted_skills": ["Spanish", "Graphic Design"]
        }
      ],
      "pagination": { "page": 1, "limit": 12, "total": 1, "totalPages": 1 }
    }
  }
  ```

### Get User Profile by ID
- **Method:** `GET`
- **Route:** `/api/users/:id`
- **Access:** Public / Optional Auth (Private profiles where `is_public = 0` return 403 Forbidden unless accessed by the owner or an admin)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": 2,
        "name": "Sarah Chen",
        "location": "San Francisco, CA",
        "bio": "Full-stack engineer...",
        "avatar_url": null,
        "availability": "Weekday evenings (6-9 PM)",
        "is_public": 1,
        "avg_rating": 4.9,
        "total_reviews": 12,
        "completed_swaps": 5,
        "skills": {
          "offered": [
            { "id": 1, "skill_id": 1, "name": "JavaScript", "category": "Programming", "proficiency_level": "expert" }
          ],
          "wanted": [
            { "id": 2, "skill_id": 4, "name": "Spanish", "category": "Languages", "proficiency_level": "beginner" }
          ]
        }
      }
    }
  }
  ```

### Update User Profile
- **Method:** `PUT`
- **Route:** `/api/users/profile`
- **Access:** Protected
- **Request Body:**
  ```json
  {
    "name": "Sarah Chen",
    "location": "San Francisco, CA",
    "bio": "Senior full-stack architect passionate about mentoring.",
    "availability": "Weekends & Evenings",
    "is_public": true
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Profile updated successfully",
    "data": { "id": 2, "name": "Sarah Chen", ... }
  }
  ```

### Upload Profile Avatar
- **Method:** `POST`
- **Route:** `/api/users/avatar`
- **Access:** Protected
- **Content-Type:** `multipart/form-data` (Field: `avatar`, Max size: 2MB, Accepted formats: JPEG, PNG, WEBP)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Avatar uploaded successfully",
    "data": { "avatar_url": "/uploads/avatars/avatar-2-1697500000000.png" }
  }
  ```

---

## 3. Skill Catalog & User Skills (`/api/skills`)

### Get Global Skills Catalog
- **Method:** `GET`
- **Route:** `/api/skills`
- **Access:** Public
- **Query Parameters:** `category`, `search`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      { "id": 1, "name": "JavaScript", "category": "Programming", "description": "Core frontend & Node.js" },
      { "id": 2, "name": "Python", "category": "Programming", "description": "Backend & data processing" }
    ]
  }
  ```

### Get Unique Skill Categories
- **Method:** `GET`
- **Route:** `/api/skills/categories`
- **Access:** Public

### Add New Skill to Catalog
- **Method:** `POST`
- **Route:** `/api/skills`
- **Access:** Protected
- **Request Body:** `{ "name": "Figma", "category": "Design", "description": "UI/UX design tool" }`

### Add Skill to User's Profile
- **Method:** `POST`
- **Route:** `/api/skills/user`
- **Access:** Protected
- **Request Body:**
  ```json
  {
    "skill_id": 3,
    "type": "offered",
    "proficiency_level": "intermediate"
  }
  ```

### Update User's Skill Proficiency Level
- **Method:** `PUT`
- **Route:** `/api/skills/user/:userSkillId`
- **Access:** Protected
- **Request Body:** `{ "proficiency_level": "expert" }`

### Remove Skill from User Profile
- **Method:** `DELETE`
- **Route:** `/api/skills/user/:userSkillId`
- **Access:** Protected

---

## 4. Swap Request System (`/api/swaps`)

### Get Current User's Swaps
- **Method:** `GET`
- **Route:** `/api/swaps`
- **Access:** Protected
- **Query Parameters:** `status` (`pending`, `accepted`, `rejected`, `completed`, `cancelled`)
- **Response (200 OK):** Returns array of both sent and received swap requests with counterparty profiles and selected skills.

### Get Swap by ID
- **Method:** `GET`
- **Route:** `/api/swaps/:id`
- **Access:** Protected (Only participants or admin can view)

### Propose a Swap Request
- **Method:** `POST`
- **Route:** `/api/swaps`
- **Access:** Protected
- **Business Rules:**
  - Cannot propose swap to self (`requester_id != receiver_id`).
  - Offered skill must belong to requester's `offered` skills.
  - Requested skill must belong to recipient's `offered` skills.
  - No active duplicate swap permitted between the two parties.
- **Request Body:**
  ```json
  {
    "receiver_id": 3,
    "offered_skill_id": 1,
    "requested_skill_id": 2,
    "message": "Hey Marcus! Want to trade Node.js tips for UI design feedback?",
    "scheduled_date": "2026-11-01 18:00:00"
  }
  ```

### Update Swap Status
- **Method:** `PATCH`
- **Route:** `/api/swaps/:id/status`
- **Access:** Protected
- **Rules:**
  - `accepted` or `rejected`: Only receiver can perform.
  - `completed`: Either participant can mark an accepted swap as completed.
  - `cancelled`: Only participants can cancel an accepted swap.
- **Request Body:** `{ "status": "accepted" }`

### Withdraw Pending Swap Request
- **Method:** `DELETE`
- **Route:** `/api/swaps/:id`
- **Access:** Protected
- **Rules:** Only the requester can withdraw their pending proposal.

---

## 5. Ratings & Reviews (`/api/reviews`)

### Get Reviews for a User
- **Method:** `GET`
- **Route:** `/api/reviews/user/:userId`
- **Access:** Public

### Submit Review for Completed Swap
- **Method:** `POST`
- **Route:** `/api/reviews`
- **Access:** Protected
- **Rules:**
  - Swap status must be `completed`.
  - Reviewer must be a participant in the swap.
  - Cannot review yourself.
  - Exactly one review allowed per reviewer per swap.
- **Request Body:**
  ```json
  {
    "swap_id": 1,
    "reviewee_id": 3,
    "rating": 5,
    "comment": "Outstanding knowledge exchange! Marcus taught me valuable design systems."
  }
  ```

---

## 6. Notifications (`/api/notifications`)

### Get User's Notifications
- **Method:** `GET`
- **Route:** `/api/notifications`
- **Access:** Protected
- **Response (200 OK):** Returns array of notifications with `is_read`, title, message, link, and timestamp.

### Mark Specific Notification as Read
- **Method:** `PATCH`
- **Route:** `/api/notifications/:id/read`
- **Access:** Protected

### Mark All Notifications as Read
- **Method:** `PATCH`
- **Route:** `/api/notifications/read-all`
- **Access:** Protected

---

## 7. Admin Dashboard & Operations (`/api/admin`)

*All admin endpoints strictly require authentication AND an authenticated user with `role = 'admin'`.*

### Platform Metrics
- **Method:** `GET`
- **Route:** `/api/admin/stats`
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "users": { "total": 5, "active": 5, "suspended": 0, "public": 4 },
      "swaps": { "total": 3, "pending": 1, "accepted": 1, "completed": 1, "rejected": 0, "cancelled": 0 },
      "reviews": { "total": 2, "average_rating": 4.95 },
      "skills": { "total": 8 }
    }
  }
  ```

### User Management
- **Method:** `GET`
- **Route:** `/api/admin/users`
- **Query Parameters:** `q`, `status`, `role`, `page`, `limit`

### Toggle User Account Status (Suspend / Reactivate)
- **Method:** `PATCH`
- **Route:** `/api/admin/users/:id/status`
- **Request Body:** `{ "status": "suspended" }` (or `"active"`)

### Monitor All Platform Swaps
- **Method:** `GET`
- **Route:** `/api/admin/swaps`
- **Query Parameters:** `status`, `page`, `limit`

### Delete Catalog Skill
- **Method:** `DELETE`
- **Route:** `/api/admin/skills/:id`

### Create Platform Announcement
- **Method:** `POST`
- **Route:** `/api/admin/announcements`
- **Request Body:**
  ```json
  {
    "title": "Scheduled Platform Maintenance",
    "content": "SkillSwap will undergo brief maintenance on Sunday at 2 AM UTC.",
    "priority": "high"
  }
  ```

### View Audit Logs
- **Method:** `GET`
- **Route:** `/api/admin/audit-logs`
- **Query Parameters:** `action`, `page`, `limit`

### Export Data as CSV
- **Users CSV:** `GET /api/admin/export/users` — streams `users_export.csv`
- **Swaps CSV:** `GET /api/admin/export/swaps` — streams `swaps_export.csv`
- **Feedback Logs CSV:** `GET /api/admin/export/feedback` — streams `feedback_export.csv`
