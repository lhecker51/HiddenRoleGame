const socket = io("");

socket.on("connect", () => {
    console.log("Connected to socket with ID", socket.id);
});

let session_code = "";
const players = [];
const werewolves = [];
let role;
let countdownInterval = null;
let werewolfVotes = {};

// lobby and join
document.getElementById("join-btn").addEventListener("click", () => {
    console.log("Join button clicked.");
    const player_name = document.getElementById("player-name").value.trim();
    session_code = document.getElementById("session-code").value.trim().toUpperCase();

    if (!player_name || !session_code) {
        document.getElementById("status").textContent = "Please enter your name and a session code.";
        return;
    }

    socket.emit("join_session", {player_name, session_code});
});

socket.on("join_success", () => {
    console.log("Joined successfully!");
    document.getElementById("session-code-p").innerText = "Session code: " + session_code;
    document.getElementById("login-screen").classList.add("hidden");
    document.getElementById("game-screen").classList.remove("hidden");
});

socket.on("player_joined", (player_name) => {
    console.log("Player joined:", player_name);
    players.push(player_name);
    update_player_list();
});

socket.on("player_left", (player_name) => {
    console.log("Player left:", player_name);
    const index = players.indexOf(player_name);
    if (index > -1) {
        players.splice(index, 1);
    }
    update_player_list();
});

function update_player_list() {
    const list = document.getElementById("player-list");
    list.innerHTML = players.map(name => `<li>${name}</li>`).join("");
}

document.getElementById("start-btn").addEventListener("click", () => {
    console.log("Start button clicked.");
    socket.emit("start_game", session_code);
});

socket.on("start_success", () => {
    console.log("Game start successful!");
});

socket.on("timer", ({name, time}) => {
    console.log(`Started ${name} for ${time / 1000} seconds...`);

    if (countdownInterval) {
        clearInterval(countdownInterval);
    }

    let timerDisplay;
    let timerSeconds;

    if (name == "role-timer") {
        timerDisplay = document.getElementById("role-timer-display");
        timerSeconds = document.getElementById("role-timer-seconds");
    }
    if (name == "night-timer") {
        if (role === "Villager") {
            timerDisplay = document.getElementById("night--timer-villager-display");
            timerSeconds = document.getElementById("night-timer-villager-seconds");
        } else if (role === "Werewolf") {
            timerDisplay = document.getElementById("night-timer-werewolf-display");
            timerSeconds = document.getElementById("night-timer-werewolf-seconds");
        } else if (role === "Seer") {
            timerDisplay = document.getElementById("night-timer-seer-display");
            timerSeconds = document.getElementById("night-timer-seer-seconds");
        }
    }
    if (name == "day-timer") {
        timerDisplay = document.getElementById("day-timer-display");
        timerSeconds = document.getElementById("day-timer-seconds");
    }

    printTimer(timerSeconds, timerDisplay, time);

});

//parameter: html tags
function printTimer(timerSeconds, timerDisplay, timeMilliseconds) {
    let secondsLeft = timeMilliseconds / 1000;

    timerSeconds.textContent = secondsLeft.toString();
    timerDisplay.classList.remove("hidden");

    countdownInterval = setInterval(() => {
        secondsLeft--;

        if (secondsLeft <= 0) {
            clearInterval(countdownInterval);
            timerSeconds.textContent = "0";
            timerDisplay.classList.add("hidden");
            console.log("Timer finished.");
        } else {
            timerSeconds.textContent = secondsLeft.toString();
        }
    }, 1000);
}

socket.on("role_update", (received_role) => {
    console.log("Role update received:", received_role);
    role = received_role;
    document.getElementById("game-screen").classList.add("hidden");
    document.getElementById("role-name").innerHTML = role;

    document.getElementById("role-screen").classList.remove("role-villager", "role-werewolf");
    if (role == "Villager") {
        document.getElementById("role-screen").classList.add("role-villager");
    } else if (role == "Werewolf") {
        document.getElementById("role-screen").classList.add("role-werewolf");
    } else if (role == "Seer") {
        document.getElementById("role-screen").classList.add("role-seer");
    }
    document.getElementById("role-screen").classList.remove("hidden");

    // Play among us role reveal sound
    const amongUsRoleRevealSound = new Audio("./among-us-role-reveal.mp3");
    amongUsRoleRevealSound.play();
});

socket.on("werewolf_list", (werewolf_list) => {
    document.getElementById("werewolf-team").classList.remove("hidden");
    for (const werewolf of werewolf_list) {
        werewolves.push(werewolf);
    }
    update_werewolf_list("werewolf-team-list");
    console.log("Werewolves are:", werewolves);
});

function update_werewolf_list(html_tag = "werewolf-team-list") {
    const list = document.getElementById(html_tag);
    if (list) {
        list.innerHTML = werewolves.map(werewolf => `<li>${werewolf}</li>`).join("");
    }
}

socket.on("start_night", (number) => {
    console.log("It is night", number);

    document.getElementById("villager-night-count").innerHTML = number.toString();
    document.getElementById("werewolf-night-count").innerHTML = number.toString();

    document.getElementById("role-screen").classList.add("hidden");
    if (role == "Villager") {
        document.getElementById("night-villager-screen").classList.remove("hidden");
        console.log("Showing villager night screen.");
    } else if (role == "Werewolf") {
        document.getElementById("night-werewolf-screen").classList.remove("hidden");
        console.log("Showing werewolf night screen.");
    } else if (role == "Seer") {
        document.getElementById("night-seer-screen").classList.remove("hidden");
        console.log("Showing seer night screen.");
    }
});

function start_werewolf_voting() {
    const victim_container = document.getElementById("night-voting-list");
    victim_container.innerHTML = "";
    const victim_list = get_victims();

    victim_list.forEach((value, index) => {
        const radioId = `option-${index}`;

        const radioButton = document.createElement('input');
        radioButton.type = 'radio';
        radioButton.name = 'werewolf-voting';
        radioButton.value = value;
        radioButton.id = radioId;

        const label = document.createElement('label');
        label.htmlFor = radioId;
        label.classList.add("vote-card");
        label.dataset.target = value;

        const icon = document.createElement("span");
        icon.classList.add("vote-icon");
        icon.textContent = "☠";

        const name = document.createElement("span");
        name.classList.add("vote-name");
        name.textContent = value;

        const voters = document.createElement("span");
        voters.classList.add("wolf-voters");

        radioButton.addEventListener("change", (e) => {
            const current_selection = e.target.value;
            console.log("Selected victim:", current_selection);

            document.querySelectorAll(".vote-card").forEach(card => {
                card.classList.remove("selected");
            });

            label.classList.add("selected");

            socket.emit("werewolf_vote_changed", {
                session_code,
                victim: current_selection
            });
        });

        label.appendChild(radioButton);
        label.appendChild(icon);
        label.appendChild(name);
        label.appendChild(voters);

        victim_container.appendChild(label);
    });
}

function setup_werewolf_submit() {
    const submitBtn = document.getElementById("werewolf-victim-btn");

    const clone = submitBtn.cloneNode(true);
    submitBtn.parentNode.replaceChild(clone, submitBtn);

    clone.addEventListener("click", () => {
        const selected_value = get_werewolf_result();

        if (!selected_value) {
            alert("You must choose a victim before submitting!");
            return;
        }

        console.log("Current vote confirmed:", selected_value);

        socket.emit("werewolf_vote_changed", {
            session_code,
            victim: selected_value
        });

        //clone.textContent = "Current vote confirmed";
        //console.log("Voted to kill victim:", selected_value);

        socket.emit("vote_werewolf", selected_value);

        clone.disabled = true;
        clone.textContent = "Vote submitted...";

        document.querySelectorAll('input[name="werewolf-voting"]').forEach(radio => radio.disabled = true);
    });
}

function get_werewolf_result() {
    return document.querySelector('input[name="werewolf-voting"]:checked')?.value;
}

function render_werewolf_votes(votes) {
    werewolfVotes = votes;

    document.querySelectorAll(".wolf-voters").forEach(element => {
        element.textContent = "";
    });

    document.querySelectorAll(".vote-card").forEach(card => {
        const target = card.dataset.target;
        const votersContainer = card.querySelector(".wolf-voters");

        const votersForThisTarget = Object.entries(votes)
            .filter(([werewolfName, victimName]) => victimName === target)
            .map(([werewolfName]) => werewolfName);

        votersContainer.textContent = "🐺".repeat(votersForThisTarget.length);
    });

    const status = document.getElementById("werewolf-vote-status");
    status.innerHTML = "";

    werewolves.forEach(werewolf => {
        const row = document.createElement("div");
        row.classList.add("wolf-vote-row");

        const victim = votes[werewolf];

        if (victim) {
            row.textContent = `🐺 ${werewolf} → ${victim}`;
        } else {
            row.textContent = `🐺 ${werewolf} → waiting...`;
        }

        status.appendChild(row);
    });
}

socket.on("werewolf_votes_update", ({votes}) => {
    render_werewolf_votes(votes);
});

function get_victims() {
    console.log("Calculating possible victims...");
    return players.filter(victim => !werewolves.includes(victim));

}

socket.on("start_werewolf_vote", () => {
    console.log("Werewolf vote started...");
    werewolfVotes = {};
    document.getElementById("werewolf-vote-status").innerHTML = "";
    const submitBtn = document.getElementById("werewolf-victim-btn");
    submitBtn.disabled = false;
    submitBtn.textContent = "Confirm current vote";

    start_werewolf_voting();
    setup_werewolf_submit();
});


// schickt mir info über alle selected victims von den wölfen
socket.on("selected_werewolf", (victim) => {
    console.log(victim, "was selected for killing...");
});

socket.on("start_seeing", () => {
    console.log("Starting seeing...");
});

socket.on("start_seeing", () => {
    //TODO
});

socket.on("you_died", () => {
    console.log("You died...");
    document.getElementById('night-result').classList.add("hidden");
    document.getElementById('own-death-bool').classList.remove("hidden");
});

socket.on("start_day", (number) => {
    console.log("It is day", number);
    document.getElementById("day-count").innerHTML = number.toString();
    document.getElementById("night-villager-screen").classList.add("hidden");
    document.getElementById("night-werewolf-screen").classList.add("hidden");

    document.getElementById("day-screen").classList.remove("hidden");
});

socket.on("start_day_vote", () => {
    //TODO
    console.log("Day vote started!");
});

socket.on("village_won", (werewolf_list) => {
    console.log("The villagers won the game!");
    document.getElementById('win-villager-screen').classList.remove("hidden");

    werewolves.length = 0;
    for (const werewolf of werewolf_list) {
        werewolves.push(werewolf);
    }
    update_werewolf_list("werewolf-villager-list");

    const restart_button = document.getElementById('restart-villager-btn');
    restart_button.addEventListener("click", () => {
        console.log("Restart button was clicked.");
        socket.emit("restart_game", session_code);

        resetClientState();
    }, { once: true});
});


socket.on("werewolves_won", (werewolf_list) => {
    console.log("The werewolves won the game!");
    document.getElementById('win-werewolf-screen').classList.remove("hidden");
    werewolves.length = 0;
    for (const werewolf of werewolf_list) {
        werewolves.push(werewolf);
    }
    
    update_werewolf_list("werewolf-win-list"); // Nutzt die neue, eindeutige ID

    const restart_button = document.getElementById('restart-werewolf-btn');
    restart_button.addEventListener("click", () => {
        console.log("Restart button was clicked.");
        socket.emit("restart_game", session_code);
        resetClientState();
    }, { once: true});
});

socket.on("error", (data) => {
    console.log("Error received:", data.message);
    document.getElementById("status").textContent = data.message;
});

socket.on("debug", (message) => {
    console.log("Debug received:", message);
});


function resetClientState() {
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }

    werewolves.length = 0; 
    role = null;

    document.getElementById("status").textContent = "";
    document.getElementById("night-result").innerHTML = "Someone was killed during the night:";

    const screensToHide = [
        "role-screen", 
        "night-villager-screen", 
        "night-werewolf-screen", 
        "night-seer-screen",
        "day-screen", 
        "win-villager-screen",
        "win-werewolf-screen",
        "werewolf-team"
    ];
    screensToHide.forEach(screenId => {
        const el = document.getElementById(screenId);
        if (el) el.classList.add("hidden");
    });

    const deathScreen = document.getElementById('own-death-bool');
    if (deathScreen) deathScreen.classList.add("hidden");

    document.getElementById("game-screen").classList.remove("hidden");

    update_player_list();
    update_werewolf_list("werewolf-team-list");
}
