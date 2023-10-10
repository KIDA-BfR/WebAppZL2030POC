// TODO: Template for an EPCIS Event that requests a simulation
// with: Parameter, ModelID, EPC (of gtin) and readPoint (Spoilage Predictor)
// readPoint: App that sends/receives FSKX Events

function generateSimulationResult(predictionResult, modelId, gtin){
    
    let predictionValueString = JSON.stringify(predictionResult); //JSON.stringify(tempValue)
 
    var parameterArray = [
        {
            "fskparam:metadata": {
                "fskparam:id": "result",
                "fskparam:classification": "OUTPUT",
                "fskparam:name": "days to spoilage",
                "fskparam:unit": "D",
                "fskparam:dataType": "DOUBLE",
                "fskparam:value": predictionValueString
            },
            "fskparam:data": predictionValueString,
            "fskparam:modelId": modelId,
            "fskparam:parameterType": "DOUBLE",
            "fskparam:generatorLanguage": "Python 3.10"
        }
        
        
    ]
    var simulationResultEvent = {
        "@context": [
            "https://ref.gs1.org/standards/epcis/2.0.0/epcis-context.jsonld",
            {
                "fskparam": "https://medifit-prima.github.io/fsklab-json/FSKParameter",
                "fskx": "https://medifit-prima.github.io/fsklab-json/1.0.4/FSKModel.json"
            }
        ],
        "id": "fskx:simulation:result",
        "type": "EPCISDocument",
        "schemaVersion": "2.0",
        "creationDate": new Date().toISOString(),
        "epcisBody": {
            "eventList": [
                {
                    "fskparam:parameters": parameterArray,
                    "type": "AssociationEvent",
                    "eventTime": new Date().toISOString(),
                    "eventTimeZoneOffset": "+02:00",
                    "parentID": "fskx:model:uuid:" + modelId,
                    "childEPCs": [  gtin ],
                    "readPoint": {
                        "id": _readPointId
                    },
                    "action": "ADD",
                    "bizStep": "commissioning",
                    "disposition": "available",
                    "bizTransactionList": [
                        {
                            "type": "testprd",
                            "bizTransaction": "https://github.com/MEDIFIT-PRIMA/data_fusion/tree/main/fskx_models"
                        }
                    ]
                
                }
            ]
        }
    }
    return JSON.stringify(simulationResultEvent);
}
function getResultData(eventList){
    resultData = []
    if(eventList.length < 1){
      return resultData;
    }
    // Sort the eventList by eventTime in ascending order
      eventList.sort((b, a) => new Date(b.eventTime) - new Date(a.eventTime));
    // Get the most recent event (the first one in the sorted list)
      let event = eventList[0];
      eventList.forEach(event => {
        let parameters = event["fskparam:parameters"]
        parameters.forEach(p =>{
            if(p["fskparam:metadata"]["fskparam:classification"] === "OUTPUT"){
                resultData.push(p["fskparam:data"]);
            }
        });
      });
    
      
      
    
    return resultData;
  }