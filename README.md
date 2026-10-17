# SkillSwap — Peer-to-Peer Skill Exchange Platform

SkillSwap is a full-stack platform where people can discover other members, share their skills, and arrange skill exchanges without direct monetary transactions. It is designed to make peer-to-peer learning and collaboration easier.

## ✨ Features

- **Discover members and skills** — explore people by the skills they offer.
- **Member profiles** — view profiles and skill information.
- **Skill exchange requests** — manage requests and track swap status.
- **Dashboard** — access a member-focused overview.
- **Notifications** — view updates related to platform activity.
- **Authentication** — sign in and register for an account.
- **Admin area** — access moderation features where configured.

> Feature availability depends on the current implementation and database configuration.

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, JavaScript, JSX |
| Frontend tooling | Vite |
| Backend | Node.js, Express.js |
| Database | MySQL |
| API communication | Fetch API / HTTP requests |
| Authentication | JWT and password hashing, if configured in the backend |

## 📁 Project Structure

The project is organized into separate frontend and backend applications. The exact files may change as the project develops.

```text
SkillSwap/
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       └── App.jsx
├── backend/
│   ├── package.json
│   └── ...              # Express API, routes, and supporting files
├── package.json         # Root scripts, if configured
└── README.md
```

## ✅ Prerequisites

Install the following before starting:

- **Node.js** — use a current LTS version
- **npm** — included with Node.js
- **MySQL Server** — only if the backend is configured to use a local MySQL database

## 🚀 Getting Started

### 1. Clone or open the project

```bash
git clone <your-repository-url>
cd SkillSwap
```

If the project is already on your computer, open its root folder in your IDE and run the commands from that folder.

### 2. Install dependencies

Install root dependencies if the root `package.json` defines them:

```bash
npm install
```

Install frontend dependencies:

```bash
cd frontend
npm install
```

Install backend dependencies in a separate terminal:

```bash
cd backend
npm install
```

If the root package provides an installation script, you can use that script instead. Use the scripts actually listed in each `package.json`.

### 3. Configure environment variables

Check the backend's `.env.example` or README instructions, then create a local `.env` file in the location expected by the backend.

Typical settings for a local setup may look like this:

```env
PORT=5050
NODE_ENV=development

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=skillswap_db

JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=7d
```

**Important:**
- These are example values, not a guarantee that every variable is required by the current backend.
- Keep your actual database password and JWT secret private.
- Do not commit `.env` files or real credentials to GitHub.
- Confirm the API port in the backend configuration and the frontend API configuration match. The development setup has used port `5050` for the API.

### 4. Set up the database

If the backend uses MySQL:

1. Start your local MySQL server.
2. Create the database specified by `DB_NAME`, if the backend does not create it automatically.
3. Run the SQL schema or migration/seed script provided in the repository, if available.

Use the database setup instructions and script names present in the current `backend` folder. Do not run a seed command unless it exists in the project's `package.json` or backend files.

### 5. Start the backend

In a terminal:

```bash
cd backend
npm run dev
```

If `dev` is not a script in `backend/package.json`, use the available script shown by:

```bash
npm run
```

The API development address used by this project is:

```text
http://localhost:5050/api
```

Use the health-check route only if it is implemented in the current backend.

### 6. Start the frontend

Open another terminal:

```bash
cd frontend
npm run dev
```

Vite will print the local URL in the terminal. The configured frontend development URL has been:

```text
http://localhost:3000
```

If Vite prints a different port, open the URL shown in the terminal. Make sure the frontend's API base URL points to the running backend.

## 🔄 Typical User Flow

1. Register or sign in.
2. Complete your profile and add skills you can offer.
3. Discover members and skills.
4. Send or respond to a skill exchange request.
5. Track the request in the swaps area.
6. Use notifications to keep up with relevant activity.

The exact available actions depend on the current frontend and backend implementation.

## 🔐 Security Notes

- Keep secrets and database credentials in environment variables.
- Never commit real `.env` files to the repository.
- Validate and authorize protected actions on the backend; frontend checks alone are not security controls.
- Use parameterized SQL queries when working with MySQL.
- Configure appropriate request validation, secure HTTP headers, and rate limits in production.
- Use HTTPS and a strong JWT secret in deployed environments.

## 🧪 Testing and Troubleshooting

Before reporting a problem, check the following:

- **Frontend does not load:** confirm frontend dependencies are installed and run `npm run dev` inside `frontend`.
- **API request fails:** confirm the backend is running and the frontend API base URL uses the correct port.
- **Database connection fails:** check that MySQL is running and the `.env` database values are correct.
- **A script is missing:** run `npm run` in the relevant folder and use a script that actually exists.
- **A page or feature is empty:** check the browser console and backend terminal for errors.

If automated tests are included in the repository, run them using the command documented in the relevant `package.json` or test instructions.

## 🛣️ Possible Future Improvements

- Improve search and filtering for members and skills.
- Add clearer swap status updates and notifications.
- Expand accessibility and mobile responsiveness.
- Add automated tests for important API and user flows.
- Document confirmed API routes and database setup steps.

## 🤝 Contributing

1. Create a branch for your change.
2. Keep frontend and backend changes consistent.
3. Test the relevant flow before opening a pull request.
4. Update this README when setup steps, scripts, or features change.

## 📄 License

No license is specified here. Add a `LICENSE` file and update this section if you intend to publish the project with an open-source license.
