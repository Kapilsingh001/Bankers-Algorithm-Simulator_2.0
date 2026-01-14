// ===================== DOM ELEMENTS =====================
const processInput = document.getElementById("processCount");
const resourceInput = document.getElementById("resourceCount");
const generateBtn = document.getElementById("generateBtn");

const allocationDiv = document.getElementById("allocationMatrix");
const requestDiv = document.getElementById("requestMatrix");
const availableDiv = document.getElementById("availableResources");

const resourceModelSelect = document.getElementById("resourceModel");

const detectBtn = document.getElementById("detectBtn");
const resultPanel = document.getElementById("resultPanel");
const resultText = document.getElementById("resultText");

const resetBtn=document.getElementById("resetBtn");
resetBtn.addEventListener("click",resetSystem);

const exampleBtn = document.getElementById("exampleBtn");
exampleBtn.addEventListener("click",loadExampleInput);

const terminateBtn=document.getElementById("terminateBtn");
const terminateSelect=document.getElementById("terminateSelect");

const preemptBtn = document.getElementById("preemptBtn");


terminateBtn.addEventListener("click",terminateProcess);
preemptBtn.addEventListener("click", preemptResources);

const terminatedProcesses = new Set();
const waitingProcesses = new Set();


// ===================== EVENT LISTENERS =====================
generateBtn.addEventListener("click", generateTables);
detectBtn.addEventListener("click", handleDeadlockDetection);

// ===================== TABLE GENERATION =====================
function generateTables() {
    const p = parseInt(processInput.value);
    const r = parseInt(resourceInput.value);

    if (isNaN(p) || isNaN(r) || p <= 0 || r <= 0) {
        alert("Please enter valid numbers for processes and resources.");
        return;
    }

    createMatrix(allocationDiv, p, r);
    createMatrix(requestDiv, p, r);
    createAvailableInputs(availableDiv, r);
}

function createMatrix(container, rows, cols) {
    container.innerHTML = "";

    const table = document.createElement("table");
    table.border = "1";

    const headerRow = document.createElement("tr");
    const emptyCell = document.createElement("th");
    emptyCell.innerText = "P / R";
    headerRow.appendChild(emptyCell);

    for (let j = 0; j < cols; j++) {
        const th = document.createElement("th");
        th.innerText = "R" + (j + 1);
        headerRow.appendChild(th);
    }
    table.appendChild(headerRow);

    for (let i = 0; i < rows; i++) {
        const tr = document.createElement("tr");

        const processCell = document.createElement("th");
        processCell.innerText = "P" + (i + 1);
        tr.appendChild(processCell);

        for (let j = 0; j < cols; j++) {
            const td = document.createElement("td");
            const input = document.createElement("input");
            input.type = "number";
            input.min = "0";
            input.value = "0";
            td.appendChild(input);
            tr.appendChild(td);
        }
        table.appendChild(tr);
    }
    container.appendChild(table);
}

function createAvailableInputs(container, count) {
    container.innerHTML = "";

    for (let i = 0; i < count; i++) {
        const wrapper = document.createElement("div");
        wrapper.style.marginBottom = "8px";

        const label = document.createElement("label");
        label.textContent = "R" + (i + 1) + ": ";

        const input = document.createElement("input");
        input.type = "number";
        input.min = "0";
        input.value = "0";

        wrapper.appendChild(label);
        wrapper.appendChild(input);
        container.appendChild(wrapper);
    }
}

// ===================== READ INPUT =====================
function readMatrix(container, rows, cols) {
    const matrix = [];
    const inputs = container.querySelectorAll("input");
    let index = 0;

    for (let i = 0; i < rows; i++) {
        const row = [];
        for (let j = 0; j < cols; j++) {
            const val = parseInt(inputs[index].value);
            row.push(isNaN(val) ? 0 : val);
            index++;
        }
        matrix.push(row);
    }
    return matrix;
}

function readAvailable(container, count) {
    const available = [];
    const inputs = container.querySelectorAll("input");

    for (let i = 0; i < count; i++) {
        const val = parseInt(inputs[i].value);
        available.push(isNaN(val) ? 0 : val);
    }
    return available;
}

// ===================== WAIT-FOR GRAPH =====================
function buildWaitForGraph(allocation, request, available, resourceModel) {
    const graph = {};
    const processes = allocation.length;
    const resources = allocation[0].length;

    for (let i = 0; i < processes; i++) {
        graph[i] = [];
    }

    for (let i = 0; i < processes; i++) {
        for (let j = 0; j < resources; j++) {
            if (request[i][j] > 0) {

                if (
                    resourceModel === "multiple" &&
                    request[i][j] <= available[j]
                ) {
                    continue;
                }

                for (let k = 0; k < processes; k++) {
                    if (allocation[k][j] > 0 && k !== i) {
                        if (!graph[i].includes(k)) {
                            graph[i].push(k);
                        }
                    }
                }
            }
        }
    }
    return graph;
}

// ===================== DFS CYCLE DETECTION =====================
function dfsDetectCycle(node, graph, visited, recStack, path) {
    visited[node] = true;
    recStack[node] = true;
    path.push(node);

    for (let neighbor of graph[node]) {
        if (!visited[neighbor]) {
            const cycle = dfsDetectCycle(neighbor, graph, visited, recStack, path);
            if (cycle) return cycle;
        } else if (recStack[neighbor]) {
            const startIndex = path.indexOf(neighbor);
            return path.slice(startIndex).concat(neighbor);
        }
    }

    recStack[node] = false;
    path.pop();
    return null;
}

function detectDeadlock(graph) {
    const n = Object.keys(graph).length;
    const visited = new Array(n).fill(false);
    const recStack = new Array(n).fill(false);

    for (let i = 0; i < n; i++) {
        if (!visited[i]) {
            const cycle = dfsDetectCycle(i, graph, visited, recStack, []);
            if (cycle) {
                return { deadlock: true, cycle };
            }
        }
    }
    return { deadlock: false, cycle: [] };
}

// ===================== MAIN HANDLER =====================
function handleDeadlockDetection() {
    const p = parseInt(processInput.value);
    const r = parseInt(resourceInput.value);

    if (isNaN(p) || isNaN(r)) {
        alert("Please generate matrices first.");
        return;
    }

    const allocation = readMatrix(allocationDiv, p, r);
    const request = readMatrix(requestDiv, p, r);
    const available = readAvailable(availableDiv, r);
    const resourceModel = resourceModelSelect.value;

    const graph = buildWaitForGraph(
        allocation,
        request,
        available,
        resourceModel
    );

    const result = detectDeadlock(graph);

    updateResultUI(result);
    drawWaitForGraph(graph, result.cycle);
    updateSystemFinalState(result);

}

// ===================== UI UPDATE =====================
//-----------------------------------------------MOST-IMPORTANT---------------------------------------------------//
function updateResultUI(result) {
    resultPanel.className = "card";

    if (result.deadlock) {
        resultPanel.classList.add("deadlock");

        resultText.innerText =
            "DEADLOCK detected involving: " +
            result.cycle.map(p => "P" + p).join(" → ");

        // Reset dropdown
        terminateSelect.innerHTML = '<option value="">Select process</option>';

        //  REMOVE DUPLICATES USING SET
        const uniqueProcesses = new Set(result.cycle);

        for (let p of uniqueProcesses) {

            if (terminatedProcesses.has(p) || waitingProcesses.has(p)) continue;

            const option = document.createElement("option");
            option.value = p;
            option.textContent = "P" + p;
            terminateSelect.appendChild(option);
        }

    } else {
        resultPanel.classList.add("safe");
        resultText.innerText = "SAFE STATE: No deadlock detected.";
        terminateSelect.innerHTML = '<option value="">Select process</option>';
    }
}


// ===================== SVG GRAPH =====================
function drawWaitForGraph(graph, cycle = []) {
    const graphArea = document.getElementById("graphArea");
    graphArea.innerHTML = "";

    const activeProcesses = [];

    for (let key in graph) {
        const p = Number(key);

         if (!terminatedProcesses.has(p)) {
            activeProcesses.push(p);
        }
    }


    // const processes = Object.keys(graph).length;
    const width = 420;
    const height = 260;
    const radius = 22;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);

    const positions = {};
    const cx = width / 2;
    const cy = height / 2;
    const layoutRadius = 90;

  const total = activeProcesses.length;

for (let i = 0; i < total; i++) {
    const pId = activeProcesses[i];
    const angle = (2 * Math.PI * i) / total;

    positions[pId] = {
        x: cx + layoutRadius * Math.cos(angle),
        y: cy + layoutRadius * Math.sin(angle)
    };
}


// -------- DRAW EDGES (WAIT-FOR RELATIONSHIPS) --------
for (let fromKey in graph) {

    const from = Number(fromKey);

    // skip terminated process
    if (terminatedProcesses.has(from)) continue;

    for (let i = 0; i < graph[from].length; i++) {

        const to = graph[from][i];

        // skip terminated process
        if (terminatedProcesses.has(to)) continue;

        const line = document.createElementNS(svg.namespaceURI, "line");

        line.setAttribute("x1", positions[from].x);
        line.setAttribute("y1", positions[from].y);
        line.setAttribute("x2", positions[to].x);
        line.setAttribute("y2", positions[to].y);

        // highlight cycle edges
        if (cycle.includes(from) && cycle.includes(to)) {
            line.setAttribute("stroke", "red");
            line.setAttribute("stroke-width", "3");
        } else {
            line.setAttribute("stroke", "#555");
            line.setAttribute("stroke-width", "2");
        }

        svg.appendChild(line);
    }
}



    // -------- DRAW PROCESS NODES --------
for (let i = 0; i < activeProcesses.length; i++) {

    const p = activeProcesses[i];

    // create circle for process
    const circle = document.createElementNS(svg.namespaceURI, "circle");
    circle.setAttribute("cx", positions[p].x);
    circle.setAttribute("cy", positions[p].y);
    circle.setAttribute("r", radius);

    // highlight deadlock cycle
    if (cycle.includes(p)) {
    
    circle.setAttribute("fill", "#ffcdd2");
    circle.setAttribute("stroke", "red");
    }
    else if (waitingProcesses.has(p)) {
    
    circle.setAttribute("fill", "#fff9c4");
    circle.setAttribute("stroke", "#f9a825");
    }
    else {
    
    circle.setAttribute("fill", "#e3f2fd");
    circle.setAttribute("stroke", "#1976d2");
    }

    circle.setAttribute("stroke-width", "2");

    // label for process
    const text = document.createElementNS(svg.namespaceURI, "text");
    text.setAttribute("x", positions[p].x);
    text.setAttribute("y", positions[p].y + 5);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("font-size", "13");
    text.textContent = "P" + p;

    // add to svg
    svg.appendChild(circle);
    svg.appendChild(text);
}

    graphArea.appendChild(svg);
}

//reset
function resetSystem() {

    // Clear inputs
    processInput.value = "";
    resourceInput.value = "";

    // Clear matrices
    allocationDiv.innerHTML = "";
    requestDiv.innerHTML = "";
    availableDiv.innerHTML = "";

    // Reset result panel
    resultPanel.className = "card";
    resultText.innerText = "Waiting for input...";

    // Clear graph
    document.getElementById("graphArea").innerHTML = "Graph will appear here";

    //  Clear process states
    terminatedProcesses.clear();
    waitingProcesses.clear();

    // Reset dropdown (ONLY placeholder remains)
    terminateSelect.innerHTML = '<option value="">Select process</option>';

    // Clear final system state
    const finalText = document.getElementById("finalStateText");
    if (finalText) {
        finalText.innerText = "";
    }
}


//example

function loadExampleInput(){

    processInput.value=5;
    resourceInput.value=4;

    generateTables();

    const allocInputs=allocationDiv.querySelectorAll("input");
    allocInputs[0].value=1;
    allocInputs[5].value=1;
    allocInputs[10].value=1;
    allocInputs[15].value=1;
    

    const reqInputs=requestDiv.querySelectorAll("input");
    reqInputs[1].value=1;
    reqInputs[6].value=1;
    reqInputs[11].value=1;
    reqInputs[12].value=1;
    reqInputs[16].value=1;

    const availInputs = availableDiv.querySelectorAll("input");
    availInputs[0].value = 0;
    availInputs[1].value = 0;
    availInputs[2].value = 0;
    availInputs[3].value = 0;

    resultPanel.className = "card";
    resultText.innerText = "Example loaded. Click Detect Deadlock.";
    handleDeadlockDetection();

}


// process termination--->1) update ->udateResultUI

function terminateProcess(){
    const p=parseInt(processInput.value);
    const r=parseInt(resourceInput.value);

    if(terminateSelect.value===""){
         alert("No process selected.");
        return;
    }

    const kill=parseInt(terminateSelect.value);
    



    // Read current state
    const allocation = readMatrix(allocationDiv, p, r);
    const request = readMatrix(requestDiv, p, r);
    const available = readAvailable(availableDiv, r);

    // release process
    for(let j=0;j<r;j++){
        available[j]+=allocation[kill][j];
        allocation[kill][j]=0;
        request[kill][j]=0;

    }

    // Update UI matrices
    writeMatrix(allocationDiv, allocation);
    writeMatrix(requestDiv, request);
    writeAvailable(availableDiv, available);

    resultText.innerText="Process P"+kill+" terminated. Resources released.";

    terminatedProcesses.add(kill);
    waitingProcesses.delete(kill);

    document.getElementById("graphArea").innerHTML = "Graph will update on next detection."
    
    handleDeadlockDetection();

    


}

function preemptResources() {

    if (terminateSelect.value === "") {
        alert("No process selected.");
        return;
    }

    const victim = parseInt(terminateSelect.value);

    const p = parseInt(processInput.value);
    const r = parseInt(resourceInput.value);

    const allocation = readMatrix(allocationDiv, p, r);
    const request = readMatrix(requestDiv, p, r);
    const available = readAvailable(availableDiv, r);

    for (let j = 0; j < r; j++) {
        available[j] += allocation[victim][j];
        allocation[victim][j] = 0;
        request[victim][j] = 0;
    }

    writeMatrix(allocationDiv, allocation);
    writeMatrix(requestDiv, request);
    writeAvailable(availableDiv, available);

    waitingProcesses.add(victim);

    resultPanel.className = "card waiting";
    resultText.innerText =
        "Resources preempted from P" + victim +
        ". Process moved to WAITING state.";

    
    handleDeadlockDetection();
}



//Helper code

function writeMatrix(container, matrix) {
    const inputs = container.querySelectorAll("input");
    let index = 0;

    for (let i = 0; i < matrix.length; i++) {
        for (let j = 0; j < matrix[0].length; j++) {
            inputs[index].value = matrix[i][j];
            index++;
        }
    }
}

function writeAvailable(container, available) {
    const inputs = container.querySelectorAll("input");
    for (let i = 0; i < available.length; i++) {
        inputs[i].value = available[i];
    }
}


// final system state

function updateSystemFinalState(result){

    const p=parseInt(processInput.value);
    const r=parseInt(resourceInput.value);

    const available=readAvailable(availableDiv,r);
    const finalText=document.getElementById("finalStateText");

    let output = "";
    //system state

    if(result.deadlock){
        output += "System Status: DEADLOCK EXISTS\n\n";
    }else{
         output += "System Status: SAFE\n\n";
    }
    //process state

    output += "Process States:\n";

    for(let i=0;i<p;i++){
        if(terminatedProcesses.has(i)){
            output+="P" + i + " → TERMINATED\n";
        }else if (waitingProcesses.has(i)) {
            output += "P" + i + " → WAITING\n";
        }
        else {
            output += "P" + i + " → RUNNING\n";
        }
    }

    // ---------------- Available Resources ----------------
    output += "\nAvailable Resources:\n";

    for(let j=0;j<r;j++){
        output+="R"+(j+1)+" = "+available[j];
        
        if (j < r - 1) output += ", ";
    }

    output += "\n\nRecovery Actions:\n";

    if (result.deadlock) {
        output += "• Deadlock detected\n";
    }
    for(let p of terminatedProcesses){
        output+= "• P" + p + " terminated\n";

    }
    for (let p of waitingProcesses) {
    output += "• P" + p + " preempted\n";
}
finalText.innerText = output;

}

