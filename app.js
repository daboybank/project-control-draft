let allProjects = [];

document.addEventListener("DOMContentLoaded", function() {
  const totalProjectsElement = document.getElementById("totalProjects");
  const highPriorityProjectsElement = document.getElementById("highPriorityProjects");
  const blockedProjectsElement = document.getElementById("blockedProjects");
  const nearDeadlineProjectsElement = document.getElementById("nearDeadlineProjects");

  const projectTableBody = document.getElementById("projectTableBody");
  const workloadContainer = document.getElementById("workloadContainer");
  const blockedList = document.getElementById("blockedList");

  const searchInput = document.getElementById("searchInput");
  const ownerFilter = document.getElementById("ownerFilter");
  const statusFilter = document.getElementById("statusFilter");
  const priorityFilter = document.getElementById("priorityFilter");
  const resetFilterButton = document.getElementById("resetFilterButton");

  const fallbackProjects = [
    {
      id: "P-001",
      projectName: "Machine A Manual Update",
      owner: "Bank",
      stage: "In Progress",
      status: "On Track",
      priority: "High",
      riskLevel: "Low",
      deadline: "2026-06-20",
      workloadPoint: 3,
      blockReason: "",
      problem: "",
      nextAction: "Final check before review",
      actionOwner: "Bank",
      actionOwnerType: "Internal",
      manualLink: "https://example.com",
      lastUpdate: "2026-06-12"
    },
    {
      id: "P-002",
      projectName: "Machine B Setup Guide",
      owner: "May",
      stage: "Waiting Customer",
      status: "Blocked",
      priority: "High",
      riskLevel: "High",
      deadline: "2026-06-15",
      workloadPoint: 5,
      blockReason: "Waiting customer drawing",
      problem: "Customer has not sent updated machine layout",
      nextAction: "Follow up customer",
      actionOwner: "Customer",
      actionOwnerType: "External",
      manualLink: "https://example.com",
      lastUpdate: "2026-06-10"
    },
    {
      id: "P-003",
      projectName: "Robot Safety Checklist",
      owner: "Bank",
      stage: "Review",
      status: "Risk",
      priority: "Medium",
      riskLevel: "Medium",
      deadline: "2026-06-25",
      workloadPoint: 2,
      blockReason: "",
      problem: "Need confirmation from safety team",
      nextAction: "Ask safety team for approval",
      actionOwner: "Safety Team",
      actionOwnerType: "Internal",
      manualLink: "https://example.com",
      lastUpdate: "2026-06-11"
    }
  ];

  fetch("data-sample.json?v=42", {
    cache: "no-store"
  })
    .then(function(response) {
      if (!response.ok) {
        throw new Error("Cannot load data-sample.json. HTTP status: " + response.status);
      }

      return response.json();
    })
    .then(function(projects) {
      if (!Array.isArray(projects)) {
        throw new Error("data-sample.json must be an array.");
      }

      allProjects = projects;
      setupFilters(allProjects);
      renderDashboard(allProjects);
    })
    .catch(function(error) {
      console.error("Data loading error:", error);

      allProjects = fallbackProjects;
      setupFilters(allProjects);
      renderDashboard(allProjects);
      showDataWarning("Warning: data-sample.json could not be loaded. Dashboard is showing fallback sample data from app.js. Please check file name and location.");
    });

  function renderDashboard(projects) {
    renderSummary(projects);
    renderWorkload(projects);
    renderProjectTable(projects);
    renderBlockedProjects(projects);
  }

  function renderSummary(projects) {
    const totalProjects = projects.length;

    const highPriorityProjects = projects.filter(function(project) {
      return project.priority === "High";
    }).length;

    const blockedProjects = projects.filter(function(project) {
      return project.status === "Blocked";
    }).length;

    const nearDeadlineProjects = projects.filter(function(project) {
      const daysLeft = calculateDaysLeft(project.deadline);
      return daysLeft >= 0 && daysLeft <= 7;
    }).length;

    totalProjectsElement.textContent = totalProjects;
    highPriorityProjectsElement.textContent = highPriorityProjects;
    blockedProjectsElement.textContent = blockedProjects;
    nearDeadlineProjectsElement.textContent = nearDeadlineProjects;
  }

  function renderWorkload(projects) {
    const workloadByOwner = {};

    projects.forEach(function(project) {
      if (!workloadByOwner[project.owner]) {
        workloadByOwner[project.owner] = 0;
      }

      if (project.status !== "Done") {
        workloadByOwner[project.owner] += Number(project.workloadPoint || 0);
      }
    });

    workloadContainer.innerHTML = "";

    const owners = Object.keys(workloadByOwner).sort();

    owners.forEach(function(owner) {
      const workload = workloadByOwner[owner];
      const workloadLevel = getWorkloadLevel(workload);

      const card = document.createElement("div");
      card.className = "workload-card " + workloadLevel.cardClass;

      card.innerHTML = `
        <h3>${escapeHtml(owner)}</h3>
        <p>${escapeHtml(workload)} pts</p>
        <span>${escapeHtml(workloadLevel.label)}</span>
      `;

      workloadContainer.appendChild(card);
    });
  }

  function renderProjectTable(projects) {
    if (projects.length === 0) {
      projectTableBody.innerHTML = `
        <tr>
          <td colspan="15" class="empty-message">No project found.</td>
        </tr>
      `;
      return;
    }

    const sortedProjects = projects.slice().sort(function(a, b) {
      return new Date(a.deadline + "T00:00:00") - new Date(b.deadline + "T00:00:00");
    });

    projectTableBody.innerHTML = "";

    sortedProjects.forEach(function(project) {
      const daysLeft = calculateDaysLeft(project.deadline);
      const deadlineInfo = getDeadlineInfo(daysLeft);

      const statusClass = getStatusClass(project.status);
      const priorityClass = getPriorityClass(project.priority);
      const riskClass = getRiskClass(project.riskLevel);
      const workloadClass = getWorkloadPointClass(project.workloadPoint);
      const actionOwnerClass = getActionOwnerClass(project.actionOwnerType);

      const row = document.createElement("tr");

      row.innerHTML = `
        <td>${escapeHtml(project.projectName)}</td>
        <td>${escapeHtml(project.owner)}</td>
        <td>${escapeHtml(project.stage)}</td>
        <td><span class="badge ${statusClass}">${escapeHtml(project.status)}</span></td>
        <td><span class="badge ${priorityClass}">${escapeHtml(project.priority)}</span></td>
        <td><span class="badge ${riskClass}">${escapeHtml(project.riskLevel)}</span></td>
        <td>${escapeHtml(project.deadline)}</td>
        <td><span class="badge ${deadlineInfo.className}">${escapeHtml(deadlineInfo.text)}</span></td>
        <td><span class="badge ${workloadClass}">${escapeHtml(project.workloadPoint)} pts</span></td>
        <td class="${project.blockReason ? "block-reason" : ""}">${escapeHtml(project.blockReason || "-")}</td>
        <td class="problem-text">${escapeHtml(project.problem || "-")}</td>
        <td class="next-action ${project.status === "Blocked" ? "action-warning" : ""}">${escapeHtml(project.nextAction || "-")}</td>
        <td><span class="badge ${actionOwnerClass}">${escapeHtml(project.actionOwner || "-")}</span></td>
        <td><span class="badge last-update">${escapeHtml(project.lastUpdate || "-")}</span></td>
        <td>${renderManualLink(project.manualLink)}</td>
      `;

      projectTableBody.appendChild(row);
    });
  }

  function renderBlockedProjects(projects) {
    const blockedProjects = projects.filter(function(project) {
      return project.status === "Blocked";
    });

    blockedList.innerHTML = "";

    if (blockedProjects.length === 0) {
      blockedList.innerHTML = `
        <div class="blocked-card">
          <h3>No blocked project</h3>
          <p>Everything is currently moving.</p>
        </div>
      `;
      return;
    }

    blockedProjects.forEach(function(project) {
      const card = document.createElement("div");
      card.className = "blocked-card";

      card.innerHTML = `
        <h3>${escapeHtml(project.projectName)}</h3>
        <p><strong>Owner:</strong> ${escapeHtml(project.owner)}</p>
        <p><strong>Reason:</strong> ${escapeHtml(project.blockReason || "-")}</p>
        <p><strong>Problem:</strong> ${escapeHtml(project.problem || "-")}</p>
        <p><strong>Next Action:</strong> ${escapeHtml(project.nextAction || "-")}</p>
        <p><strong>Action Owner:</strong> ${escapeHtml(project.actionOwner || "-")}</p>
      `;

      blockedList.appendChild(card);
    });
  }

  function setupFilters(projects) {
    clearSelectOptions(ownerFilter);
    clearSelectOptions(statusFilter);
    clearSelectOptions(priorityFilter);

    fillSelect(ownerFilter, getUniqueValues(projects, "owner"));
    fillSelect(statusFilter, getUniqueValues(projects, "status"));
    fillSelect(priorityFilter, getUniqueValues(projects, "priority"));

    searchInput.removeEventListener("input", applyFilters);
    ownerFilter.removeEventListener("change", applyFilters);
    statusFilter.removeEventListener("change", applyFilters);
    priorityFilter.removeEventListener("change", applyFilters);

    searchInput.addEventListener("input", applyFilters);
    ownerFilter.addEventListener("change", applyFilters);
    statusFilter.addEventListener("change", applyFilters);
    priorityFilter.addEventListener("change", applyFilters);

    resetFilterButton.onclick = function() {
      searchInput.value = "";
      ownerFilter.value = "All";
      statusFilter.value = "All";
      priorityFilter.value = "All";
      renderDashboard(allProjects);
    };
  }

  function clearSelectOptions(selectElement) {
    selectElement.innerHTML = '<option value="All">All</option>';
  }

  function applyFilters() {
    const searchText = searchInput.value.toLowerCase().trim();
    const selectedOwner = ownerFilter.value;
    const selectedStatus = statusFilter.value;
    const selectedPriority = priorityFilter.value;

    const filteredProjects = allProjects.filter(function(project) {
      const projectName = String(project.projectName || "").toLowerCase();

      const matchesSearch = projectName.includes(searchText);
      const matchesOwner = selectedOwner === "All" || project.owner === selectedOwner;
      const matchesStatus = selectedStatus === "All" || project.status === selectedStatus;
      const matchesPriority = selectedPriority === "All" || project.priority === selectedPriority;

      return matchesSearch && matchesOwner && matchesStatus && matchesPriority;
    });

    renderDashboard(filteredProjects);
  }

  function fillSelect(selectElement, values) {
    values.forEach(function(value) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      selectElement.appendChild(option);
    });
  }

  function getUniqueValues(projects, key) {
    const values = projects
      .map(function(project) {
        return project[key];
      })
      .filter(function(value) {
        return value !== undefined && value !== null && value !== "";
      });

    return Array.from(new Set(values)).sort();
  }

  function calculateDaysLeft(deadline) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const deadlineDate = new Date(deadline + "T00:00:00");
    deadlineDate.setHours(0, 0, 0, 0);

    const difference = deadlineDate - today;
    return Math.ceil(difference / (1000 * 60 * 60 * 24));
  }

  function getDeadlineInfo(daysLeft) {
    if (daysLeft < 0) {
      return {
        text: Math.abs(daysLeft) + " days overdue",
        className: "deadline-overdue"
      };
    }

    if (daysLeft <= 7) {
      return {
        text: daysLeft + " days left",
        className: "deadline-soon"
      };
    }

    return {
      text: daysLeft + " days left",
      className: "deadline-normal"
    };
  }

  function getWorkloadLevel(workload) {
    if (workload >= 8) {
      return {
        label: "High workload",
        cardClass: "workload-high"
      };
    }

    if (workload >= 5) {
      return {
        label: "Medium workload",
        cardClass: "workload-medium"
      };
    }

    return {
      label: "Normal workload",
      cardClass: "workload-normal"
    };
  }

  function getStatusClass(status) {
    if (status === "On Track") return "status-on-track";
    if (status === "Risk") return "status-risk";
    if (status === "Blocked") return "status-blocked";
    if (status === "Done") return "status-done";
    return "status-done";
  }

  function getPriorityClass(priority) {
    if (priority === "High") return "priority-high";
    if (priority === "Medium") return "priority-medium";
    if (priority === "Low") return "priority-low";
    return "priority-low";
  }

  function getRiskClass(riskLevel) {
    if (riskLevel === "High") return "risk-high";
    if (riskLevel === "Medium") return "risk-medium";
    if (riskLevel === "Low") return "risk-low";
    return "risk-low";
  }

  function getWorkloadPointClass(workloadPoint) {
    const point = Number(workloadPoint);

    if (point >= 5) return "workload-point-high";
    if (point >= 3) return "workload-point-medium";
    return "workload-point-normal";
  }

  function getActionOwnerClass(actionOwnerType) {
    if (actionOwnerType === "External") {
      return "action-owner-external";
    }

    return "action-owner-internal";
  }

  function renderManualLink(manualLink) {
    if (!manualLink) {
      return "<span>-</span>";
    }

    const safeManualLink = escapeAttribute(manualLink);

    return `<a href="${safeManualLink}" target="_blank" rel="noopener noreferrer">Open Manual</a>`;
  }

  function showDataWarning(message) {
    const existingWarning = document.querySelector(".data-warning");

    if (existingWarning) {
      existingWarning.remove();
    }

    const warning = document.createElement("div");
    warning.className = "data-warning";
    warning.textContent = message;

    const header = document.querySelector(".header");
    header.appendChild(warning);
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeAttribute(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }
});
