# 🔌 UniTik REST API Specification (v2.0)

All endpoints reside under `http://localhost/UniTik/backend`.
Authentication is strictly enforced via the `UNITIK_SESSION` HttpOnly cookie. The client never transmits raw `user_id` parameters.

---

## 1. Authentication & Session Hydration

| Endpoint | Method | Access | Description |
| :--- | :--- | :--- | :--- |
| `/signup.php` | `POST` | Public | Registers a new account strictly in the `students` table. |
| `/login.php` | `POST` | Public | Authenticates credentials against `organizers` and `students`. Establishes `UNITIK_SESSION`. |
| `/me.php` | `GET` | Authenticated | Hydrates the active user profile and evaluates RBAC role (`student`, `organizer`, `admin`). |
| `/logout.php` | `POST` | Authenticated | Destroys server session and expires the `UNITIK_SESSION` cookie. |

---

## 2. Events Management (`/events/*`)

| Endpoint | Method | Access | Description |
| :--- | :--- | :--- | :--- |
| `/events/list.php` | `GET` | Authenticated | Returns chronological event feed joined with `venues` and `organizers`. Appends `can_manage` boolean. |
| `/events/create.php` | `POST` | Planner (`organizer`/`admin`) | Publishes a new event and auto-resolves or provisions the venue row. |
| `/events/update.php` | `POST` | Event Owner / `admin` | Updates event metadata. Rejects organizers attempting to modify another planner's event (`403`). |
| `/events/delete.php` | `POST` | Event Owner / `admin` | Performs cascading deletion across `gate_scan_logs`, `tickets`, and `events`. |

---

## 3. Ticketing & Gate Validation (`/tickets/*`)

| Endpoint | Method | Access | Description |
| :--- | :--- | :--- | :--- |
| `/tickets/book.php` | `POST` | `student` | Atomically issues a single ticket per student per event. Generates a unique `ticket_hash`. |
| `/tickets/wallet.php` | `GET` | `student` | Retrieves all tickets belonging to the active student session. |
| `/tickets/validate.php`| `POST` | Event Owner / `admin` | Validates a `ticket_hash` at the gate, flips `scan_status`, and writes an audit row to `gate_scan_logs`. |

---

## 4. Organizer Elevation Pipeline (`/applications/*`)

| Endpoint | Method | Access | Description |
| :--- | :--- | :--- | :--- |
| `/applications/apply.php` | `POST` | `student` | Accepts `multipart/form-data` (`corporate_details` + ID file up to 5MB). Stores file in `backend/uploads/`. |
| `/applications/list_applications.php` | `GET` | `admin` | Lists all `pending` applications joined with student identity details. |
| `/applications/review_application.php`| `POST` | `admin` | Approves or rejects an application. Approval migrates student credentials into the `organizers` table. |

---

## 5. Standard Error Payload
All non-2xx responses return a unified JSON structure:
```json
{
  "ok": false,
  "error": "Descriptive human-readable error message."
}