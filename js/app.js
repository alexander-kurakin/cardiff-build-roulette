const PARTICIPANTS_CSV_PATH = "data/participants.csv";
const SKILLS_ASCENDANCIES_CSV_PATH = "data/skills-ascendancies.csv";
const ICONS_JSON_PATH = "data/icons.json";

const BOSS_COLUMNS = ["Сирус", "Убер Атзири", "Ол, босс спуска", "Мейвен", "Убер Древний"];

let participants = [];
let ascendancyPool = [];
let skillPool = [];
let icons = { skills: {}, ascendancies: {} };
let selectedIndex = null;

async function fetchCsvRows(path) {
    const response = await fetch(path, { cache: "no-store" });
    const text = await response.text();
    return parseCsv(text);
}

function parseRerollsUsed(rawValue) {
    const parsed = parseInt(rawValue, 10);
    return Number.isInteger(parsed) ? parsed : 0;
}

async function loadParticipants() {
    const rows = await fetchCsvRows(PARTICIPANTS_CSV_PATH);
    const records = csvRowsToObjects(rows);

    return records.map(record => ({
        number: record["#"],
        login: record["Логин"],
        ascendancy: record["Подкласс"],
        skill: record["Умение"],
        bossKillVerified: BOSS_COLUMNS.some(column => record[column] === "Да"),
        hadReroll: record["Был реролл"] === "Да",
        rerollsUsed: parseRerollsUsed(record["Количество рероллов"]),
    }));
}

async function loadSkillsAndAscendancies() {
    const rows = await fetchCsvRows(SKILLS_ASCENDANCIES_CSV_PATH);
    const skills = [];
    const ascendancies = [];

    for (const [skill, ascendancy] of rows) {
        if (skill) skills.push(skill);
        if (ascendancy) ascendancies.push(ascendancy);
    }

    return { skills, ascendancies };
}

async function loadIcons() {
    const response = await fetch(ICONS_JSON_PATH, { cache: "no-store" });
    return response.json();
}

function maxRerollsFor(participant) {
    return participant.bossKillVerified ? 2 : 1;
}

function hasResult(participant) {
    return participant.ascendancy.length > 0 && participant.skill.length > 0;
}

function renderParticipantsTable() {
    const tbody = document.querySelector("#participants-table tbody");
    tbody.innerHTML = "";

    participants.forEach((participant, index) => {
        const row = document.createElement("tr");
        row.className = hasResult(participant)
            ? "participant-row participant-row--assigned"
            : "participant-row participant-row--pending";

        if (index === selectedIndex) {
            row.classList.add("participant-row--selected");
        }

        const numberCell = document.createElement("td");
        numberCell.textContent = participant.number;
        row.appendChild(numberCell);

        const loginCell = document.createElement("td");
        loginCell.textContent = participant.login;
        row.appendChild(loginCell);

        const subclassCell = document.createElement("td");
        subclassCell.textContent = participant.ascendancy || "—";
        row.appendChild(subclassCell);

        const skillCell = document.createElement("td");
        skillCell.textContent = participant.skill || "—";
        row.appendChild(skillCell);

        const hadRerollCell = document.createElement("td");
        hadRerollCell.textContent = participant.hadReroll ? "Да" : "Нет";
        row.appendChild(hadRerollCell);

        const rerollsCountCell = document.createElement("td");
        rerollsCountCell.textContent = participant.rerollsUsed;
        if (participant.rerollsUsed >= 2) {
            rerollsCountCell.classList.add("reroll-cell--double");
        }
        row.appendChild(rerollsCountCell);

        row.addEventListener("click", () => {
            selectedIndex = index;
            renderParticipantsTable();
            renderControls();
        });

        tbody.appendChild(row);
    });
}

function renderControls() {
    const panel = document.getElementById("controls-panel");
    const selectedNameEl = document.getElementById("selected-player-name");
    const rollButton = document.getElementById("roll-button");
    const rerollAscendancyButton = document.getElementById("reroll-ascendancy-button");
    const rerollSkillButton = document.getElementById("reroll-skill-button");
    const rerollsInfo = document.getElementById("rerolls-info");

    if (selectedIndex === null) {
        selectedNameEl.textContent = "Выбери игрока в таблице";
        rollButton.disabled = true;
        rerollAscendancyButton.disabled = true;
        rerollSkillButton.disabled = true;
        rerollsInfo.textContent = "";
        return;
    }

    const participant = participants[selectedIndex];
    selectedNameEl.textContent = participant.login;

    const alreadyRolled = hasResult(participant);
    const rerollsLeft = maxRerollsFor(participant) - participant.rerollsUsed;

    rollButton.disabled = alreadyRolled;
    rollButton.classList.toggle("hidden", alreadyRolled);

    rerollAscendancyButton.disabled = !alreadyRolled || rerollsLeft <= 0;
    rerollSkillButton.disabled = !alreadyRolled || rerollsLeft <= 0;
    rerollAscendancyButton.classList.toggle("hidden", !alreadyRolled);
    rerollSkillButton.classList.toggle("hidden", !alreadyRolled);

    rerollsInfo.textContent = alreadyRolled
        ? `Рероллов осталось: ${Math.max(rerollsLeft, 0)} из ${maxRerollsFor(participant)}`
        : "";
}

async function handleRoll(mode) {
    const participant = participants[selectedIndex];

    const result = await runRoulette({
        mode,
        playerName: participant.login,
        currentAscendancy: participant.ascendancy,
        currentSkill: participant.skill,
        ascendancyPool,
        skillPool,
        icons,
    });

    if (mode !== "skill") participant.ascendancy = result.ascendancy;
    if (mode !== "ascendancy") participant.skill = result.skill;

    if (mode !== "full") {
        participant.rerollsUsed += 1;
        participant.hadReroll = true;
    }

    renderParticipantsTable();
    renderControls();
}

function bindControlButtons() {
    document.getElementById("roll-button").addEventListener("click", () => handleRoll("full"));
    document.getElementById("reroll-ascendancy-button").addEventListener("click", () => handleRoll("ascendancy"));
    document.getElementById("reroll-skill-button").addEventListener("click", () => handleRoll("skill"));
}

async function init() {
    const [loadedParticipants, pools, loadedIcons] = await Promise.all([
        loadParticipants(),
        loadSkillsAndAscendancies(),
        loadIcons(),
    ]);

    participants = loadedParticipants;
    ascendancyPool = pools.ascendancies;
    skillPool = pools.skills;
    icons = loadedIcons;

    bindControlButtons();
    renderParticipantsTable();
    renderControls();
}

init();
