// TODO: Template for an EPCIS Event that requests a simulation
// with: Parameter, ModelID, EPC (of gtin) and readPoint (Spoilage Predictor)
// readPoint: App that sends/receives FSKX Events

function generateSimulationRequest(tempValue,daysValue, modelId, gtin){
    let daysValueString = JSON.stringify(daysValue); //daysValue; //JSON.stringify(daysValue)
    let tempValueString = JSON.stringify(tempValue); //JSON.stringify(tempValue)
 
    var parameterArray = [
        {
            "fskparam:metadata": {
                "fskparam:id": "temperatures",
                "fskparam:classification": "INPUT",
                "fskparam:name": "Temp",
                "fskparam:unit": "°C",
                "fskparam:dataType": "VECTOROFNUMBERS",
                "fskparam:value": "tempValueString"
            },
            "fskparam:data": tempValueString,
            "fskparam:modelId": modelId,
            "fskparam:parameterType": "VECTOROFNUMBERS",
            "fskparam:generatorLanguage": "Python 3.10"
        },
        {
            "fskparam:metadata": {
                "fskparam:id": "log_times",
                "fskparam:classification": "INPUT",
                "fskparam:name": "timespan",
                "fskparam:unit": "D",
                "fskparam:dataType": "VECTOROFNUMBERS",
                "fskparam:value": "daysValueString"
            },
            "fskparam:data": daysValueString,
            "fskparam:modelId": modelId,
            "fskparam:parameterType": "VECTOROFNUMBERS",
            "fskparam:generatorLanguage": "Python 3.10"
        }
        
    ]
    var simulationRequestEvent = {
        "@context": [
            "https://ref.gs1.org/standards/epcis/2.0.0/epcis-context.jsonld",
            {
                "fskparam": "https://medifit-prima.github.io/fsklab-json/FSKParameter",
                "fskx": "https://medifit-prima.github.io/fsklab-json/1.0.4/FSKModel.json"
            }
        ],
        "id": "fskx:simulation:request",
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
                    "bizStep": "inspecting",
                    "disposition": "in_progress",
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
    return JSON.stringify(simulationRequestEvent);
}
