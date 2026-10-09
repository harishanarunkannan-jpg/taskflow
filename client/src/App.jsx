import { useEffect, useMemo, useState } from "react";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import "./App.css";

const API_BASE_URL = "http://localhost:5000";

const priorityOrder = {
  High: 1,
  Medium: 2,
  Low: 3,
};

function formatDate(dateString) {
  if (!dateString) {
    return "No due date";
  }

  const normalizedDate =
    typeof dateString === "string"
      ? dateString.slice(0, 10)
      : dateString;

  const date = new Date(
    `${normalizedDate}T00:00:00`
  );

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(dateString) {
  if (!dateString) {
    return "";
  }

  const date = new Date(dateString);

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getInitials(name) {
  if (!name) {
    return "U";
  }

  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getStatusLabel(status) {
  if (status === "todo") {
    return "To Do";
  }

  if (status === "progress") {
    return "In Progress";
  }

  if (status === "done") {
    return "Done";
  }

  return status;
}

/* ======================================================
   AUTH PAGE
====================================================== */

function AuthPage({
  authMode,
  setAuthMode,
  authForm,
  setAuthForm,
  authError,
  authLoading,
  onSubmit,
}) {
  function handleInputChange(event) {
    const {
      name,
      value,
    } = event.target;

    setAuthForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function switchMode(mode) {
    setAuthMode(mode);

    setAuthForm({
      name: "",
      email: "",
      password: "",
    });
  }

  return (
    <div className="auth-page">
      <div className="auth-grid"></div>

      <div className="auth-shell">
        <section className="auth-left">
          <div className="auth-brand">
            <div className="brand-icon">
              T
            </div>

            <div>
              <strong>
                TaskFlow
              </strong>

              <span>
                PROJECT MANAGEMENT
              </span>
            </div>
          </div>

          <div className="auth-hero">
            <span>
              BUILD. TRACK. SHIP.
            </span>

            <h1>
              Keep your work moving.
            </h1>

            <p>
              Projects, assignments,
              collaboration and Kanban
              workflows in one place.
            </p>
          </div>

          <div className="auth-points">
            <div>
              ✓ Project workspaces
            </div>

            <div>
              ✓ Team assignments
            </div>

            <div>
              ✓ Secure accounts
            </div>
          </div>
        </section>

        <section className="auth-right">
          <div className="auth-card">
            <span className="eyebrow">
              {authMode === "login"
                ? "WELCOME BACK"
                : "GET STARTED"}
            </span>

            <h2>
              {authMode === "login"
                ? "Sign in to TaskFlow"
                : "Create your account"}
            </h2>

            <p>
              {authMode === "login"
                ? "Continue to your workspace."
                : "Create an account and start building."}
            </p>

            <div className="auth-tabs">
              <button
                type="button"
                className={
                  authMode === "login"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  switchMode("login")
                }
              >
                Sign In
              </button>

              <button
                type="button"
                className={
                  authMode === "register"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  switchMode("register")
                }
              >
                Create Account
              </button>
            </div>

            <form
              className="auth-form"
              onSubmit={onSubmit}
            >
              {authMode === "register" && (
                <label>
                  Full name

                  <input
                    type="text"
                    name="name"
                    value={authForm.name}
                    onChange={handleInputChange}
                    placeholder="Your name"
                  />
                </label>
              )}

              <label>
                Email

                <input
                  type="email"
                  name="email"
                  value={authForm.email}
                  onChange={handleInputChange}
                  placeholder="you@example.com"
                />
              </label>

              <label>
                Password

                <input
                  type="password"
                  name="password"
                  value={authForm.password}
                  onChange={handleInputChange}
                  placeholder="Password"
                />
              </label>

              {authError && (
                <div className="auth-error">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                className="primary-button auth-submit"
                disabled={authLoading}
              >
                {authLoading
                  ? "Please wait..."
                  : authMode === "login"
                    ? "Sign In"
                    : "Create Account"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}

/* ======================================================
   TASK CARDS
====================================================== */

function TaskCardContent({
  task,
  status,
  openMenuTaskId,
  onToggleMenu,
  onEdit,
  onDelete,
  isOverlay = false,
}) {
  const isMenuOpen =
    openMenuTaskId === task.id;

  return (
    <>
      <div className="task-card-top">
        <span
          className={`priority ${task.priority.toLowerCase()}`}
        >
          {task.priority}
        </span>

        {!isOverlay && (
          <div className="task-menu-wrapper">
            <button
              type="button"
              className="task-menu"
              onPointerDown={(event) =>
                event.stopPropagation()
              }
              onClick={(event) => {
                event.stopPropagation();

                onToggleMenu(task.id);
              }}
            >
              •••
            </button>

            {isMenuOpen && (
              <div className="task-dropdown">
                <button
                  type="button"
                  onPointerDown={(event) =>
                    event.stopPropagation()
                  }
                  onClick={(event) => {
                    event.stopPropagation();

                    onEdit(
                      task,
                      status
                    );
                  }}
                >
                  ✎ Edit task
                </button>

                <button
                  type="button"
                  className="delete-option"
                  onPointerDown={(event) =>
                    event.stopPropagation()
                  }
                  onClick={(event) => {
                    event.stopPropagation();

                    onDelete(
                      task.id
                    );
                  }}
                >
                  × Delete task
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <h3>
        {task.title}
      </h3>

      <p>
        {task.description}
      </p>

      {task.project_name && (
        <span className="task-project-name">
          {task.project_name}
        </span>
      )}

      <div className="task-card-footer">
        <span className="task-date">
          {task.due_date
            ? `Due ${formatDate(task.due_date)}`
            : "No due date"}
        </span>

        <div
          className="task-avatar"
          title={
            task.assignee_name ||
            "Unassigned"
          }
        >
          {task.assignee_name
            ? getInitials(
                task.assignee_name
              )
            : "?"}
        </div>
      </div>
    </>
  );
}

function DraggableTaskCard({
  task,
  status,
  openMenuTaskId,
  onToggleMenu,
  onEdit,
  onDelete,
  onOpenDetails,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `task-${task.id}`,

    data: {
      task,
      status,
    },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`task-card draggable-task ${
        isDragging
          ? "is-dragging"
          : ""
      }`}
      onClick={() => {
        if (!isDragging) {
          onOpenDetails(task);
        }
      }}
      {...listeners}
      {...attributes}
    >
      <TaskCardContent
        task={task}
        status={status}
        openMenuTaskId={
          openMenuTaskId
        }
        onToggleMenu={
          onToggleMenu
        }
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </article>
  );
}

function TaskColumn({
  title,
  status,
  tasks,
  dotClass,
  onAddTask,
  canAddTask,
  openMenuTaskId,
  onToggleMenu,
  onEdit,
  onDelete,
  onOpenDetails,
}) {
  const {
    setNodeRef,
    isOver,
  } = useDroppable({
    id: status,

    data: {
      status,
    },
  });

  return (
    <section
      ref={setNodeRef}
      className={`task-column ${
        isOver
          ? "column-drag-over"
          : ""
      }`}
    >
      <div className="column-header">
        <div>
          <span
            className={`column-dot ${dotClass}`}
          ></span>

          <h2>
            {title}
          </h2>
        </div>

        <span className="task-count">
          {tasks.length}
        </span>
      </div>

      <div className="column-tasks">
        {tasks.map((task) => (
          <DraggableTaskCard
            key={task.id}
            task={task}
            status={status}
            openMenuTaskId={
              openMenuTaskId
            }
            onToggleMenu={
              onToggleMenu
            }
            onEdit={onEdit}
            onDelete={onDelete}
            onOpenDetails={
              onOpenDetails
            }
          />
        ))}

        {tasks.length === 0 && (
          <div className="empty-column">
            No tasks
          </div>
        )}
      </div>

      {canAddTask && (
        <button
          type="button"
          className="add-task-button"
          onClick={onAddTask}
        >
          + Add task
        </button>
      )}
    </section>
  );
}

/* ======================================================
   TASK DETAILS DRAWER
====================================================== */

function TaskDetailsDrawer({
  details,
  loading,
  activeTab,
  setActiveTab,
  commentText,
  setCommentText,
  commentPosting,
  commentError,
  currentUser,
  onClose,
  onPostComment,
  onDeleteComment,
  onEditTask,
}) {
  const task =
    details?.task;

  return (
    <div
      className="details-overlay"
      onClick={onClose}
    >
      <aside
        className="task-details-drawer"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        <div className="details-header">
          <div>
            <span className="eyebrow">
              TASK DETAILS
            </span>

            <h2>
              {task?.title ||
                "Loading task..."}
            </h2>
          </div>

          <button
            type="button"
            className="close-button"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {loading ? (
          <div className="details-loading">
            Loading task details...
          </div>
        ) : !task ? (
          <div className="details-loading">
            Task could not be loaded.
          </div>
        ) : (
          <>
            <div className="details-status-row">
              <span
                className={`priority ${task.priority.toLowerCase()}`}
              >
                {task.priority}
              </span>

              <span
                className={`status-pill status-${task.status}`}
              >
                {getStatusLabel(
                  task.status
                )}
              </span>

              <button
                type="button"
                className="details-edit-button"
                onClick={() =>
                  onEditTask(
                    task,
                    task.status
                  )
                }
              >
                ✎ Edit
              </button>
            </div>

            <div className="details-description">
              <span className="details-label">
                DESCRIPTION
              </span>

              <p>
                {task.description ||
                  "No description provided."}
              </p>
            </div>

            <div className="details-metadata">
              <div className="metadata-item">
                <span className="details-label">
                  PROJECT
                </span>

                <strong>
                  {task.project_name ||
                    "No project"}
                </strong>
              </div>

              <div className="metadata-item">
                <span className="details-label">
                  ASSIGNED TO
                </span>

                <div className="details-assignee">
                  <div className="member-avatar">
                    {getInitials(
                      task.assignee_name
                    )}
                  </div>

                  <div>
                    <strong>
                      {task.assignee_name ||
                        "Unassigned"}
                    </strong>

                    <span>
                      {task.assignee_email ||
                        ""}
                    </span>
                  </div>
                </div>
              </div>

              <div className="metadata-item">
                <span className="details-label">
                  DUE DATE
                </span>

                <strong>
                  {task.due_date
                    ? formatDate(
                        task.due_date
                      )
                    : "No due date"}
                </strong>
              </div>

              <div className="metadata-item">
                <span className="details-label">
                  CREATED
                </span>

                <strong>
                  {formatDateTime(
                    task.created_at
                  )}
                </strong>
              </div>
            </div>

            <div className="details-tabs">
              <button
                type="button"
                className={
                  activeTab === "comments"
                    ? "details-tab active"
                    : "details-tab"
                }
                onClick={() =>
                  setActiveTab(
                    "comments"
                  )
                }
              >
                Comments
                <span>
                  {details.comments
                    ?.length || 0}
                </span>
              </button>

              <button
                type="button"
                className={
                  activeTab === "activity"
                    ? "details-tab active"
                    : "details-tab"
                }
                onClick={() =>
                  setActiveTab(
                    "activity"
                  )
                }
              >
                Activity
                <span>
                  {details.activity
                    ?.length || 0}
                </span>
              </button>
            </div>

            {activeTab ===
              "comments" && (
              <div className="comments-section">
                <div className="comments-list">
                  {details.comments
                    ?.length === 0 && (
                    <div className="empty-detail-state">
                      <strong>
                        No comments yet
                      </strong>

                      <span>
                        Start the
                        conversation below.
                      </span>
                    </div>
                  )}

                  {details.comments?.map(
                    (comment) => (
                      <div
                        key={
                          comment.id
                        }
                        className="comment-item"
                      >
                        <div className="comment-avatar">
                          {getInitials(
                            comment.user_name
                          )}
                        </div>

                        <div className="comment-body">
                          <div className="comment-heading">
                            <div>
                              <strong>
                                {
                                  comment.user_name
                                }
                              </strong>

                              <span>
                                {formatDateTime(
                                  comment.created_at
                                )}
                              </span>
                            </div>

                            {Number(
                              comment.user_id
                            ) ===
                              Number(
                                currentUser.id
                              ) && (
                              <button
                                type="button"
                                className="comment-delete"
                                onClick={() =>
                                  onDeleteComment(
                                    comment.id
                                  )
                                }
                              >
                                Delete
                              </button>
                            )}
                          </div>

                          <p>
                            {
                              comment.comment
                            }
                          </p>
                        </div>
                      </div>
                    )
                  )}
                </div>

                <form
                  className="comment-form"
                  onSubmit={
                    onPostComment
                  }
                >
                  <div className="comment-compose">
                    <div className="comment-avatar current-user-comment-avatar">
                      {getInitials(
                        currentUser.name
                      )}
                    </div>

                    <textarea
                      rows="3"
                      value={
                        commentText
                      }
                      onChange={(
                        event
                      ) =>
                        setCommentText(
                          event.target
                            .value
                        )
                      }
                      placeholder="Add a comment..."
                    ></textarea>
                  </div>

                  {commentError && (
                    <div className="comment-error">
                      {
                        commentError
                      }
                    </div>
                  )}

                  <div className="comment-form-actions">
                    <button
                      type="submit"
                      className="primary-button"
                      disabled={
                        commentPosting ||
                        !commentText.trim()
                      }
                    >
                      {commentPosting
                        ? "Posting..."
                        : "Post Comment"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab ===
              "activity" && (
              <div className="activity-section">
                {details.activity
                  ?.length === 0 && (
                  <div className="empty-detail-state">
                    <strong>
                      No activity yet
                    </strong>

                    <span>
                      Task changes will
                      appear here.
                    </span>
                  </div>
                )}

                {details.activity?.map(
                  (item) => (
                    <div
                      className="activity-item"
                      key={item.id}
                    >
                      <div className="activity-line">
                        <div className="activity-dot"></div>
                      </div>

                      <div className="activity-content">
                        <div className="activity-heading">
                          <strong>
                            {item.user_name ||
                              "TaskFlow"}
                          </strong>

                          <span>
                            {formatDateTime(
                              item.created_at
                            )}
                          </span>
                        </div>

                        <p>
                          {
                            item.description
                          }
                        </p>

                        <span className="activity-action">
                          {item.action
                            .replaceAll(
                              "_",
                              " "
                            )
                            .toUpperCase()}
                        </span>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </>
        )}
      </aside>
    </div>
  );
}

/* ======================================================
   APP
====================================================== */

function App() {
  const [token, setToken] =
    useState(
      localStorage.getItem(
        "taskflowToken"
      ) || ""
    );

  const [user, setUser] =
    useState(() => {
      const saved =
        localStorage.getItem(
          "taskflowUser"
        );

      if (!saved) {
        return null;
      }

      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    });

  /* AUTH */

  const [
    authMode,
    setAuthMode,
  ] = useState("login");

  const [
    authForm,
    setAuthForm,
  ] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [
    authError,
    setAuthError,
  ] = useState("");

  const [
    authLoading,
    setAuthLoading,
  ] = useState(false);

  /* PROJECTS */

  const [
    projects,
    setProjects,
  ] = useState([]);

  const [
    selectedProject,
    setSelectedProject,
  ] = useState(null);

  const [
    projectMembers,
    setProjectMembers,
  ] = useState([]);

  const [
    currentView,
    setCurrentView,
  ] = useState("project");

  const [
    projectModalOpen,
    setProjectModalOpen,
  ] = useState(false);

  const [
    projectForm,
    setProjectForm,
  ] = useState({
    name: "",
    description: "",
  });

  const [
    inviteModalOpen,
    setInviteModalOpen,
  ] = useState(false);

  const [
    inviteEmail,
    setInviteEmail,
  ] = useState("");

  const [
    inviteMessage,
    setInviteMessage,
  ] = useState("");

  /* TASKS */

  const [
    tasks,
    setTasks,
  ] = useState({
    todo: [],
    progress: [],
    done: [],
  });

  const [
    isLoading,
    setIsLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    taskModalOpen,
    setTaskModalOpen,
  ] = useState(false);

  const [
    modalMode,
    setModalMode,
  ] = useState("create");

  const [
    editingTaskId,
    setEditingTaskId,
  ] = useState(null);

  const [
    openMenuTaskId,
    setOpenMenuTaskId,
  ] = useState(null);

  const [
    activeDragTask,
    setActiveDragTask,
  ] = useState(null);

  const [
    searchQuery,
    setSearchQuery,
  ] = useState("");

  const [
    priorityFilter,
    setPriorityFilter,
  ] = useState("All");

  const [
    sortOption,
    setSortOption,
  ] = useState("Newest");

  const [
    userMenuOpen,
    setUserMenuOpen,
  ] = useState(false);

  const [
    taskForm,
    setTaskForm,
  ] = useState({
    title: "",
    description: "",
    priority: "Medium",
    status: "todo",
    dueDate: "",
    assignedTo: "",
  });

  /* TASK DETAILS */

  const [
    detailsOpen,
    setDetailsOpen,
  ] = useState(false);

  const [
    detailsTaskId,
    setDetailsTaskId,
  ] = useState(null);

  const [
    taskDetails,
    setTaskDetails,
  ] = useState(null);

  const [
    detailsLoading,
    setDetailsLoading,
  ] = useState(false);

  const [
    detailsTab,
    setDetailsTab,
  ] = useState("comments");

  const [
    commentText,
    setCommentText,
  ] = useState("");

  const [
    commentPosting,
    setCommentPosting,
  ] = useState(false);

  const [
    commentError,
    setCommentError,
  ] = useState("");

  const sensors = useSensors(
    useSensor(
      PointerSensor,
      {
        activationConstraint: {
          distance: 6,
        },
      }
    )
  );

  async function authenticatedFetch(
    url,
    options = {}
  ) {
    return fetch(url, {
      ...options,

      headers: {
        ...options.headers,

        Authorization:
          `Bearer ${token}`,
      },
    });
  }

  useEffect(() => {
    if (
      token &&
      user
    ) {
      loadProjects();
    }
  }, [token]);

  /* ======================================================
     AUTH
  ====================================================== */

  async function handleAuthSubmit(
    event
  ) {
    event.preventDefault();

    setAuthError("");

    if (
      !authForm.email.trim() ||
      !authForm.password
    ) {
      setAuthError(
        "Email and password are required."
      );

      return;
    }

    if (
      authMode === "register" &&
      !authForm.name.trim()
    ) {
      setAuthError(
        "Name is required."
      );

      return;
    }

    try {
      setAuthLoading(true);

      const endpoint =
        authMode === "login"
          ? `${API_BASE_URL}/api/auth/login`
          : `${API_BASE_URL}/api/auth/register`;

      const body =
        authMode === "login"
          ? {
              email:
                authForm.email.trim(),

              password:
                authForm.password,
            }
          : {
              name:
                authForm.name.trim(),

              email:
                authForm.email.trim(),

              password:
                authForm.password,
            };

      const response =
        await fetch(
          endpoint,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                body
              ),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Authentication failed."
        );
      }

      localStorage.setItem(
        "taskflowToken",
        data.token
      );

      localStorage.setItem(
        "taskflowUser",
        JSON.stringify(
          data.user
        )
      );

      setToken(data.token);
      setUser(data.user);

      setAuthForm({
        name: "",
        email: "",
        password: "",
      });
    } catch (error) {
      setAuthError(
        error.message
      );
    } finally {
      setAuthLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem(
      "taskflowToken"
    );

    localStorage.removeItem(
      "taskflowUser"
    );

    setToken("");
    setUser(null);

    setProjects([]);
    setSelectedProject(null);

    setTasks({
      todo: [],
      progress: [],
      done: [],
    });

    closeTaskDetails();
  }

  /* ======================================================
     PROJECTS
  ====================================================== */

  async function loadProjects() {
    try {
      setError("");

      const response =
        await authenticatedFetch(
          `${API_BASE_URL}/api/projects`
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Could not load projects."
        );
      }

      setProjects(data);

      if (data.length > 0) {
        const project =
          data[0];

        setSelectedProject(
          project
        );

        setCurrentView(
          "project"
        );

        await loadProjectData(
          project.id
        );
      } else {
        setSelectedProject(null);
        setProjectMembers([]);

        organizeTasks([]);
      }
    } catch (error) {
      setError(
        error.message
      );
    }
  }

  async function selectProject(
    project
  ) {
    closeTaskDetails();

    setSelectedProject(
      project
    );

    setCurrentView(
      "project"
    );

    setSearchQuery("");

    await loadProjectData(
      project.id
    );
  }

  async function loadProjectData(
    projectId
  ) {
    await Promise.all([
      loadProjectTasks(
        projectId
      ),

      loadProjectMembers(
        projectId
      ),
    ]);
  }

  async function loadProjectTasks(
    projectId
  ) {
    try {
      setIsLoading(true);

      const response =
        await authenticatedFetch(
          `${API_BASE_URL}/api/projects/${projectId}/tasks`
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Could not load project tasks."
        );
      }

      organizeTasks(data);
    } catch (error) {
      setError(
        error.message
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function loadProjectMembers(
    projectId
  ) {
    try {
      const response =
        await authenticatedFetch(
          `${API_BASE_URL}/api/projects/${projectId}/members`
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message
        );
      }

      setProjectMembers(
        data
      );
    } catch (error) {
      console.error(error);

      setProjectMembers([]);
    }
  }

  async function createProject(
    event
  ) {
    event.preventDefault();

    if (
      !projectForm.name.trim()
    ) {
      return;
    }

    try {
      const response =
        await authenticatedFetch(
          `${API_BASE_URL}/api/projects`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                name:
                  projectForm.name.trim(),

                description:
                  projectForm.description.trim(),
              }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message
        );
      }

      setProjectModalOpen(false);

      setProjectForm({
        name: "",
        description: "",
      });

      await loadProjects();
    } catch (error) {
      setError(
        error.message
      );
    }
  }

  /* ======================================================
     INVITE MEMBER
  ====================================================== */

  async function inviteMember(
    event
  ) {
    event.preventDefault();

    if (
      !selectedProject ||
      !inviteEmail.trim()
    ) {
      return;
    }

    try {
      setInviteMessage("");

      const response =
        await authenticatedFetch(
          `${API_BASE_URL}/api/projects/${selectedProject.id}/members`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                email:
                  inviteEmail.trim(),
              }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message
        );
      }

      setInviteMessage(
        "Member added successfully."
      );

      setInviteEmail("");

      await loadProjectMembers(
        selectedProject.id
      );
    } catch (error) {
      setInviteMessage(
        error.message
      );
    }
  }

  /* ======================================================
     MY TASKS
  ====================================================== */

  async function loadMyTasks() {
    closeTaskDetails();

    try {
      setCurrentView(
        "mine"
      );

      setSelectedProject(
        null
      );

      setIsLoading(
        true
      );

      const response =
        await authenticatedFetch(
          `${API_BASE_URL}/api/tasks/mine`
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message
        );
      }

      organizeTasks(
        data
      );

      setProjectMembers([]);
    } catch (error) {
      setError(
        error.message
      );
    } finally {
      setIsLoading(
        false
      );
    }
  }

  /* ======================================================
     TASK DETAILS
  ====================================================== */

  async function openTaskDetails(
    task
  ) {
    setDetailsOpen(true);

    setDetailsTaskId(
      task.id
    );

    setDetailsTab(
      "comments"
    );

    setCommentText("");
    setCommentError("");

    await loadTaskDetails(
      task.id
    );
  }

  async function loadTaskDetails(
    taskId
  ) {
    try {
      setDetailsLoading(
        true
      );

      const response =
        await authenticatedFetch(
          `${API_BASE_URL}/api/tasks/${taskId}/details`
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Could not load task details."
        );
      }

      setTaskDetails(
        data
      );
    } catch (error) {
      setError(
        error.message
      );
    } finally {
      setDetailsLoading(
        false
      );
    }
  }

  function closeTaskDetails() {
    setDetailsOpen(false);

    setDetailsTaskId(null);
    setTaskDetails(null);

    setCommentText("");
    setCommentError("");
  }

  async function postComment(
    event
  ) {
    event.preventDefault();

    if (
      !commentText.trim() ||
      !detailsTaskId
    ) {
      return;
    }

    try {
      setCommentPosting(
        true
      );

      setCommentError("");

      const response =
        await authenticatedFetch(
          `${API_BASE_URL}/api/tasks/${detailsTaskId}/comments`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                comment:
                  commentText.trim(),
              }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Could not post comment."
        );
      }

      setCommentText("");

      await loadTaskDetails(
        detailsTaskId
      );
    } catch (error) {
      setCommentError(
        error.message
      );
    } finally {
      setCommentPosting(
        false
      );
    }
  }

  async function deleteComment(
    commentId
  ) {
    if (!detailsTaskId) {
      return;
    }

    const confirmed =
      window.confirm(
        "Delete this comment?"
      );

    if (!confirmed) {
      return;
    }

    try {
      const response =
        await authenticatedFetch(
          `${API_BASE_URL}/api/tasks/${detailsTaskId}/comments/${commentId}`,
          {
            method: "DELETE",
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Could not delete comment."
        );
      }

      await loadTaskDetails(
        detailsTaskId
      );
    } catch (error) {
      setCommentError(
        error.message
      );
    }
  }

  /* ======================================================
     TASK HELPERS
  ====================================================== */

  function organizeTasks(
    taskList
  ) {
    setTasks({
      todo:
        taskList.filter(
          (task) =>
            task.status ===
            "todo"
        ),

      progress:
        taskList.filter(
          (task) =>
            task.status ===
            "progress"
        ),

      done:
        taskList.filter(
          (task) =>
            task.status ===
            "done"
        ),
    });
  }

  function resetTaskForm(
    status = "todo"
  ) {
    setTaskForm({
      title: "",
      description: "",
      priority: "Medium",
      status,
      dueDate: "",
      assignedTo:
        user?.id || "",
    });
  }

  function openNewTaskModal(
    status = "todo"
  ) {
    if (!selectedProject) {
      setError(
        "Select a project before creating a project task."
      );

      return;
    }

    setModalMode(
      "create"
    );

    setEditingTaskId(
      null
    );

    resetTaskForm(
      status
    );

    setTaskModalOpen(
      true
    );
  }

  function openEditTaskModal(
    task,
    status
  ) {
    setModalMode(
      "edit"
    );

    setEditingTaskId(
      task.id
    );

    setTaskForm({
      title:
        task.title,

      description:
        task.description || "",

      priority:
        task.priority,

      status,

      dueDate:
        task.due_date
          ? task.due_date.slice(
              0,
              10
            )
          : "",

      assignedTo:
        task.assigned_to || "",
    });

    setOpenMenuTaskId(
      null
    );

    setTaskModalOpen(
      true
    );
  }

  function closeTaskModal() {
    setTaskModalOpen(
      false
    );

    setEditingTaskId(
      null
    );

    resetTaskForm();
  }

  function handleTaskInputChange(
    event
  ) {
    const {
      name,
      value,
    } = event.target;

    setTaskForm(
      (previous) => ({
        ...previous,

        [name]: value,
      })
    );
  }

  function toggleTaskMenu(
    taskId
  ) {
    setOpenMenuTaskId(
      (previous) =>
        previous === taskId
          ? null
          : taskId
    );
  }

  async function submitTask(
    event
  ) {
    event.preventDefault();

    if (
      !taskForm.title.trim()
    ) {
      return;
    }

    if (
      modalMode === "create"
    ) {
      await createTask();
    } else {
      await updateTask();
    }
  }

  async function createTask() {
    if (!selectedProject) {
      return;
    }

    try {
      const response =
        await authenticatedFetch(
          `${API_BASE_URL}/api/tasks`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                title:
                  taskForm.title.trim(),

                description:
                  taskForm.description.trim(),

                priority:
                  taskForm.priority,

                status:
                  taskForm.status,

                dueDate:
                  taskForm.dueDate,

                projectId:
                  selectedProject.id,

                assignedTo:
                  Number(
                    taskForm.assignedTo
                  ),
              }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message
        );
      }

      closeTaskModal();

      await loadProjectTasks(
        selectedProject.id
      );
    } catch (error) {
      setError(
        error.message
      );
    }
  }

  async function updateTask() {
    try {
      const response =
        await authenticatedFetch(
          `${API_BASE_URL}/api/tasks/${editingTaskId}`,
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                title:
                  taskForm.title.trim(),

                description:
                  taskForm.description.trim(),

                priority:
                  taskForm.priority,

                status:
                  taskForm.status,

                dueDate:
                  taskForm.dueDate,

                assignedTo:
                  Number(
                    taskForm.assignedTo
                  ),
              }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message
        );
      }

      closeTaskModal();

      await refreshCurrentTasks();

      if (
        detailsTaskId ===
        editingTaskId
      ) {
        await loadTaskDetails(
          editingTaskId
        );
      }
    } catch (error) {
      setError(
        error.message
      );
    }
  }

  async function deleteTask(
    taskId
  ) {
    const confirmed =
      window.confirm(
        "Delete this task?"
      );

    if (!confirmed) {
      return;
    }

    try {
      const response =
        await authenticatedFetch(
          `${API_BASE_URL}/api/tasks/${taskId}`,
          {
            method:
              "DELETE",
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message
        );
      }

      setOpenMenuTaskId(
        null
      );

      if (
        Number(
          detailsTaskId
        ) ===
        Number(
          taskId
        )
      ) {
        closeTaskDetails();
      }

      await refreshCurrentTasks();
    } catch (error) {
      setError(
        error.message
      );
    }
  }

  async function refreshCurrentTasks() {
    if (
      currentView ===
      "mine"
    ) {
      await loadMyTasks();

      return;
    }

    if (
      selectedProject
    ) {
      await loadProjectTasks(
        selectedProject.id
      );
    }
  }

  /* ======================================================
     DRAG AND DROP
  ====================================================== */

  function handleDragStart(
    event
  ) {
    const data =
      event.active.data.current;

    if (!data) {
      return;
    }

    setActiveDragTask({
      ...data.task,

      originalStatus:
        data.status,
    });

    setOpenMenuTaskId(
      null
    );
  }

  async function handleDragEnd(
    event
  ) {
    const {
      active,
      over,
    } = event;

    setActiveDragTask(
      null
    );

    if (!over) {
      return;
    }

    const data =
      active.data.current;

    if (!data) {
      return;
    }

    const task =
      data.task;

    const originalStatus =
      data.status;

    const newStatus =
      over.id;

    if (
      ![
        "todo",
        "progress",
        "done",
      ].includes(newStatus)
    ) {
      return;
    }

    if (
      newStatus ===
      originalStatus
    ) {
      return;
    }

    setTasks(
      (previous) => {
        const movedTask = {
          ...task,

          status:
            newStatus,
        };

        return {
          ...previous,

          [originalStatus]:
            previous[
              originalStatus
            ].filter(
              (currentTask) =>
                currentTask.id !==
                task.id
            ),

          [newStatus]: [
            ...previous[
              newStatus
            ],

            movedTask,
          ],
        };
      }
    );

    try {
      const response =
        await authenticatedFetch(
          `${API_BASE_URL}/api/tasks/${task.id}`,
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                title:
                  task.title,

                description:
                  task.description,

                priority:
                  task.priority,

                status:
                  newStatus,

                dueDate:
                  task.due_date
                    ? task.due_date.slice(
                        0,
                        10
                      )
                    : "",

                assignedTo:
                  task.assigned_to,
              }),
          }
        );

      if (!response.ok) {
        throw new Error(
          "Could not move task."
        );
      }

      await refreshCurrentTasks();

      if (
        Number(
          detailsTaskId
        ) ===
        Number(
          task.id
        )
      ) {
        await loadTaskDetails(
          task.id
        );
      }
    } catch (error) {
      setError(
        error.message
      );

      await refreshCurrentTasks();
    }
  }

  /* ======================================================
     FILTERING
  ====================================================== */

  function filterAndSortTasks(
    taskList
  ) {
    let filtered =
      [...taskList];

    if (
      searchQuery.trim()
    ) {
      const query =
        searchQuery.toLowerCase();

      filtered =
        filtered.filter(
          (task) =>
            task.title
              ?.toLowerCase()
              .includes(query) ||
            task.description
              ?.toLowerCase()
              .includes(query) ||
            task.assignee_name
              ?.toLowerCase()
              .includes(query)
        );
    }

    if (
      priorityFilter !==
      "All"
    ) {
      filtered =
        filtered.filter(
          (task) =>
            task.priority ===
            priorityFilter
        );
    }

    if (
      sortOption ===
      "Priority"
    ) {
      filtered.sort(
        (a, b) =>
          priorityOrder[
            a.priority
          ] -
          priorityOrder[
            b.priority
          ]
      );
    }

    if (
      sortOption ===
      "Due Soon"
    ) {
      filtered.sort(
        (a, b) => {
          if (!a.due_date) {
            return 1;
          }

          if (!b.due_date) {
            return -1;
          }

          return (
            new Date(
              a.due_date
            ) -
            new Date(
              b.due_date
            )
          );
        }
      );
    }

    if (
      sortOption ===
      "Newest"
    ) {
      filtered.sort(
        (a, b) =>
          new Date(
            b.created_at
          ) -
          new Date(
            a.created_at
          )
      );
    }

    if (
      sortOption ===
      "Oldest"
    ) {
      filtered.sort(
        (a, b) =>
          new Date(
            a.created_at
          ) -
          new Date(
            b.created_at
          )
      );
    }

    return filtered;
  }

  const visibleTasks =
    useMemo(
      () => ({
        todo:
          filterAndSortTasks(
            tasks.todo
          ),

        progress:
          filterAndSortTasks(
            tasks.progress
          ),

        done:
          filterAndSortTasks(
            tasks.done
          ),
      }),
      [
        tasks,
        searchQuery,
        priorityFilter,
        sortOption,
      ]
    );

  if (
    !token ||
    !user
  ) {
    return (
      <AuthPage
        authMode={
          authMode
        }
        setAuthMode={
          setAuthMode
        }
        authForm={
          authForm
        }
        setAuthForm={
          setAuthForm
        }
        authError={
          authError
        }
        authLoading={
          authLoading
        }
        onSubmit={
          handleAuthSubmit
        }
      />
    );
  }

  const displayTitle =
    currentView === "mine"
      ? "My Tasks"
      : selectedProject
        ? selectedProject.name
        : "Projects";

  const displayDescription =
    currentView === "mine"
      ? "Tasks currently assigned to you."
      : selectedProject
        ? selectedProject.description ||
          "Manage project tasks and team progress."
        : "Create your first project to begin.";

  const canAddTask =
    currentView === "project" &&
    Boolean(
      selectedProject
    );

  return (
    <DndContext
      sensors={sensors}
      onDragStart={
        handleDragStart
      }
      onDragEnd={
        handleDragEnd
      }
      onDragCancel={() =>
        setActiveDragTask(
          null
        )
      }
    >
      <div className="taskflow-app">
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-icon">
              T
            </div>

            <div>
              <strong>
                TaskFlow
              </strong>

              <span>
                WORKSPACE
              </span>
            </div>
          </div>

          <nav className="sidebar-nav">
            <button
              type="button"
              className={
                currentView ===
                "project"
                  ? "nav-item active"
                  : "nav-item"
              }
              onClick={() => {
                if (
                  selectedProject
                ) {
                  selectProject(
                    selectedProject
                  );
                } else if (
                  projects.length >
                  0
                ) {
                  selectProject(
                    projects[0]
                  );
                }
              }}
            >
              <span>
                ▦
              </span>

              Dashboard
            </button>

            <button
              type="button"
              className={
                currentView ===
                "mine"
                  ? "nav-item active"
                  : "nav-item"
              }
              onClick={
                loadMyTasks
              }
            >
              <span>
                □
              </span>

              My Tasks
            </button>

            <button
              type="button"
              className="nav-item"
              onClick={() =>
                setProjectModalOpen(
                  true
                )
              }
            >
              <span>
                ＋
              </span>

              New Project
            </button>
          </nav>

          <div className="sidebar-section">
            <div className="sidebar-section-heading">
              <span className="sidebar-label">
                PROJECTS
              </span>

              <button
                type="button"
                className="tiny-add-button"
                onClick={() =>
                  setProjectModalOpen(
                    true
                  )
                }
              >
                +
              </button>
            </div>

            {projects.length ===
              0 && (
              <span className="no-projects-text">
                No projects yet
              </span>
            )}

            {projects.map(
              (project) => (
                <button
                  key={
                    project.id
                  }
                  type="button"
                  className={`project-nav ${
                    selectedProject
                      ?.id ===
                      project.id &&
                    currentView ===
                      "project"
                      ? "active-project"
                      : ""
                  }`}
                  onClick={() =>
                    selectProject(
                      project
                    )
                  }
                >
                  <span className="project-color"></span>

                  <span className="project-nav-name">
                    {
                      project.name
                    }
                  </span>
                </button>
              )
            )}
          </div>

          <div className="sidebar-bottom">
            <div className="sidebar-user-wrapper">
              <button
                type="button"
                className="sidebar-user"
                onClick={() =>
                  setUserMenuOpen(
                    (previous) =>
                      !previous
                  )
                }
              >
                <div className="user-avatar">
                  {getInitials(
                    user.name
                  )}
                </div>

                <div>
                  <strong>
                    {user.name}
                  </strong>

                  <span>
                    {user.email}
                  </span>
                </div>

                <span>
                  •••
                </span>
              </button>

              {userMenuOpen && (
                <div className="user-menu">
                  <button
                    type="button"
                    onClick={
                      logout
                    }
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>

        <main className="main-content">
          <header className="topbar">
            <div>
              <span className="breadcrumb">
                Workspace /{" "}
                {currentView ===
                "mine"
                  ? "My Tasks"
                  : "Projects"}
              </span>

              <h1>
                {displayTitle}
              </h1>

              <p>
                {
                  displayDescription
                }
              </p>
            </div>

            <div className="topbar-actions">
              {selectedProject &&
                currentView ===
                  "project" && (
                  <>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => {
                        setInviteMessage(
                          ""
                        );

                        setInviteModalOpen(
                          true
                        );
                      }}
                    >
                      + Invite
                    </button>

                    <button
                      type="button"
                      className="primary-button"
                      onClick={() =>
                        openNewTaskModal(
                          "todo"
                        )
                      }
                    >
                      + New Task
                    </button>
                  </>
                )}
            </div>
          </header>

          {selectedProject &&
            currentView ===
              "project" && (
              <div className="member-row">
                <span>
                  Team
                </span>

                <div className="member-avatars">
                  {projectMembers.map(
                    (member) => (
                      <div
                        key={
                          member.id
                        }
                        className="member-avatar"
                        title={`${member.name} - ${member.role}`}
                      >
                        {getInitials(
                          member.name
                        )}
                      </div>
                    )
                  )}
                </div>

                <span className="member-count">
                  {
                    projectMembers.length
                  }{" "}
                  member
                  {projectMembers.length ===
                  1
                    ? ""
                    : "s"}
                </span>
              </div>
            )}

          <section className="project-toolbar">
            <div className="search-box">
              <span>
                ⌕
              </span>

              <input
                type="text"
                placeholder="Search tasks or assignees..."
                value={
                  searchQuery
                }
                onChange={(
                  event
                ) =>
                  setSearchQuery(
                    event.target
                      .value
                  )
                }
              />
            </div>

            <div className="toolbar-actions">
              <select
                value={
                  priorityFilter
                }
                onChange={(
                  event
                ) =>
                  setPriorityFilter(
                    event.target
                      .value
                  )
                }
              >
                <option value="All">
                  All priorities
                </option>

                <option value="High">
                  High
                </option>

                <option value="Medium">
                  Medium
                </option>

                <option value="Low">
                  Low
                </option>
              </select>

              <select
                value={
                  sortOption
                }
                onChange={(
                  event
                ) =>
                  setSortOption(
                    event.target
                      .value
                  )
                }
              >
                <option value="Newest">
                  Newest
                </option>

                <option value="Oldest">
                  Oldest
                </option>

                <option value="Due Soon">
                  Due soon
                </option>

                <option value="Priority">
                  Priority
                </option>
              </select>
            </div>
          </section>

          {error && (
            <div className="error-message">
              {error}

              <button
                type="button"
                onClick={() =>
                  setError("")
                }
              >
                ×
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="loading-message">
              Loading tasks...
            </div>
          ) : !selectedProject &&
            currentView ===
              "project" ? (
            <div className="empty-project-state">
              <div className="empty-project-icon">
                +
              </div>

              <h2>
                Create your first project
              </h2>

              <p>
                Projects keep tasks
                and team members
                organized.
              </p>

              <button
                type="button"
                className="primary-button"
                onClick={() =>
                  setProjectModalOpen(
                    true
                  )
                }
              >
                Create Project
              </button>
            </div>
          ) : (
            <section className="board">
              <TaskColumn
                title="To Do"
                status="todo"
                dotClass="todo-dot"
                tasks={
                  visibleTasks.todo
                }
                onAddTask={() =>
                  openNewTaskModal(
                    "todo"
                  )
                }
                canAddTask={
                  canAddTask
                }
                openMenuTaskId={
                  openMenuTaskId
                }
                onToggleMenu={
                  toggleTaskMenu
                }
                onEdit={
                  openEditTaskModal
                }
                onDelete={
                  deleteTask
                }
                onOpenDetails={
                  openTaskDetails
                }
              />

              <TaskColumn
                title="In Progress"
                status="progress"
                dotClass="progress-dot"
                tasks={
                  visibleTasks.progress
                }
                onAddTask={() =>
                  openNewTaskModal(
                    "progress"
                  )
                }
                canAddTask={
                  canAddTask
                }
                openMenuTaskId={
                  openMenuTaskId
                }
                onToggleMenu={
                  toggleTaskMenu
                }
                onEdit={
                  openEditTaskModal
                }
                onDelete={
                  deleteTask
                }
                onOpenDetails={
                  openTaskDetails
                }
              />

              <TaskColumn
                title="Done"
                status="done"
                dotClass="done-dot"
                tasks={
                  visibleTasks.done
                }
                onAddTask={() =>
                  openNewTaskModal(
                    "done"
                  )
                }
                canAddTask={
                  canAddTask
                }
                openMenuTaskId={
                  openMenuTaskId
                }
                onToggleMenu={
                  toggleTaskMenu
                }
                onEdit={
                  openEditTaskModal
                }
                onDelete={
                  deleteTask
                }
                onOpenDetails={
                  openTaskDetails
                }
              />
            </section>
          )}
        </main>
      </div>

      {/* TASK DETAILS */}

      {detailsOpen && (
        <TaskDetailsDrawer
          details={
            taskDetails
          }
          loading={
            detailsLoading
          }
          activeTab={
            detailsTab
          }
          setActiveTab={
            setDetailsTab
          }
          commentText={
            commentText
          }
          setCommentText={
            setCommentText
          }
          commentPosting={
            commentPosting
          }
          commentError={
            commentError
          }
          currentUser={
            user
          }
          onClose={
            closeTaskDetails
          }
          onPostComment={
            postComment
          }
          onDeleteComment={
            deleteComment
          }
          onEditTask={
            openEditTaskModal
          }
        />
      )}

      {/* TASK MODAL */}

      {taskModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <span className="eyebrow">
                  {modalMode ===
                  "create"
                    ? "CREATE TASK"
                    : "EDIT TASK"}
                </span>

                <h2>
                  {modalMode ===
                  "create"
                    ? "New Task"
                    : "Edit Task"}
                </h2>
              </div>

              <button
                type="button"
                className="close-button"
                onClick={
                  closeTaskModal
                }
              >
                ×
              </button>
            </div>

            <form
              className="modal-form"
              onSubmit={
                submitTask
              }
            >
              <label>
                Task title

                <input
                  type="text"
                  name="title"
                  value={
                    taskForm.title
                  }
                  onChange={
                    handleTaskInputChange
                  }
                  placeholder="Build dashboard"
                />
              </label>

              <label>
                Description

                <textarea
                  name="description"
                  value={
                    taskForm.description
                  }
                  onChange={
                    handleTaskInputChange
                  }
                  rows="4"
                  placeholder="Describe the task..."
                ></textarea>
              </label>

              <div className="form-grid">
                <label>
                  Priority

                  <select
                    name="priority"
                    value={
                      taskForm.priority
                    }
                    onChange={
                      handleTaskInputChange
                    }
                  >
                    <option value="Low">
                      Low
                    </option>

                    <option value="Medium">
                      Medium
                    </option>

                    <option value="High">
                      High
                    </option>
                  </select>
                </label>

                <label>
                  Status

                  <select
                    name="status"
                    value={
                      taskForm.status
                    }
                    onChange={
                      handleTaskInputChange
                    }
                  >
                    <option value="todo">
                      To Do
                    </option>

                    <option value="progress">
                      In Progress
                    </option>

                    <option value="done">
                      Done
                    </option>
                  </select>
                </label>
              </div>

              <label>
                Assign to

                <select
                  name="assignedTo"
                  value={
                    taskForm.assignedTo
                  }
                  onChange={
                    handleTaskInputChange
                  }
                >
                  {projectMembers.map(
                    (member) => (
                      <option
                        key={
                          member.id
                        }
                        value={
                          member.id
                        }
                      >
                        {
                          member.name
                        }{" "}
                        (
                        {
                          member.email
                        }
                        )
                      </option>
                    )
                  )}
                </select>
              </label>

              <label>
                Due date

                <input
                  type="date"
                  name="dueDate"
                  value={
                    taskForm.dueDate
                  }
                  onChange={
                    handleTaskInputChange
                  }
                />
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={
                    closeTaskModal
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                >
                  {modalMode ===
                  "create"
                    ? "Create Task"
                    : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE PROJECT */}

      {projectModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <span className="eyebrow">
                  NEW WORKSPACE
                </span>

                <h2>
                  Create Project
                </h2>
              </div>

              <button
                type="button"
                className="close-button"
                onClick={() =>
                  setProjectModalOpen(
                    false
                  )
                }
              >
                ×
              </button>
            </div>

            <form
              className="modal-form"
              onSubmit={
                createProject
              }
            >
              <label>
                Project name

                <input
                  type="text"
                  value={
                    projectForm.name
                  }
                  onChange={(
                    event
                  ) =>
                    setProjectForm(
                      (previous) => ({
                        ...previous,

                        name:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                  placeholder="Website Redesign"
                />
              </label>

              <label>
                Description

                <textarea
                  rows="4"
                  value={
                    projectForm.description
                  }
                  onChange={(
                    event
                  ) =>
                    setProjectForm(
                      (previous) => ({
                        ...previous,

                        description:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                  placeholder="What is this project about?"
                ></textarea>
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    setProjectModalOpen(
                      false
                    )
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INVITE MEMBER */}

      {inviteModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card small-modal">
            <div className="modal-header">
              <div>
                <span className="eyebrow">
                  TEAM
                </span>

                <h2>
                  Add Member
                </h2>
              </div>

              <button
                type="button"
                className="close-button"
                onClick={() =>
                  setInviteModalOpen(
                    false
                  )
                }
              >
                ×
              </button>
            </div>

            <p className="invite-description">
              The person must already
              have a TaskFlow account.
            </p>

            <form
              className="modal-form"
              onSubmit={
                inviteMember
              }
            >
              <label>
                Member email

                <input
                  type="email"
                  value={
                    inviteEmail
                  }
                  onChange={(
                    event
                  ) =>
                    setInviteEmail(
                      event.target
                        .value
                    )
                  }
                  placeholder="teammate@example.com"
                />
              </label>

              {inviteMessage && (
                <div className="invite-message">
                  {
                    inviteMessage
                  }
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    setInviteModalOpen(
                      false
                    )
                  }
                >
                  Close
                </button>

                <button
                  type="submit"
                  className="primary-button"
                >
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DragOverlay>
        {activeDragTask ? (
          <article className="task-card drag-overlay-card">
            <TaskCardContent
              task={
                activeDragTask
              }
              status={
                activeDragTask.originalStatus
              }
              openMenuTaskId={
                null
              }
              onToggleMenu={() => {}}
              onEdit={() => {}}
              onDelete={() => {}}
              isOverlay
            />
          </article>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export default App;