
let barcodeCounter = 1;
var datasetColors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'];
$(document).ready(function () {



  let socket = new WebSocket(_socketUrl);
  socket.addEventListener('open', (event) => {
    console.log('WebSocket connection opened:', event);
  });

  socket.addEventListener('message', (event) => {
    console.log('Message from server:', event.data);
    data = JSON.parse(event.data);
    let modelResult = data.resultsBody.eventList[0]['fskparam:parameters'][0]['fskparam:data'];
    $('#result').text('Days left before spoilage: ' + parseFloat(JSON.parse(modelResult)));


  });

  socket.addEventListener('error', (event) => {
    console.log('WebSocket error:', event);
  });

  socket.addEventListener('close', (event) => {
    console.log('WebSocket connection closed:', event);
  });
  var chartData = {
    labels: [],
    datasets: []
  };

  var chart = new Chart($('#chart'), {
    //type: 'line',
    data: chartData,
    options: {

    }
  });

  function removeData(chart) {
    //chart.data.labels.pop();
    chart.data.labels = [];
    chart.data.datasets = [];
    //chart.data.datasets.forEach((dataset) => {
    //dataset.pop();

    //dataset.data = [];
    //});
    chart.update();
  }
  function mapArrays(array1, array2) {
    if (array1.length !== array2.length) {
      throw new Error('Arrays must have the same length');
    }

    // Map each value pair to a new array of arrays
    const mappedArray = array1.map((value1, index) => [value1, array2[index]]);

    return mappedArray;
  }
  function sendCSVSensorReport(temperatures, dates) {
    var barcode = $('#barcodeInput').val();

    //if(oldBarcode != barcode){
    //    removeData(chart);
    //}

    //[...chartData.labels,new Date()]
    let tempLoggerData = JSON.stringify(mapArrays(temperatures, dates));

    if (temperatures.length == 1) {
      tempLoggerData = JSON.stringify([temperatures]);
    }

    console.log(tempLoggerData);

    let gtin = barcode;//"urn:epc:id:sgtin:4012345.022222.1235"
    let simRequest = generateSimulationRequest(temperatures, dates, _modelId, gtin);
    let sensorReport = generateCSVSensorEvent(temperatures, dates, gtin);
    $.ajax({
      url: `${_epcis_server_url}/capture`,
      type: 'POST',

      headers: {
        'API-KEY': _api_key,
        'API-KEY-SECRET': _api_key_secret
      },
      data: sensorReport,
      contentType: 'application/json',
    }).done();

    temperatures.map((tempValue, index) => {
      let dateObj = new Date(Number(dates[index]) * 1000);
      var year = String(dateObj.getFullYear());
      var month = ('0' + (dateObj.getMonth() + 1)).slice(-2);
      var date = ('0' + dateObj.getDate()).slice(-2);
      var hours = ('0' + dateObj.getHours()).slice(-2);
      var minutes = ('0' + dateObj.getMinutes()).slice(-2);
      // concatenate them in desired format
      var dateString = year + '/' + month + '/' + date + ' ' + hours + ':' + minutes;

      // use the new label
      if (!chartData.labels.includes(dateString)) {
        chartData.labels.push(dateString);
      }

      //chartData.datasets[0].data.push(2);//(data.days);




    });
    //chartData.datasets[1].data.push(tempValue);

    chartData.datasets.push({
      label: 'Temperature ',
      type: 'line',
      borderColor: datasetColors[chartData.datasets.length + 1],
      backgroundColor: datasetColors[chartData.datasets.length + 1],
      borderWidth: 1,
      data: temperatures
    })
    chart.update();






    // execute LOCAL (deprecated when using simulationRequest)



    // send SimulationRequestEvent

    $.ajax({
      url: `${_epcis_server_url}/capture`,
      type: 'POST',

      headers: {
        'API-KEY': _api_key,
        'API-KEY-SECRET': _api_key_secret
      },
      data: simRequest,
      contentType: 'application/json',
    }).done();
    // get month, date, hours and minutes
    //oldBarcode = barcode;
    //$('#barcode').val('');
    //$('#temperature').val('');



  }
  function parseCSV() {
    // Get the selected file from the input element
    const selectedFile = document.getElementById('csvFileInput').files[0];
    var temperatures = [];
    var dates = [];
    // Initialize a FileReader object
    const reader = new FileReader();

    // Define what happens when the file has been read
    reader.onload = function (event) {
      const fileContent = event.target.result;

      // Split the file content into lines
      const lines = fileContent.split('\n');

      // Initialize two arrays to store the extracted values


      // Loop through each line and split it by commas to extract the values
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        if (values[0].trim().length < 1) {
          continue;
        }
        // Extract the values into the arrays
        dates.push(parseFloat(values[0]));
        temperatures.push(parseFloat(values[1]));

      }

      // Log the extracted arrays
      console.log('Array 1:', temperatures);
      console.log('Array 2:', dates);



      sendCSVSensorReport(temperatures, dates);



    };

    // Handle errors
    reader.onerror = function (error) {
      console.error('An error occurred:', error);
    };

    // Read the file as text
    reader.readAsText(selectedFile);
  }
  $('#productForm').submit(function (event) {
    event.preventDefault();
    $("#spinner").show();
    parseCSV();

  });

  var storedBarcodes = getSensorReportEvents();//['123456789012', '987654321098', '112233445566'];

  // Function to populate the dropdown menu with stored barcodes
  function populateBarcodeSelect() {

    //var dataList = document.getElementById('barcodeInput');
    for (var i = 0; i < storedBarcodes.length; i++) {
      //var opt = document.createElement('option');
      //opt.value = storedBarcodes[i];
      //dataList.appendChild(opt);
      url = storedBarcodes[i];
      const urlParts = url.split("/");
      const gtin = urlParts[4];
      const batchNumber = urlParts[6];
      generateBarcode(gtin, batchNumber);

    }
  };
  function addBarcode(barcode) {
    // If barcode is not in storedBarcodes array, add it
    //var dataList = document.getElementById('barcodeList');
    if (!storedBarcodes.includes(barcode) && barcode.trim().length > 0) {
      storedBarcodes.push(barcode);


    }

  }


  populateBarcodeSelect();




  function getSensorReportEvents() {
    let epcList = [];
    let url = `${_epcis_server_url}/events?perPage=200&`
      + 'EQ_readPoint=' + _readPointId + '&'
      + 'EQ_bizStep=sensor_reporting';

    $.ajax({
      url: url,
      type: 'GET',
      async: false,
      headers: {
        'API-KEY': _api_key,
        'API-KEY-SECRET': _api_key_secret
      },
      contentType: 'application/json',
      success: function (data) {
        let eventList = data.epcisBody.queryResults.resultsBody.eventList;
        eventList.forEach(event => {
          if (event.type === "ObjectEvent") {
            // check if the event is already in epcList
            if (!epcList.includes(event.epcList[0])) {
              // if not, add new event
              epcList.push(event.epcList[0]);
            }
          }
        });
      },

      error: function () {
        alert("Request failed");
      }
    });

    return epcList;
  }
  function average(ctx) {
    const values = ctx.chart.data.datasets[0].data;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  // TODO: send Simulation Request

  // TODO: receive possible FSKX models and return the model identifier

  // TODO: send execution Event with modelID and parameter

  // TODO: receive Execution Result Event 
  function receiveSensorReportEvents(barcode) {
    let selectedBarcode = barcode;
    // clear the chart data
    chartData.labels = [];
    chartData.datasets.forEach((dataset) => {
      dataset.data = [];
    });
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
          // create a new date object from dateObj String
          var dateObjFormatted = new Date(report.time);
          // Get year, month, date, hours, and minutes from date using inbuilt JavaScript Date object methods
          var year = String(dateObjFormatted.getFullYear());
          var month = String(dateObjFormatted.getMonth() + 1).padStart(2, "0"); //getMonth() starts from 0
          var date = String(dateObjFormatted.getDate()).padStart(2, "0");
          var hours = String(dateObjFormatted.getHours()).padStart(2, "0");
          var minutes = String(dateObjFormatted.getMinutes()).padStart(2, "0");


          // concatenate them in desired format
          var dateString = year + '/' + month + '/' + date + ' ' + hours + ':' + minutes;

          // use the new label
          if (!chartData.labels.includes(dateString)) {
            chartData.labels.push(dateString);
          }

          //chartData.datasets[0].data.push(report.value);//(data.days);


          // create new Temperature Dataset in chartdata

          reportArray.push(report.value)

        })

        chartData.datasets.push({
          label: 'Temperature ' + index,
          type: 'line',
          borderColor: datasetColors[chartData.datasets.length + 1],
          backgroundColor: datasetColors[chartData.datasets.length + 1],
          borderWidth: 1,
          data: reportArray
        })
      });

      //chart.update();
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
      }).done(function (data) {

        // handle your response here
        let eventList = data.epcisBody.queryResults.resultsBody.eventList;
        if (eventList.length == 0) {
          $('#result').text('Days left before spoilage: ');
        } else {
          let resultData = getResultData(eventList);
          $('#result').text('Days left before spoilage: ' + resultData[resultData.length - 1]);// + data.days);
          resultData.forEach(result => {
            // create a new date object from dateObj String


            // use the new label
            //chartData.labels.push(dateString);
            //chartData.datasets[0].data.push(report.value);//(data.days);
            resultValue = parseFloat(JSON.parse(result));
            chartData.datasets[0].data.push(resultValue);
            chart.destroy();
            chart = new Chart($('#chart'), {
              type: 'line',
              data: chartData,
              options: {
                layout: {
                  padding: {
                    right: 80
                  }
                },
                plugins: {
                  annotation: {
                    clip: false,
                    annotations: {
                      // Add this line
                      point1: {

                        type: 'label',
                        //borderColor: (ctx) => ctx.chart.data.datasets[0].backgroundColor,
                        borderRadius: 2,
                        borderWidth: 1,
                        content: ['March', 'annotated'],
                        position: {
                          x: 'center',
                          y: 'end'
                        },
                        xValue: chartData.labels[chartData.labels.length - 1],
                        yValue: 4,
                        xAdjust: 40

                      }

                    }
                  }
                }
              }
            });
            chart.update();
          });
        }

      }).fail(function () {
        alert('An error occurred while processing your request.');
      });
    })
      .fail(function () {
        alert('An error occurred while processing your request.');
      });

    // retrieve Simulation Results (Spoilage days)



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

  function generateRandomGTIN() {

    let gtin = ""; // GS1 GTIN AI
    for (let i = 0; i < 11; i++) {
      gtin += Math.floor(Math.random() * 10);
    }
    return "040" + gtin.toString();
  }

  function generateRandomBatchNumber() {
    const batchNumber = Math.floor(Math.random() * 10000);
    return batchNumber.toString().padStart(4, '0');
  }
  function generateBarcode(gtin, batchNumber) {
    console.log(barcodeCounter);
    JsBarcode(`#barcode-${barcodeCounter}`, "01" + gtin + "21" + batchNumber, {
      format: "code128",
      displayValue: true,
      width: 2,
      height: 50,
      fontSize: 12,

    });
    svgContainer = document.getElementById('barcode-' + barcodeCounter);

    svgContainer.addEventListener('click', function (event) {

      textElement = event.target;
      var bcode = '0104012345222227211233'
      if (textElement.toString() === '[object SVGTextElement]') {
        bcode = textElement.textContent


      } else if (event.target.closest('g')) {
        bcode = event.target.closest("g").textContent;

      } else {
        bcode = textElement.nextElementSibling.textContent;

      }
      const gtin = bcode.slice(2, 16);
      const batch = bcode.slice(18);
      const baseURL = 'https://id.gs1.org/';
      let inputField = document.getElementById('barcodeInput');
      inputField.value = `${baseURL}01/${gtin}/21/${batch}`;
      removeData(chart);

      receiveSensorReportEvents(`${baseURL}01/${gtin}/21/${batch}`)
    });
    barcodeCounter++;
    return `https://id.gs1.org/01/${gtin}/21/${batchNumber}`
  }

  $('#generate-barcode').on("click", () => {
    const gtin = generateRandomGTIN();
    const batchNumber = generateRandomBatchNumber();


    // Create a new barcode element
    //const barcodeElement = document.createElement("svg");
    //barcodeElement.setAttribute("id", barcodeId);
    //document.getElementById("barcode-container").appendChild(barcodeElement);

    // Generate the GS1-128 barcode
    code = generateBarcode(gtin, batchNumber)

    addBarcode(code)

  });




});



