
let barcodeCounter = 1;
var datasetColors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#E6194B', '#3CB44B', '#FFE119', '#4363D8', '#F58231', '#911EB4', '#46F0F0', '#F032E6', '#BCF60C', '#FABEBE', '#008080', '#E6BEFF', '#9A6324', '#FFFAC8', '#800000', '#AAFFC3'];
$(document).ready(function () {



  let socket = new WebSocket(_socketUrl);
  socket.addEventListener('open', (event) => {
    console.log('WebSocket connection opened:', event);
  });

  socket.addEventListener('message', (event) => {
    console.log('Message from server:', event.data);
    var barcode = $('#barcodeInput').val();
    $("#spinner").hide(); // Hide the spinner
    /*data = JSON.parse(event.data);
    let modelResult = data.resultsBody.eventList[0]['fskparam:parameters'][0]['fskparam:data'];
    $('#result').text('Days left before spoilage: ' + parseFloat(JSON.parse(modelResult)));
*/
    
    receiveSensorReportEvents(barcode, chart, chartData)

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



  // BARCODE
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
      //removeData(chart);
      // Pull Events that match EPC with barcode
      // Get the canvas element
      removeData(chart);
      receiveSensorReportEvents(`${baseURL}01/${gtin}/21/${batch}`, chart, chartData)
    });
    barcodeCounter++;
    return `https://id.gs1.org/01/${gtin}/21/${batchNumber}`
  }

  $('#generate-barcode').on("click", () => {
    const gtin = generateRandomGTIN();
    const batchNumber = generateRandomBatchNumber();
    code = generateBarcode(gtin, batchNumber)
    addBarcode(code)
  });


  // GTIN GENERATION
  function generateRandomGTIN() {

    let gtin = ""; // GS1 GTIN AI
    for (let i = 0; i < 7; i++) {
      gtin += Math.floor(Math.random() * 10);
    }
    return "9521321" + gtin.toString(); //for demo 952
  }

  function generateRandomBatchNumber() {
    const batchNumber = Math.floor(Math.random() * 10000);
    return batchNumber.toString().padStart(4, '0');
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
      var dateString = getPrettyDateTime(new Date(Number(dates[index]) * 1000));
      // use the new label
      if (!chartData.labels.includes(dateString)) {
        chartData.labels.push(dateString);
      }

    });
    //chartData.datasets[1].data.push(tempValue);

    chartData.datasets.push({
      label: getPrettyDateTime(new Date()),//'Temperature ' + index,
      type: 'line',
      borderColor: datasetColors[chartData.datasets.length + 1],
      backgroundColor: datasetColors[chartData.datasets.length + 1],
      borderWidth: 1,
      data: temperatures
    })
    removeData(chart);
    chart = new Chart($('#chart'), {
      type: 'line',
      data: chartData,
      options: {
          layout: {
              padding: {
                  right: 80
              }
          },
      }
    });
    chart.update();

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



  

});

