// todo
const app = document.querySelector<HTMLDivElement>("#app");

const button = document.createElement("button");

button.addEventListener("click", () => {
  alert("you clikced the button");
});

app?.append(button);
