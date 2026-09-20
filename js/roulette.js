const REEL_ITEM_HEIGHT = 100;
const REEL_FILLER_COUNT = 24;
const REEL_SPIN_DURATION_MS = 2600;

function pickRandom(pool) {
    return pool[Math.floor(Math.random() * pool.length)];
}

const ICON_DISPLAY_SIZE = 72;

function buildIconElement(name, iconData) {
    if (!iconData) {
        const placeholder = document.createElement("div");
        placeholder.className = "icon-placeholder";
        return placeholder;
    }

    if (typeof iconData === "string") {
        const img = document.createElement("img");
        img.className = "reel-icon";
        img.src = iconData;
        img.alt = name;
        return img;
    }

    // Sprite-sheet icon (ascendancies): crop a region out of a shared atlas via background-position.
    const scale = ICON_DISPLAY_SIZE / iconData.h;
    const sprite = document.createElement("div");
    sprite.className = "reel-icon reel-icon--sprite";
    sprite.style.backgroundImage = `url("${iconData.sheet}")`;
    sprite.style.backgroundSize = `${iconData.sheetW * scale}px ${iconData.sheetH * scale}px`;
    sprite.style.backgroundPosition = `-${iconData.x * scale}px -${iconData.y * scale}px`;
    sprite.setAttribute("role", "img");
    sprite.setAttribute("aria-label", name);
    return sprite;
}

function buildReelItem(name, iconUrl) {
    const item = document.createElement("div");
    item.className = "reel-item";
    item.appendChild(buildIconElement(name, iconUrl));

    const label = document.createElement("span");
    label.textContent = name;
    item.appendChild(label);

    return item;
}

function fillStaticReel(reelElement, name, iconUrl) {
    const strip = reelElement.querySelector(".reel-strip");
    strip.style.transition = "none";
    strip.style.transform = "translateY(0)";
    strip.innerHTML = "";
    strip.appendChild(buildReelItem(name, iconUrl));
    reelElement.classList.add("reel--static");
}

function spinReel(reelElement, pool, icons, winnerName) {
    return new Promise(resolve => {
        const strip = reelElement.querySelector(".reel-strip");
        reelElement.classList.remove("reel--static");

        strip.style.transition = "none";
        strip.style.transform = "translateY(0)";
        strip.innerHTML = "";

        for (let i = 0; i < REEL_FILLER_COUNT; i++) {
            const name = pickRandom(pool);
            strip.appendChild(buildReelItem(name, icons[name]));
        }

        strip.appendChild(buildReelItem(winnerName, icons[winnerName]));

        const winnerIndex = REEL_FILLER_COUNT;
        const targetOffset = winnerIndex * REEL_ITEM_HEIGHT;

        // Force layout so the transition below animates from translateY(0).
        strip.getBoundingClientRect();

        strip.style.transition = `transform ${REEL_SPIN_DURATION_MS}ms cubic-bezier(0.12, 0.85, 0.15, 1)`;
        strip.style.transform = `translateY(-${targetOffset}px)`;

        strip.addEventListener("transitionend", () => resolve(), { once: true });
    });
}

function playFanfare() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
        return;
    }

    const context = new AudioContextClass();
    const notes = [523.25, 659.25, 783.99, 1046.5];

    notes.forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "triangle";
        oscillator.frequency.value = frequency;

        const startTime = context.currentTime + index * 0.12;
        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.exponentialRampToValueAtTime(0.2, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.3);

        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(startTime);
        oscillator.stop(startTime + 0.35);
    });
}

function runRoulette({ mode, playerName, currentAscendancy, currentSkill, ascendancyPool, skillPool, icons }) {
    const modal = document.getElementById("roulette-modal");
    const nameEl = document.getElementById("roulette-player-name");
    const ascendancyReel = document.getElementById("reel-ascendancy");
    const skillReel = document.getElementById("reel-skill");
    const resultEl = document.getElementById("roulette-result");
    const closeButton = document.getElementById("roulette-close");

    nameEl.textContent = playerName;
    resultEl.classList.add("hidden");
    closeButton.classList.add("hidden");
    modal.classList.remove("hidden");

    const winnerAscendancy = mode === "skill" ? currentAscendancy : pickRandom(ascendancyPool);
    const winnerSkill = mode === "ascendancy" ? currentSkill : pickRandom(skillPool);

    const spins = [];

    if (mode === "skill") {
        fillStaticReel(ascendancyReel, currentAscendancy, icons.ascendancies[currentAscendancy]);
    } else {
        spins.push(spinReel(ascendancyReel, ascendancyPool, icons.ascendancies, winnerAscendancy));
    }

    if (mode === "ascendancy") {
        fillStaticReel(skillReel, currentSkill, icons.skills[currentSkill]);
    } else {
        spins.push(spinReel(skillReel, skillPool, icons.skills, winnerSkill));
    }

    return Promise.all(spins).then(() => {
        document.getElementById("result-ascendancy").textContent = winnerAscendancy;
        document.getElementById("result-skill").textContent = winnerSkill;
        resultEl.classList.remove("hidden");
        closeButton.classList.remove("hidden");
        playFanfare();

        return new Promise(resolve => {
            closeButton.addEventListener("click", () => {
                modal.classList.add("hidden");
                resolve({ ascendancy: winnerAscendancy, skill: winnerSkill });
            }, { once: true });
        });
    });
}
