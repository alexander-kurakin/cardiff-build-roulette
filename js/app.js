const PARTICIPANTS_CSV_PATH = "data/participants.csv";

async function loadParticipants() {
    const response = await fetch(PARTICIPANTS_CSV_PATH, { cache: "no-store" });
    const text = await response.text();
    const rows = parseCsv(text);

    return csvRowsToObjects(rows);
}

function renderParticipantsTable(participants) {
    const tbody = document.querySelector("#participants-table tbody");
    tbody.innerHTML = "";

    for (const participant of participants) {
        const isAssigned = participant["Подкласс"].length > 0 && participant["Умение"].length > 0;

        const row = document.createElement("tr");
        row.className = isAssigned ? "participant-row participant-row--assigned" : "participant-row participant-row--pending";

        const numberCell = document.createElement("td");
        numberCell.textContent = participant["#"];
        row.appendChild(numberCell);

        const loginCell = document.createElement("td");
        loginCell.textContent = participant["Логин"];
        row.appendChild(loginCell);

        const subclassCell = document.createElement("td");
        subclassCell.textContent = participant["Подкласс"] || "—";
        row.appendChild(subclassCell);

        const skillCell = document.createElement("td");
        skillCell.textContent = participant["Умение"] || "—";
        row.appendChild(skillCell);

        tbody.appendChild(row);
    }
}

async function init() {
    const participants = await loadParticipants();
    renderParticipantsTable(participants);
}

init();
