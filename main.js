// Add here the path to the .json file
const questions_path = './questions.json';

let questions = {};
let currentTopic = null;
let currentQuestionIndex = 0;
let score = 0;
let currentQuestions = [];

const difficulties = [
    { key: "easy", label: "Einfach" },
    { key: "hard", label: "Schwer" },
    { key: "random", label: "Zufällig" }
];

const topicDiv = document.getElementById("topic-selection");
const quizArea = document.getElementById("quiz-area");
const questionText = document.getElementById("question-text");
const answersDiv = document.getElementById("answers");
const returnDiv = document.getElementById("return-btn");
const progressDiv = document.getElementById("progress");
const diffSelection = document.getElementById("diff-selection");

const tippBtn = document.getElementById("tipp-btn");
const tippContainer = document.getElementById("tipp-container");
const merksatzContainer = document.getElementById("merksatz-container");
const nextBtn = document.getElementById("next-btn");

async function loadQuestions() {
    try {
        const response = await fetch(questions_path);
        if (!response.ok) throw new Error('Netzwerk-Antwort war nicht ok');
        
        questions = await response.json();
        console.log("Daten erfolgreich geladen");
        showTopics();
    } catch (error) {
        console.error('Fehler beim Laden der JSON:', error);
        topicDiv.innerHTML = "<p>Fehler beim Laden der Fragen.</p>";
    }
}

function showTopics() {
    topicDiv.innerHTML = "";
    topicDiv.style.display = "grid";
    diffSelection.style.display = "none";
    for (let topic in questions) {
        const button = document.createElement("button");
        button.textContent = topic;
        button.classList.add("topic-btn");
        button.onclick = () => showDifficulty(topic);
        topicDiv.appendChild(button);
    }
}

function showDifficulty(topic) {
    topicDiv.style.display = "none";
    quizArea.style.display = "none";
    diffSelection.style.display = "grid";
    diffSelection.innerHTML = "";

    difficulties.forEach((difficulty) => {
        const diffbutton = document.createElement("button");
        diffbutton.textContent = difficulty.label;
        diffbutton.classList.add("diff-btn");
        diffbutton.onclick = () => startQuiz(topic, difficulty.key);
        diffSelection.appendChild(diffbutton);
    });

    const backToTopicsBtn = document.createElement("button");
    backToTopicsBtn.textContent = "Zurück zu den Themen";
    backToTopicsBtn.classList.add("return-btn");
    backToTopicsBtn.onclick = () => {
        diffSelection.style.display = "none";
        showTopics();
    };
    diffSelection.appendChild(backToTopicsBtn);
}

function getQuestionsForDifficulty(topic, difficultyKey) {
    const source = questions[topic] || [];

    if (difficultyKey === "easy" || difficultyKey === "hard") {
        return source.filter((q) => q.difficulty === difficultyKey);
    }

    if (difficultyKey === "random") {
        return [...source].sort(() => Math.random() - 0.5);
    }

    return source;
}

function startQuiz(topic, difficultyKey = "hard") {
    currentTopic = topic;
    currentQuestionIndex = 0;
    score = 0;
    currentQuestions = getQuestionsForDifficulty(topic, difficultyKey);

    if (currentQuestions.length === 0) {
        questionText.textContent = "Keine Fragen für dieses Thema gefunden.";
        answersDiv.innerHTML = "";
        quizArea.style.display = "block";
        topicDiv.style.display = "none";
        diffSelection.style.display = "none";
        return;
    }

    topicDiv.style.display = "none";
    quizArea.style.display = "block";
    returnDiv.style.display = "none";
    diffSelection.style.display = "none";
    showQuestion();
}

function showQuestion() {
    const questionsArray = currentQuestions;
    const q = questionsArray[currentQuestionIndex];
    
    progressDiv.textContent = `Frage ${currentQuestionIndex + 1} von ${questionsArray.length}`;
    questionText.textContent = q.text;
    answersDiv.innerHTML = "";

    tippContainer.style.display = "none";
    tippContainer.textContent = "";
    merksatzContainer.style.display = "none";
    merksatzContainer.textContent = "";
    nextBtn.style.display = "none";

    if (q.hint) {
        tippBtn.style.display = "block";
        tippBtn.onclick = () => {
            tippContainer.textContent = `Tipp: ${q.hint}`;
            tippContainer.style.display = "block";
        };
    } else {
        tippBtn.style.display = "none";
    }

    q.answers.forEach((answer, index) => {
        const button = document.createElement("button");
        button.textContent = answer;
        button.classList.add("answer-btn");
        button.onclick = (e) => checkAnswer(index, e.target);
        answersDiv.appendChild(button);
    });

    returnDiv.innerHTML = "";

    if (currentQuestionIndex > 0) {
        const btnback = document.createElement("button");
        btnback.textContent = "Vorherige Frage";
        btnback.classList.add("back-btn");
        btnback.onclick = () => {
            currentQuestionIndex--;
            showQuestion();
            btnback.style.display = "none";
        }
        returnDiv.appendChild(btnback);
    }

    const btnhome = document.createElement("button");
    btnhome.textContent = "Zurück zur Übersicht";
    btnhome.classList.add("return-btn");
    btnhome.onclick = () => {
        quizArea.style.display = "none";
        showTopics();
        btnhome.style.display = "none";
        returnDiv.style.display = "none";
    };
    returnDiv.appendChild(btnhome);

    returnDiv.style.display = "block";

    if (window.MathJax) {
        MathJax.typesetPromise();
    }
}

function checkAnswer(selectedIndex, clickedButton) {
    const q = currentQuestions[currentQuestionIndex];
    const allButtons = answersDiv.querySelectorAll(".answer-btn");
    
    allButtons.forEach(btn => btn.style.pointerEvents = "none");

    tippBtn.style.display = "none";

    if (selectedIndex === q.correct) {
        score++;
        clickedButton.classList.add("correct");
    } else {
        clickedButton.classList.add("wrong");
        allButtons[q.correct].classList.add("correct");
    }

    if (q.note) {
        merksatzContainer.textContent = `Merksatz: ${q.note}`;
        merksatzContainer.style.display = "block";
    }

    nextBtn.style.display = "block";
    nextBtn.onclick = () => {
        currentQuestionIndex++;
        if (currentQuestionIndex < currentQuestions.length) {
            showQuestion();
        } else {
            endQuiz();
        }
    };
}

function endQuiz() {
    progressDiv.textContent = "";
    questionText.textContent = `Quiz beendet! Deine Punktzahl: ${score} von ${currentQuestions.length}`;
    answersDiv.innerHTML = "";
    tippBtn.style.display = "none";
    tippContainer.style.display = "none";
    merksatzContainer.style.display = "none";
    nextBtn.style.display = "none";
    
    returnDiv.innerHTML = "";
    const btnhome = document.createElement("button");
    btnhome.textContent = "Zurück zur Übersicht";
    btnhome.classList.add("return-btn");
    btnhome.onclick = () => {
        quizArea.style.display = "none";
        showTopics();
        btnhome.style.display = "none";
    };
    returnDiv.appendChild(btnhome);
    returnDiv.style.display = "block";
}

loadQuestions();