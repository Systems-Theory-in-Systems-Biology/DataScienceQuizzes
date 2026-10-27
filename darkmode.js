const toggleButton = document.getElementById("dark-mode");
const body = document.body;

const savedTheme = localStorage.getItem("theme");

if (savedTheme === "dark" || !savedTheme) {
    body.classList.add("dark");
}

// toggleButton.addEventListener("click", () => {
//     body.classList.toggle("dark");

//     if (body.classList.contains("dark")) {
//         localStorage.setItem("theme", "dark");
//     } else {
//         localStorage.setItem("theme", "light")
//     }

// });

toggleButton.addEventListener("click", () => {
    const currentScheme = document.documentElement.style.getPropertyValue("color-scheme");
    
    if (currentScheme === "dark") {
        document.documentElement.style.setProperty("color-scheme", "light");
    } else {
        document.documentElement.style.setProperty("color-scheme", "dark");
    }
});