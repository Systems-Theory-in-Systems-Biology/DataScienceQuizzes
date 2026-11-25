// Die Fragen stehen in fragen/fragen.js (window.QUESTION_DATA).
// Diese Datei wird mit convert_fragen.py aus den Excel-Dateien erzeugt.
// Der Excel-Dateiname ist gleichzeitig der Name des Fragenblocks.

// Ordner, in dem die Bilder liegen. In Excel genügt dann z. B. [bild:grafik1.png]
const IMAGE_FOLDER = 'bilder/';

// Schalter für Funktionen, die schon eingebaut, aber noch ausgeblendet sind.
// Auf true setzen, sobald genug Fragen vorhanden sind.
const SHOW_TOPICS = true;       // Auswahl nach Thema (Spalte "Thema")
const SHOW_DIFFICULTY = false;   // Auswahl nach Schwierigkeit (Spalte "Schwierigkeit")

// Antworten in zufälliger Reihenfolge anzeigen?
// (In der Excel steht die richtige Antwort meist bei A1 – ohne Mischen
// wäre die erste Antwort immer richtig.)
const SHUFFLE_ANSWERS = true;


let questions = {};          // { Blockname: [Frage, Frage, ...] }
let currentBlock = null;
let currentQuestionIndex = 0;
let currentQuestions = [];
let results = [];            // pro Frage true/false (verhindert Doppelzählung beim Zurückgehen)
let selected = new Set();    // aktuell markierte Antworten
let answered = false;

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
const checkBtn = document.getElementById("check-btn");
const answerHint = document.getElementById("answer-hint");


// Zellen, die leer sind oder 0 enthalten (leere Formelzeilen), gelten als leer
function cellText(value) {
    if (value === null || value === undefined) return "";
    if (value === 0 || value === "0") return "";
    return String(value).trim();
}

function normalizeDifficulty(value) {
    const v = cellText(value).toLowerCase();
    if (["leicht", "einfach", "easy"].includes(v)) return "easy";
    if (["schwer", "schwierig", "hard"].includes(v)) return "hard";
    return "";
}

// Wandelt die Tabellenzeilen (Liste von Listen) in Fragen um.
function rowsToQuestions(rows, sourceName = "") {
    if (!rows.length) return [];

    // Spaltenüberschriften -> Spaltennummer (Leerzeichen/Groß-Kleinschreibung egal)
    const col = {};
    rows[0].forEach((h, i) => { col[String(h).trim().toLowerCase()] = i; });

    const get = (row, name) => (name in col ? row[col[name]] : "");
    const result = [];

    for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        const text = cellText(get(row, "frage"));
        if (!text) continue; // leere Zeile überspringen

        // Antworten A1, A2, ... mit Status 1, Status 2, ...
        const answers = [];
        for (let n = 1; ("a" + n) in col; n++) {
            const status = cellText(get(row, "status " + n)).toLowerCase();
            const raw = get(row, "a" + n);
            const isStatus = status.startsWith("r") || status.startsWith("f");
            if (!isStatus || raw === "" || raw === null || raw === undefined) continue;
            answers.push({ text: String(raw).trim(), correct: status.startsWith("r") });
        }

        const where = `${sourceName} Zeile ${r + 1}`;
        if (answers.length < 2) {
            console.warn(`${where}: übersprungen (weniger als 2 Antworten mit Status r/f)`);
            continue;
        }
        if (!answers.some(a => a.correct)) {
            console.warn(`${where}: übersprungen (keine Antwort mit "r" markiert)`);
            continue;
        }

        result.push({
            topic: cellText(get(row, "thema")),
            text: text,
            answers: answers,
            tipp: cellText(get(row, "tipp")),
            merksatz: cellText(get(row, "merksatz")),
            difficulty: normalizeDifficulty(get(row, "schwierigkeit"))
        });
    }
    return result;
}

function loadQuestions() {
    const errors = [];
    const data = window.QUESTION_DATA;

    if (!data) {
        topicDiv.innerHTML = "<p>Fragen konnten nicht geladen werden (fragen/fragen.js fehlt).</p>";
        return;
    }

    for (const blockName of Object.keys(data)) {
        try {
            const list = rowsToQuestions(data[blockName], blockName);
            if (list.length === 0) throw new Error("keine gültigen Fragen gefunden");
            questions[blockName] = list;
        } catch (error) {
            console.error(`Fehler bei ${blockName}:`, error);
            errors.push(`${blockName}: ${error.message}`);
        }
    }

    showBlocks();

    if (errors.length) {
        const p = document.createElement("p");
        p.textContent = "Fehler beim Laden: " + errors.join(" | ");
        topicDiv.appendChild(p);
    }
}


// Startseite: Fragenblöcke (= Excel-Dateien)
function showBlocks() {
    topicDiv.innerHTML = "";
    topicDiv.style.display = "grid";
    diffSelection.style.display = "none";
    quizArea.style.display = "none";
    returnDiv.style.display = "none";

    for (let block in questions) {
        const button = document.createElement("button");
        button.textContent = block;
        button.classList.add("topic-btn");
        button.onclick = () => chooseBlock(block);
        topicDiv.appendChild(button);
    }
}

function chooseBlock(block) {
    currentBlock = block;
    if (SHOW_TOPICS) {
        showTopics(block);
    } else {
        chooseDifficulty(block, questions[block]);
    }
}

// Thema innerhalb eines Blocks (aktuell ausgeblendet)
function showTopics(block) {
    const topics = [...new Set(questions[block].map(q => q.topic).filter(Boolean))];
    const options = [
        { label: "Alle Themen", pool: questions[block] },
        ...topics.map(t => ({ label: t, pool: questions[block].filter(q => q.topic === t) }))
    ];
    showChoice(options, (pool) => chooseDifficulty(block, pool));
}

function chooseDifficulty(block, pool) {
    if (SHOW_DIFFICULTY) {
        showDifficulty(block, pool);
    } else {
        startQuiz(pool);
    }
}

// Schwierigkeit (aktuell ausgeblendet)
function showDifficulty(block, pool) {
    const options = difficulties.map(d => ({
        label: d.label,
        pool: getQuestionsForDifficulty(pool, d.key)
    }));
    showChoice(options, (p) => startQuiz(p));
}

// Gemeinsamer Bildschirm für Thema-/Schwierigkeitswahl
function showChoice(options, onPick) {
    topicDiv.style.display = "none";
    quizArea.style.display = "none";
    diffSelection.style.display = "grid";
    diffSelection.innerHTML = "";

    options.forEach((opt) => {
        const btn = document.createElement("button");
        btn.textContent = opt.label;
        btn.classList.add("diff-btn");
        btn.onclick = () => onPick(opt.pool);
        diffSelection.appendChild(btn);
    });

    const back = document.createElement("button");
    back.textContent = "Zurück";
    back.classList.add("return-btn");
    back.onclick = showBlocks;
    diffSelection.appendChild(back);
}

function getQuestionsForDifficulty(pool, difficultyKey) {
    if (difficultyKey === "easy" || difficultyKey === "hard") {
        return pool.filter((q) => q.difficulty === difficultyKey);
    }
    return [...pool].sort(() => Math.random() - 0.5); // "random"
}


function shuffle(list) {
    const a = [...list];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function startQuiz(pool) {
    // Kopie anlegen, damit die Originalreihenfolge der Antworten erhalten bleibt
    currentQuestions = pool.map(q => ({
        ...q,
        answers: SHUFFLE_ANSWERS ? shuffle(q.answers) : [...q.answers]
    }));
    currentQuestionIndex = 0;
    results = new Array(currentQuestions.length).fill(false);

    topicDiv.style.display = "none";
    diffSelection.style.display = "none";
    returnDiv.style.display = "none";
    quizArea.style.display = "block";

    if (currentQuestions.length === 0) {
        progressDiv.textContent = "";
        questionText.textContent = "Keine Fragen für diese Auswahl gefunden.";
        answersDiv.innerHTML = "";
        answerHint.style.display = "none";
        checkBtn.style.display = "none";
        tippBtn.style.display = "none";
        nextBtn.style.display = "none";
        addHomeButton();
        return;
    }
    showQuestion();
}

// Schreibt Text in ein Element und ersetzt Platzhalter [bild:datei.png] durch echte Bilder.
// Optional mit Beschreibung für Screenreader: [bild:datei.png|Beschreibung]
function renderRich(el, text, prefix = "") {
    el.textContent = "";
    const full = prefix + text;
    const pattern = /\[bild:\s*([^\]|]+?)\s*(?:\|\s*([^\]]*?)\s*)?\]/gi;
    let last = 0, m;
    while ((m = pattern.exec(full)) !== null) {
        if (m.index > last) appendFormatted(el, full.slice(last, m.index));
        const img = document.createElement("img");
        img.src = IMAGE_FOLDER + m[1];
        img.alt = m[2] || "Abbildung";
        img.classList.add("quiz-img");
        img.onerror = () => {
            console.warn(`Bild nicht gefunden: ${IMAGE_FOLDER}${m[1]}`);
            img.replaceWith(document.createTextNode(`[Bild fehlt: ${img.getAttribute("src")}]`));
        };
        el.appendChild(img);
        last = pattern.lastIndex;
    }
    if (last < full.length) appendFormatted(el, full.slice(last));
}

// Hängt Text an ein Element an. Formeln \( ... \) bleiben unverändert (werden später
// von KaTeX gesetzt); in den übrigen Textteilen werden einfache LaTeX-Textbefehle
// umgesetzt: \textbf{..} -> fett, \emph{..} -> kursiv, \, -> schmales Leerzeichen,
// \begin{itemize} / \end{itemize} werden entfernt.
function appendFormatted(el, text) {
    const parts = text.split(/(\\\(.*?\\\)|\\\[.*?\\\])/s);
    parts.forEach((part, i) => {
        if (i % 2 === 1) {            // Formel unverändert übernehmen
            el.appendChild(document.createTextNode(part));
            return;
        }
        part = part
            .replace(/\\(?:begin|end)\{itemize\}/g, "")
            .replace(/\\,/g, "\u202F");
        const re = /\\(textbf|emph|textit)\{([^{}]*)\}/g;
        let last = 0, m;
        while ((m = re.exec(part)) !== null) {
            if (m.index > last) el.appendChild(document.createTextNode(part.slice(last, m.index)));
            const node = document.createElement(m[1] === "textbf" ? "strong" : "em");
            node.textContent = m[2];
            el.appendChild(node);
            last = re.lastIndex;
        }
        if (last < part.length) el.appendChild(document.createTextNode(part.slice(last)));
    });
}

function typeset() {
    if (typeof renderMathInElement !== "function") return;
    renderMathInElement(quizArea, {
        delimiters: [
            { left: "\\(", right: "\\)", display: false },
            { left: "\\[", right: "\\]", display: true }
        ],
        throwOnError: false      // fehlerhafte Formeln stören das Quiz nicht
    });
}

function isMulti(q) {
    return q.answers.filter(a => a.correct).length > 1;
}

function showQuestion() {
    const q = currentQuestions[currentQuestionIndex];
    const multi = isMulti(q);
    selected = new Set();
    answered = false;

    progressDiv.textContent = `Frage ${currentQuestionIndex + 1} von ${currentQuestions.length}`;
    renderRich(questionText, q.text);
    answersDiv.innerHTML = "";

    // Alles zurücksetzen
    tippContainer.style.display = "none";
    tippContainer.textContent = "";
    merksatzContainer.style.display = "none";
    merksatzContainer.textContent = "";
    nextBtn.style.display = "none";

    // Hinweis zur Antwortart
    // Hinweis nur bei Mehrfachauswahl anzeigen
    answerHint.textContent = multi
        ? "Mehrere Antworten können richtig sein. Wähle alle richtigen aus."
        : "";
    answerHint.style.display = multi ? "block" : "none";

    // Tipp
    if (q.tipp) {
        tippBtn.style.display = "block";
        tippBtn.onclick = () => {
            renderRich(tippContainer, q.tipp, "Tipp: ");
            tippContainer.style.display = "block";
            typeset();
        };
    } else {
        tippBtn.style.display = "none";
    }

    // Antworten
    q.answers.forEach((answer, index) => {
        const button = document.createElement("button");
        renderRich(button, answer.text);
        button.classList.add("answer-btn");
        button.onclick = () => {
            if (answered) return;
            if (multi) {
                // an-/abwählen
                if (selected.has(index)) {
                    selected.delete(index);
                    button.classList.remove("selected");
                } else {
                    selected.add(index);
                    button.classList.add("selected");
                }
                checkBtn.disabled = selected.size === 0;
            } else {
                selected = new Set([index]);
                evaluateAnswer();
            }
        };
        answersDiv.appendChild(button);
    });

    // "Antwort prüfen" nur bei Mehrfachauswahl
    if (multi) {
        checkBtn.style.display = "block";
        checkBtn.disabled = true;
        checkBtn.onclick = evaluateAnswer;
    } else {
        checkBtn.style.display = "none";
    }

    // Navigation
    returnDiv.innerHTML = "";
    if (currentQuestionIndex > 0) {
        const btnback = document.createElement("button");
        btnback.textContent = "Vorherige Frage";
        btnback.classList.add("back-btn");
        btnback.onclick = () => {
            currentQuestionIndex--;
            showQuestion();
        };
        returnDiv.appendChild(btnback);
    }
    addHomeButton(false);
    returnDiv.style.display = "block";

    typeset();
}

function addHomeButton(clear = true) {
    if (clear) returnDiv.innerHTML = "";
    const btnhome = document.createElement("button");
    btnhome.textContent = "Zurück zur Übersicht";
    btnhome.classList.add("return-btn");
    btnhome.onclick = showBlocks;
    returnDiv.appendChild(btnhome);
    returnDiv.style.display = "block";
}

function evaluateAnswer() {
    const q = currentQuestions[currentQuestionIndex];
    const allButtons = answersDiv.querySelectorAll(".answer-btn");
    answered = true;

    // Klicks sperren, Prüfen- und Tipp-Button ausblenden
    allButtons.forEach(btn => btn.style.pointerEvents = "none");
    checkBtn.style.display = "none";
    tippBtn.style.display = "none";

    let allRight = true;
    q.answers.forEach((answer, i) => {
        const btn = allButtons[i];
        const wasSelected = selected.has(i);
        btn.classList.remove("selected");

        if (answer.correct) {
            btn.classList.add("correct");
            if (!wasSelected) {
                btn.classList.add("missed"); // richtig, aber nicht angekreuzt
                allRight = false;
            }
        } else if (wasSelected) {
            btn.classList.add("wrong");
            allRight = false;
        }
    });

    // Punkt gibt es nur, wenn genau die richtigen Antworten gewählt wurden
    results[currentQuestionIndex] = allRight;

    answerHint.style.display = "block";
    answerHint.textContent = allRight
        ? "Richtig!"
        : (isMulti(q)
            ? "Nicht ganz – alle richtigen Antworten sind grün markiert."
            : "Leider falsch – die richtige Antwort ist grün markiert.");

    if (q.merksatz) {
        renderRich(merksatzContainer, q.merksatz, "Merksatz: ");
        merksatzContainer.style.display = "block";
    }

    nextBtn.style.display = "block";
    nextBtn.textContent = currentQuestionIndex + 1 < currentQuestions.length ? "Nächste Frage" : "Quiz beenden";
    nextBtn.onclick = () => {
        currentQuestionIndex++;
        if (currentQuestionIndex < currentQuestions.length) {
            showQuestion();
        } else {
            endQuiz();
        }
    };

    typeset();
}

function endQuiz() {
    const score = results.filter(Boolean).length;
    progressDiv.textContent = "";
    questionText.textContent = `Quiz beendet! Deine Punktzahl: ${score} von ${currentQuestions.length}`;
    answersDiv.innerHTML = "";
    answerHint.style.display = "none";
    checkBtn.style.display = "none";
    tippBtn.style.display = "none";
    tippContainer.style.display = "none";
    merksatzContainer.style.display = "none";
    nextBtn.style.display = "none";
    addHomeButton();
}

loadQuestions();
