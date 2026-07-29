export const SEED = {
  settings: {
    categories: [
      "Full Engineering",
      "MEP Design",
      "Structural Design",
      "Design Review",
      "PMC / As-Built",
      "Concept Design",
      "Value Engineering"
    ],
    taskStatuses: ["Not Started", "In Progress", "On Hold", "TBC", "Done"],
    projectStatuses: ["Active", "On Hold", "Concept", "Closed"],
    disciplines: [
      "Architect of Record",
      "Architecture",
      "Structure",
      "HVAC",
      "Electrical",
      "Plumbing",
      "Fire",
      "Admin / Management"
    ],
    approvalStatuses: ["Required", "Sent", "Pending", "Rejected", "Approved"]
  },
  clients: [],
  users: [
    { id: "u1", name: "Administrator", role: "Admin", discipline: "Management", username: "admin", userType: "admin" },
    { id: "u2", name: "Saurabh M.", role: "Project Manager - MEP", discipline: "MEP", email: "pm@dgec.com", phone: "+968 9412 8899", username: "projectmanager", userType: "project_manager" }
  ],
  projects: [],
  tasks: [],
  teammates: [],
  comments: [],
  invoices: [],
  history: []
};
