Project TaskFlow

TaskFlow is a full-stack project management application that I built to help users like me organize projects, manage tasks, collaborate with team members, and track progress through a Kanban-style workflow.

The project was built to strengthen my experience with full-stack software development, authentication, relational databases, REST APIs, and React-based user interfaces.

Features

- User registration and login
- Password hashing with bcrypt
- JWT authentication
- Protected API routes
- Multiple project workspaces
- Project member management
- Task assignment to team members
- Kanban board with drag-and-drop
- Create, edit, and delete tasks
- Task priorities and due dates
- Search, filter, and sort tasks
- "My Tasks" view
- Task comments
- Task activity history
- Project-based access control
- Responsive dark-mode interface

Tech Stack

Frontend
- React
- JavaScript
- Vite
- CSS
- dnd-kit

Backend
- Node.js
- Express.js
- REST API
- JWT
- bcryptjs

Database
- MySQL
- mysql2

Tools
- Git
- GitHub
- npm
- MySQL Workbench
- VS Code

## How TaskFlow Works

Users first create an account or sign into an existing account.

Once authenticated, users can:

1. Create projects
2. Add other TaskFlow users to projects
3. Create tasks inside projects
4. Assign tasks to project members
5. Move tasks between To Do, In Progress, and Done
6. Edit task information
7. Add comments to tasks
8. View task activity history
9. Search and filter tasks
10. View tasks assigned specifically to them

## Database Structure

TaskFlow uses the following main MySQL tables:

- `users`
- `projects`
- `project_members`
- `tasks`
- `task_comments`
- `task_activity`

The relationships between the main parts of the application are:

```text
User
 ├── owns Projects
 ├── belongs to Projects
 └── can be assigned Tasks

Project
 ├── contains Members
 └── contains Tasks

Task
 ├── belongs to a Project
 ├── can be assigned to a User
 ├── has Comments
 └── has Activity History
