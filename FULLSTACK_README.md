# Full-Stack Modular Boilerplate

A complete full-stack boilerplate project with React frontend and Node.js/Express/MongoDB backend, featuring dual authentication (email/password + Google OAuth) and project/task management.

## 🚀 Features

### Frontend (React)
- ✅ **React 19** with **React Router** for navigation
- ✅ **Firebase Google Authentication** integration
- ✅ **Email/Password Authentication** with JWT
- ✅ **Protected Routes** with authentication guards
- ✅ **Axios** for API communication with auto-retry and token handling
- ✅ **Clean Raw CSS** styling (no frameworks)
- ✅ **Context API** for state management
- ✅ **Responsive Design** for all screen sizes

### Backend (Node.js + Express + MongoDB)
- ✅ **Express.js** REST API server
- ✅ **MongoDB** with **Mongoose** ODM
- ✅ **Dual Authentication System**:
  - JWT-based email/password auth with bcrypt
  - Firebase Admin SDK for Google OAuth verification
- ✅ **Flexible Auth Middleware** (accepts both JWT and Firebase tokens)
- ✅ **Complete CRUD APIs** for Projects and Tasks
- ✅ **Input Validation** with express-validator
- ✅ **CORS** configuration
- ✅ **Error Handling** middleware

### Models & APIs
- **User Model**: `{ name, email, password?, authProvider, firebaseUid? }`
- **Project Model**: `{ title, description, owner, tasks[], status, priority }`
- **Task Model**: `{ projectId, title, status, priority, assignedTo, comments[] }`

## 📁 Project Structure

```
CodeMasters/
├── my-app/                 # React Frontend
│   ├── src/
│   │   ├── components/
│   │   │   └── ProtectedRoute.jsx
│   │   ├── context/
│   │   │   └── AuthContext.js
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Signup.jsx
│   │   │   └── Dashboard.jsx
│   │   ├── services/
│   │   │   ├── api.js
│   │   │   └── firebase.js
│   │   ├── styles/
│   │   │   ├── Auth.css
│   │   │   └── Dashboard.css
│   │   └── App.js
│   ├── package.json
│   └── .env.example
│
└── server/                 # Node.js Backend
    ├── config/
    │   └── firebase.js
    ├── middleware/
    │   └── authMiddleware.js
    ├── models/
    │   ├── User.js
    │   ├── Project.js
    │   └── Task.js
    ├── routes/
    │   ├── auth.js
    │   ├── projects.js
    │   └── tasks.js
    ├── server.js
    ├── package.json
    └── .env.example
```

## 🛠️ Setup Instructions

### Prerequisites
- Node.js (v14+)
- MongoDB (local or cloud)
- Firebase Project (for Google Auth)

### 1. Clone and Navigate
```bash
cd "d:\Github projects\CodeMasters"
```

### 2. Backend Setup

```bash
cd server

# Install dependencies
npm install

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your configurations:
# - MongoDB URI
# - JWT Secret
# - Firebase Service Account Key
# - Client URL

# Start the server
npm run dev
```

### 3. Frontend Setup

```bash
cd ../my-app

# Install dependencies
npm install

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your configurations:
# - Backend API URL
# - Firebase Config (from Firebase Console)

# Start the development server
npm start
```

### 4. Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use existing one
3. Enable Authentication → Sign-in methods → Google
4. Generate web app config and add to frontend `.env`
5. Generate service account key and add to backend `.env`

## 🔌 API Endpoints

### Authentication
```
POST /auth/signup          # Email/password signup
POST /auth/login           # Email/password login
POST /auth/google          # Google OAuth with Firebase token
GET  /auth/me              # Get current user (protected)
```

### Projects
```
GET    /api/projects       # Get all user projects
GET    /api/projects/:id   # Get single project
POST   /api/projects       # Create new project
PUT    /api/projects/:id   # Update project
DELETE /api/projects/:id   # Delete project
```

### Tasks
```
GET    /api/tasks          # Get all user tasks (with filters)
GET    /api/tasks/:id      # Get single task
POST   /api/tasks          # Create new task
PUT    /api/tasks/:id      # Update task
DELETE /api/tasks/:id      # Delete task
POST   /api/tasks/:id/comments  # Add comment to task
```

## 📝 Example API Usage

### Using Axios (Frontend)
```javascript
import { authAPI, projectsAPI, tasksAPI } from './services/api';

// Login
const result = await authAPI.login({ email, password });

// Create project
const project = await projectsAPI.create({
  title: 'My Project',
  description: 'Project description',
  status: 'planning'
});

// Create task
const task = await tasksAPI.create({
  projectId: project.data.project._id,
  title: 'My Task',
  status: 'todo',
  priority: 'high'
});
```

### Using fetch/curl
```javascript
// Login
const response = await fetch('http://localhost:5000/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'user@example.com', password: 'password123' })
});

// Use token for protected routes
const projects = await fetch('http://localhost:5000/api/projects', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Postman Collection
```json
{
  "info": { "name": "Full-Stack Boilerplate API" },
  "variable": [
    { "key": "baseUrl", "value": "http://localhost:5000" },
    { "key": "token", "value": "" }
  ],
  "item": [
    {
      "name": "Auth",
      "item": [
        {
          "name": "Login",
          "request": {
            "method": "POST",
            "url": "{{baseUrl}}/auth/login",
            "body": {
              "mode": "raw",
              "raw": "{\\"email\\": \\"user@example.com\\", \\"password\\": \\"password123\\"}"
            }
          }
        }
      ]
    }
  ]
}
```

## 🔐 Authentication Flow

### Email/Password Authentication
1. User signs up with email/password
2. Backend hashes password with bcrypt
3. JWT token generated and returned
4. Frontend stores token and user data
5. Token included in subsequent API requests

### Google OAuth Authentication
1. User clicks "Sign in with Google"
2. Firebase SDK handles Google OAuth flow
3. Firebase ID token sent to backend
4. Backend verifies token with Firebase Admin SDK
5. User created/updated in database
6. JWT token generated and returned

### Dual Token Support
The auth middleware accepts both:
- **JWT tokens** (for email/password users)
- **Firebase ID tokens** (for Google OAuth users)

## 🎨 Styling

Clean, modern CSS with:
- **Responsive design** for all devices
- **Gradient backgrounds** and modern aesthetics
- **Card-based layouts** with subtle shadows
- **Loading states** and animations
- **Form validation** visual feedback

## 🚀 Deployment Ready

### Environment Variables
- All sensitive data in environment variables
- Separate configs for development/production
- Example files provided for easy setup

### Production Considerations
- MongoDB connection pooling
- JWT secret rotation
- CORS origin restrictions
- Rate limiting middleware ready
- Error logging and monitoring hooks

## 📚 Tech Stack

### Frontend
- React 19
- React Router DOM
- Firebase SDK
- Axios
- Context API
- Raw CSS

### Backend
- Node.js
- Express.js
- MongoDB + Mongoose
- Firebase Admin SDK
- bcryptjs
- jsonwebtoken
- express-validator
- cors

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## 📄 License

MIT License - feel free to use for personal or commercial projects.

---

**Happy Coding! 🚀**

This boilerplate provides a solid foundation for hackathons, MVPs, and production applications with modern authentication and project management features.