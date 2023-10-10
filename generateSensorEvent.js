// - --------------------------------------------------------------------------------------------------------------



function generateCSVSensorEvent( tempValues,dateValues,  gtin){
    var epc = gtin;//"4012345.011111.9875";
    
    let sensorReport = tempValues.map((tempValue, index) => {
        let date = new Date(Number(dateValues[index]) * 1000);
        
    return { 
        "type": "Temperature",
        "time": date.toISOString(),
        "value": tempValue,
        "uom": "CEL"
        };
    });

    var newSensorReportEvent = {
      "@context": [
      "https://ref.gs1.org/standards/epcis/2.0.0/epcis-context.jsonld",
        {
            "fskx":"https://medifit-prima.github.io/fsklab-json/1.0.4/FSKModel.json"
        }
      ],
      "id": "https://id.example.org/document1",
      "type": "EPCISDocument",
      "schemaVersion": "2.0",
      "creationDate": new Date().toISOString(),
      "epcisBody": {
          "eventList": [
              {
                  
                  "type": "ObjectEvent",
                  "action": "OBSERVE",
                  "bizStep": "sensor_reporting",
                  "epcList": [epc],
                  "eventTime": new Date().toISOString(),
                  "eventTimeZoneOffset": "+01:00",
                  "readPoint": {
                      "id": _readPointId
                  },
                  "sensorElementList": [
                      {
    
                          "sensorReport": sensorReport
                      }
                  ]
           }
          ]
      }
    }
    return JSON.stringify(newSensorReportEvent);
}
