const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

require("dotenv").config();

const db = require("./db");

const app = express();

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

/*
|--------------------------------------------------------------------------
| ROOT
|--------------------------------------------------------------------------
*/

app.get("/", (req, res) => {
  res.json({
    message: "TaskFlow API is running",
  });
});

/*
|--------------------------------------------------------------------------
| AUTH MIDDLEWARE
|--------------------------------------------------------------------------
*/

function authenticateToken(req, res, next) {
  const authHeader =
    req.headers.authorization;

  const token =
    authHeader &&
    authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message:
        "Authentication token required.",
    });
  }

  try {
    const decoded =
      jwt.verify(
        token,
        process.env.JWT_SECRET
      );

    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      message:
        "Invalid or expired token.",
    });
  }
}

/*
|--------------------------------------------------------------------------
| HELPER: TASK ACCESS
|--------------------------------------------------------------------------
*/

async function getTaskWithAccess(
  taskId,
  userId
) {
  const [tasks] =
    await db.query(
      `
      SELECT *
      FROM tasks
      WHERE id = ?
      `,
      [taskId]
    );

  if (tasks.length === 0) {
    return {
      allowed: false,
      reason: "not_found",
      task: null,
    };
  }

  const task =
    tasks[0];

  /*
    Project task:
    user must be a member
    of the project.
  */

  if (task.project_id) {
    const [memberships] =
      await db.query(
        `
        SELECT id
        FROM project_members
        WHERE project_id = ?
        AND user_id = ?
        `,
        [
          task.project_id,
          userId,
        ]
      );

    if (
      memberships.length === 0
    ) {
      return {
        allowed: false,
        reason: "forbidden",
        task,
      };
    }

    return {
      allowed: true,
      task,
    };
  }

  /*
    Personal task:
    only creator can access it.
  */

  if (
    Number(task.user_id) !==
    Number(userId)
  ) {
    return {
      allowed: false,
      reason: "forbidden",
      task,
    };
  }

  return {
    allowed: true,
    task,
  };
}

/*
|--------------------------------------------------------------------------
| HELPER: RECORD ACTIVITY
|--------------------------------------------------------------------------
*/

async function recordActivity(
  taskId,
  userId,
  action,
  description
) {
  await db.query(
    `
    INSERT INTO task_activity
    (
      task_id,
      user_id,
      action,
      description
    )
    VALUES (?, ?, ?, ?)
    `,
    [
      taskId,
      userId,
      action,
      description,
    ]
  );
}

/*
|--------------------------------------------------------------------------
| REGISTER
|--------------------------------------------------------------------------
*/

app.post(
  "/api/auth/register",
  async (req, res) => {
    try {
      const {
        name,
        email,
        password,
      } = req.body;

      if (
        !name ||
        !email ||
        !password
      ) {
        return res.status(400).json({
          message:
            "Name, email, and password are required.",
        });
      }

      if (
        password.length < 6
      ) {
        return res.status(400).json({
          message:
            "Password must be at least 6 characters long.",
        });
      }

      const normalizedEmail =
        email
          .trim()
          .toLowerCase();

      const [existingUsers] =
        await db.query(
          `
          SELECT id
          FROM users
          WHERE email = ?
          `,
          [normalizedEmail]
        );

      if (
        existingUsers.length > 0
      ) {
        return res.status(409).json({
          message:
            "An account with this email already exists.",
        });
      }

      const hashedPassword =
        await bcrypt.hash(
          password,
          10
        );

      const [result] =
        await db.query(
          `
          INSERT INTO users
          (
            name,
            email,
            password
          )
          VALUES (?, ?, ?)
          `,
          [
            name.trim(),
            normalizedEmail,
            hashedPassword,
          ]
        );

      const token =
        jwt.sign(
          {
            id: result.insertId,
            email:
              normalizedEmail,
          },
          process.env.JWT_SECRET,
          {
            expiresIn: "7d",
          }
        );

      res.status(201).json({
        message:
          "Account created successfully.",

        token,

        user: {
          id:
            result.insertId,

          name:
            name.trim(),

          email:
            normalizedEmail,
        },
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message:
          "Could not create account.",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| LOGIN
|--------------------------------------------------------------------------
*/

app.post(
  "/api/auth/login",
  async (req, res) => {
    try {
      const {
        email,
        password,
      } = req.body;

      if (
        !email ||
        !password
      ) {
        return res.status(400).json({
          message:
            "Email and password are required.",
        });
      }

      const normalizedEmail =
        email
          .trim()
          .toLowerCase();

      const [users] =
        await db.query(
          `
          SELECT *
          FROM users
          WHERE email = ?
          `,
          [normalizedEmail]
        );

      if (
        users.length === 0
      ) {
        return res.status(401).json({
          message:
            "Invalid email or password.",
        });
      }

      const user =
        users[0];

      const passwordMatches =
        await bcrypt.compare(
          password,
          user.password
        );

      if (
        !passwordMatches
      ) {
        return res.status(401).json({
          message:
            "Invalid email or password.",
        });
      }

      const token =
        jwt.sign(
          {
            id: user.id,
            email: user.email,
          },
          process.env.JWT_SECRET,
          {
            expiresIn: "7d",
          }
        );

      res.json({
        message:
          "Login successful.",

        token,

        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message:
          "Could not log in.",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| CURRENT USER
|--------------------------------------------------------------------------
*/

app.get(
  "/api/auth/me",
  authenticateToken,
  async (req, res) => {
    try {
      const [users] =
        await db.query(
          `
          SELECT
            id,
            name,
            email,
            created_at
          FROM users
          WHERE id = ?
          `,
          [req.user.id]
        );

      if (
        users.length === 0
      ) {
        return res.status(404).json({
          message:
            "User not found.",
        });
      }

      res.json(
        users[0]
      );
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message:
          "Could not retrieve user.",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| GET PROJECTS
|--------------------------------------------------------------------------
*/

app.get(
  "/api/projects",
  authenticateToken,
  async (req, res) => {
    try {
      const [projects] =
        await db.query(
          `
          SELECT
            p.id,
            p.name,
            p.description,
            p.owner_id,
            p.created_at,
            pm.role
          FROM projects p
          INNER JOIN project_members pm
            ON p.id = pm.project_id
          WHERE pm.user_id = ?
          ORDER BY p.created_at DESC
          `,
          [req.user.id]
        );

      res.json(
        projects
      );
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message:
          "Could not retrieve projects.",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| CREATE PROJECT
|--------------------------------------------------------------------------
*/

app.post(
  "/api/projects",
  authenticateToken,
  async (req, res) => {
    const connection =
      await db.getConnection();

    try {
      const {
        name,
        description,
      } = req.body;

      if (
        !name ||
        !name.trim()
      ) {
        connection.release();

        return res.status(400).json({
          message:
            "Project name is required.",
        });
      }

      await connection.beginTransaction();

      const [projectResult] =
        await connection.query(
          `
          INSERT INTO projects
          (
            owner_id,
            name,
            description
          )
          VALUES (?, ?, ?)
          `,
          [
            req.user.id,
            name.trim(),
            description || "",
          ]
        );

      await connection.query(
        `
        INSERT INTO project_members
        (
          project_id,
          user_id,
          role
        )
        VALUES (?, ?, 'owner')
        `,
        [
          projectResult.insertId,
          req.user.id,
        ]
      );

      await connection.commit();

      const [projects] =
        await db.query(
          `
          SELECT *
          FROM projects
          WHERE id = ?
          `,
          [
            projectResult.insertId,
          ]
        );

      res.status(201).json(
        projects[0]
      );
    } catch (error) {
      await connection.rollback();

      console.error(error);

      res.status(500).json({
        message:
          "Could not create project.",
      });
    } finally {
      if (
        connection.connection
      ) {
        connection.release();
      }
    }
  }
);

/*
|--------------------------------------------------------------------------
| PROJECT MEMBERS
|--------------------------------------------------------------------------
*/

app.get(
  "/api/projects/:projectId/members",
  authenticateToken,
  async (req, res) => {
    try {
      const {
        projectId,
      } = req.params;

      const [membership] =
        await db.query(
          `
          SELECT id
          FROM project_members
          WHERE project_id = ?
          AND user_id = ?
          `,
          [
            projectId,
            req.user.id,
          ]
        );

      if (
        membership.length === 0
      ) {
        return res.status(403).json({
          message:
            "You do not have access to this project.",
        });
      }

      const [members] =
        await db.query(
          `
          SELECT
            u.id,
            u.name,
            u.email,
            pm.role
          FROM project_members pm
          INNER JOIN users u
            ON pm.user_id = u.id
          WHERE pm.project_id = ?
          ORDER BY
            CASE
              WHEN pm.role = 'owner'
              THEN 0
              ELSE 1
            END,
            u.name ASC
          `,
          [projectId]
        );

      res.json(
        members
      );
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message:
          "Could not retrieve project members.",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| ADD PROJECT MEMBER
|--------------------------------------------------------------------------
*/

app.post(
  "/api/projects/:projectId/members",
  authenticateToken,
  async (req, res) => {
    try {
      const {
        projectId,
      } = req.params;

      const {
        email,
      } = req.body;

      if (!email) {
        return res.status(400).json({
          message:
            "Member email is required.",
        });
      }

      const [projects] =
        await db.query(
          `
          SELECT id
          FROM projects
          WHERE id = ?
          AND owner_id = ?
          `,
          [
            projectId,
            req.user.id,
          ]
        );

      if (
        projects.length === 0
      ) {
        return res.status(403).json({
          message:
            "Only the project owner can add members.",
        });
      }

      const normalizedEmail =
        email
          .trim()
          .toLowerCase();

      const [users] =
        await db.query(
          `
          SELECT
            id,
            name,
            email
          FROM users
          WHERE email = ?
          `,
          [
            normalizedEmail,
          ]
        );

      if (
        users.length === 0
      ) {
        return res.status(404).json({
          message:
            "No TaskFlow account exists with that email.",
        });
      }

      const userToAdd =
        users[0];

      const [existingMembers] =
        await db.query(
          `
          SELECT id
          FROM project_members
          WHERE project_id = ?
          AND user_id = ?
          `,
          [
            projectId,
            userToAdd.id,
          ]
        );

      if (
        existingMembers.length > 0
      ) {
        return res.status(409).json({
          message:
            "This user is already a project member.",
        });
      }

      await db.query(
        `
        INSERT INTO project_members
        (
          project_id,
          user_id,
          role
        )
        VALUES (?, ?, 'member')
        `,
        [
          projectId,
          userToAdd.id,
        ]
      );

      res.status(201).json({
        message:
          "Project member added successfully.",

        member: {
          id:
            userToAdd.id,

          name:
            userToAdd.name,

          email:
            userToAdd.email,

          role:
            "member",
        },
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message:
          "Could not add project member.",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| GET PROJECT TASKS
|--------------------------------------------------------------------------
*/

app.get(
  "/api/projects/:projectId/tasks",
  authenticateToken,
  async (req, res) => {
    try {
      const {
        projectId,
      } = req.params;

      const [membership] =
        await db.query(
          `
          SELECT id
          FROM project_members
          WHERE project_id = ?
          AND user_id = ?
          `,
          [
            projectId,
            req.user.id,
          ]
        );

      if (
        membership.length === 0
      ) {
        return res.status(403).json({
          message:
            "You do not have access to this project.",
        });
      }

      const [tasks] =
        await db.query(
          `
          SELECT
            t.*,
            u.name AS assignee_name,
            u.email AS assignee_email
          FROM tasks t
          LEFT JOIN users u
            ON t.assigned_to = u.id
          WHERE t.project_id = ?
          ORDER BY t.created_at DESC
          `,
          [projectId]
        );

      res.json(
        tasks
      );
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message:
          "Could not retrieve project tasks.",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| MY TASKS
|--------------------------------------------------------------------------
*/

app.get(
  "/api/tasks/mine",
  authenticateToken,
  async (req, res) => {
    try {
      const [tasks] =
        await db.query(
          `
          SELECT
            t.*,
            p.name AS project_name,
            u.name AS assignee_name,
            u.email AS assignee_email
          FROM tasks t
          LEFT JOIN projects p
            ON t.project_id = p.id
          LEFT JOIN users u
            ON t.assigned_to = u.id
          WHERE t.assigned_to = ?
          ORDER BY t.created_at DESC
          `,
          [req.user.id]
        );

      res.json(
        tasks
      );
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message:
          "Could not retrieve assigned tasks.",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| GET USER TASKS
|--------------------------------------------------------------------------
*/

app.get(
  "/api/tasks",
  authenticateToken,
  async (req, res) => {
    try {
      const [tasks] =
        await db.query(
          `
          SELECT
            t.*,
            u.name AS assignee_name,
            u.email AS assignee_email
          FROM tasks t
          LEFT JOIN users u
            ON t.assigned_to = u.id
          WHERE t.user_id = ?
          ORDER BY t.created_at DESC
          `,
          [req.user.id]
        );

      res.json(
        tasks
      );
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message:
          "Could not retrieve tasks.",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| CREATE TASK
|--------------------------------------------------------------------------
*/

app.post(
  "/api/tasks",
  authenticateToken,
  async (req, res) => {
    try {
      const {
        title,
        description,
        priority,
        status,
        dueDate,
        projectId,
        assignedTo,
      } = req.body;

      if (
        !title ||
        !title.trim()
      ) {
        return res.status(400).json({
          message:
            "Task title is required.",
        });
      }

      const finalProjectId =
        projectId || null;

      const finalAssignedTo =
        assignedTo ||
        req.user.id;

      if (finalProjectId) {
        const [membership] =
          await db.query(
            `
            SELECT id
            FROM project_members
            WHERE project_id = ?
            AND user_id = ?
            `,
            [
              finalProjectId,
              req.user.id,
            ]
          );

        if (
          membership.length === 0
        ) {
          return res.status(403).json({
            message:
              "You do not have access to this project.",
          });
        }

        const [assigneeMembership] =
          await db.query(
            `
            SELECT id
            FROM project_members
            WHERE project_id = ?
            AND user_id = ?
            `,
            [
              finalProjectId,
              finalAssignedTo,
            ]
          );

        if (
          assigneeMembership.length === 0
        ) {
          return res.status(400).json({
            message:
              "Assigned user is not a member of this project.",
          });
        }
      }

      const [result] =
        await db.query(
          `
          INSERT INTO tasks
          (
            user_id,
            project_id,
            assigned_to,
            title,
            description,
            priority,
            status,
            due_date
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            req.user.id,
            finalProjectId,
            finalAssignedTo,
            title.trim(),
            description || "",
            priority || "Medium",
            status || "todo",
            dueDate || null,
          ]
        );

      await recordActivity(
        result.insertId,
        req.user.id,
        "created",
        "Created the task."
      );

      const [tasks] =
        await db.query(
          `
          SELECT
            t.*,
            u.name AS assignee_name,
            u.email AS assignee_email
          FROM tasks t
          LEFT JOIN users u
            ON t.assigned_to = u.id
          WHERE t.id = ?
          `,
          [
            result.insertId,
          ]
        );

      res.status(201).json(
        tasks[0]
      );
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message:
          "Could not create task.",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| UPDATE TASK
|--------------------------------------------------------------------------
*/

app.put(
  "/api/tasks/:id",
  authenticateToken,
  async (req, res) => {
    try {
      const {
        id,
      } = req.params;

      const {
        title,
        description,
        priority,
        status,
        dueDate,
        assignedTo,
      } = req.body;

      const access =
        await getTaskWithAccess(
          id,
          req.user.id
        );

      if (
        !access.allowed
      ) {
        return res
          .status(
            access.reason ===
              "not_found"
              ? 404
              : 403
          )
          .json({
            message:
              access.reason ===
              "not_found"
                ? "Task not found."
                : "You do not have permission to edit this task.",
          });
      }

      const oldTask =
        access.task;

      const finalAssignedTo =
        assignedTo ||
        oldTask.assigned_to ||
        req.user.id;

      if (
        oldTask.project_id
      ) {
        const [assigneeMembership] =
          await db.query(
            `
            SELECT id
            FROM project_members
            WHERE project_id = ?
            AND user_id = ?
            `,
            [
              oldTask.project_id,
              finalAssignedTo,
            ]
          );

        if (
          assigneeMembership.length === 0
        ) {
          return res.status(400).json({
            message:
              "Assigned user is not a member of this project.",
          });
        }
      }

      await db.query(
        `
        UPDATE tasks
        SET
          title = ?,
          description = ?,
          priority = ?,
          status = ?,
          due_date = ?,
          assigned_to = ?
        WHERE id = ?
        `,
        [
          title,
          description,
          priority,
          status,
          dueDate || null,
          finalAssignedTo,
          id,
        ]
      );

      /*
        Record changes.
      */

      if (
        oldTask.status !==
        status
      ) {
        await recordActivity(
          id,
          req.user.id,
          "status_changed",
          `Moved task from ${oldTask.status} to ${status}.`
        );
      }

      if (
        oldTask.priority !==
        priority
      ) {
        await recordActivity(
          id,
          req.user.id,
          "priority_changed",
          `Changed priority from ${oldTask.priority} to ${priority}.`
        );
      }

      if (
        Number(
          oldTask.assigned_to
        ) !==
        Number(
          finalAssignedTo
        )
      ) {
        await recordActivity(
          id,
          req.user.id,
          "assignee_changed",
          "Changed the task assignee."
        );
      }

      if (
        oldTask.title !==
        title
      ) {
        await recordActivity(
          id,
          req.user.id,
          "title_changed",
          "Changed the task title."
        );
      }

      if (
        oldTask.description !==
        description
      ) {
        await recordActivity(
          id,
          req.user.id,
          "description_changed",
          "Updated the task description."
        );
      }

      const oldDueDate =
        oldTask.due_date
          ? String(
              oldTask.due_date
            ).slice(0, 10)
          : "";

      const newDueDate =
        dueDate || "";

      if (
        oldDueDate !==
        newDueDate
      ) {
        await recordActivity(
          id,
          req.user.id,
          "due_date_changed",
          "Changed the task due date."
        );
      }

      const [updatedTasks] =
        await db.query(
          `
          SELECT
            t.*,
            u.name AS assignee_name,
            u.email AS assignee_email
          FROM tasks t
          LEFT JOIN users u
            ON t.assigned_to = u.id
          WHERE t.id = ?
          `,
          [id]
        );

      res.json(
        updatedTasks[0]
      );
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message:
          "Could not update task.",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| DELETE TASK
|--------------------------------------------------------------------------
*/

app.delete(
  "/api/tasks/:id",
  authenticateToken,
  async (req, res) => {
    try {
      const {
        id,
      } = req.params;

      const access =
        await getTaskWithAccess(
          id,
          req.user.id
        );

      if (
        !access.allowed
      ) {
        return res
          .status(
            access.reason ===
              "not_found"
              ? 404
              : 403
          )
          .json({
            message:
              access.reason ===
              "not_found"
                ? "Task not found."
                : "You do not have permission to delete this task.",
          });
      }

      await db.query(
        `
        DELETE FROM tasks
        WHERE id = ?
        `,
        [id]
      );

      res.json({
        message:
          "Task deleted successfully.",
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message:
          "Could not delete task.",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| GET COMMENTS
|--------------------------------------------------------------------------
*/

app.get(
  "/api/tasks/:id/comments",
  authenticateToken,
  async (req, res) => {
    try {
      const {
        id,
      } = req.params;

      const access =
        await getTaskWithAccess(
          id,
          req.user.id
        );

      if (
        !access.allowed
      ) {
        return res
          .status(
            access.reason ===
              "not_found"
              ? 404
              : 403
          )
          .json({
            message:
              access.reason ===
              "not_found"
                ? "Task not found."
                : "You do not have access to this task.",
          });
      }

      const [comments] =
        await db.query(
          `
          SELECT
            tc.id,
            tc.task_id,
            tc.user_id,
            tc.comment,
            tc.created_at,
            u.name AS user_name,
            u.email AS user_email
          FROM task_comments tc
          INNER JOIN users u
            ON tc.user_id = u.id
          WHERE tc.task_id = ?
          ORDER BY tc.created_at ASC
          `,
          [id]
        );

      res.json(
        comments
      );
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message:
          "Could not retrieve comments.",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| ADD COMMENT
|--------------------------------------------------------------------------
*/

app.post(
  "/api/tasks/:id/comments",
  authenticateToken,
  async (req, res) => {
    try {
      const {
        id,
      } = req.params;

      const {
        comment,
      } = req.body;

      if (
        !comment ||
        !comment.trim()
      ) {
        return res.status(400).json({
          message:
            "Comment cannot be empty.",
        });
      }

      const access =
        await getTaskWithAccess(
          id,
          req.user.id
        );

      if (
        !access.allowed
      ) {
        return res
          .status(
            access.reason ===
              "not_found"
              ? 404
              : 403
          )
          .json({
            message:
              access.reason ===
              "not_found"
                ? "Task not found."
                : "You do not have access to this task.",
          });
      }

      const [result] =
        await db.query(
          `
          INSERT INTO task_comments
          (
            task_id,
            user_id,
            comment
          )
          VALUES (?, ?, ?)
          `,
          [
            id,
            req.user.id,
            comment.trim(),
          ]
        );

      await recordActivity(
        id,
        req.user.id,
        "comment_added",
        "Added a comment."
      );

      const [comments] =
        await db.query(
          `
          SELECT
            tc.id,
            tc.task_id,
            tc.user_id,
            tc.comment,
            tc.created_at,
            u.name AS user_name,
            u.email AS user_email
          FROM task_comments tc
          INNER JOIN users u
            ON tc.user_id = u.id
          WHERE tc.id = ?
          `,
          [
            result.insertId,
          ]
        );

      res.status(201).json(
        comments[0]
      );
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message:
          "Could not add comment.",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| DELETE COMMENT
|--------------------------------------------------------------------------
*/

app.delete(
  "/api/tasks/:taskId/comments/:commentId",
  authenticateToken,
  async (req, res) => {
    try {
      const {
        taskId,
        commentId,
      } = req.params;

      const access =
        await getTaskWithAccess(
          taskId,
          req.user.id
        );

      if (
        !access.allowed
      ) {
        return res.status(403).json({
          message:
            "You do not have access to this task.",
        });
      }

      const [comments] =
        await db.query(
          `
          SELECT *
          FROM task_comments
          WHERE id = ?
          AND task_id = ?
          `,
          [
            commentId,
            taskId,
          ]
        );

      if (
        comments.length === 0
      ) {
        return res.status(404).json({
          message:
            "Comment not found.",
        });
      }

      const comment =
        comments[0];

      /*
        Only the person who wrote
        the comment can delete it.
      */

      if (
        Number(
          comment.user_id
        ) !==
        Number(
          req.user.id
        )
      ) {
        return res.status(403).json({
          message:
            "You can only delete your own comments.",
        });
      }

      await db.query(
        `
        DELETE FROM task_comments
        WHERE id = ?
        `,
        [commentId]
      );

      await recordActivity(
        taskId,
        req.user.id,
        "comment_deleted",
        "Deleted a comment."
      );

      res.json({
        message:
          "Comment deleted successfully.",
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message:
          "Could not delete comment.",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| GET ACTIVITY
|--------------------------------------------------------------------------
*/

app.get(
  "/api/tasks/:id/activity",
  authenticateToken,
  async (req, res) => {
    try {
      const {
        id,
      } = req.params;

      const access =
        await getTaskWithAccess(
          id,
          req.user.id
        );

      if (
        !access.allowed
      ) {
        return res
          .status(
            access.reason ===
              "not_found"
              ? 404
              : 403
          )
          .json({
            message:
              access.reason ===
              "not_found"
                ? "Task not found."
                : "You do not have access to this task.",
          });
      }

      const [activity] =
        await db.query(
          `
          SELECT
            ta.id,
            ta.task_id,
            ta.user_id,
            ta.action,
            ta.description,
            ta.created_at,
            u.name AS user_name,
            u.email AS user_email
          FROM task_activity ta
          LEFT JOIN users u
            ON ta.user_id = u.id
          WHERE ta.task_id = ?
          ORDER BY ta.created_at DESC
          `,
          [id]
        );

      res.json(
        activity
      );
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message:
          "Could not retrieve task activity.",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| TASK DETAILS
|--------------------------------------------------------------------------
*/

app.get(
  "/api/tasks/:id/details",
  authenticateToken,
  async (req, res) => {
    try {
      const {
        id,
      } = req.params;

      const access =
        await getTaskWithAccess(
          id,
          req.user.id
        );

      if (
        !access.allowed
      ) {
        return res
          .status(
            access.reason ===
              "not_found"
              ? 404
              : 403
          )
          .json({
            message:
              access.reason ===
              "not_found"
                ? "Task not found."
                : "You do not have access to this task.",
          });
      }

      const [tasks] =
        await db.query(
          `
          SELECT
            t.*,
            p.name AS project_name,
            u.name AS assignee_name,
            u.email AS assignee_email
          FROM tasks t
          LEFT JOIN projects p
            ON t.project_id = p.id
          LEFT JOIN users u
            ON t.assigned_to = u.id
          WHERE t.id = ?
          `,
          [id]
        );

      const [comments] =
        await db.query(
          `
          SELECT
            tc.id,
            tc.task_id,
            tc.user_id,
            tc.comment,
            tc.created_at,
            u.name AS user_name,
            u.email AS user_email
          FROM task_comments tc
          INNER JOIN users u
            ON tc.user_id = u.id
          WHERE tc.task_id = ?
          ORDER BY tc.created_at ASC
          `,
          [id]
        );

      const [activity] =
        await db.query(
          `
          SELECT
            ta.id,
            ta.task_id,
            ta.user_id,
            ta.action,
            ta.description,
            ta.created_at,
            u.name AS user_name,
            u.email AS user_email
          FROM task_activity ta
          LEFT JOIN users u
            ON ta.user_id = u.id
          WHERE ta.task_id = ?
          ORDER BY ta.created_at DESC
          `,
          [id]
        );

      res.json({
        task:
          tasks[0],

        comments,

        activity,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message:
          "Could not retrieve task details.",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| START SERVER
|--------------------------------------------------------------------------
*/

app.listen(
  PORT,
  () => {
    console.log(
      `TaskFlow server running on http://localhost:${PORT}`
    );
  }
);