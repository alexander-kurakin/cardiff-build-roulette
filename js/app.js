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

const CROWD_HEIGHT_PX = 420;
const CROWD_BALL_SIZE_PX = 44;
const CROWD_BALL_RADIUS_PX = CROWD_BALL_SIZE_PX / 2;
const CROWD_ZONE_MARGIN_PX = 10;
const CROWD_MIN_SPACING_PX = CROWD_BALL_SIZE_PX + 6;
const CROWD_PLACEMENT_ATTEMPTS = 80;

const CROWD_TOP_BOUNDS_Y = {
    min: CROWD_ZONE_MARGIN_PX,
    max: CROWD_HEIGHT_PX / 2 - CROWD_BALL_SIZE_PX - CROWD_ZONE_MARGIN_PX,
};
const CROWD_BOTTOM_BOUNDS_Y = {
    min: CROWD_HEIGHT_PX / 2 + CROWD_ZONE_MARGIN_PX,
    max: CROWD_HEIGHT_PX - CROWD_BALL_SIZE_PX - CROWD_ZONE_MARGIN_PX,
};

function randomBetween(min, max) {
    return min + Math.random() * (max - min);
}

function findCrowdBall(login) {
    return document.querySelector(`.crowd-ball[data-login="${CSS.escape(login)}"]`);
}

function crowdXBounds(containerWidth) {
    return { min: CROWD_BALL_RADIUS_PX, max: containerWidth - CROWD_BALL_RADIUS_PX };
}

// Balls are placed one by one, each time picking the random candidate spot
// that stays furthest from already-placed neighbours — a cheap stand-in for
// a real repulsion simulation, good enough to keep 50 balls from stacking
// on top of each other in a fairly small zone.
function findCrowdSpot(existingPositions, boundsX, boundsY) {
    let bestSpot = null;
    let bestDistance = -Infinity;

    for (let attempt = 0; attempt < CROWD_PLACEMENT_ATTEMPTS; attempt++) {
        const candidate = {
            x: randomBetween(boundsX.min, boundsX.max),
            y: randomBetween(boundsY.min, boundsY.max),
        };

        const closestDistance = existingPositions.reduce((closest, position) => {
            const distance = Math.hypot(candidate.x - position.x, candidate.y - position.y);
            return Math.min(closest, distance);
        }, Infinity);

        if (closestDistance >= CROWD_MIN_SPACING_PX) {
            return candidate;
        }

        if (closestDistance > bestDistance) {
            bestDistance = closestDistance;
            bestSpot = candidate;
        }
    }

    return bestSpot;
}

function fillCrowdBallIcons(iconsEl, participant) {
    iconsEl.innerHTML = "";

    const ascendancyIconPath = icons.ascendancies[participant.ascendancy];
    if (ascendancyIconPath) {
        const ascendancyImg = document.createElement("img");
        ascendancyImg.className = "crowd-ball-icon crowd-ball-icon--ascendancy";
        ascendancyImg.src = ascendancyIconPath;
        ascendancyImg.alt = participant.ascendancy;
        iconsEl.appendChild(ascendancyImg);
    }

    const skillIconPath = icons.skills[participant.skill];
    if (skillIconPath) {
        const skillImg = document.createElement("img");
        skillImg.className = "crowd-ball-icon crowd-ball-icon--skill";
        skillImg.src = skillIconPath;
        skillImg.alt = participant.skill;
        iconsEl.appendChild(skillImg);
    }
}

function createCrowdBall(participant, position) {
    const ball = document.createElement("div");
    ball.className = "crowd-ball";
    ball.dataset.login = participant.login;

    const inner = document.createElement("div");
    inner.className = "crowd-ball-inner";
    inner.style.animationDelay = `${randomBetween(0, 2.5)}s`;

    const nameEl = document.createElement("span");
    nameEl.className = "crowd-ball-name";
    nameEl.textContent = participant.login;
    inner.appendChild(nameEl);

    const iconsEl = document.createElement("div");
    iconsEl.className = "crowd-ball-icons";
    inner.appendChild(iconsEl);

    ball.appendChild(inner);
    ball.style.left = `${position.x}px`;
    ball.style.top = `${position.y}px`;

    if (hasResult(participant)) {
        ball.classList.add("crowd-ball--active");
        fillCrowdBallIcons(iconsEl, participant);
    }

    return ball;
}

function renderCrowdPreview() {
    const container = document.getElementById("crowd-preview");
    container.innerHTML = "";

    const boundsX = crowdXBounds(container.clientWidth);
    const topPositions = [];
    const bottomPositions = [];

    participants.forEach(participant => {
        const boundsY = hasResult(participant) ? CROWD_BOTTOM_BOUNDS_Y : CROWD_TOP_BOUNDS_Y;
        const existingPositions = hasResult(participant) ? bottomPositions : topPositions;

        const position = findCrowdSpot(existingPositions, boundsX, boundsY);
        existingPositions.push(position);

        container.appendChild(createCrowdBall(participant, position));
    });
}

function moveCrowdBallToBottom(participant) {
    const ball = findCrowdBall(participant.login);
    if (!ball) return;

    const container = document.getElementById("crowd-preview");
    const boundsX = crowdXBounds(container.clientWidth);

    const existingPositions = Array.from(container.querySelectorAll(".crowd-ball--active"))
        .filter(otherBall => otherBall !== ball)
        .map(otherBall => ({ x: parseFloat(otherBall.style.left), y: parseFloat(otherBall.style.top) }));

    const position = findCrowdSpot(existingPositions, boundsX, CROWD_BOTTOM_BOUNDS_Y);

    ball.style.left = `${position.x}px`;
    ball.style.top = `${position.y}px`;
    ball.classList.add("crowd-ball--active");
    fillCrowdBallIcons(ball.querySelector(".crowd-ball-icons"), participant);
}

function refreshCrowdBallIcons(participant) {
    const ball = findCrowdBall(participant.login);
    if (!ball) return;

    fillCrowdBallIcons(ball.querySelector(".crowd-ball-icons"), participant);
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
    const wasAssigned = hasResult(participant);

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

    if (wasAssigned) {
        refreshCrowdBallIcons(participant);
    } else {
        moveCrowdBallToBottom(participant);
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
    renderCrowdPreview();
    renderParticipantsTable();
    renderControls();
}

init();
