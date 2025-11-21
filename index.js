var outputDiv = document.querySelector('.output');
var chartCanvas = document.querySelector('.myChart');

let group = [];
let groupedByWeek = {};
let currentChart = null;

fetch('./weekly_kw.csv').then(response => response.text())
    .then(data => {
        const lines = data.replace(/\r/g, '').trim().split('\n');
        const headers = lines[0].split(',');
        const parsedData = lines.slice(1).map(line => {
            const values = line.split(',');
            if (!group.includes(values[0])) {
                group.push(values[0]);
            }
            const obj = {};
            headers.forEach((header, index) => {
                obj[header] = values[index];
            });
            return obj;
        }).filter(item => item.week);

        groupedByWeek = parsedData.reduce((acc, item) => {
            if (!acc[item.week]) {
                acc[item.week] = [];
            }
            acc[item.week].push(item);
            return acc;
        }, {});

        Object.keys(groupedByWeek).forEach(week => {
            groupedByWeek[week].sort((a, b) => parseInt(b.count) - parseInt(a.count));
        });
        
        const sortedData = [];
        group.sort().forEach(week => {
            if (groupedByWeek[week]) {
                sortedData.push(...groupedByWeek[week]);
            }
        });
        
        const weeklyTop10 = {};
        Object.keys(groupedByWeek).forEach(week => {
            weeklyTop10[week] = groupedByWeek[week].slice(0, 10);
        });

        displayData(sortedData);
        
        createInitialChart();
    });

function displayData(data) {
    const weekSelector = `
        <div class="controls">
            <div>
                <label for="weekSelect">選擇週次: </label>
                <select id="weekSelect" onchange="filterByWeek(this.value)">
                    <option value="">-- 顯示全部 --</option>
                    ${group.sort().map(week => `<option value="${week}">${week}</option>`).join('')}
                </select>
            </div>
            <div>
                <label for="chartType">圖表類型: </label>
                <select id="chartType" onchange="updateChartType(this.value)">
                    <option value="bar">長條圖 (Top 10)</option>
                    <option value="line">趨勢折線圖</option>
                    <option value="weeklyTrend">週間趨勢圖</option>
                </select>
            </div>
            <div>
                <button onclick="downloadWeeklyReport()" title="根據當前選擇的週次下載報告">下載週報 CSV</button>
            </div>
        </div>
    `;

    const dataHTML = `
        ${weekSelector}
        <div class="data-container">
            <div class="header">
                <div>week</div>
                <div>keyword</div>
                <div>count</div>
                <div>avg_risk</div>
                <div>trend</div>
            </div>
            ${data.map(item => `
                <div class="item" data-week="${item.week}">
                    <div>${item.week}</div>
                    <div>${item.keyword}</div>
                    <div>${item.count}</div>
                    <div>${item.avg_risk}</div>
                    <div>${item.trend}</div>
                </div>
            `).join('')}
        </div>
    `;

    outputDiv.innerHTML = dataHTML;
}

function filterByWeek(selectedWeek) {
    if (selectedWeek === '') {
        const sortedData = [];
        group.sort().forEach(week => {
            if (groupedByWeek[week]) {
                sortedData.push(...groupedByWeek[week]);
            }
        });
        displayFilteredData(sortedData);
    } else {
        const weekData = groupedByWeek[selectedWeek] || [];
        displayFilteredData(weekData);
    }
    
    const chartType = document.getElementById('chartType')?.value || 'bar';
    updateChartType(chartType);
}

function displayFilteredData(data) {
    const container = document.querySelector('.data-container');
    
    container.innerHTML = `
        <div class="header">
            <div>week</div>
            <div>keyword</div>
            <div>count</div>
            <div>avg_risk</div>
            <div>trend</div>
        </div>
        ${data.map(item => `
            <div class="item" data-week="${item.week}">
                <div>${item.week}</div>
                <div>${item.keyword}</div>
                <div>${item.count}</div>
                <div>${item.avg_risk}</div>
                <div>${item.trend}</div>
            </div>
        `).join('')}
    `;
}

function createInitialChart() {
    updateChartType('bar');
}

function updateChartType(type) {
    const selectedWeek = document.getElementById('weekSelect')?.value || '';
    
    if (currentChart) {
        currentChart.destroy();
    }
    
    switch(type) {
        case 'bar':
            createBarChart(selectedWeek);
            break;
        case 'line':
            createLineChart(selectedWeek);
            break;
        case 'weeklyTrend':
            createWeeklyTrendChart();
            break;
    }
}

function createBarChart(selectedWeek) {
    let data;
    let title;
    
    if (selectedWeek) {
        data = groupedByWeek[selectedWeek]?.slice(0, 10) || [];
        title = `${selectedWeek} 關鍵字熱度 Top 10`;
    } else {
        const allData = [];
        Object.values(groupedByWeek).forEach(weekData => {
            allData.push(...weekData);
        });
        allData.sort((a, b) => parseInt(b.count) - parseInt(a.count));
        data = allData.slice(0, 10);
        title = '全期間關鍵字熱度 Top 10';
    }
    
    const labels = data.map(item => item.keyword);
    const counts = data.map(item => parseInt(item.count));
    
    currentChart = new Chart(chartCanvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Count',
                data: counts,
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: title
                },
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Count'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Keywords'
                    }
                }
            },
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const keyword = labels[index];
                    alert(`關鍵字: ${keyword}\nCount: ${counts[index]}`);
                }
            }
        }
    });
}

function createLineChart(selectedWeek) {
    let data;
    let title;
    
    if (selectedWeek) {
        data = groupedByWeek[selectedWeek]?.slice(0, 5) || [];
        title = `${selectedWeek} 關鍵字趨勢`;
    } else {
        const keywordCounts = {};
        Object.entries(groupedByWeek).forEach(([week, weekData]) => {
            weekData.forEach(item => {
                if (!keywordCounts[item.keyword]) {
                    keywordCounts[item.keyword] = {};
                }
                keywordCounts[item.keyword][week] = parseInt(item.count);
            });
        });
        
        const topKeywords = Object.entries(keywordCounts)
            .map(([keyword, weeks]) => ({
                keyword,
                totalCount: Object.values(weeks).reduce((sum, count) => sum + count, 0)
            }))
            .sort((a, b) => b.totalCount - a.totalCount)
            .slice(0, 5);
        
        createMultiLineChart(keywordCounts, topKeywords.map(k => k.keyword));
        return;
    }
    
    const labels = data.map(item => item.keyword);
    const counts = data.map(item => parseInt(item.count));
    
    currentChart = new Chart(chartCanvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Count',
                data: counts,
                borderColor: 'rgba(255, 99, 132, 1)',
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: title
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Count'
                    }
                }
            }
        }
    });
}

function createMultiLineChart(keywordCounts, topKeywords) {
    const weeks = group.sort();
    const colors = [
        'rgba(255, 99, 132, 1)',
        'rgba(54, 162, 235, 1)',
        'rgba(255, 205, 86, 1)',
        'rgba(75, 192, 192, 1)',
        'rgba(153, 102, 255, 1)'
    ];
    
    const datasets = topKeywords.map((keyword, index) => ({
        label: keyword,
        data: weeks.map(week => keywordCounts[keyword][week] || 0),
        borderColor: colors[index % colors.length],
        backgroundColor: colors[index % colors.length].replace('1)', '0.2)'),
        fill: false,
        tension: 0.4
    }));
    
    currentChart = new Chart(chartCanvas, {
        type: 'line',
        data: {
            labels: weeks,
            datasets: datasets
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: '關鍵字跨週趨勢比較 (Top 5)'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Count'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Week'
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

function createWeeklyTrendChart() {
    const weeks = group.sort();
    const weeklyTotals = weeks.map(week => {
        return groupedByWeek[week]?.reduce((sum, item) => sum + parseInt(item.count), 0) || 0;
    });
    
    currentChart = new Chart(chartCanvas, {
        type: 'line',
        data: {
            labels: weeks,
            datasets: [{
                label: '週總計數',
                data: weeklyTotals,
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: '週間總體趨勢'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Total Count'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Week'
                    }
                }
            },
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const week = weeks[index];
                    document.getElementById('weekSelect').value = week;
                    filterByWeek(week);
                }
            }
        }
    });
}

function downloadWeeklyReport() {
    const selectedWeek = document.getElementById('weekSelect')?.value || '';
    const reportData = [];
    
    reportData.push(['Week', 'Keyword', 'Count', 'Avg_Risk', 'Trend', 'Rank']);
    
    let filename = 'weekly_report.csv';
    
    if (selectedWeek) {
        if (groupedByWeek[selectedWeek]) {
            groupedByWeek[selectedWeek].forEach((item, index) => {
                reportData.push([
                    item.week,
                    item.keyword,
                    item.count,
                    item.avg_risk,
                    item.trend,
                    index + 1
                ]);
            });
        }
        filename = `weekly_report_${selectedWeek}.csv`;
    } else {
        group.sort().forEach(week => {
            if (groupedByWeek[week]) {
                groupedByWeek[week].forEach((item, index) => {
                    reportData.push([
                        item.week,
                        item.keyword,
                        item.count,
                        item.avg_risk,
                        item.trend,
                        index + 1
                    ]);
                });
            }
        });
        filename = 'weekly_report_all.csv';
    }
    
    const csvContent = reportData.map(row => 
        row.map(field => {
            if (typeof field === 'string' && (field.includes(',') || field.includes('"') || field.includes('\n'))) {
                return `"${field.replace(/"/g, '""')}"`;
            }
            return field;
        }).join(',')
    ).join('\n');
    
    downloadCSV(csvContent, filename);
}

function downloadCSV(csvContent, filename) {
    const blob = new Blob(['\uFEFF' + csvContent], { 
        type: 'text/csv;charset=utf-8;' 
    });
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log(`${filename} 下載完成！`);
}
