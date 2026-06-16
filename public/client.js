const socket = io("");

socket.on("connect", () => {
    console.log("Connected to socket with ID", socket.id);
});

let session_code = "";
const players = [];
const werewolves = [];
let role;


//lobby and join
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
    console.log("Player joined.");
    players.push(player_name);
    update_player_list();
});

socket.on("player_left", (player_name) => {
    console.log("Player left.");
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
})

socket.on("role_update", (received_role) => {
    role = received_role;
    document.getElementById("game-screen").classList.add("hidden");
    document.getElementById("role-name").innerHTML = role;
    //Ich brauche es für role-screen
    document.getElementById("role-screen").classList.remove("role-villager", "role-werewolf");
    if (role == "Villager") {
        document.getElementById("role-screen").classList.add("role-villager");
    } else if (role == "Werewolf") {
        document.getElementById("role-screen").classList.add("role-werewolf");
    }
    console.log("Role update received:", received_role);
    document.getElementById("role-screen").classList.remove("hidden");
});

socket.on("werewolf_list", (werewolf_list) => {
    document.getElementById("werewolf-team").classList.remove("hidden");
    for (const werewolf of werewolf_list) {
        werewolves.push(werewolf);
        update_werewolf_list();
    }
    console.log("Werewolves are:", werewolves);
});

function update_werewolf_list() {
    const list = document.getElementById("werewolf-team-list");
    list.innerHTML = werewolves.map(werewolf => `<li>${werewolf}</li>`).join("");
}

socket.on("start_night", (number) => {
    console.log("It is night", number);
    document.getElementById("role-screen").classList.add("hidden");
    if (role == "Villager") {
        document.getElementById("night-villager-screen").classList.remove("hidden");
        console.log("villager screen worked");

    } else if (role == "Werewolf") {
        document.getElementById("night-werewolf-screen").classList.remove("hidden");
        console.log("werewolf screen worked");
    }
});

function start_werewolf_voting() {
    console.log("Started radiobutton creation");
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

        radioButton.addEventListener("change", (e) => {
            const current_selection = e.target.value;
            console.log("Auswahl geändert auf:", current_selection);

            socket.emit("select_werewolf", current_selection);
        });

        const label = document.createElement('label');
        label.htmlFor = radioId;
        label.textContent = value;

        const br = document.createElement('br');

        victim_container.appendChild(radioButton);
        victim_container.appendChild(label);
        victim_container.appendChild(br);
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

        console.log("You locked in vote for:", selected_value);

        socket.emit("vote_werewolf", selected_value);

        clone.disabled = true;
        clone.textContent = "Vote submitted...";
        
        document.querySelectorAll('input[name="werewolf-voting"]').forEach(radio => radio.disabled = true);
    });
}

function get_werewolf_result() {
    return document.querySelector('input[name="werewolf-voting"]:checked')?.value;
}


function get_victims() {
    return players.filter(victim => !werewolves.includes(victim));
}

socket.on("start_werewolf_vote", () => {
    console.log("Werewolf vote started...");

    start_werewolf_voting();
    setup_werewolf_submit();
});


//schickt mir info ueber alle selected victims von den woelfen
socket.on("selected_werewolf", (victim) => {
    console.log(victim, "was selected for killing...");
});

socket.on("death", (player_name) => {
    console.log(player_name, "has died!");
    const player_index = players.indexOf(player_name);
    if (player_index > -1) {
        players.splice(player_index, 1);
    }
    const werewolf_index = werewolves.indexOf(player_name);
    if (werewolf_index > -1) {
        players.splice(werewolf_index, 1);
    }
});

socket.on("start_day", (number) => {
    console.log("It is day", number);
    document.getElementById("day-screen").classList.remove("Hidden");
});

socket.on("start_day_vote", () => {
    console.log("Day vote started!");
});

socket.on("village_won", () => {
    console.log("The villagers won the game!");
});

socket.on("werewolves_won", () => {
    console.log("The werewolves won the game!");
});

socket.on("error", (data) => {
    console.log("Error received:", data.message);
    document.getElementById("status").textContent = data.message;
});

socket.on("debug", (message) => {
    console.log("Debug received:", message);
});
