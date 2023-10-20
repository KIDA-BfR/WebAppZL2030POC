function getPrettyDateTime(date) {
    var dateObjFormatted = date
    // Get year, month, date, hours, and minutes from date using inbuilt JavaScript Date object methods
    var year = String(dateObjFormatted.getFullYear());
    var month = String(dateObjFormatted.getMonth() + 1).padStart(2, "0"); //getMonth() starts from 0
    var date = String(dateObjFormatted.getDate()).padStart(2, "0");
    var hours = String(dateObjFormatted.getHours()).padStart(2, "0");
    var minutes = String(dateObjFormatted.getMinutes()).padStart(2, "0");
    return year + '/' + month + '/' + date + ' ' + hours + ':' + minutes;
}
function removeData(chart) {
    //chart.data.labels.pop();
    oldChart = Chart.getChart("chart")
    if (oldChart) {
        oldChart.destroy();


    }
    oldChart = Chart.getChart("myChart")
    if (oldChart) {
        oldChart.destroy();


    }

}
var _eventList;
var _chart;
var _chartData;
function receiveSensorReportEvents(barcode, chart, chartData) {
    let selectedBarcode = barcode;
    // clear the chart data
    chartData.datasets = []

    $.ajax({
        url: `${_epcis_server_url}/events?`
            + 'perPage=200&'
            + 'EQ_readPoint=' + _readPointId + '&'
            + 'EQ_bizStep=sensor_reporting&'
            + 'MATCH_epc=' + selectedBarcode,
        type: 'GET',
        headers: {
            'API-KEY': _api_key,
            'API-KEY-SECRET': _api_key_secret
        },
        //data: { barcode: selectedBarcode },
        contentType: 'application/json',
    }).done(function (data) {
        // handle your response here
        let eventList = data.epcisBody.queryResults.resultsBody.eventList;
        let reportHistory = getSensorData(eventList);

        reportHistory.forEach(function (reportData, index) {
            reportArray = []
            reportData.forEach(report => {

                // concatenate them in desired format
                var dateString = getPrettyDateTime(new Date(report.time));//

                // use the new label
                if (!chartData.labels.includes(dateString)) {
                    chartData.labels.push(dateString);
                }

                reportArray.push(report.value)

            })

            chartData.datasets.push({
                label: getPrettyDateTime(new Date(eventList[index].eventTime)),//'Temperature ' + index,
                type: 'line',
                borderColor: datasetColors[chartData.datasets.length + 1],
                backgroundColor: datasetColors[chartData.datasets.length + 1],
                borderWidth: 1,
                data: reportArray
            })
        });

        // Also get Simulation Result Events for the sensor events

        $.ajax({
            url: `${_epcis_server_url}/events?`
                + 'perPage=200&'
                + 'EQ_readPoint=' + _readPointId + '&'
                + 'EQ_bizStep=commissioning&'
                + 'MATCH_epc=' + selectedBarcode + '&'
                + 'MATCH_parentID=' + 'fskx:model:uuid:' + _modelId + '*',
            type: 'GET',
            headers: {
                'API-KEY': _api_key,
                'API-KEY-SECRET': _api_key_secret
            },
            //data: { barcode: selectedBarcode },
            contentType: 'application/json',
        }).done(function (datePairs) {

            // handle your response here
            let eventList = datePairs.epcisBody.queryResults.resultsBody.eventList;
            _eventList = eventList;
            _chart = chart;
            _chartData = chartData;

            change(0);

        }).fail(function () {
            alert('An error occurred while processing your request.');
        });
    })
        .fail(function () {
            alert('An error occurred while processing your request.');
        });

    // retrieve Simulation Results (Spoilage days)



}

function change(i) {
    var buttons = Array.from(document.getElementsByClassName('chart-tab'));
    buttons.forEach(function (button, index) {
        button.style.display = "block";
        if (index === i) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
    if (i == 0) {
        drawGraph1(_eventList, _chart, _chartData);

    } else {
        drawGraph2(_eventList, _chart, _chartData);
    }
}
function drawGraph1(eventList, chart, chartData) {
    if (eventList.length == 0) {
        $('#result').text('No sensor data found, please upload a temperature logger file! ');
    } else {

        let resultData = getResultData(eventList);

        //eventList.sort((a, b) => new Date(b.eventTime) - new Date(a.eventTime));
        const reportDateTime = new Date(eventList[0].eventTime);
        const daysToAdd = parseFloat(JSON.parse(resultData[0]));
        const millisecondsToAdd = Math.floor(daysToAdd * 86400000);
        reportDateTime.setTime(reportDateTime.getTime() + millisecondsToAdd);

        $('#result').text('Date until critical time has been reached: ' + getPrettyDateTime(reportDateTime));// + data.days);
        let annotations = {};
        chartData.datasets.forEach((dataset, index) => {
            // get the resultValue for the current index.
            const resultValue = resultData[index]
                ? parseFloat(JSON.parse(resultData[index]))
                : 0;

            // calculate color of label text:
            if (!dataset.backgroundColor) {
                dataset.backgroundColor = '#4BC0C0';
            }
            const hex = dataset.backgroundColor.replace('#', '');
            const rgb = hex.match(/.{1,2}/g).map(val => parseInt(val, 16));
            const brightness = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
            const textColor = brightness > 170 ? 'black' : 'white';

            // only create an annotation if resultValue exists
            if (resultValue !== undefined) {
                annotations[`label${index}`] = {
                    type: 'label',
                    backgroundColor: dataset.backgroundColor,
                    borderRadius: 2,
                    borderWidth: 1,
                    color: textColor,//'white', // text color, choose a color that suits your needs
                    font: {
                        size: 12, // Adjust size to your preference
                        weight: 'bold'
                    },

                    content: `${resultValue.toFixed(1)}`, // show the value in the label
                    align: 'end',
                    xAdjust: 40, // Move the annotation right to avoid overlaying the line end
                    yAdjust: -30 * index, // Move the annotation up or down to avoid overlapping labels
                    xValue: chartData.labels[chartData.labels.length - 1],
                    yValue: dataset.data[dataset.data.length - 1] // This should be the last data point in this dataset
                }
            }
        });

        // If there's an old chart, destroy it before creating a new chart.
        /*oldChart = Chart.getChart("chart")
        if (oldChart) {
            oldChart.destroy();
        }*/
        removeData(chart);
        const degrees = new Intl.NumberFormat('en-US', {
            style: 'unit',
            unit: 'celsius',
          });
        // Create a new chart with the updated data and annotations.
        chart = new Chart($('#chart'), {
            type: 'line',
            data: chartData,
            options: {
                scales: {
                    y: {
                      title: {
                        display: true,
                        text: 'Temperature ' +degrees.format().charAt(3) + 'C' 
                      }
                    }
                  },
                layout: {
                    padding: {
                        right: 80
                    }
                },
                plugins: {
                    annotation: {
                        clip: false,
                        annotations: annotations
                    },
                    title: {
                        display: true,
                        text: 'Product Sensor Reports'
                    }
                }
            }
        });

        chart.update();


        //----------------------------------------------------------------------------------------------------------------------------------------


    }
}

function drawGraph2(eventList, chart, chartData) {

    if (eventList.length == 0) {
        $('#result').text('No sensor data found, please upload a temperature logger file! ');
    } else {
        // metadata for 2nd Chart:
        var datePairs = [];

        let resultData = getResultData(eventList);

        //eventList.sort((a, b) => new Date(b.eventTime) - new Date(a.eventTime));
        const reportDateTime = new Date(eventList[0].eventTime);
        const daysToAdd = parseFloat(JSON.parse(resultData[0]));
        const millisecondsToAdd = Math.floor(daysToAdd * 86400000);
        reportDateTime.setTime(reportDateTime.getTime() + millisecondsToAdd);

        $('#result').text('Date until critical time has been reached: ' + getPrettyDateTime(reportDateTime));// + data.days);
        let annotations = {};
        chartData.datasets.forEach((dataset, index) => {
            // get the resultValue for the current index.
            const resultValue = resultData[index]
                ? parseFloat(JSON.parse(resultData[index]))
                : 0;
            let rDateTime = eventList[index]
                ? new Date(eventList[index].eventTime)
                : new Date(eventList[0].eventTime);
            let eventStartDate = eventList[index]
                ? new Date(eventList[index].eventTime)
                : new Date(eventList[0].eventTime);
            var millisecondsToAdd = Math.floor(resultValue * 86400000);
            rDateTime.setTime(eventStartDate.getTime() + millisecondsToAdd);
            var newDatePair = [eventStartDate, rDateTime];
            datePairs.push(newDatePair);
            // calculate color of label text:
            if (!dataset.backgroundColor) {
                dataset.backgroundColor = '#4BC0C0';
            }
            const hex = dataset.backgroundColor.replace('#', '');
            const rgb = hex.match(/.{1,2}/g).map(val => parseInt(val, 16));
            const brightness = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
            const textColor = brightness > 170 ? 'black' : 'white';

            // only create an annotation if resultValue exists

        });

        // If there's an old chart, destroy it before creating a new chart.
        /*oldChart = Chart.getChart("chart")
        if (oldChart) {
            oldChart.destroy();
        }*/
        removeData(chart);



        //----------------------------------------------------------------------------------------------------------------------------------------

        var ctx = document.getElementById('chart').getContext('2d');



        var datasets = datePairs.map(function (pair, index) {
            var startDate = pair[0];
            var endDate = pair[1];

            var dateArray = [];
            var labelDate = eventList[index]
                ? new Date(eventList[index].eventTime)
                : new Date(eventList[0].eventTime);
            for (var d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                dateArray.push(new Date(d));
            }

            return {
                label: getPrettyDateTime(labelDate),//'Line ' + (index + 1),
                data: dateArray.map(function (date, i) {
                    return {
                        x: date,
                        y: 100 - (i / (dateArray.length - 1)) * 100,
                    };
                }),
                fill: false,
                borderColor: chartData.datasets[index].backgroundColor
            };
        });
        oldChart = Chart.getChart("myChart")
        if (oldChart) {
            oldChart.destroy();


        }
        var myChart = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: datasets
            },
            options: {
                plugins: {
                    title: {
                        display: true,
                        text: 'Product Condition Prediction'
                    }
                },

                responsive: true,
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day'  // this can also be 'week', 'month', etc.
                        },
                        display: true,
                        scaleLabel: {
                            display: true,
                        },
                    },
                    y: {
                        min: 0,
                        max: 100
                    }
                }
            }
        });
        //----------------------------------------------------------------------------------------------------------------------------------------


    }
}
function getSensorData(eventList) {
    reportHistory = []
    if (eventList.length < 1) {
        return reportHistory;
    }
    // Sort the eventList by eventTime in descending order
    eventList.sort((a, b) => new Date(b.eventTime) - new Date(a.eventTime));
    // Get the most recent event (the first one in the sorted list)

    eventList.forEach(event => {
        reportData = []
        if (event.type === "ObjectEvent") {


            let sensorElementList = event.sensorElementList;
            sensorElementList.forEach(sensorElement => {
                let sensorReport = sensorElement.sensorReport;
                sensorReport.forEach(report => {
                    if (report.type === "Temperature") {
                        //console.log(`Temperature: ${report.value || report.minValue}`);
                        reportData.push(report)
                    }
                });
            });
        }
        reportHistory.push(reportData)
    });


    return reportHistory;
}


function getResultData(eventList) {
    resultData = []
    if (eventList.length < 1) {
        return resultData;
    }
    // Sort the eventList by eventTime in ascending order
    eventList.sort((a, b) => new Date(b.eventTime) - new Date(a.eventTime));
    // Get the most recent event (the first one in the sorted list)
    let event = eventList[0];
    eventList.forEach(event => {
        let parameters = event["fskparam:parameters"]
        parameters.forEach(p => {
            if (p["fskparam:metadata"]["fskparam:classification"] === "OUTPUT") {
                resultData.push(p["fskparam:data"]);
            }
        });
    });




    return resultData;
}