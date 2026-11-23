const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const rates = {
  co: { name: "City Ordinary", capacity: 45, short: 57, long: 53 },
  gco: { name: "Green City Ordinary", capacity: 35, short: 57, long: 53 },
  me: { name: "Metro Express", capacity: 45, short: 62, long: 57 },
  gme: { name: "Green Metro Express", capacity: 35, short: 62, long: 57 }
};
let currentPage = 1;
let selectedFleet = "co";

// In-page validation dialog: no native alert(), confirm() or prompt() popups.
function showAppDialog(title, messages, type = "error") {
  const dialog = $("#appDialog");
  if (!dialog) return;
  $("#appDialogTitle").textContent = title;
  $("#appDialogMessage").textContent = type === "success"
    ? "Your action has been completed."
    : "Please review the following before continuing.";
  const list = $("#appDialogList");
  list.replaceChildren();
  (Array.isArray(messages) ? messages : [messages]).forEach(message => {
    const item = document.createElement("li");
    item.textContent = message;
    list.append(item);
  });
  dialog.classList.add("is-open");
  dialog.setAttribute("aria-hidden", "false");
  document.body.classList.add("dialog-open");
  $("#appDialogClose").focus();
}

function closeAppDialog() {
  const dialog = $("#appDialog");
  if (!dialog) return;
  dialog.classList.remove("is-open");
  dialog.setAttribute("aria-hidden", "true");
  document.body.classList.remove("dialog-open");
}

$("#appDialogClose")?.addEventListener("click", closeAppDialog);
$("#appDialog")?.addEventListener("click", event => {
  if (event.target === $("#appDialog")) closeAppDialog();
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeAppDialog();
});

function clearValidationMarks() {
  $$(".field.is-invalid").forEach(field => field.classList.remove("is-invalid"));
  $$(".field-error").forEach(message => message.remove());
}

function markInvalid(input, message) {
  if (!input) return;
  const field = input.closest(".field");
  if (!field) return;
  field.classList.add("is-invalid");
  let note = $(".field-error", field);
  if (!note) {
    note = document.createElement("small");
    note.className = "field-error";
    field.append(note);
  }
  note.textContent = message;
}

function reportValidation(errors, title = "A few details need attention") {
  clearValidationMarks();
  errors.forEach(error => markInvalid(error.input, error.message));
  showAppDialog(title, errors.map(error => error.message));
  const first = errors.find(error => error.input)?.input;
  if (first) first.focus({ preventScroll: true });
}

// Clear a field's inline error as soon as the user edits it.
document.addEventListener("input", event => {
  const field = event.target.closest?.(".field");
  if (field) {
    field.classList.remove("is-invalid");
    $(".field-error", field)?.remove();
  }
});

// Match the original standalone HTML intro: cinematic reveal, then automatic exit.
setTimeout(() => {
  const intro = document.getElementById('intro');

  document.body.classList.add('page-entering');

  if (intro) {
    intro.classList.add('intro-exit');

    setTimeout(() => {
      intro.remove();
      document.body.classList.remove('page-entering');
    }, 1250);
  }
}, 5000);

$$("[data-next]").forEach(btn => btn.addEventListener("click", () => advance()));
$$("[data-back]").forEach(btn => btn.addEventListener("click", () => showPage(currentPage - 1)));
$$('input[name="existing"]').forEach(r => r.addEventListener("change", updateExisting));
$$('input[name="kind"]').forEach(c => c.addEventListener("change", updateKinds));
$$(".fleet-card").forEach(card => card.addEventListener("click", () => chooseFleet(card)));
$("#addRoute").addEventListener("click", addRoute);


function routeChoiceControls(isFirst = false) {
  if (isFirst) return `<div class="route-choice route-choice-first"><span class="route-choice-label">BUS ROUTE</span><span class="route-choice-note">First pickup area</span></div>`;
  return `
    <div class="route-choice" role="group" aria-label="Route assignment">
      <span class="route-choice-label">THIS AREA</span>
      <div class="route-choice-actions">
        <button type="button" class="route-choice-btn is-active" data-route-choice="save" aria-pressed="true">Save</button>
        <button type="button" class="route-choice-btn" data-route-choice="previous" aria-pressed="false">Add this to previous route</button>
      </div>
    </div>`;
}
function initialiseRouteChoices() {
  $$(".route-row").forEach((row, index) => {
    if (!row.dataset.routeGroup) row.dataset.routeGroup = `route-${index}`;
    if (!$(".route-choice", row)) {
      const preview = $(".route-normalized", row);
      const wrapper = document.createElement("div");
      wrapper.innerHTML = routeChoiceControls(index === 0);
      row.insertBefore(wrapper.firstElementChild, preview);
    }
    if (index > 0 && !row.dataset.routeChoice) row.dataset.routeChoice = "save";
    updateRouteChoiceUI(row);
  });
}
function updateRouteChoiceUI(row) {
  $$("[data-route-choice]", row).forEach(button => {
    const active = button.dataset.routeChoice === (row.dataset.routeChoice || "save");
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}
function assignRouteChoice(row, choice) {
  const rows = $$(".route-row");
  const index = rows.indexOf(row);
  if (index <= 0) return;
  row.dataset.routeChoice = choice;
  if (choice === "previous") {
    const previous = rows[index - 1];
    row.dataset.routeGroup = previous.dataset.routeGroup || `route-${index - 1}`;
  } else {
    row.dataset.routeGroup = `route-${index}`;
  }
  updateRouteChoiceUI(row);
  updateRouteGroupingHint();
}
initialiseRouteChoices();
$("#routeList").addEventListener("click", event => {
  const button = event.target.closest("[data-route-choice]");
  if (button) assignRouteChoice(button.closest(".route-row"), button.dataset.routeChoice);
});
$("#routeList").addEventListener("input", event => {
  if (event.target.matches(".route-km")) updateRoutePreview(event.target.closest(".route-row"));
});
$("#routeList").addEventListener("change", event => {
  if (event.target.matches(".route-distance-type")) updateRoutePreview(event.target.closest(".route-row"));
});
$("#calculateButton").addEventListener("click", calculate);
$("#editPlan").addEventListener("click", () => showPage(1));
$("#printPlan").addEventListener("click", exportEstimatePdf);
$("#editOffice").addEventListener("click", () => showPage(1));
$("#office").addEventListener("input", () =>
  $("#officePreview").textContent = $("#office").value || "Your office location"
);

const routeGroupingHint = document.createElement("p");
routeGroupingHint.id = "routeGroupingHint";
routeGroupingHint.className = "route-grouping-hint";
routeGroupingHint.textContent = "Choose the same pickup route for areas served by one bus. Otherwise, keep them independent.";
$(".tariff-note")?.after(routeGroupingHint);

const groupingStyle = document.createElement("style");
groupingStyle.textContent = `
  .route-choice{grid-column:2/5;display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:3px 0 5px}
  .route-choice-label{font-size:8px;letter-spacing:1.2px;font-weight:800;color:#84917f}
  .route-choice-note{font-size:10px;color:#899588}
  .route-choice-actions{display:flex;gap:7px;flex-wrap:wrap}
  .route-choice-btn{border:1px solid #dce5d9;background:#fff;color:#657568;border-radius:4px;padding:8px 12px;font:600 10px inherit;cursor:pointer;transition:background .18s,border-color .18s,color .18s}
  .route-choice-btn:hover{border-color:#83a96b;color:#244b37}
  .route-choice-btn.is-active{background:#edf4e8;border-color:#78ad45;color:#214b35;box-shadow:inset 0 0 0 1px #78ad45}
  .route-choice-first{min-height:25px}
  .route-grouping-hint{margin:10px 0 0;padding:9px 12px;background:#f2f6ee;border-left:2px solid #78ad45;color:#758273;font-size:10px;line-height:1.5}
  @media(max-width:620px){
    .route-choice{grid-column:2/4;display:grid;gap:7px}
    .route-choice-actions{display:grid;grid-template-columns:1fr 1fr}
    .route-choice-btn{padding:9px 7px}
  }
`;
document.head.append(groupingStyle);
updateRouteGroupingHint();

const tariffNote = $(".tariff-note span");
if (tariffNote) {
  tariffNote.textContent =
    "Choose One-way if you enter the distance from the area to the office; the planner doubles it for the daily return journey. Choose Round trip if your entered distance already includes both directions. The fare uses the resulting daily distance, subject to a 40 km minimum: distances below 40 km use the 40 km fare; 40–79 km and 80 km+ use their respective tariff bands.";
}

function updateExisting() {
  const yes = $('input[name="existing"]:checked').value === "yes";
  $("#existingDetails").classList.toggle("hidden", !yes);

  if (!yes) {
    $$('input[name="kind"]').forEach(c => c.checked = false);
    updateKinds();
  }
}

function updateKinds() {
  const cab = $('input[name="kind"][value="cab"]').checked;
  const bus = $('input[name="kind"][value="bus"]').checked;
  $("#cabFields").classList.toggle("hidden", !cab);
  $("#busFields").classList.toggle("hidden", !bus);
}

function addRoute() {
  const count = $$(".route-row").length;
  if (count >= 5) return;

  const row = document.createElement("div");
  row.className = "route-row route-enter";

  row.innerHTML = `
    <div class="route-index">${String(count + 1).padStart(2, "0")}</div>
    <label class="field">
      <span>Area / locality <b>*</b></span>
      <input class="route-area" placeholder="Enter locality">
    </label>
    <label class="field">
      <span>Employees <b>*</b></span>
      <input class="route-employees" type="number" min="1" placeholder="Count">
    </label>
    <div class="field route-distance-field">
      <span>Route distance <b>*</b></span>
      <div class="distance-controls">
        <input class="route-km" type="number" min="1" step="0.1" placeholder="e.g. 25">
        <select class="route-distance-type" aria-label="Distance type">
          <option value="one-way">One-way</option>
          <option value="round-trip">Round trip</option>
        </select>
      </div>
    </div>
    <button class="remove-route" type="button" aria-label="Remove route">×</button>
    ${routeChoiceControls(false)}
    <div class="route-normalized" aria-live="polite">
      <span class="route-normalized-label">DAILY DISTANCE USED IN ESTIMATE</span>
      <b class="route-daily-km">— km/day</b>
      <span class="route-tariff-band">Enter a distance to preview</span>
    </div>
  `;

  row.querySelector(".remove-route").addEventListener("click", () => {
    row.remove();
    renumberRoutes();
    initialiseRouteChoices();
    updateRouteGroupingHint();
  });

  row.dataset.routeGroup = `route-${count}`;
  row.dataset.routeChoice = "save";
  $("#routeList").append(row);
  initialiseRouteChoices();
  $("#addRoute").classList.toggle("hidden", $$(".route-row").length >= 5);
  updateRouteGroupingHint();
}

function renumberRoutes() {
  $$(".route-row").forEach((r, i) => {
    r.querySelector(".route-index").textContent = String(i + 1).padStart(2, "0");
  });

  $("#addRoute").classList.remove("hidden");
}

function chooseFleet(card) {
  $$(".fleet-card").forEach(c => c.classList.remove("selected"));
  card.classList.add("selected");
  card.querySelector("input").checked = true;

  selectedFleet = card.dataset.fleet;
  const item = rates[selectedFleet];

  $("#capacityValue").innerHTML = `${item.capacity} <i>seats</i>`;

  $$(".fleet-specs").forEach(el => {
    const key = el.closest(".fleet-card").dataset.fleet;
    const r = rates[key];

    el.innerHTML =
      `<span><b>${r.capacity}</b> seats</span><span><b>₹${r.short}</b> / km*</span>`;
  });
}

function updateRouteGroupingHint() {
  const groups = new Map();
  $$(".route-row").forEach((row, index) => {
    const key = row.dataset.routeGroup || `route-${index}`;
    groups.set(key, (groups.get(key) || 0) + 1);
  });
  const shared = [...groups.values()].filter(count => count > 1).length;
  const note = $("#routeGroupingHint");
  if (note) note.textContent = shared
    ? `${shared} shared route${shared === 1 ? "" : "s"} configured. Areas added to a previous route will be picked up by the same bus.`
    : "Each area is saved as a separate bus route. Choose “Add this to previous route” to combine consecutive pickup areas.";
}

function getRoutes() {
  return $$(".route-row").map((row, index) => {
    const enteredKm = Number($(".route-km", row).value) || 0;
    const distanceType = $(".route-distance-type", row)?.value || "one-way";
    const dailyKm = enteredKm * (distanceType === "one-way" ? 2 : 1);
    const selectedGroup = row.dataset.routeGroup || `route-${index}`;

    return {
      area: $(".route-area", row).value.trim(),
      employees: Number($(".route-employees", row).value) || 0,
      enteredKm,
      distanceType,
      dailyKm,
      fareKm: Math.max(40, dailyKm),
      routeGroup: selectedGroup
    };
  });
}

// Merge areas assigned to the same shared corridor. For a shared corridor,
// the longest entered daily distance is used as the approximate end-to-end
// corridor distance; the individual area distances remain available for
// passenger-kilometre carbon calculations.
function buildBusRoutes(routes) {
  const groups = new Map();
  routes.forEach((route, index) => {
    const key = route.routeGroup || `separate-${index}`;
    if (!groups.has(key)) {
      groups.set(key, {
        ...route,
        areas: [route.area],
        employees: 0,
        dailyKm: 0,
        fareKm: 0,
        shared: key.startsWith("shared-"),
        routeGroup: key
      });
    }
    const group = groups.get(key);
    group.employees += route.employees;
    group.dailyKm = Math.max(group.dailyKm, route.dailyKm);
    group.fareKm = Math.max(group.fareKm, route.fareKm);
    if (route.area && !group.areas.includes(route.area)) group.areas.push(route.area);
  });

  return [...groups.values()].map(group => ({
    ...group,
    area: group.areas.join(" → "),
    corridorLabel: group.shared
      ? `Shared corridor ${Number(group.routeGroup.split("-")[1])}`
      : group.areas[0]
  }));
}

// Update the distance and tariff preview as the user enters data.
function updateRoutePreview(row) {
  if (!row) return;

  const enteredKm = Number($(".route-km", row).value) || 0;
  const distanceType = $(".route-distance-type", row)?.value || "one-way";

  const dailyKm = enteredKm * (distanceType === "one-way" ? 2 : 1);
  const fareKm = Math.max(40, dailyKm);

  if (enteredKm <= 0) {
    $(".route-daily-km", row).textContent = "— km/day";
    $(".route-tariff-band", row).textContent = "Enter a distance to preview";
    return;
  }

  $(".route-daily-km", row).textContent =
    `${Number(dailyKm.toFixed(1))} km/day`;

  $(".route-tariff-band", row).textContent =
    `Fare distance: ${Number(fareKm.toFixed(1))} km · ${fareKm < 80 ? "40–79 km tariff band" : "80 km and above tariff band"
    }`;
}

function advance() {
  clearValidationMarks();
  const errors = [];

  if (currentPage === 1) {
    const employees = $("#employees");
    const total = Number(employees.value);
    if (employees.value.trim() === "" || !Number.isInteger(total) || total < 1) {
      errors.push({ input: employees, message: "Enter a valid total employee count (a whole number greater than zero)." });
    }
    if (!$("#office").value.trim()) {
      errors.push({ input: $("#office"), message: "Enter the office location." });
    }
    if (errors.length) {
      reportValidation(errors, "Complete the workforce details");
      return;
    }
    $("#officePreview").textContent = $("#office").value.trim();
  }

  if (currentPage === 2) {
    const existing = $('input[name="existing"]:checked');
    if (!existing) {
      errors.push({ input: null, message: "Select whether your organisation currently provides employee transport." });
    } else if (existing.value === "yes") {
      const cab = $('input[name="kind"][value="cab"]').checked;
      const bus = $('input[name="kind"][value="bus"]').checked;
      const totalEmployees = Number($("#employees").value) || 0;

      if (!cab && !bus) {
        errors.push({ input: null, message: "Select Cabs, Buses, or both; alternatively choose Not currently." });
      }

      if (cab) {
        const cabEmployees = $("#cabEmployees");
        const cabs = $("#cabs");
        const cabUsers = Number(cabEmployees.value);
        const cabCount = Number(cabs.value);
        if (cabEmployees.value.trim() === "" || !Number.isInteger(cabUsers) || cabUsers < 1) {
          errors.push({ input: cabEmployees, message: "Enter the number of employees using company cabs (a whole number greater than zero)." });
        }
        if (cabs.value.trim() === "" || !Number.isInteger(cabCount) || cabCount < 1) {
          errors.push({ input: cabs, message: "Enter at least one deployed cab." });
        }
      }

      if (bus) {
        const busEmployees = $("#busEmployees");
        const buses = $("#buses");
        const busUsers = Number(busEmployees.value);
        const busCount = Number(buses.value);
        if (busEmployees.value.trim() === "" || !Number.isInteger(busUsers) || busUsers < 1) {
          errors.push({ input: busEmployees, message: "Enter the number of employees using company buses (a whole number greater than zero)." });
        }
        if (buses.value.trim() === "" || !Number.isInteger(busCount) || busCount < 1) {
          errors.push({ input: buses, message: "Enter at least one deployed bus." });
        }
      }

      ["cabCost", "busCost"].forEach(id => {
        const input = $("#" + id);
        if (input.value.trim() !== "" && (!Number.isFinite(Number(input.value)) || Number(input.value) < 0)) {
          errors.push({ input, message: `${id === "cabCost" ? "Cab" : "Bus"} expenditure must be zero or a positive amount.` });
        }
      });

      const cabUsers = cab ? (Number($("#cabEmployees").value) || 0) : 0;
      const busUsers = bus ? (Number($("#busEmployees").value) || 0) : 0;
      const existingUsers = cabUsers + busUsers;
      if (existingUsers > totalEmployees) {
        errors.push({
          input: bus ? $("#busEmployees") : $("#cabEmployees"),
          message: `Existing transport users total ${existingUsers.toLocaleString("en-IN")} (cabs ${cabUsers.toLocaleString("en-IN")} + buses ${busUsers.toLocaleString("en-IN")}), exceeding the total workforce of ${totalEmployees.toLocaleString("en-IN")} by ${(existingUsers - totalEmployees).toLocaleString("en-IN")}.`
        });
      }
    }
  }

  if (currentPage === 3) {
    const routes = getRoutes();
    if (!routes.length) {
      errors.push({ input: null, message: "Add at least one employee commute area." });
    }
    $$(".route-row").forEach((row, index) => {
      const area = $(".route-area", row);
      const employees = $(".route-employees", row);
      const distance = $(".route-km", row);
      if (!area.value.trim()) errors.push({ input: area, message: `Area ${index + 1}: enter the area or locality.` });
      if (employees.value.trim() === "" || !Number.isInteger(Number(employees.value)) || Number(employees.value) < 1) {
        errors.push({ input: employees, message: `Area ${index + 1}: enter a whole-number employee count greater than zero.` });
      }
      if (distance.value.trim() === "" || !Number.isFinite(Number(distance.value)) || Number(distance.value) <= 0) {
        errors.push({ input: distance, message: `Area ${index + 1}: enter a positive route distance.` });
      }
    });
    const routeEmployees = routes.reduce((sum, route) => sum + route.employees, 0);
    const totalEmployees = Number($("#employees").value) || 0;
    if (routeEmployees > totalEmployees) {
      errors.push({
        input: $(".route-employees", $("#routeList")),
        message: `Commute-area employees total ${routeEmployees.toLocaleString("en-IN")}, exceeding the workforce of ${totalEmployees.toLocaleString("en-IN")} by ${(routeEmployees - totalEmployees).toLocaleString("en-IN")}.`
      });
    }
  }

  if (errors.length) {
    reportValidation(errors);
    return;
  }

  closeAppDialog();
  showPage(currentPage + 1);
}

function showPage(n) {
  if (n < 1 || n > 5) return;

  currentPage = n;

  $$(".form-step").forEach(p =>
    p.classList.toggle("active", Number(p.dataset.page) === n)
  );

  $$(".step").forEach(s => {
    const k = Number(s.dataset.step);
    s.classList.toggle("active", k === n);
    s.classList.toggle("done", k < n);
  });

  $("#panelOverline").textContent = `STEP ${String(n).padStart(2, "0")} / 05`;
  $("#progressBar").style.width = `${n * 20}%`;

  if (n === 4) {
    chooseFleet($(`.fleet-card[data-fleet="${selectedFleet}"]`));
  }

  $(".form-panel").scrollIntoView({ behavior: "smooth", block: "start" });
}

function money(value) {
  return "₹" + Math.round(value).toLocaleString("en-IN");
}

function calculate() {
  const routes = getRoutes();
  const fleet = rates[selectedFleet];
  const days = Number($("#operatingDays").value) || 0;

  clearValidationMarks();
  if (!Number.isInteger(days) || days < 1 || days > 31) {
    reportValidation([{
      input: $("#operatingDays"),
      message: "Operating days must be a whole number between 1 and 31."
    }], "Check the operating days");
    return;
  }

  const busRoutes = buildBusRoutes(routes);
  const priced = busRoutes.map(r => ({
    ...r,
    buses: Math.ceil(r.employees / fleet.capacity),
    rate: r.fareKm < 80 ? fleet.short : fleet.long
  }));

  // Fare is based on billed distance, including the 40 km minimum.
  const daily = priced.reduce(
    (sum, r) => sum + r.buses * r.fareKm * r.rate,
    0
  );

  const monthly = daily * days;

  const currentSpend =
    (Number($("#cabCost").value) || 0) +
    (Number($("#busCost").value) || 0);

  const hasCurrentSpend = currentSpend > 0;
  const busCount = priced.reduce((sum, r) => sum + r.buses, 0);
  const covered = routes.reduce((sum, r) => sum + r.employees, 0);

  const cabEmployees = Number($("#cabEmployees").value) || 0;
  const cabs = Number($("#cabs").value) || 0;

  // Estimate cabs avoided from the share of existing cab users shifted
  // to the proposed TGSRTC service. Cap shifted users at the current cab-user
  // count and cap avoided vehicles at the number currently deployed.
  const cabUsersShifted = Math.min(cabEmployees, covered);
  const avoided = (cabEmployees > 0 && cabs > 0 && cabUsersShifted > 0)
    ? Math.min(cabs, Math.round((cabUsersShifted / cabEmployees) * cabs))
    : null;

  $("#resultCost").textContent = money(monthly);
  $("#resultFleet").textContent =
    `${fleet.name} · ${fleet.capacity} seats · ${days} operating days`;

  $("#resultBuses").textContent = busCount;
  $("#resultEmployees").textContent = covered.toLocaleString("en-IN");

  // The redesigned analysis page no longer displays the legacy resultSaving
  // metric. Keep it updated only when that legacy element exists.
  const legacySaving = $("#resultSaving");
  if (legacySaving) {
    legacySaving.textContent =
      hasCurrentSpend ? money(Math.abs(currentSpend - monthly)) : "—";
  }

  $("#savingCaption").textContent = hasCurrentSpend
    ? (currentSpend >= monthly
      ? "Potential monthly saving"
      : "Estimated additional monthly cost")
    : "Enter current monthly spend to compare";

  // Populate the dedicated financial comparison in the redesigned results view.
  const comparisonCurrent = $("#comparisonCurrent");
  const comparisonProposed = $("#comparisonProposed");
  const comparisonDifference = $("#comparisonDifference");
  const comparisonStatus = $("#comparisonStatus");
  const comparisonNote = $("#comparisonNote");

  if (comparisonCurrent) {
    comparisonCurrent.textContent = hasCurrentSpend ? money(currentSpend) : "Not provided";
  }
  if (comparisonProposed) comparisonProposed.textContent = money(monthly);
  if (comparisonDifference) {
    comparisonDifference.textContent = hasCurrentSpend
      ? money(Math.abs(currentSpend - monthly))
      : "—";
  }
  if (comparisonStatus) {
    comparisonStatus.textContent = !hasCurrentSpend
      ? "MONTHLY DIFFERENCE"
      : currentSpend >= monthly
        ? "POTENTIAL MONTHLY SAVING"
        : "ESTIMATED ADDITIONAL COST";
  }
  if (comparisonNote) {
    comparisonNote.textContent = hasCurrentSpend
      ? "Comparison uses the current monthly expenditure entered. Confirm that all existing transport costs and operating assumptions are included."
      : "A current monthly expenditure was not provided, so the planner cannot claim a saving or calculate a cost difference.";
  }

  $("#resultCabs").textContent = avoided === null ? "—" : avoided;

  // Indicative carbon model: standard proxy factors, not user-entered factors.
  // Actual daily commute distance is used; the 40 km fare minimum is excluded.
  const totalRouteEmployees = routes.reduce((sum, r) => sum + r.employees, 0);
  const weightedDailyKm = totalRouteEmployees > 0
    ? routes.reduce((sum, r) => sum + r.employees * r.dailyKm, 0) / totalRouteEmployees
    : 0;
  const cabCount = Number($("#cabs").value) || 0;
  const currentBusCount = Number($("#buses").value) || 0;
  const currentCabEmployees = Number($("#cabEmployees").value) || 0;
  const currentBusEmployees = Number($("#busEmployees").value) || 0;

  // Indicative India-oriented proxy assumptions. Replace with TGSRTC/company
  // measured factors when verified operational data becomes available.
  const emission = {
    petrolCabKgPerVehicleKm: 0.153,
    cabOccupancy: 2.8,
    busOccupancy: 38,
    dieselBusKgPerPassengerKm: 0.015161,
    gridKgPerKwh: 0.675,
    electricBusKwhPerKm: 1
  };

  const activeCabs = currentCabEmployees > 0
    ? Math.min(cabCount, Math.ceil(currentCabEmployees / emission.cabOccupancy))
    : cabCount;
  const activeCurrentBuses = currentBusEmployees > 0
    ? Math.min(currentBusCount, Math.ceil(currentBusEmployees / emission.busOccupancy))
    : currentBusCount;

  const hasCurrentTransport =
    $('input[name="existing"]:checked').value === "yes" &&
    (activeCabs > 0 || activeCurrentBuses > 0);

  const currentCabKgPerDay = activeCabs * weightedDailyKm * emission.petrolCabKgPerVehicleKm;
  const currentBusPassengers = currentBusEmployees > 0
    ? currentBusEmployees
    : activeCurrentBuses * emission.busOccupancy;
  const currentBusKgPerDay = currentBusPassengers * weightedDailyKm * emission.dieselBusKgPerPassengerKm;
  const currentKgPerDay = currentCabKgPerDay + currentBusKgPerDay;

  const proposedPassengerKmPerDay = routes.reduce(
    (sum, r) => sum + r.employees * r.dailyKm, 0
  );
  const isElectricFleet = selectedFleet === "gco" || selectedFleet === "gme";
  const proposedKgPerDay = isElectricFleet
    ? busCount * priced.reduce((sum, r) => sum + r.dailyKm, 0) *
    emission.electricBusKwhPerKm * emission.gridKgPerKwh
    : proposedPassengerKmPerDay * emission.dieselBusKgPerPassengerKm;
  const proposedMonthlyKg = proposedKgPerDay * days;

  $("#resultCarbon").textContent =
    `${Math.round(proposedMonthlyKg).toLocaleString("en-IN")} kg`;
  $("#carbonCaption").textContent = "Estimated proposed fleet CO₂ / month";

  const carbonDetails = $("#carbonDetails");
  if (carbonDetails) {
    const comparison = hasCurrentTransport
      ? `<p><strong>Estimated current transport:</strong> ${Math.round(currentKgPerDay * days).toLocaleString("en-IN")} kg CO₂/month</p>
         <p><strong>Indicative difference:</strong> ${Math.round((currentKgPerDay - proposedKgPerDay) * days).toLocaleString("en-IN")} kg CO₂/month ${currentKgPerDay >= proposedKgPerDay ? "potentially avoided" : "additional"}</p>`
      : `<p><strong>Current baseline:</strong> Not available. No carbon savings are claimed without an existing transport baseline.</p>`;
    carbonDetails.innerHTML = `${comparison}
      <p><strong>Proposed fleet:</strong> ${isElectricFleet ? "Electric fleet (grid-electricity estimate)" : "Diesel fleet (passenger-kilometre estimate)"}.</p>
      <p><strong>Distance basis:</strong> Actual daily commute distance; one-way entries are doubled and round-trip entries are used as entered. The 40 km fare minimum is not applied to emissions.</p>
      <p><strong>Method:</strong> Standard indicative occupancy and emission-factor assumptions. Current cab and bus counts are adjusted using assumed occupancy where employee counts are provided.</p>`;
  }

  $("#resultRows").innerHTML = priced.map(r =>
    `<tr>
      <td>${escapeText(r.area)}</td>
      <td>${r.employees}</td>
      <td>${r.buses}</td>
      <td>${Number(r.dailyKm.toFixed(1))}</td>
      <td>${money(r.buses * r.fareKm * r.rate * days)}</td>
    </tr>`
  ).join("");

  $("#resultDisclaimer").textContent =
    `Calculation uses revised TGSRTC BOC rates from Circular No. 27/2022 dated 17.06.2022. For 40–79 km: CO / Green CO ₹57/km; ME / Green ME ₹62/km. For 80 km and above: CO / Green CO ₹53/km; ME / Green ME ₹57/km. One-way distances are doubled to calculate daily travel; round-trip distances are used as entered. Fare distance is the greater of 40 km or the calculated daily distance. Monthly estimate = buses required × fare distance × applicable rate × operating days. Areas assigned to the same shared corridor are combined for bus capacity and cost; the longest entered daily distance is used as an approximate corridor distance, so verify the actual pickup sequence and road distance before confirming the route. This is an indicative estimate, not a quotation. Carbon estimates are generated automatically using indicative occupancy and emission-factor assumptions. The current baseline is shown only when existing company transport is reported; otherwise no carbon savings are claimed. Confirm route feasibility, exact tariff application, vehicle availability and terms with TGSRTC.`;

  showPage(5);
}


// Generate a branded, downloadable PDF report (independent of browser print styles).
function exportEstimatePdf() {
  // Prefer the branded jsPDF report when the library is available.
  // If the CDN is blocked/offline, fall back to the browser's native
  // Print dialog so the user can still choose Microsoft Print to PDF / Save as PDF.
  if (!window.jspdf || !window.jspdf.jsPDF) {
    window.print();
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210;
  const pageH = 297;
  const margin = 17;
  const contentW = pageW - margin * 2;
  const green = [23, 60, 43];
  const lime = [190, 218, 135];
  const ink = [35, 43, 38];
  const muted = [105, 115, 108];
  const pale = [242, 246, 239];
  let y = 0;
  let page = 1;

  const text = (value, x, yy, size = 9, color = ink, style = "normal", opts = {}) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    doc.text(Array.isArray(value) ? value : String(value ?? "—"), x, yy, opts);
  };
  const moneyText = value => {
    const n = Number(String(value || "").replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? "INR " + Math.round(n).toLocaleString("en-IN") : String(value || "—");
  };
  const addFooter = () => {
    doc.setDrawColor(220, 226, 219);
    doc.line(margin, 284, pageW - margin, 284);
    text("TGSRTC CORPORATE MOBILITY PLANNER", margin, 290, 7, muted, "bold");
    text(`CONFIDENTIAL ESTIMATE  ·  ${page}`, pageW - margin, 290, 7, muted, "normal", { align: "right" });
  };
  const newPage = () => {
    addFooter();
    doc.addPage();
    page += 1;
    doc.setFillColor(...green);
    doc.rect(0, 0, pageW, 12, "F");
    text("TGSRTC  /  CORPORATE MOBILITY PLAN", margin, 8, 7, [255, 255, 255], "bold");
    y = 22;
  };
  const ensure = needed => { if (y + needed > 275) newPage(); };
  const section = title => {
    ensure(13);
    y += 5;
    doc.setFillColor(...lime);
    doc.rect(margin, y - 4, 2, 7, "F");
    text(title.toUpperCase(), margin + 6, y + 1, 9, green, "bold");
    y += 8;
  };
  const paragraph = (value, size = 8, color = muted) => {
    const lines = doc.splitTextToSize(String(value || ""), contentW);
    ensure(lines.length * 4 + 3);
    text(lines, margin, y, size, color);
    y += lines.length * 4 + 3;
  };
  const metric = (x, yy, w, label, value, sub = "") => {
    doc.setFillColor(...pale);
    doc.roundedRect(x, yy, w, 23, 2, 2, "F");
    text(label.toUpperCase(), x + 4, yy + 6, 6.5, muted, "bold");
    text(value, x + 4, yy + 14, 12, green, "bold");
    if (sub) text(sub, x + 4, yy + 19, 6, muted);
  };

  // Cover / executive snapshot.
  doc.setFillColor(...green);
  doc.rect(0, 0, pageW, 59, "F");
  doc.setFillColor(...lime);
  doc.rect(margin, 15, 2, 27, "F");
  text("TGSRTC", margin + 7, 19, 10, [255, 255, 255], "bold");
  text("CORPORATE MOBILITY", margin + 7, 25, 7, [215, 228, 216], "bold");
  text("COMMUTE PLAN", margin + 7, 38, 20, [255, 255, 255], "bold");
  text("INDICATIVE COST & FLEET ESTIMATE", margin + 7, 47, 7, [215, 228, 216], "normal");
  text(new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }), pageW - margin, 18, 8, [255, 255, 255], "normal", { align: "right" });

  y = 72;
  const company = $("#company").value.trim() || "Organisation not specified";
  const office = $("#office").value.trim() || "—";
  text("PREPARED FOR", margin, y, 7, muted, "bold");
  y += 7;
  text(company, margin, y, 15, ink, "bold");
  y += 7;
  paragraph(`Office location: ${office}`, 8, muted);
  paragraph(`Employees requiring transport: ${Number($("#employees").value || 0).toLocaleString("en-IN")}  ·  Operating days per month: ${$("#operatingDays").value || "—"}`, 8, muted);

  section("Executive summary");
  const fleetLabel = $("#resultFleet").textContent.trim();
  const totalCost = $("#resultCost").textContent.trim();
  const buses = $("#resultBuses").textContent.trim();
  const covered = $("#resultEmployees").textContent.trim();
  const carbon = $("#resultCarbon").textContent.trim();
  const gap = 3;
  const boxW = (contentW - gap) / 2;
  metric(margin, y, boxW, "Estimated monthly cost", totalCost);
  metric(margin + boxW + gap, y, boxW, "Proposed fleet", `${buses} buses`);
  y += 27;
  metric(margin, y, boxW, "Employees covered", covered);
  metric(margin + boxW + gap, y, boxW, "Proposed fleet CO₂ / month", carbon);
  y += 29;
  paragraph(`Selected category: ${fleetLabel}.`, 8, ink);

  section("Route-wise cost breakdown");
  const cols = [margin, margin + 47, margin + 75, margin + 96, margin + 123, pageW - margin];
  const headers = ["AREA", "EMPLOYEES", "BUSES", "KM / DAY", "MONTHLY COST"];
  doc.setFillColor(...green);
  doc.rect(margin, y - 4, contentW, 9, "F");
  headers.forEach((h, i) => text(h, cols[i] + 2, y + 2, 6.2, [255, 255, 255], "bold"));
  y += 10;
  const routes = getRoutes();
  const selected = rates[selectedFleet];
  const days = Number($("#operatingDays").value) || 0;
  routes.forEach((r, i) => {
    const busesForRoute = Math.ceil(r.employees / selected.capacity);
    const rate = r.fareKm < 80 ? selected.short : selected.long;
    const cost = busesForRoute * r.fareKm * rate * days;
    const row = [r.area, String(r.employees), String(busesForRoute), `${Number(r.dailyKm.toFixed(1))}`, `INR ${Math.round(cost).toLocaleString("en-IN")}`];
    const wrapped = row.map((v, idx) => doc.splitTextToSize(v, [43, 24, 17, 24, 47][idx]));
    const rowH = Math.max(8, ...wrapped.map(lines => lines.length * 3.5 + 2));
    ensure(rowH + 2);
    if (i % 2 === 0) { doc.setFillColor(246, 248, 245); doc.rect(margin, y - 4, contentW, rowH, "F"); }
    wrapped.forEach((lines, idx) => text(lines, cols[idx] + 2, y + 1, 7, idx === 4 ? green : ink, idx === 4 ? "bold" : "normal"));
    y += rowH;
  });
  doc.setDrawColor(220, 226, 219);
  doc.line(margin, y, pageW - margin, y);
  y += 5;
  paragraph("KM / DAY shows the actual daily commute distance. Fare calculations apply the 40 km minimum and the applicable tariff band.", 7, muted);

  section("Current transport comparison");
  const existing = $('input[name="existing"]:checked').value === "yes";
  if (existing) {
    const types = [];
    if ($('input[name="kind"][value="cab"]').checked) types.push(`${$("#cabs").value || 0} cabs; monthly spend ${moneyText($("#cabCost").value)}`);
    if ($('input[name="kind"][value="bus"]').checked) types.push(`${$("#buses").value || 0} buses; monthly spend ${moneyText($("#busCost").value)}`);
    paragraph(types.length ? types.join(". ") : "Existing transport was reported, but no vehicle type was selected.", 8, ink);
    paragraph(`Current monthly expenditure entered: ${$("#comparisonCurrent")?.textContent.trim() || "Not provided"}. Proposed TGSRTC monthly estimate: ${$("#comparisonProposed")?.textContent.trim() || $("#resultCost").textContent.trim()}.`, 8, ink);
    const savingValue = $("#resultSaving")?.textContent.trim() ||
    $("#comparisonDifference")?.textContent.trim() || "—";
  paragraph(`Estimated monthly cost difference: ${savingValue} (${$("#savingCaption").textContent.trim()}).`, 8, ink);
  } else {
    paragraph("No existing company transport was reported. A current-cost comparison and baseline carbon savings are therefore not claimed.", 8, muted);
  }

  section("Estimated environmental impact");
  const carbonBlock = $("#carbonDetails");
  if (carbonBlock) {
    [...carbonBlock.querySelectorAll("p")].forEach(p => paragraph(p.textContent.trim(), 7.5, muted));
  } else {
    paragraph(`Estimated proposed fleet CO₂ per month: ${carbon}.`, 8, muted);
  }

  section("Methodology & important notes");
  paragraph($("#resultDisclaimer").textContent.trim(), 7, muted);
  paragraph("This report is generated from the information entered in the planner. It is an indicative planning estimate, not a quotation, service commitment or confirmation of vehicle availability. Please validate route feasibility, schedules, tariff applicability and operating terms with TGSRTC.", 7, muted);

  addFooter();
  const safeName = (company || "organisation").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "organisation";
  doc.save(`TGSRTC-Mobility-Estimate-${safeName}.pdf`);
}

function escapeText(s) {
  return s.replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

$$(".route-row .remove-route").forEach(btn =>
  btn.addEventListener("click", () => {
    btn.closest(".route-row").remove();
    renumberRoutes();
  })
);

$$(".route-row").forEach(updateRoutePreview);
initialiseRouteChoices();
updateRouteGroupingHint();
updateExisting();
chooseFleet($(".fleet-card.selected"));