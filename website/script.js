const students = {};
const studentsList = [
    'Guillaume',
    'Clément',
    'Nils',
    'Judith',
    'Cléo',
    'Imane',
    'Jeanne',
    'Hugo',
    'Jérémy',
    'Emma',
    'Julie',
    'Siegrid',
    'Vinicius',
    'Damien',
    'Oumar',
    'Paul',
    'Axel',
    'Clémence',
    'Marius',
    'Ludovick',
]
const groupsJSON = {};
var groups = [];
var selectedStudent = 'Guillaume';
var selectedOtherStudent = 'Tous les élèves';
var resultsForStudents = {};

var diameter = 600,
    radius = diameter / 2,
    medianRadius = radius - 60,
    innerRadius = radius - 90;

function copy(object) {
    if (!object) return {};
    return JSON.parse(JSON.stringify(object));
}

function hide(htmlID) {
    document.getElementById(htmlID).style.display = 'none';
}

function show(htmlID) {
    document.getElementById(htmlID).style.display = 'block';
}

function addOptionToSelect(selectID, name) {
    const option = `<option ${name === 'Guillaume' ? 'selected' : ''} value="${name}">${name}</option>`
    document.getElementById(selectID)
        .innerHTML = document.getElementById(selectID).innerHTML.concat(option);
}

function buildStudentsJSON(results){
	const data = results.data;
	for(let i=0;i<data.length;i++){
		const row = data[i];
        if (i > 0) {
            const name = row[2];
            if (!studentsList.includes(name)) console.warn(`problem with the name : ${name} (line ${i})`);
            students[name] = {
               genre: row[3],
               origin: row[4],
               originBefore: row[5],
               gapYear: row[6],
               internships: row[7],
               workMates: row[8].split(", "),
               goals: row[9].split(", "),
               favorites: row[10].split(", "),
           };
        }
	}
    // console.log('students', students);
}

function buildGroupsJSON(results){
    studentsList.forEach(name => {
        addOptionToSelect('selected-student', name);
        // addOptionToSelect('selected-other-student', name);
    });
	const data = results.data;
    groups = copy(data);
	for(let i=0;i<data.length;i++){
		const row = data[i];
        if (i > 0) {
            const project = row[0];
            const group = row[1];
            if (!groupsJSON[project]) groupsJSON[project] = {};
            groupsJSON[project][group] = [];
            for(let j=2;j<row.length&&row[j];j++){
                groupsJSON[project][group].push(row[j]);
            }
        }
	}
    // console.log('groups', groups, groupsJSON);
    if (/*Object.keys(students).length > 0 && */groups.length > 0) {
        hide('initialization-form');
        show('main-body');
        drawStats();
    }
    else alert('error loading files');
}

function changeSelectedStudent(newStudent) {
    selectedStudent = newStudent;
    // console.log('new student :', newStudent);
}

function getGroupsWithOtherStudent(student, otherStudent) {
    const list = [];
    for(let i=0; i<groups.length; i++) {
        const g = groups[i];
        if (g.includes(student) && g.includes(otherStudent)) list.push(g[0]);
    }
    return list;
}

function getGroupsWithOtherStudents(student) {
    return studentsList
        .filter(el => el !== student)
        .map(otherStudent => {
            const list = getGroupsWithOtherStudent(student, otherStudent);
            return {
                name: otherStudent,
                withStudent: student,
                number: list.length,
                list,
            }
        })
        .sort((a, b) => b.number - a.number);
}

function getCoordinates(studentName) {
    const a = studentsList.findIndex(el => el === studentName) * 360 / (studentsList.length);
    const x = innerRadius * Math.cos(a);
    const y = innerRadius * Math.sin(a);
    return [x, y];
}

function drawStats() {
    studentsList.forEach(student => {
        resultsForStudents[student] = copy(getGroupsWithOtherStudents(student));
    });
    const results = resultsForStudents[selectedStudent];
    let barChart;
    if (selectedStudent === 'Tous les élèves') {
        barChart = Object.values(resultsForStudents).flat(2).sort((a, b) => b.number - a.number);
        for(let i = 0; i < barChart.length; i++) {
            const link = barChart[i];
            const index = barChart.findIndex(el => (el.name === link.withStudent && el.withStudent === link.name && el.number === link.number));
            if (index > -1) {
                barChart.splice(index, 1);
            }
        }
        barChart = barChart.reduce((r, a) => {
            r[a.number] = [...r[a.number] || [], a];
            return r;
        }, {});
    }
    // console.log('results', results || barChart);
    document.getElementById('selected-student-name').innerText = selectedStudent;
    const width = 600,
        barHeight = 20,
        margin = 5,
        scale = 20,
        scale2 = 7;
    
    // create a tooltip
    var tooltip = d3.select("#tooltip")
        .style("opacity", 0);

    // Three functions that change the tooltip when user hover / move / leave a cell
    function mouseover(event, data) {
        var matrix = this.getScreenCTM()
            .translate(+ this.getAttribute("cx"), + this.getAttribute("cy"));
        // console.log(matrix, window.scrollX, window.scrollY);
        // console.log(data)
        if (selectedStudent !== 'Tous les élèves') {
            tooltip.html(data.list.join('<br>'))
                .style("left", (window.scrollX + matrix.e * scale + 50) + "px")
                .style("top", (window.scrollY + matrix.f - 100) + "px")
                .style("opacity", 1); 
        } else {
            tooltip.html(data.map(el => `${el.name} & ${el.withStudent}`).join(', '))
                .style("left", (window.scrollX + matrix.e * scale + 50) + "px")
                .style("top", (window.scrollY + matrix.f - 100) + "px")
                .style("opacity", 1); 
        }
    }
    function mouseleave(event, data) {
        tooltip
            .style("opacity", 0);
    }

    d3.selectAll('#chart > *, #total > *')
        .remove();
    
    var svg = d3.select("#total").append("svg")
        .attr("width", diameter)
        .attr("height", diameter)
        .append("g")
        .attr("transform", "translate(" + radius + "," + radius + ")");
    
    var link = svg.append("g").selectAll(".link"),
        node = svg.append("g").selectAll(".node");

    const curve = d3.line().curve(d3.curveNatural);

    if (selectedStudent !== 'Tous les élèves') {
        const chart = d3.select("#chart")
            .attr("width", width)
            .attr("height", barHeight * results.length)

        const domain = [0, d3.max(results, d => d.number)];
        const x = d3.scaleLinear()
            .range([0, results.length-1]);

        x.domain(domain);

        const color = d3.scaleLinear().domain(domain)
            .range(["white", "green"]);

        let bar = chart.selectAll("g")
            .data(results)
            .enter()
            .append("g")
            .attr("transform", (d, i) => "translate(0," + i * barHeight + ")")
            .attr('fill', d => color(d.number));
        
        let rect = bar.append("rect")
            .attr("width", "1")
            .attr("height", barHeight - 1);

        rect.transition()
            .attr("width", d => x(d.number * scale))
            .duration(1500);

        bar.append("text")
            .attr("x", d => x(d.number * scale + margin))
            .attr("y", barHeight/2)
            .attr("dy", ".35em")
            .attr('fill', 'blue')
            .text(d => d.name)
            .on('mouseover', mouseover)
            .on('mouseleave', mouseleave);

        bar.append("text")
            .attr("x", d => d.number > 0 ? margin : 0)
            .attr("y", barHeight/2)
            .attr("dy", ".35em")
            .attr('fill', d => d.number > 0 ? 'white' : 'red')
            .text(d => d.number);

        link = link
            .data(results)
            .enter().append("path")
            .attr("class", "link")
            .attr('stroke', d => color(d.number))
            .attr('stroke-width', d => 2 * d.number)
            .attr('d', d => {
                if (d.number === 0) {
                    return;
                }
                const [x1, y1] = getCoordinates(selectedStudent);
                const [x2, y2] = getCoordinates(d.name);
                return curve([[x1, y1], [x2, y2]]);
            });
    } else {
        const bars = Object.values(barChart);
        const links = Object.values(barChart).flat(2);
        // console.log('bars', bars);
        // console.log('links', links);

        const chart = d3.select("#chart")
            .attr("width", width)
            .attr("height", barHeight * bars.length)

        const max = 5; // better than a wrong formula...
        const domain = [0, max];
        const x = d3.scaleLinear()
            .range([0, max - 1]);

        x.domain(domain);

        const color = d3.scaleLinear().domain(domain)
            .range(["lightblue", "blue"]);

        let bar = chart.selectAll("g")
            .data(bars)
            .enter()
            .append("g")
            .attr("transform", (d, i) => "translate(0," + i * barHeight + ")")
            .attr('fill', d => color(d[0].number));
        
        let rect = bar.append("rect")
            .attr("width", "1")
            .attr("height", barHeight - 1);

        rect.transition()
            .attr("width", d => x(d.length * scale2))
            .duration(1500);

        bar.append("text")
            .attr("x", x(d3.max(bars.map(el => el.length)) * scale2 + margin))
            .attr("y", barHeight/2)
            .attr("dy", ".35em")
            .attr('fill', 'blue')
            .text(d => `${d.length} binômes`)
            .on('mouseover', mouseover)
            .on('mouseleave', mouseleave);

        bar.append("text")
            .attr("x", margin)
            .attr("y", barHeight/2)
            .attr("dy", ".35em")
            .attr('fill', 'black')
            .text(d => `${d[0].number} projets ensemble`);

        link = link
            .data(links)
            .enter().append("path")
            .attr("class", "link")
            .attr('stroke', d => color(d.number))
            .attr('stroke-width', d => 2 * d.number)
            .attr('d', d => {
                if (d.number === 0) {
                    return;
                }
                const [x1, y1] = getCoordinates(d.withStudent);
                const [x2, y2] = getCoordinates(d.name);
                return curve([[x1, y1], [x2, y2]]);
            });
    }

    node = node
        .data(studentsList)
        .enter().append("text")
        .attr("class", "node")
        .attr("dy", "0.31em")
        .attr("transform", function(d) {
            const a = studentsList.findIndex(el => el === d) * 360 / (studentsList.length);
            const x = medianRadius * Math.cos(a);
            const y = medianRadius * Math.sin(a);
            return "rotate(" + 0 + ")translate(" + (x - 20) + "," + (y - 0) + ")";
        })
        .text(function(d) { return d; });
}

$('#submit-file').click(function(){
    // if (!$('#students')[0]?.files?.length) return console.error('select a file for students');
    if (!$('#groups')[0]?.files?.length) return console.error('select a file for groups');
    $('#students').parse({
        config: {
            // base config to use for each file
            complete: console.log('no need for students'),//buildStudentsJSON,
        },
        before: function(file, inputElem)
        {
            // executed before parsing each file begins;
            // what you return here controls the flow
            // console.log('before', file, inputElem);
        },
        error: function(err, file, inputElem, reason)
        {
            // executed if an error occurs while loading the file,
            // or if before callback aborted for some reason
            console.log(err, file, inputElem, reason);
        },
        complete: function()
        {
            // console.log('all completed');
            // executed after all files are complete
        }
    });
    $('#groups').parse({
        config: {
            // base config to use for each file
            complete: buildGroupsJSON,
        },
        before: function(file, inputElem)
        {
            // executed before parsing each file begins;
            // what you return here controls the flow
            // console.log('before', file, inputElem);
        },
        error: function(err, file, inputElem, reason)
        {
            // executed if an error occurs while loading the file,
            // or if before callback aborted for some reason
            console.log(err, file, inputElem, reason);
        },
        complete: function()
        {
            // console.log('all completed');
            // executed after all files are complete
        }
    });
});

$('#selected-student').change(event => {
    changeSelectedStudent(event.target.value);
    drawStats();
});
