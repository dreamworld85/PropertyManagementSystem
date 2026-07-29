# User Access Management Guide

This guide provides instructions on how to manage user login and directory access for the **DGEC Project Control Dashboard**.

---

## 1. Local Development / Shared Storage Mode

In the current local/static hosting mode:
- **No separate login screens exist**: The dashboard uses a shared client-side state (`localStorage` fallback) which makes it instantly accessible to anyone with the link.
- **Switching Identity**: To perform edits under a specific team member's name, select their identity from the **Active User** dropdown in the bottom-left sidebar. All subsequent changes will be logged under that user's name in the **History** audit log.

### To Add a Team Member:
1. Go to the **Team** tab in the sidebar.
2. Click the **＋ Add member** button on the top right.
3. Fill in the member's Name, Role, and Discipline.
4. Click **Save**. The user will now be available in the **Active User** selector and task assignments.

### To Remove a Team Member:
1. Reassign any tasks currently assigned to the team member.
2. The user will remain in the historic log but can be pruned directly in the database config or by clearing/resetting the storage.

---

## 2. Production Environment (Supabase Integration)

When deploying to a production server connected to a database (like **Supabase**), you should utilize full secure Authentication.

### To Invite a New Team Member:
1. Log in to your **Supabase Dashboard**.
2. Navigate to **Authentication** (in the left sidebar) -> **Users**.
3. Click the **Invite User** button.
4. Enter the user's email address and click **Send Invitation**.
5. The user will receive an email invitation to set up their password and log in.

### To Revoke Access (Delete a User):
1. Log in to your **Supabase Dashboard**.
2. Navigate to **Authentication** -> **Users**.
3. Find the user you want to delete and click the three dots (`...`) next to their name.
4. Select **Delete User** and confirm. Their login session will be revoked immediately, and they will no longer be able to log in or access the database.

---

## 3. Data Integrity & Audit Trails
- Any changes made by users (creating projects, altering task status, adding invoices) are tracked in the **History** tab.
- This edit history safeguards data integrity and ensures full accountability among department heads.
