document.getElementById('fileInput').addEventListener('change', handleFileSelect, false);
document.getElementById('processClipboard').addEventListener('click', handleClipboardInput, false);

let chartInstance;

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = function(event) {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        const headers = jsonData[0];
        const rows = jsonData.slice(1);
        
        const columnData = headers.map((_, colIndex) => rows.map(row => parseFloat(row[colIndex])).filter(value => !isNaN(value)));
        
        displayStatsAndDrawChart(headers, columnData);
    };

    reader.readAsArrayBuffer(file);
}

function handleClipboardInput() {
    const clipboardText = document.getElementById('clipboardInput').value.trim();
    if (!clipboardText) return;

    const rows = clipboardText.split('\n').map(row => row.split('\t').map(cell => parseFloat(cell.trim())));

    const headers = rows[0];
    const columnData = headers.map((_, colIndex) => rows.slice(1).map(row => row[colIndex]).filter(value => !isNaN(value)));
    
    displayStatsAndDrawChart(headers, columnData);
}

function displayStatsAndDrawChart(headers, columnData) {
    const statsDiv = document.getElementById('stats');
    statsDiv.innerHTML = '';
    
    const datasets = [];
    const colors = generateColors(columnData.length);

    let globalMin = Infinity;
    let globalMax = -Infinity;

    columnData.forEach(col => {
        const min = Math.min(...col);
        const max = Math.max(...col);
        if (min < globalMin) globalMin = min;
        if (max > globalMax) globalMax = max;
    });

    const xValuesGlobal = linspace(globalMin - 3, globalMax + 3, 100);

    columnData.forEach((col, index) => {
        const mean = calculateMean(col);
        const stdDev = calculateStdDev(col, mean);

        statsDiv.innerHTML += `<p><strong>${headers[index]}</strong> - 평균: ${mean.toFixed(2)}, 표준편차: ${stdDev.toFixed(2)}</p>`;

        const yValues = xValuesGlobal.map(x => normalDistribution(x, mean, stdDev));

        datasets.push({
            label: headers[index],
            data: yValues,
            borderColor: colors[index],
            borderWidth: 2,
            fill: false
        });
    });

    drawChart(xValuesGlobal, datasets);
}

function calculateMean(data) {
    const sum = data.reduce((acc, val) => acc + val, 0);
    return sum / data.length;
}

function calculateStdDev(data, mean) {
    const variance = data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / data.length;
    return Math.sqrt(variance);
}

function normalDistribution(x, mean, stdDev) {
    return (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mean) / stdDev, 2));
}

function linspace(start, end, num) {
    const arr = [];
    const step = (end - start) / (num - 1);
    for (let i = 0; i < num; i++) {
        arr.push(start + (step * i));
    }
    return arr;
}

function generateColors(num) {
    const colors = [];
    const hueStep = Math.floor(360 / num);
    for (let i = 0; i < num; i++) {
        colors.push(`hsl(${i * hueStep}, 70%, 50%)`);
    }
    return colors;
}

function drawChart(labels, datasets) {
    const ctx = document.getElementById('chart').getContext('2d');

    if (chartInstance) {
        chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: '정규분포 곡선'
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: '값'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: '확률 밀도'
                    }
                }
            }
        }
    });
}
