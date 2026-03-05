const teamColor = {
  avenger: "#e01a38",
  xmen: "#fbbf24",
  guardian: "#22c55e",
  asgardian: "#3b82f6",
  villain: "#a855f7",
  defender: "#f97316",
  fantastic: "#06b6d4",
  shield: "#64748b",
  mutant: "#ec4899",
  other: "#8b5cf6",
};

const characterTeams = {
  "Iron Man": "avenger",
  "Captain America": "avenger",
  "Thor": "asgardian",
  "Spider-Man": "avenger",
  "Hulk": "avenger",
  "Black Widow": "shield",
  "Wolverine": "xmen",
  "Deadpool": "mutant",
  "Doctor Strange": "defender",
  "Black Panther": "avenger",
  "Hawkeye": "avenger",
  "Loki": "asgardian",
  "Vision": "avenger",
  "Scarlet Witch": "avenger",
  "Cyclops": "xmen",
  "Storm": "xmen",
  "Jean Grey": "xmen",
  "Magneto": "villain",
  "Professor X": "xmen",
  "Gambit": "xmen",
  "Rogue": "xmen",
  "Daredevil": "defender",
  "Luke Cage": "defender",
  "Jessica Jones": "defender",
  "Rocket Raccoon": "guardian",
  "Groot": "guardian",
  "Star-Lord": "guardian",
  "Gamora": "guardian",
  "Drax": "guardian",
  "Mister Fantastic": "fantastic",
};

const card = document.getElementById("card");
const btn = document.getElementById("btn");

let characters = [];

fetch("marvel_characters.json")
  .then((response) => response.json())
  .then((data) => {
    characters = data;
    generateCard(characters[Math.floor(Math.random() * characters.length)]);
  });

let getMarvelData = () => {
  if (characters.length === 0) return;
  const random = characters[Math.floor(Math.random() * characters.length)];
  generateCard(random);
};

let generateCard = (data) => {
  const imgSrc = data.image;
  const marvelName = data.name;
  const description = data.description;

  const team = characterTeams[marvelName] || "other";
  const themeColor = teamColor[team];

  card.innerHTML = `
        <p class="hp">
          <span>Team</span>
        </p>
        <img src="${imgSrc}" alt="${marvelName}" />
        <h2 class="poke-name">${marvelName}</h2>
        <div class="types"></div>
        <div class="stats">
          <p class="character-desc">${description}</p>
        </div>
  `;

  appendTeam(team);
  styleCard(themeColor);
};

let appendTeam = (team) => {
  let span = document.createElement("SPAN");
  span.textContent = team;
  document.querySelector(".types").appendChild(span);
};

let styleCard = (color) => {
  card.style.background =
    `radial-gradient(circle at 50% 0%, ${color} 36%, #ffffff 36%)`;

  card.querySelectorAll(".types span").forEach((typeColor) => {
    typeColor.style.backgroundColor = color;
  });
};

btn.addEventListener("click", getMarvelData);
