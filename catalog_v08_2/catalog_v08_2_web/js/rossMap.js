var catalog_v = "catalog_v07";
var production = 0;

if (production == 1) {
    catalog_v = "catalog";
}

var getProj4Key = {
    "epsg4326": "EPSG:4326",
    "epsg3031": "EPSG:3031",
    "epsg3413": "EPSG:3413"
};

/*
 * // Lookup Entry Info Based on Page Url
 */
function getEntry(entryName, data) {
    var thisEntry;
    for (var entryId in data) {
        if (entryId == entryName) {
            thisEntry = data[entryId];
            break;
        }
    }
    return thisEntry;
}

function makeIsoDate(timep) {
    timesplit = actvTime.split("_");
    timeIso = "";
    //Make Date
    timeIso = timesplit[0] + "-" + timesplit[1] + "-" + timesplit[2] + "T";
    //Add Time
    if (timesplit.length > 3) {
        // has a time use it
        timeIso = timeIso + timesplit[3] + ":" + timesplit[4] + ":" + timesplit[5] + "Z"; // untested no case for this
    } else {
        // fill with zeros for time
        timeIso = timeIso + "00:00:00Z";
    }
    return timeIso;
}

/*
 * On page load get valid times for all datasets in this entry (from erddap),
 * use to populate calendar for image selection, python writes a json object
 * populate all calendars on page load, return activeTime for first map
 */

function createDatepicker(entry) {

    console.log("Creating Datepicker ");
    console.log(entry.entryId)
    timeListFn = "../"+entry.entryId+"/timeList.json"
    console.log(timeListFn)
    var a = $.getJSON(timeListFn, {}).done(function () {
        console.log("creating datepicker - Success getting dataset Time list");
        var resp = a.responseJSON;
        //console.log(resp);
        idateTimes = {};
        entry["calendars"] = [];
        // Get current browser timezone offset
        var browserDate = new Date();
        var browserOffsetHr = browserDate.getTimezoneOffset() / 60;
        // For each dataset on this page, Populate valid dates in repective datepicker
        // First format the dates and store in idateTimes
        for (var i = 0; i < entry["datasets"].length; i++) {
            var datasetId = entry["datasets"][i]["id"];
            newCalId = datasetId + "-datetimepicker";
            for (var j = 0; j < resp["ids"].length; j++) {
                // Match calendar id to response's id and add the info to that calendar
                if (resp["ids"][j] == datasetId) {
                    console.log('setting calendar valid dates/times')
                    entry["calendars"].push(newCalId); // create a calendar list in entry
                    entry["datasets"][i]["time"]["timeList"] = resp["timeList"][j];
                    var theseTimes = resp["timeList"][j];
                    newCalTimes = [];
                    for (var k = 0; k < theseTimes.length; k++) {
                        newCalTimes.push(theseTimes[k][0]);
                    }
                    newCalEl = "#" + newCalId;
                    // Use dates to populate new picker
                    $(newCalEl).datetimepicker({
                        defaultDate: newCalTimes[newCalTimes.length - 1],
                        enabledDates: newCalTimes,
                        date: newCalTimes[newCalTimes.length - 1]
                    });
                    break;
                }
            }
        }
        console.log("getValidTimes finished");
    }).fail(function () {
        console.log("error fetching dataset times, cant populate page");
    });
}

/* testing having another on the fly call to python */
//makeBasemap()

function makeBasemap() {
    console.log("in js makebasemap function");

    // Getting projection info in js instead of python
    projInfoUrl = "https://epsg.io/?q=3338&format=json&trans=1";
    $.getJSON(projInfoUrl, {}).fail(function () {
        console.log("DID NOT GET proj DETAILS");
        //add a display message to the user that the requested image could not be generated
    }).done(function (projInfo) {
        console.log("In Done");
        console.log(projInfo);
        projBbox = projInfo.results[0].bbox;
        //projMaxLat = projBbox[0]
        //projMinLat = projBbox[2]
        //projMaxLon = projBbox[1]
        //projMinLon = projBbox[3]
        console.log(projBbox[2]);
        infoToPass = {
            "catalog_v": catalog_v,
            "projectionEPSG": "3338",
            "projMaxLat": projBbox[0],
            "projMinLat": projBbox[2],
            "projMaxLon": projBbox[1],
            "projMinLon": projBbox[3]
        };
        console.log(infoToPass);
        postUrl = "/" + catalog_v + "/makeNewBasemap.php";
        ajax = jQuery.ajax({
            type: "POST",
            url: postUrl,
            data: infoToPass,
            success: function success(response) {
                console.log("response:");
                console.log(response);
            }
        });
    });
}

/*
 * called by:
 *   date changes 1. onSelect in getValidTimes(), 2. prev button, 3. next button, 4. latest button
 *   createMap
 *   projection change onclick
 *   dataset change onclick
 * Should not use the url, should use only reqs and updates the url with update layers call
 */
function callPython(reqs) {

    reqProjection = reqs[0]["projection"];
    $(".loader").removeClass("d-none");
    $(".loader").removeClass("hidden");

    $(".mapTitleArea").addClass("d-none");
    $(".mapTitleArea").addClass("hidden");
    console.log(" ### In callPython() ### ");
    console.log(reqs);
    actvSubname = getActive("dataset"); // from url
    actvParameters = getActive("var"); // from url
    actvTime = getActive("time"); // from url
    actvProjection = getActive("proj"); // from url
    actvColorBar = getActive("colorBar"); // from url
    //console.log("these are the url state before the request is made and before the url is updated with new request")
    //console.log(actvSubname)
    //console.log(actvParameters)
    //console.log(actvTime)
    //console.log(actvProjection)
    //console.log(actvColorBar)

    // On page load request inputs is determined from entry metadata
    // on tab click request inputs is determined by user input
    // A request is formed for each dataset and each parameter within that dataset
    // Requests are sent to python
    // When python responds then javascript looks for 
    // the image and the image info returned from python

    console.log("  Number of Requests: " + reqs.length);
    var promises = [];
    var firstpromise = [];
    promiseList = [];

    // request inputs only has more than one input when
    // there is more than one variable for a dataset (like MUR)
    console.log(reqs);

    // Store requests with dataset
    dataset = getDatasetInfoById(reqs[0].datasetId);
    dataset["lastRequest"] = reqs;

    for (var i = 0; i < reqs.length; i++) {
        req = reqs[i];
        // CALL PYTHON VIA PHP
        console.log("  calling Python for: " + req["datasetId"]);
        p1 = performance.now();
        // This ajax created issues when more than one request input. 
        // python now keeps track of intermediate files properly (they are now distinct)
        // 2/7 still experiencing slow loading of datasets (particularly MUR which has four calls)
        // could either adapt python or change so that only one parameter is fetched at a time. 
        // Could also setup some deferreds so that the script continues after the first request without waiting for all requests
        postUrl = "/" + catalog_v + "/preview.php";
        ajax = jQuery.ajax({
            type: "POST",
            url: postUrl,
            data: req,
            success: function success(response) {
                promiseList.push(0);
                console.log(response);
                //console.log(promiseList.length)

                // Testing to speed up the rendering of the image
                // display first image asap without waiting for other responses to come back
                // generally because the calls are async doesn"t make a huge difference
                // but occassionally one of the calls takes a longer time due to internet vagueries

                if (promiseList.length == 1) {
                    console.log("**** first promise returned");
                    fp1 = performance.now();
                    console.log(fp1 - p1);
                }
            },
            error: function error(jqXHR, textStatus, errorThrown) {
                console.log(textStatus, errorThrown);
            }
        });
        promises.push(ajax);
    }

    // Once all of the promises are returned display the other parameters to the map
    $.when.apply(null, promises).done(function () {

        console.log("AFTER all promises returned - PYTHON COMPLETE.");

        console.log(" - Clearing all map images");
        // This was previously at the start of callPython, 
        // moved here to fix issue with multiple layers being displayed when
        // user clicked a new calendar date before the prior selection was fetched
        
        // Using my own clear layers because of issues with the leaflet provided clear layers 
        // it was impacting other things (url)
        // This Clear both basemaps layers and overlays
        // Added using clearMap var so the url and titles are not updated with every map clearing
        clearMap = 1;
        console.log(map._layers)
        for (var mapKey in map._layers) {
            if (map._layers[mapKey]) {
                console.log('removing');
                map.removeLayer(map._layers[mapKey]);
            }
        };
        clearMap = 0;

        //Clear all layers (basemaps and overlays from layer control)
        console.log(" - Clearing Layer control...");
        clearLayerControlBasemaps();
        clearLayerControlOverlays();
        //console.log(reqProjection)
        //console.log(actvProjection)
        reqCrs = crsLookup[reqProjection];
        //console.log(reqCrs)
    /*
    pp = reqs[0]["projection"]
    if (pp == "epsg3413"){
      epsgProj = "EPSG:3413"
    } else if (pp == "epsg3031"){
      epsgProj = "EPSG:3031"
    } else if (pp == "epsg4326"){
      epsgProj = "EPSG:4326"
    }*/

    console.log("Setting Appropriate Basemaps");
    console.log("only want to do this once and should only happen on projection change");
    // Looks at info stored for this projection and updates the layer control with the approp. bmap
    for (var group in enLayers) {
        // Overlays are grouped by projection
        if (enLayers[group]["projection"] == reqCrs) {
            console.log(enLayers[group]);
            var bmapListing = enLayers[group]["basemaps"];
            var bmapKeys = Object.keys(bmapListing);

            for (var i = 0; i < bmapKeys.length; i++) {
                bmapKey = bmapKeys[i];
                var basemap = bmapListing[bmapKey];
                console.log(basemap);
                if (!map.hasLayer(basemap)) {
                    console.log("adding basemap layer to map");
                    basemap.addTo(map);
                }
                layerControl.removeLayer(basemap, bmapKey);
                layerControl.addBaseLayer(basemap, bmapKey);
            }
        }
    }

        fp2 = performance.now();
        console.log(fp2 - p1);

       
        $(".loader").addClass("hidden");
        $(".mapTitleArea").removeClass("d-none");
        $(".mapTitleArea").removeClass("hidden");
        //console.log("Number of requests: "+ reqs.length)
        //console.log(reqs)
        //console.log(enLayers)

        timep = makeDatePrint(req["time"]);
        //timep = req["time"].slice(0,4) + '_' + req["time"].slice(5,7) + '_' + req["time"].slice(8,10)
        for (var i = 0; i < reqs.length; i++) {
            req = reqs[i];
            imageDir = "/map_images/" + catalog_v + "/" + req["entryId"] + "/" + req["datasetId"] + "/";
            fromPyFn = imageDir + req["parameter"] + "_" + req["projection"] + "_" + timep + ".json";
            //console.log(fromPyFn)
            $.getJSON(fromPyFn, {}).fail(function () {
                console.log("DID NOT GET IMAGE DETAILS");
                //add a display message to the user that the requested image could not be generated
            }).done(function (imgInfo) {
                //console.log("got image details successfully")
                //console.log(imgInfo)
                // Get the image ready for adding to the map
                // Get the image bounds
                bound0 = imgInfo["boundsProjected"][0][0];
                bound1 = imgInfo["boundsProjected"][1][1];
                bound2 = imgInfo["boundsProjected"][3][0];
                bound3 = imgInfo["boundsProjected"][3][1];
                imageBounds = L.bounds([[bound0, bound1], [bound2, bound3]]);
                //console.log(imageBounds)

                // Get the location of the image because this is async...
                imageDir = "/map_images/" + catalog_v + "/" + req["entryId"] + "/" + req["datasetId"] + "/";
                overlayName = imgInfo["parameter"] + "_" + imgInfo["projection"] + "_" + imgInfo["timep"];
                overlayFn = imageDir + overlayName + ".png";

                // Set the name of the image layer for the layer control
                overlayDisplayName = imgInfo["parameter"];

                //console.log(overlayFn)
                //console.log(map)
                //console.log(map.getPixelBounds())
                //console.log(map.getPixelWorldBounds())

                // Make the layer (but don't add it to the map)
                var myLayer = L.Proj.imageOverlay(overlayFn, imageBounds);

                // Add CRS field
                imgInfo["crs"] = crsLookup[imgInfo["projection"]];
                proj = imgInfo["crs"];
                console.log(proj)

                /* 
                // Add info about the projection to the image info storage
                if ( imgInfo["projection"]=="epsg3031" ){
                  proj="EPSG:3031"
                  imgInfo["crs"]="EPSG:3031"
                } else if ( imgInfo["projection"] == "epsg3413" ) {
                  proj = "EPSG:3413"
                  imgInfo["crs"] = "EPSG:3413"
                } else if ( imgInfo["projection"] == "epsg4326" ) {
                  proj = "EPSG:4326"
                  imgInfo["crs"] = "EPSG:4326"
                }
                */

                // Add this layer to my layer tracker
                // ? first check to confirm that layer doesnt already exist? Python should be doing this already
                //console.log(enLayers[proj])
                if (typeof enLayers[proj] != "undefined") {
                    //console.log("exists")
                } else {
                    //console.log("create")
                    enLayers[proj] = {};
                    enLayers[proj]["overlayDetails"] = {};
                }

                // Put info into my layer tracker object
                enLayers[proj]["overlayDetails"][overlayName] = { "overlayName": overlayName };
                enLayers[proj]["overlayDetails"][overlayName]["overlayDisplayName"] = overlayDisplayName;
                enLayers[proj]["overlayDetails"][overlayName]["projection"] = proj;
                enLayers[proj]["overlayDetails"][overlayName]["dataset"] = imgInfo["datasetId"];
                enLayers[proj]["overlayDetails"][overlayName]["parameter"] = imgInfo["parameter"];
                enLayers[proj]["overlayDetails"][overlayName]["subname"] = imgInfo["tab"];
                enLayers[proj]["overlayDetails"][overlayName]["time"] = imgInfo["timep"];
                enLayers[proj]["overlayDetails"][overlayName][overlayDisplayName] = myLayer;
                console.log("calling updateLayerDisplay()");
                // Update the map display
                enLayers[proj]["overlayDetails"][overlayName]
                //console.log(imgInfo)
                updateLayerDisplay(imgInfo);
            });

            console.log("Python done");
        }
        $(".loading").addClass("hidden");
        $(".time-prev-btn").removeAttr("disabled");
        $(".time-next-btn").removeAttr("disabled");
        $(".time-latest-btn").removeAttr("disabled");
        $(".calendar").removeAttr("disabled", "disabled");
        $(".calendar a").removeAttr("disabled", "disabled");

        //console.log("end json loop")

        if (typeof polygonPoints != "undefined") {
            //Create and display a wrapping polygon.
            //console.log(polygonPoints)
            new L.Polygon(polygonPoints, {
                color: "black",
                weight: 2,
                opacity: 0.5,
                smoothFactor: 1,
                noWrap: true
            }); //.addTo(map);
        }

        console.log("Python call and layer add complete.");
    });
} // end call python


function pip(point, vs) {
    // ray-casting algorithm based on
    // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html
    var x = point[0],
        y = point[1];
    var inside = false;
    for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        var xi = vs[i][0],
            yi = vs[i][1];
        var xj = vs[j][0],
            yj = vs[j][1];

        var intersect = yi > y != yj > y && x < (xj - xi) * (y - yi) / (yj - yi) + xi;
        if (intersect) inside = !inside;
    }
    return inside;
}

// Check to see if a given Layer is a dataset variable or not
// Often used to determine if the url, title and legend should be updated or not
// Those are not updated for non-dataset layers
// @ dataset is an object, @ layerName is a string
function layerIsVariable (dataset, layerName) {
    console.log(layerName)
    //Get parameter index reference for dataset object
    actvIdx = "";
    for (var j = 0; j < dataset.variables.length; j++) {
        if (layerName == dataset.variables[j].name) {
            actvIdx = j;
            thisUnits = dataset.variables[j].units;
        }
    }
    if (actvIdx !== "" ){
        console.log('is a dataset var')
        return actvIdx
    } 
    else {
        console.log('not a dataset var')
        return false
    }

}

/*
 * Get the active state of the designated query string from the url
 * key is a string
 */
function getActive(key) {

    var actvVal = "";
    var i, actvLi;

    if (key.toLowerCase() == "datasetid") {
        //tracking dataset only by tab, not url
        actvLi = $(".subEntryTabs .active").attr("id");
        actvVal = actvLi.substring(0, actvLi.indexOf("-tab"));
    } else {
        // get info from url
        queryStrings = getQueryStrings();
        for (i in queryStrings) {
            queryKey = queryStrings[i].split("=")[0];
            queryVal = queryStrings[i].split("=")[1];

            if (queryKey == key) {

                if (queryVal == "") {
                    //console.log("there is a key but no value set")
                } else {
                    actvVal = queryVal;
                }
            }
        }
    }
    return actvVal;
}

/* keep in case decide to handle layers differently
function getDisplayedPar(queryStrings) {
    console.log("IN GET active variables ")
    // need to know the order that layers are listed in the layer control
    // Make a list of current layers
    var layerControlList = []
    for (i in layerControl._layers) {
        layerControlList.push( layerControl._layers[i]["name"])
    }
    // reverse the names of layers in layer control to see which one is "highest"
    layerControlList = layerControlList.reverse()

    for ( var i in queryStrings ){
        queryKey = queryStrings[i].split("=")[0]
        queryVal = queryStrings[i].split("=")[1]
        if ( queryKey == "var" ){
            if (queryVal == ""){
                console.log("no variables showing right now")
            } else {
                var parameterList = queryVal.split(",")
            }
        }
    }
    displayedPar = ""
    // see if last var is in url, if not do same for previous...
    for (var i in layerControlList) {
        thisLayerControlPar = layerControlList[i]
        for (j in parameterList) {
            thisUrlPar = parameterList[j]
            if (thisUrlPar == thisLayerControlPar) {
                //console.log("this is the displayed layer")
                displayedPar = thisUrlPar
                break
            }
        }
        if (displayedPar !== "") {
            break
        }
    }
    return displayedPar
}
*/

function updateTitle() {

    console.log("## Updating Title ##");
    var i;
    actvVariables = getActive("var");
    actvVariables = actvVariables.split(",");
    actvTime = getActive("time");
    //console.log(actvTime)
    actvTimePrint = actvTime.slice(5, 7) + "/" + actvTime.slice(8, 10) + "/" + actvTime.slice(0, 4);
    $(".mapTimeStamp").html(actvTimePrint);
    $(".mapTitle").text(actvSubname + " ");

    if (actvVariables.length > 0) {
        for (i = 0; i < actvVariables.length; i++) {
            if (i == 0) {
                $(".mapTitle").append(actvVariables[i].split("_").join(" "));
            } else {
                $(".mapTitle").append(" and " + actvVariables[i].split("_").join(" "));
            }
        }
    }
}

function updateLegend(actvParameters) {

    console.log("## UPDATING LEGEND ##");
    var i, imageDir, legendName, legendFn, thisPar;
    
    actvDatasetId = getActive("datasetid");
    var dataset = getDatasetInfoById(getActive("datasetid"));
    //console.log(dataset)

    //show the legend for each active parameter
    actvParameters = getActive("var");
    actvTime = getActive("time");

    legendProjection = actvCrs.toLowerCase(); // data is different depending on extent so legend may be different as well
    legendProjection = legendProjection.split(":");
    legendProjection = legendProjection[0] + legendProjection[1];

    $(".mapLegend").html("");

    if (actvParameters.length > 0) {
        actvParameters = actvParameters.split(",");
        for (i in actvParameters) {
            console.log(layerIsVariable(dataset, actvParameters[i]));
            //Get parameter index reference for dataset object
            actvIdx = "";
            for (j = 0; j < dataset.variables.length; j++) {
                if (actvParameters[i] == dataset.variables[j].name) {
                    actvIdx = j;
                    thisUnits = dataset.variables[j].units;
                }
            }
            if (actvIdx !== "" ){
                imageDir = "/map_images/" + catalog_v + "/" + actvEntry + "/" + actvDatasetId + "/";
                legendName = actvParameters[i] + "_" + legendProjection + "_" + makeDatePrint(actvTime);
                legendFn = imageDir + legendName + "_legend.png";
                console.log(legendFn);

                //add legend to legend area
                thisPar = actvParameters[i].split("_").join(" ");
                legendTitleHtml = '<div class="legendTitle">' + thisPar + ' (' + thisUnits + ')' + '</div>';
                legendImageHtml = '<img src="' + legendFn + '"/>';
                legendHtml = '<div class="mapLegend">' + legendTitleHtml + legendImageHtml + '</div>';
                $(".mapLegends").append(legendHtml);
            } else {
                console.log('Not a parameter +++++')
            }
        }
    } else {
        console.log("no variables displayed");
        $(".mapLegend").html();
    }
}

function getLayerDetails(tab, projection, time, parameter) {
    //Pass info about the layer : dataset (or subname), timestamp, parameter

    var layerList, layerDetails, i, j;

    // Loop through each projection
    for (i in enLayers) {
        if (enLayers[i]["projection"] == projection) {
            layerList = enLayers[i]["overlayDetails"];
            //console.log(layerList)
            for (j in layerList) {
                layerDetails = layerList[j];
                if (layerDetails["subname"] == tab && layerDetails["time"] == time && layerDetails["parameter"] == parameter) {
                    //console.log(layerDetails)
                    return layerDetails;
                    break;
                }
            }
            break;
        }
    }
}

/* 
 * Called at end of callPython() by the active request
 * Show/hide dataset map layers
 * if there are multiple parameters in a dataset
 * this will be called multiple times
 */

function updateLayerDisplay(imgInfo) {
    console.log("* Updating Map Overlays *");

    // url has not been updated yet
    // use response from image request to see what the active parameters are
    // only called from one place (callPython)
    console.log(imgInfo);

    actvParameters = getActive("var");
    actvProjection = getActive("proj");

    // cannot rely on leaflet layer control to control layers, it is not persistent
    // use my own tracker

    // Multiple requests can run this at the same time
    // need to know if it's the request that will be displayed or not

    actvSubname = imgInfo["tab"].toLowerCase();
    actvCrs = imgInfo["crs"];
    actvTime = imgInfo["time"];

    var tab = imgInfo["tab"];
    var timep = imgInfo["timep"];
    var crs = imgInfo["crs"];
    var parameter = imgInfo["parameter"];

    // Get list of layers for this dataset, with names and layer refs
    var layerDetails = getLayerDetails(tab, actvCrs, timep, parameter);

    console.log(layerDetails)
    var displayName = layerDetails["overlayDisplayName"];

    // Find active overlay(s) and add to map
    var actvVarList = actvParameters.split(",");
    var actvVar;
    var isActiveLayer = 0;

    for (var i in actvVarList) {
        actvVar = actvVarList[i];
        if (layerDetails["parameter"] == actvVar) {
            isActiveLayer = 1;
            break;
        }
    }
    console.log(layerDetails[displayName])
    if (isActiveLayer == 1) {
        console.log("  - adding active parameter overlay to map and layer control: " + layerDetails["overlayName"]);
        
        // UPdate Layer control
        layerControl.removeLayer(layerDetails[displayName], displayName);
        layerControl.addOverlay(layerDetails[displayName], displayName); // add to layer control
        console.log('layer added to layer control list')

        // Update map
        console.log(layerDetails[displayName])
        if (!map.hasLayer(layerDetails[displayName])) {
            console.log('confirmed, this layer is not displayed on the map, adding it')
            map.addLayer(layerDetails[displayName]); // show layer on Map if not already displayed
            layerDetails[displayName].bringToFront()
            console.log('after map.addlayer()')
            console.log(map.hasLayer(layerDetails[displayName]))
            
        }
        // update url
        urlUpdates = {
            'newVars': actvParameters
            }

        updateUrl(urlUpdates);
        //updateUrl(actvSubname, actvParameters, actvTime, actvProjection, actvColorBar);
        // update legend
        updateLegend(actvParameters);
        // update title
        updateTitle();
    } else {
        // Update layer control
        console.log("  - adding overlay to layer control only: " + layerDetails["overlayName"]);
        layerControl.removeLayer(layerDetails[displayName], displayName); // add to layer control
        layerControl.addOverlay(layerDetails[displayName], displayName);
        console.log('layer added to layer control list')
    }
    // updating url legend and title should happen automatically on layer add but 
    // leaflet onadd is not always called for some reason')
} // End update layer display


function dictIsEmpty(obj) {
    return Object.keys(obj).length === 0;
}

function makeDatePrint(timeIso) {
    mm = timeIso.slice(5, 7);
    dd = timeIso.slice(8, 10);
    yyyy = timeIso.slice(0, 4);
    HH = timeIso.slice(11, 13);
    MM = timeIso.slice(14, 16);
    timePrint = yyyy + "_" + mm + "_" + dd + "_" + HH + "_" + MM;
    return timePrint;
}

function clearLayerControlBasemaps() {
    console.log(" - clearing basemaps...");
    var basemap;
    for (var i in enLayers) {
        if (!dictIsEmpty(enLayers[i]["basemaps"])) {
            for (j in enLayers[i]["basemaps"]) {
                basemap = enLayers[i]["basemaps"][j];
                layerControl.removeLayer(basemap);
            }
        }
    }
}

function clearLayerControlOverlays() {
    console.log(" - clearing overlays...");
    var olayInfo;
    for (var i in enLayers) {
        if (!dictIsEmpty(enLayers[i]["overlayDetails"])) {
            for (j in enLayers[i]["overlayDetails"]) {
                olayInfo = enLayers[i]["overlayDetails"][j];
                olayId = enLayers[i]["overlayDetails"][j]["overlayDisplayName"];
                olay = enLayers[i]["overlayDetails"][j][olayId];
                layerControl.removeLayer(olay);
            }
        }
    }
}

projLookup = {
    "EPSG:3031": "epsg3031",
    "EPSG:3413": "epsg3413",
    "EPSG:4326": "epsg4326"
};

crsLookup = {
    "epsg3031": "EPSG:3031",
    "epsg3413": "EPSG:3413",
    "epsg4326": "EPSG:4326"
};

/*
 * Update the url with new info
 * Modified from datasetDownload.js version (8/8/2018)
 */
function updateUrl(urlUpdates) {

    console.log('## UPDATING URL ##')
    console.log(urlUpdates)
    // options are dataset (subname), projection, vars, colorBar, time"

    // Get all url query string parameters and values to establish state before updates

    var subname = getActive('dataset')      // Get active subname from url    
    var vars = getActive('var')
    var time = getActive('time')
    var proj = getActive('projection')
    var cbar = getActive('colorBar')
    var entry = getActive('entry')
    
    //iterate over the updated queries submitted to this function
    Object.keys(urlUpdates).forEach(function(key) {
      console.log(key, urlUpdates[key]);

      if(key =="newTime"){
        console.log('new time submitted')
        time = urlUpdates[key]
      }
      else if(key =="newVars"){
        console.log('new vars submitted')
        vars = urlUpdates[key]
      }
      else if(key =="newEntry"){
        console.log('new entry submitted')
        entry = urlUpdates[key]
      }
      else if(key =="newSubname"){
        console.log('new subname submitted')
        subname = urlUpdates[key]
      }
      else if(key =="newProj"){
        console.log('new projection submitted')
        proj = urlUpdates[key]
      }
      else if(key =="newCbar"){
        console.log('new colorbar submitted')
        cbar = urlUpdates[key]
      }
    });

    // Update the Url
    var queries = []
    //queries.push("dataset=" + )
    //queries.push("var=" + vars)
    if (typeof time !=  "undefined") { 
      queries.push("time=" + time)
    }
    if (typeof vars !=  "undefined") { 
      queries.push("var=" + vars)
    }
    if (typeof subname !=  "undefined") { 
      queries.push("dataset=" + subname.toLowerCase())
    }
    if (typeof entry !=  "undefined") { 
      queries.push("entry=" + entry)
    }
    if (typeof proj !=  "undefined") { 
      queries.push("proj=" + proj)
    }
    if (typeof cbar !=  "undefined") { 
      queries.push("colorBar=" + cbar)
    }
    console.log(queries)
    
    var urlParts = window.location.pathname.split("/")
    var newUrl = window.location.pathname + "?" + queries.join("&")   
    console.log(newUrl)
    // SEND ACTIVE DATASET info to url   
    history.replaceState(null, null, newUrl);
}


function updateUrlOld(actvSubname, actvParameters, actvTime, actvProjection, actvColorBar) {
    console.log("## UPDATING URL ##");
    //Working towards: actvSubname, actvParameters, actvTime, actvBasemap
    //Set which layer is checked
    //console.log(actvSubname)
    //console.log(actvParameters)
    //console.log(actvTime)
    //console.log(actvProjection)
    //console.log(actvColorBar)
    //console.log("##")
    var datasetQueryString = "dataset=" + actvSubname.toLowerCase();
    var parameterQueryString = "var=" + actvParameters;
    var timeQueryString = "time=" + actvTime;
    var projectionQueryString = "proj=" + actvProjection;
    var colorbarQueryString = "colorBar=" + actvColorBar;
    var queries = [datasetQueryString, parameterQueryString, timeQueryString, projectionQueryString, colorbarQueryString];
    var urlParts = window.location.pathname.split("/");
    var newUrl = window.location.pathname + "?" + queries.join("&");
    console.log('pushing new address to url')
    // SEND ACTIVE DATASET info to url
    history.replaceState(null, null, newUrl);
    console.log("url is new")
}

function getQueryStrings() {
    var urlParts = window.location.pathname.split("/");
    var queryStrings = window.location.search.substr(1); // remove the ?
    queryStrings = queryStrings.split("&");
    return queryStrings;
}

/*
 * Look through the loaded entry (from json) to get info associated with the given dataset
 */
function getDatasetInfoById(datasetId) {
    var dataset, i;
    for (i = 0; i < entry.datasets.length; i++) {
        dataset = entry.datasets[i];
        if (dataset["id"] == datasetId) {
            dataset["ref"] = i; //add reference for pulling out datasetinfo from coresponding lists like colorbars
            return dataset;
            break;
        }
    }
}

function getDatasetInfoBySubname(datasetSubname) {
    var dataset;
    for (var i = 0; i < entry.datasets.length; i++) {
        dataset = entry.datasets[i];
        if (dataset["subname"].toLowerCase() == datasetSubname.toLowerCase()) {
            dataset["ref"] = i; //add reference for pulling out out parameters from lists like colorbars
            return dataset;
            break;
        }
    }
}

// If we continue using this, break this down so we can use it for any projection
function setupErddapBasemaps(epsg3413BasemapInfo, epsg4326BasemapInfo, epsg3031BasemapInfo) {
    console.log("Making layers from basemaps");
    // Arctic
    //console.log(epsg3413BasemapInfo)
    bound0 = epsg3413BasemapInfo[0]["boundsProjected"][0][0];
    bound1 = epsg3413BasemapInfo[0]["boundsProjected"][1][1];
    bound2 = epsg3413BasemapInfo[0]["boundsProjected"][3][0];
    bound3 = epsg3413BasemapInfo[0]["boundsProjected"][3][1];
    epsg3413BasemapBounds = L.bounds([[bound0, bound1], [bound2, bound3]]);
    epsg3413BasemapDir = "/" + catalog_v + "/basemaps/";
    epsg3413OverlayName = "EPSG3413_etopo";
    epsg3413OverlayFn = epsg3413BasemapDir + epsg3413OverlayName + ".png";
    console.log(epsg3413OverlayFn);
    epsg3413EtopoBasemap = L.Proj.imageOverlay(epsg3413OverlayFn, epsg3413BasemapBounds);
    //Add layer to layer tracker...
    enLayers["EPSG:3413"]["basemaps"]["Topography"] = epsg3413EtopoBasemap;

    // Geographic
    bound0 = epsg4326BasemapInfo[0]["boundsProjected"][0][0];
    bound1 = epsg4326BasemapInfo[0]["boundsProjected"][1][1];
    bound2 = epsg4326BasemapInfo[0]["boundsProjected"][3][0];
    bound3 = epsg4326BasemapInfo[0]["boundsProjected"][3][1];
    epsg4326BasemapBounds = L.bounds([[bound0, bound1], [bound2, bound3]]);
    epsg4326BasemapDir = "/" + catalog_v + "/basemaps/";
    epsg4326OverlayName = "EPSG4326_etopo";
    epsg4326OverlayFn = epsg4326BasemapDir + epsg4326OverlayName + ".png";
    console.log(epsg4326OverlayFn);
    epsg4326EtopoBasemap = L.Proj.imageOverlay(epsg4326OverlayFn, epsg4326BasemapBounds);
    //Add layer to layer tracker...
    enLayers["EPSG:4326"]["basemaps"]["Topography"] = epsg4326EtopoBasemap;

    // Antarctic
    console.log(epsg3031BasemapInfo);
    bound0 = epsg3031BasemapInfo[0]["boundsProjected"][0][0];
    bound1 = epsg3031BasemapInfo[0]["boundsProjected"][1][1];
    bound2 = epsg3031BasemapInfo[0]["boundsProjected"][3][0];
    bound3 = epsg3031BasemapInfo[0]["boundsProjected"][3][1];
    epsg3031BasemapBounds = L.bounds([[bound0, bound1], [bound2, bound3]]);
    epsg3031BasemapDir = "/" + catalog_v + "/basemaps/";
    epsg3031OverlayName = "EPSG3031_etopo";
    epsg3031OverlayFn = epsg3031BasemapDir + epsg3031OverlayName + ".png";
    epsg3031EtopoBasemap = L.Proj.imageOverlay(epsg3031OverlayFn, epsg3031BasemapBounds);
    //Add layer to layer tracker...
    enLayers["EPSG:3031"]["basemaps"]["Topography"] = epsg3031EtopoBasemap;
}

/*
 * Runs on page load, from createMap()
 * make default colorbar queries for all datasets
 * Makes colorbar url format and stores it with dataset (like parameters list)
 */
function makeDefaultColorbarQueries(entry) {
    for (i = 0; i < entry["datasets"].length; i++) {

        var dataset = entry["datasets"][i];

        for (j = 0; j < dataset.parameters.length; j++) {
            var colorbarInfo = dataset.parameters[j]["colorbar"];
            cbitems = [];
            cbitems.push(colorbarInfo.palette);
            cbitems.push(colorbarInfo.continuity);
            //because I already have these in my config file a little differently
            if (colorbarInfo.logscale == "TRUE") {
                cbitems.push("Log");
            } else {
                cbitems.push("");
            }
            cbitems.push(colorbarInfo.colorbarmin);
            cbitems.push(colorbarInfo.colorbarmax);
            cbitems.push(colorbarInfo.sections);
            dataset.parameters[j]["colorbar"]["query"] = cbitems.join(",");
        }
    }
}

function createMap(data) {
    console.log(" ## In createMap ##");
    actvEntryTab = $(".entryList li li.active").attr("id");
    actvEntry = actvEntryTab.substring(0, actvEntryTab.indexOf("-tab"));
    entry = data[actvEntry];
    var polygon, epointList, prevProjPoly, prevProjPolyPoints;
    var i, actvLi, defaultDatasetId, actvSubname, actvDatasetId, actvProjection, actvCrs, actvParameters;
    var entryName = entry.entryId;
    pageLoad = 1;
    // Get this page's default dataset
    actvLi = $(".subEntryTabs .active").attr("id");
    defaultDatasetId = actvLi.substring(0, actvLi.indexOf("-tab"));
    // Set active Dataset 
    actvSubname = getActive("dataset"); // Get active subname from url
    if (actvSubname == "") {
        //if no dataset is specified in the query string use the default tab (usually daily)
        dataset = getDatasetInfoById(defaultDatasetId);
        actvSubname = dataset["subname"].toLowerCase();
        actvDatasetId = defaultDatasetId;
    } else {
        // if there is a dataset indicated in the query string use it to set the active Dataset
        dataset = getDatasetInfoBySubname(actvSubname);
        actvDatasetId = dataset["id"];
    }
    // Set active Projection 
    actvCrs = "EPSG:3031";
    // Get active Parameters from Url, if none, set to default
    actvParameters = getActive("var");
    console.log(actvParameters)
    if (actvParameters == "") {
        // SET DEFAULT PARAMETER (AS 1ST PARAMETER) - SST, ice concentration...
        // Not really setting the "default paramter, setting the active parameter
        // change to look for active layer on map and get parameter name
        console.log(dataset.parameters);
        actvParameters = dataset.parameters[0].name;
        dataset["displayedParameters"] = actvParameters;
    }
    makeDefaultColorbarQueries(entry);
    //Get Colorbar Settings from url
    actvColorBar = getActive("colorBar");
    //ColorBar is specified by these options, in this order
    //1. color palette : ie. Rainbow
    //2. continutity : either continuus (c), or discrete (d)
    //3. scale: linear or log
    //4. min: number
    //5. max: number
    //6. discrete sections: integer

    // This was quickly setup for March release. 
    // Works with default settings per dataset config
    // Will need lots of checks/catches for this once we allow user input

    // set the active colorbar query to pass to url
    if (actvColorBar == "") {
        actvColorBar = [];
        colorbarIdxs = [];
        // get parameter idx to use as colorbar query idx
        var parameterList = actvParameters.split(",");
        for (var i in parameterList) {
            for (var j in dataset["parameters"]) {
                if (parameterList[i] == dataset["parameters"][j]["name"]) {
                    colorbarIdxs.push(j);
                }
            }
        }
        for (var i in colorbarIdxs) {
            thiscb = dataset["parameters"][i]["colorbar"]["query"].split(",").join("|");
        }
        actvColorBar.push(thiscb);
    }
    createDatepicker(entry); // for time selector population

    map = new L.Map("map", {
        crs: projDefs[actvCrs],
        noWrap: true
    });

    L.Map.include({
        "clearLayers": function clearLayers() {
            this.eachLayer(function (layer) {
                this.removeLayer(layer);
            }, this);
        }
    });

    //var runLayer = omnivore.kml('../basemaps/mpa_1.kml').addTo(map);

    //Convert Kml to GeoJson on import and remove any points, only keep polygons
    var customLayer = L.geoJSON(null, {
      filter: function(geoJsonFeature) {
        // my custom filter function: do not display Point type features.
        return geoJsonFeature.geometry.type !== 'Point';
      }
    }).addTo(map);

    var runLayer = omnivore.kml('../basemaps/mpa_1.kml', null, customLayer);

    var popup = L.popup();

    // Update parameter selected in leaflet layer control
    // this is not always called, only called from layer controller interaction
    // set to ignore layers that are not a parameter (mpa layer...)
    map.on("overlayadd", function (e) {
        console.log(e)
        console.log(e.name)
        // just a change of parameter
        // we don't need to call python here, because an earlier call to python got all parameters (layers)
        console.log("Overlay added to map (through layer control, so updating url, adding colorbar to legend, adding par to title");
        //actvSubname = getActive("dataset");
        //actvTime = getActive("time");
        actvParameters = getActive("var");
        actvColorBar = getActive("colorBar");

        // Add new parameter to url parameter list
        if (actvParameters == "") {
            actvParameters = e.name; // for cases where all layers have been removed
        } else {
            actvVarList = actvParameters.split(",");
            actvVarList.push(e.name);
            actvParameters = actvParameters + "," + e.name;
        }
        console.log(actvParameters)
        // Add coresponding colorbar query to the url colorbar list (for reference)
        // get info from dataset
        var activeIdx = [];
        for (var i = 0; i < dataset.parameters.length; i++) {
            if (dataset.parameters[i]["name"] == e.name) {
                activeIdx.push(i);
            }
        }
        console.log(activeIdx)
        if (activeIdx.length > 0){
            console.log('Dataset parameter layer, updating Url')
            cbquery = dataset.parameters[activeIdx]["colorbar"]["query"];
            cbqueryForUrl = cbquery.split(",").join("|");
            if (actvColorBar == "") {
                actvColorBar = cbqueryForUrl;
            } else {
                actvColorBar = actvColorBar + "," + cbqueryForUrl;
            }
            // Update Url with new dataset parameter and colorbar (everything else should be the same)
             urlUpdates = {
            'newVars': actvParameters,
           // 'newProj': actvProjection,
            'newCbar': actvColorBar
            }
            updateUrl(urlUpdates);
            updateLegend(actvParameters);
            updateTitle();
        } else {
            console.log('not a dataset parameter... dont update the url, legend or title')
        }

        
    });

    //listener to track which parameters are in leaflet layer control
    map.on("overlayremove", function (e) {
        console.log(' overlay removed, doing stuff')
        // just a change of parameter, don't need to call python here,
        // because a prior call to python got all parameters (layers) for this dataset

        //Should only be the parameters that change here
        //actvSubname = getActive("dataset");
        //actvTime = getActive("time");
        //actvProjection = getActive("proj");
        actvColorBar = getActive("colorBar");

        // See if there are parameters in the initial loaded url
        // If so, pass those along as the active parameters
        actvParameters = getActive("var");
        console.log(actvParameters)
        removeIdx = 0;
        if (actvParameters !== "") {
            var tmpParameters = [];
            var actvParArray = actvParameters.split(",");
            for (var i = 0; i < actvParArray.length; i++) {
                if (actvParArray[i] !== e.name) {
                    // if doenst match current layer to remove add to new list
                    tmpParameters.push(actvParArray[i]);
                } else {
                    removeIdx = i;
                }
            }
            actvParameters = tmpParameters.join(",");
        }

        // there should be existing colorbar queries in the url
        // loop through those and remove the one associated with this layer
        // use layer index from loop above
        if (actvColorBar !== "") {
            var newCbList = [];
            actvCbList = actvColorBar.split(",");
            for (var i = 0; i < actvCbList.length; i++) {
                if (i !== removeIdx) {
                    newCbList.push(actvCbList[i]);
                }
            }
            actvColorBar = newCbList.join(",");
        } else {
            console.log('No colorbar query in url yet')
        }
        // Update Url with new dataset parameter and colorbar
         urlUpdates = {
            'newVars': actvParameters,
            'newCbar': actvColorBar
        }
        // Only update these things if it's an onclick
        // Otherwise it messes up parameter tracking
        // only update the url when the active layer is ADDED to map
        if (clearMap == 0) {
            console.log(" - overlay removed so updating url, legend, title");
            updateUrl(urlUpdates);
            updateLegend(actvParameters);
            updateTitle();
        }
    });

    enLayers = {
        "EPSG:3031": {
            "projection": "EPSG:3031",
            "basemaps": {},
            "overlayDetails": {},
            "otherLayers": {}
        },
        "EPSG:3413": {
            "projection": "EPSG:3413",
            "basemaps": {},
            "overlayDetails": {},
            "otherLayers": {}
        },
        "EPSG:4326": {
            "projection": "EPSG:4326",
            "basemaps": {},
            "overlayDetails": {},
            "otherLayers": {}
        }
        
    };
    console.log("  populating initial (no overlays yet) layer control");
    console.log(enLayers)
    console.log(actvCrs)
    // Start layer control with antarctic basemaps and no overlays
    layerControl = L.control.layers(enLayers[actvCrs]["basemaps"], {}, { collapsed: false }).addTo(map);
    layerControl.addOverlay(runLayer, 'MPA'); // add to layer control
    initialBoundsList = {
        "EPSG:3031": [[-45.72594458145447, 44.92245898902086], [-45.725944862100214, -134.92245898847855]],
        "EPSG:3413": [[15, 45], [15, -179.63]],
        "EPSG:4326": [[90, 180.1, -90, -180.1]]   
    };

    actvProjection = projLookup[actvCrs];
    // Set initial map state - default view of antarctica
    if (actvCrs == "EPSG:3031") {
        console.log('Standard Antarctic Projection')
        var center = [-75, -179];
        map.setView(center, 5);

        //Does this help with responsive map?
        mapBounds = map.getBounds();
        //console.log(mapBounds);
        //console.log(actvCrs);
        //console.log(initialBoundsList[actvCrs]);
        //map.fitBounds(initialBoundsList[actvCrs])
        //map.setMaxBounds(initialBoundsList[actvCrs]); // This prevents panning outside of initial extent (to some extent, can still zoom out and can still attempt to pan out of this range)
    } else {
        console.log("Triggering the click of the appropraite projection tab");
        
        actvProjectionTab = "#" + actvProjection;
        $(".map-projection li").removeClass("active"); // remove active class from all tabs
        $(actvProjectionTab).addClass("active"); // add active class to this tab
        $(actvProjectionTab).trigger("click"); // do some stuff to the map and then call python (or not, if it's a page load)
        //alert('The projection input from the url is not currently supported.')
    }
    //document.getElementsByClassName( 'leaflet-control-attribution' )[0].style.display = 'none';
    //$(".leaflet-control-attribution").before('<div style="text-align:right; font-size: 11px; padding-right: 5px;color: #333; background: rgba(255, 255, 255, 0.7)"> * For preview only, does not represent resolution of data</div> <span style="font-size: 11px; color: #333; padding: 3px 0px 1px 0px;background: rgba(255, 255, 255, 0.7)">NOAA PolarWatch |</span> ')

    // Make requests to python for all parameters within the active Dataset

    reqs = [];
    //console.log(actvDatasetId)
    //dataset = getDatasetInfoById(actvDatasetId)
    //console.log(dataset)
    //console.log(dataset.subname)
    //console.log(dataset.parameters)

    // Set Default Time
    actvTime = dataset.allDatasets[10];
    //console.log(actvTime)
    actvTimePrint = makeDatePrint(actvTime);
    actvTime = actvTime;

    console.log(actvColorBar)

    // Create the info to send to getImage script
    // getting all parameters
    //console.log(dataset)
    for (var j = 0; j < dataset.parameters.length; j++) {
        parameter = dataset.parameters[j]["name"]; // always get all parameters
        cbquery = dataset.parameters[j]["colorbar"]["query"]; //php to python cant handle the | char keeping that separate and just for url
        //console.log(parameter)
        //console.log(cbquery)
        req = {
            "catalog_v": catalog_v,
            "projection": actvProjection,
            "datasetId": actvDatasetId,
            "entryId": entryName,
            "parameter": parameter,
            "time": actvTime,
            "tab": actvSubname,
            "colorBar": cbquery
        };
        reqs.push(req);
    } //End par for
    //console.log(reqs)

    epsg3413BasemapInfoFn = "/" + catalog_v + "/basemaps/EPSG3413_etopo.json";
    promise1 = $.getJSON(epsg3413BasemapInfoFn);

    epsg4326BasemapInfoFn = "/" + catalog_v + "/basemaps/EPSG4326_etopo.json";
    promise2 = $.getJSON(epsg4326BasemapInfoFn);

    epsg3031BasemapInfoFn = "/" + catalog_v + "/basemaps/EPSG3031_etopo.json";
    promise3 = $.getJSON(epsg3031BasemapInfoFn);

    // Once we have basemap info 
    //  1. setup the basemaps, 
    //  2. update the url with complete corresponding info
    //  3. 
    $.when(promise1, promise2, promise3).done(function (epsg3413BasemapInfo, epsg4326BasemapInfo, epsg3031BasemapInfo) {
        console.log(' basemap promises complete')
        //console.log(epsg3031BasemapInfo);
        setupErddapBasemaps(epsg3413BasemapInfo, epsg4326BasemapInfo, epsg3031BasemapInfo);
        //console.log(actvSubname, actvParameters, actvTime, actvProjection, actvColorBar)
        // Here we update the url to pass the parameters when there arent any yet

        actvParameters = getActive('var')
        console.log(getActive('var'))

         urlUpdates = {
            'newSubname':actvSubname,
            'newVars': actvParameters,
            'newCbar': actvColorBar,
            'newTime': actvTime,
            'newProj': actvProjection
            }
        console.log(actvParameters)
        updateUrl(urlUpdates);
        //var queryStrings = getQueryStrings() 
        //actvDatasetId = getActive('datasetid') // this method uses the current tab, here we need to calculate it from the url
        //console.log(defaultDatasetId);
        // get active dataset Id from url
        dataset = getDatasetInfoBySubname(actvSubname);
        actvDatasetId = dataset["id"];
        console.log(actvDatasetId)
        // Get image from ERDDAP via Python
        // If the request is for the default dataset, go straight to call python
        // The request can be for a different dataset because we are using input from the url
        // If that is the case, update the page state and then call python
        if (actvDatasetId == defaultDatasetId) {
            callPython(reqs);
        } else {
            console.log("Triggering dataset tab switch on page load");
            actvDatasetTab = "#" + actvDatasetId + "-tab";
            $(actvDatasetTab).trigger("click"); //this does some stuff and then calls python
        }
    });
    pageLoad = 0;
} //end createMap

function setDecimalsString(num, decimal_places) {
    //num input should be a string, output will be a string
    // decimal place should be a num
    num = num.toString(); // make sure we are working with a string
    //Look for decimal place
    decimal_location = num.indexOf(".");
    if (decimal_location != -1) {
        num = num.slice(0, decimal_location + decimal_places);
    }
    return num;
}

$(document).ready(function () {

    /*
     * on load, get catalog.json file and calls mapData
    */
    console.log('PAGE LOAD - reading entry info from JSON')
    var jqxhr = $.getJSON("../config/catalog.json", {}).done(function () {
        data = jqxhr.responseJSON;
        console.log(data); 
        createMap(data)
        
    }).fail(function () {
        console.log("error fetching metadata, cant populate page");
        $(".previewSidebarFirst").html("Error: Could not access dataset metadata");
    });

    $(".mapTitleArea.loading").html("loading...");

    proj4defs = {
        "EPSG:3031": "+proj=stere +lat_0=-90 +lat_ts=-71 +lon_0=0 +k=1 +x_0=0 +y_0=0 " + "+ellps=WGS84 +datum=WGS84 +units=m +no_defs",
        "EPSG:3413": "+proj=stere +lat_0=90 +lat_ts=70 +lon_0=-45 +k=1 +x_0=0 +y_0=0 " + "+ellps=WGS84 +datum=WGS84 +units=m +no_defs",
        "EPSG:4326": "+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs"
    };
    EPSG3031CRS = new L.Proj.CRS("EPSG:3031", "+proj=stere +lat_0=-90 +lat_ts=-71 +lon_0=0 +k=1 +x_0=0 +y_0=0 +ellps=WGS84 +datum=WGS84 +units=m +no_defs", {
        origin: [-3.369955099203E7, 3.369955101703E7],
        resolutions: [238810.81335399998, 119405.40667699999, 59702.70333849987, 29851.351669250063, 14925.675834625032, 7462.837917312516, 3731.4189586563907, 1865.709479328063, 932.8547396640315, 466.42736983214803, 233.21368491607402, 116.60684245803701, 58.30342122888621, 29.151710614575396, 14.5758553072877, 7.28792765351156, 3.64396382688807, 1.82198191331174],
        bounds: L.bounds([[-3.0635955947272874E7, -3.063595594727252E7], [3.0635955947272874E7, 3.0635955947272986E7]])
    });
    EPSG3413CRS = new L.Proj.CRS("EPSG:3413", "+proj=stere +lat_0=90 +lat_ts=70 +lon_0=-45 +k=1 +x_0=0 +y_0=0 " + "+ellps=WGS84 +datum=WGS84 +units=m +no_defs", {
        origin: [-4194304, 4194304],
        resolutions: [8192.0, 4096.0, 2048.0, 1024.0, 512.0, 256.0],
        bounds: L.bounds([[-4194304, -4194304], [4194304, 4194304]])
    });
    EPSG4326CRS = L.CRS.EPSG4326;
    projDefs = {
        "EPSG:3031": EPSG3031CRS,
        "EPSG:3413": EPSG3413CRS,
        "EPSG:4326": EPSG4326CRS        
    };

    //console.log(data.actvEntry)
    // Get Active Dataset
    actvLi = $(".subEntryTabs .active").attr("id");
    actvDatasetId = actvLi.substring(0, actvLi.indexOf("-tab"));
    console.log(actvDatasetId)

    /*
     * Time prev
     */
    $(".time-prev-btn").click(function () {
        //dataset is global (and only changed by dataset onclick)
        //actvDatasetId = getActive('datasetid')
        //var dataset = getDatasetInfoById(actvDatasetId)  //Get current dataset
        console.log(actvSubname);
        clearMap = 1;
        // Clear active map image
        console.log("map layers cleared by PREV button");
        map.clearLayers();
        //console.log(actvSubname);
        // Clear overlays in layer control
        clearLayerControlOverlays();
        //console.log(actvSubname);
        clearMap = 0;
        //console.log(dataset["time"]);
        actvTimeList = dataset["time"]["timeList"];
        // get current time 
        actvTime = getActive("time");
        //console.log(actvTime);
        //console.log(actvTimeList);

        // find index of current time in time list
        for (i in actvTimeList) {
            if (actvTimeList[i][0] == actvTime) {
                console.log("found");
                actvTimeIdx = parseInt(i);
                break;
            }
        }
        //console.log(actvTimeIdx);
        latestTimeIdx = actvTimeList.length - 1;
        //make sure we can go back one (not alredy on oldest)
        if (actvTimeIdx !== 0) {
            newTimeIdx = actvTimeIdx - 1;
            //console.log(newTimeIdx);
            newTime = actvTimeList[newTimeIdx][0];
            newTimep = makeDatePrint(newTime);
            //console.log(newTime);
            //console.log(newTimep);
            for (var j = 0; j < reqs.length; j++) {
                reqs[j]["time"] = newTime;
            }
            console.log("*** New Time Selected ***");

            // Get active dataset, variable, time, etc
            // the new time is from this action
            actvTime = newTime;
            // use the selected tab to get the active dataset subname
            actvSubname = getActive("dataset");
            // Get the rest of the info from the url
            actvDatasetId = getActive("datasetid");
            actvCalEl = "#" + actvDatasetId + "-datetimepicker";
            dataset = getDatasetInfoById(actvDatasetId);
            actvParameters = getActive("var");
            actvProjection = getActive("proj");
            actvColorBar = getActive("colorBar");
            //Update the Url with the new info (new time)

            urlUpdates = {
            'newTime': actvTime
            }

        updateUrl(urlUpdates);

            
            //console.log(dataset.parameters.length)
            //update calendar 
            //this calls python function
            $(actvCalEl).data("DateTimePicker").date(new Date(actvTime));
            $(".time-prev-btn").attr("disabled", "disabled");
            $(".time-latest-btn").attr("disabled", "disabled");
            $(".time-next-btn").attr("disabled", "disabled");
        } else {
            console.log("doing nothing, on oldest time stamp");
        }
    });

    //Time next 
    $(".time-next-btn").click(function () {
        //dataset is global (and only changed by dataset onclick)
        //actvDatasetId = getActive('datasetid')
        //var dataset = getDatasetInfoById(actvDatasetId)  //Get current dataset
        actvTimeList = dataset["time"]["timeList"];

        //look for current time in timelist
        actvTime = getActive("time");
        var actvTimeIdx;
        //console.log(actvTimeIso)
        //console.log(actvTimeList)
        for (i in actvTimeList) {
            if (actvTimeList[i][0] == actvTime) {
                //console.log('found')
                actvTimeIdx = parseInt(i);
                break;
            }
        }
        //console.log(actvTimeIdx)
        latestTimeIdx = actvTimeList.length - 1;
        //console.log(actvTimeIdx)
        //make sure we can go forward one (not alredy on latest)
        if (actvTimeIdx != latestTimeIdx) {
            newTimeIdx = actvTimeIdx + 1;
            //console.log(newTimeIdx)
            newTime = actvTimeList[newTimeIdx][0];
            newTimep = makeDatePrint(newTime);
            actvTime = newTime;
            actvSubname = getActive("dataset"); // all from url
            actvDatasetId = getActive("datasetid");
            dataset = getDatasetInfoById(actvDatasetId);
            actvParameters = getActive("var");
            actvProjection = getActive("proj");
            actvColorBar = getActive("colorBar");
            urlUpdates = {
            'newTime': actvTime
            }

            updateUrl(urlUpdates);
            //updateUrl(actvSubname, actvParameters, actvTime, actvProjection, actvColorBar); // update the url
            console.log(dataset.parameters.length);
            //update calendar (calls py)
            $(actvCalEl).data("DateTimePicker").date(new Date(actvTime));
            $(".time-next-btn").attr("disabled", "disabled");
            $(".time-prev-btn").attr("disabled", "disabled");
            $(".time-latest-btn").attr("disabled", "disabled");
        } else {
            console.log("doing nothing, on latest time stamp");
        }
    });

    //Time latest
    $(".time-latest-btn").click(function () {
        //dataset is global (and only changed by dataset onclick)
        //actvDatasetId = getActive('datasetid')
        //var dataset = getDatasetInfoById(actvDatasetId)  //Get current dataset
        actvTimeList = dataset["time"]["timeList"];
        //look for current time in timelist
        actvTime = getActive("time");
        var actvTimeIdx;
        //console.log(actvTimeIso)
        //console.log(actvTimeList)
        for (i in actvTimeList) {
            if (actvTimeList[i][0] == actvTime) {
                actvTimeIdx = parseInt(i);
                break;
            }
        }
        //console.log(actvTimeIdx)
        latestTimeIdx = actvTimeList.length - 1;
        //console.log(actvTimeIdx)
        //make sure we need to make a change
        if (actvTimeIdx != latestTimeIdx) {
            newTime = actvTimeList[latestTimeIdx][0];
            newTimep = makeDatePrint(newTime);
            actvTime = newTime;
            //actvSubname = getActive("dataset");
            // all from url
            //actvDatasetId = getActive("datasetid");
            //dataset = getDatasetInfoById(actvDatasetId);
            //actvParameters = getActive("var");
            //actvProjection = getActive("proj");
            //actvColorBar = getActive("colorBar");
            urlUpdates = {
            'newTime': actvTime
            }
            updateUrl(urlUpdates);
            //updateUrl(actvSubname, actvParameters, actvTime, actvProjection, actvColorBar); // update the url
            //console.log(dataset.parameters.length);
            //update calendar (calls py)
            $(actvCalEl).data("DateTimePicker").date(new Date(actvTime));
            $(".time-latest-btn").attr("disabled", "disabled");
            $(".time-prev-btn").attr("disabled", "disabled");
            $(".time-next-btn").attr("disabled", "disabled");
        } else {
            console.log("doing nothing, on latest time stamp");
        }
    });

    // Entry Click function
     $(".entryList li li").click(function () {
        console.log("## TOGGLING ENTRY TAB ##");
        $(".entryList .active").removeClass("active");
        $(this).addClass("active");
        actvEntryTab = $(".entryList li li.active").attr("id");
        actvEntry = actvEntryTab.substring(0, actvEntryTab.indexOf("-tab"));
        console.log(actvEntry)

    });

    // Dataset Click Function
    $(".subEntryTabs li").click(function () {
        console.log("## TOGGLING DATASET TAB ##");
        // Check to make sure this dataset was in erddap last time we checked
        // Catalog now has the ability to display entries where one dataset is missing but others were there
        // 3/27/18 example of this is NASA VIIRS Monthly dataset not accessed but Daily and weekly are available

        var i, j;
        // get info from the selected tab 
        // if triggered by page load then the correct tab is set to active before this is called

        // set this  dataset button to active
        $(".subEntryTabs .active").removeClass("active");
        $(this).addClass("active");
        actvLi = $(".subEntryTabs .active").attr("id");
        actvDatasetId = actvLi.substring(0, actvLi.indexOf("-tab"));

        // clearing layers
        // doing this also in call python so don't really need to do it here too
        // but it is nice to have the layers removed earlier
        // improves user experience, indicates that something is happening right away
        clearMap = 1;

        // Clear active map image
        map.clearLayers(); // this needs to be done first, impacts active states

        // Clear overlays in layer control
        clearLayerControlOverlays();
        clearMap = 0;

        // Get dataset info from metadata
        dataset = getDatasetInfoById(actvDatasetId);

        //Get iso latest time stamp from metadata
        try {
            actvTime = dataset.allDatasets[10];
        } catch (err) {
            console.log("display dataset not active message");
        }

        actvSubname = dataset["subname"];

        //Get active projection (based on url)
        actvProjection = getActive("proj");

        // Set active parameters
        // this is a new dataset, need to use new dataset info and reset active parameter as this dataset's first parameter
        for (j = 0; j < dataset.parameters.length; j++) {
            parameter = dataset.parameters[j]["name"];
            if (j == 0) {
                actvParameters = parameter;
                break;
            }
        }
        //console.log(actvParameters)

        //Time
        //Each dataset has different times available, reverts to default (latest)
        //to do: if toggling between monthly and daily tabs want to remember the last used time and go back to that

        /*
         * SHOW/HIDE Date/time selectors and data details section
         * make sure the calendar displayed correlates to the selected subname tab
         * loop through all calendars, show active, hide non-active
         * calendars are submitted on click, so this will work
         */
        $(".map-time-selector").each(function (k, obj) {
            thisTimeSectionDivId = $(obj).attr("id");
            if (thisTimeSectionDivId == actvDatasetId + "-map-time") {
               
                $(obj).removeClass("hidden");
            } else {
               
                $(obj).removeClass("hidden");
      
                 $(obj).addClass("hidden");
            }
        });

        // Show/Hide corresponding dataset details html
        $(".dataset-details").each(function (k, obj) {
            thisDetailsSectionDivId = $(obj).attr("id");
            if (thisDetailsSectionDivId == actvDatasetId + "-dataset-details") {
            
                $(obj).removeClass("hidden");
            } else {
             
                $(obj).removeClass("hidden");
             
                $(obj).addClass("hidden");
            }
        });

        // new dataset, cannot keep the time from the previous dataset because they have different time spacing(daily, monthly)
        // well we could remember if this dataset had a time selected before and default to that
        // will require a time variable for each available dataset.

        //actvTime = dataset.allDatasets[10]
        //actvTime = makeDatePrint(actvTime)

        // Setup python request
        // Create the info to send to getImage script
        reqs = [];
        for (i = 0; i < dataset.parameters.length; i++) {
            req = {
                "catalog_v": catalog_v,
                "projection": actvProjection,
                "datasetId": actvDatasetId,
                "entryId": entry["entryId"],
                "parameter": dataset.parameters[i]["name"],
                "time": actvTime,
                "tab": actvSubname,
                "colorBar": dataset.parameters[i]["colorbar"]["query"]
            };
            reqs.push(req);
        } //End par for
        // we need this update url because we are only tracking active parameters in the url, no where else
        // this may change when we start 'remembering parameters' for toggling back and forth between 
        // daily and monthly versions of the non-default parameter

        urlUpdates = {
            'newSubname':actvSubname
            }

        updateUrl(urlUpdates);

        //updateUrl(actvSubname, actvParameters, actvTime, actvProjection, actvColorBar);
        callPython(reqs);
    });

    actvDatasetId = getActive("datasetid");
    calEl = "#" + actvDatasetId + "-datetimepicker";
    //console.log(calEl);

    $(".calendar").on("dp.change", function (e) {
        // check to make sure it was the calendar for the active dataset
        // if not ignore the change, it's just the setting up of the other calendars
        actvDatasetId = getActive("datasetid");
        actvCalEl = actvDatasetId+"-datetimepicker"
        if (e.target.id !== actvCalEl){
            console.log('not this calendar')
        } else {
            $(".calendar").attr("disabled", "disabled");
            $(".calendar a").attr("disabled", "disabled");
            console.log('time changed in calendar');
            console.log(e.target.id)
            dateFromDp = e.date;
            dateFromDpIso = dateFromDp.toISOString();
            actvTime = dateFromDp.utc().format();
            actvSubname = getActive("dataset"); 
            // all from url
            
            dataset = getDatasetInfoById(actvDatasetId);
            actvParameters = getActive("var");
            actvProjection = getActive("proj");
            actvColorBar = getActive("colorBar");

            urlUpdates = {
            'newTime': actvTime
            }
            console.log(actvParameters)
        console.log("Updating Time in Url")
        updateUrl(urlUpdates);

            //updateUrl(actvSubname, actvParameters, actvTime, actvProjection, actvColorBar); // update the url
            // check for initial load
            if (e.oldDate) {
                // make sure date was actually changed
                if (e.date !== e.oldDate) {
                    reqs = [];
                    // Create the info to send to getImage script
                    for (i = 0; i < dataset.parameters.length; i++) {
                        req = {
                            "catalog_v": catalog_v,
                            "projection": actvProjection,
                            "datasetId": actvDatasetId,
                            "entryId": entry["entryId"],
                            "parameter": dataset.parameters[i]["name"],
                            "time": actvTime,
                            "tab": actvSubname,
                            "colorBar": dataset.parameters[i]["colorbar"]["query"]
                        };
                        reqs.push(req);
                    }
                    console.log(reqs);
                    callPython(reqs);
                }
            }
        }
        
    });

    /**
     * PROJECTION Click Function - from button
     * Change projection
     **/
    $(".map-projection li").click(function () {

        console.log("PROJECTION BUTTON CLICKED");
        // change map settings
        // dataset info stays the same 
        // working towards keeping the parameter the same here too, need to add that in April

        if (typeof polygon != "undefined") {
            console.log("saving last polygon");
            console.log(polygon);
            console.log(epointList);
            prevProjPoly = polygon;
            prevProjPolyPoints = epointList;
            remadepolygon = L.polygon(epointList); //.addTo(map);
        }

        var i;

        actvSubname = getActive("dataset");
        actvDatasetId = getActive("datasetid");

        // Get dataset info from metadata
        dataset = getDatasetInfoById(actvDatasetId);

        //clear all buttons then set this projection button to active
        $(".map-projection li.active").removeClass("active");
        $(this).addClass("active");

        // Set active projection
        var actvProjBtn = $(".map-projection li.active");
        var actvProjection = actvProjBtn.attr("id");
        actvCrs = crsLookup[actvProjection];

        actvSubname = getActive("dataset");
        actvDatasetId = getActive("datasetid");
        actvTime = getActive("time");

        //console.log(actvTime)
        actvColorBar = getActive("colorBar");

        actvParameters = getActive("var");
        //console.log(actvParameters)

        console.log(" - clearing all existing layers");
        // Clear active map image
        map.clearLayers();
        // Clear overlays in layer control
        clearLayerControlOverlays(); // Think I can remove this
        console.log(map);

        //Set new default parameter
        if (actvParameters == "") {
            console.log(" - SET PARAMETER (AS 1ST PARAMETER)"); // - SST, ice concentration...
            // to do: change to use previous if exists
            for (i = 0; i < dataset.parameters.length; i++) {
                parameter = dataset.parameters[i]["name"];
                if (i == 0) {
                    actvParameters = parameter;
                    break;
                }
            }
        }
        //console.log(actvParameters)

        //Update the map view
        console.log("updating map state");
        if (actvCrs == "EPSG:3413") {
            // Arctic
            $(".mapWrap ").removeClass("not-square"); // apply css that keeps the polar maps equal aspect ratio
            map.options.crs = projDefs[actvCrs];
            //console.log(initialBoundsList[actvCrs])
            map.setMaxBounds(initialBoundsList["EPSG:4326"]);
            var center = [90, 0];
            map._resetView(center, 0, true);
            //console.log(epsg3413BasemapInfo)//[0]["boundsProjected"][0][0]
            map.invalidateSize(); // to make sure the map takes the new aspect ratio
            //map.fitBounds(initialBoundsList[actvCrs])

        } else if (actvCrs == "EPSG:3031") {
            // Arctic
            $(".mapWrap ").removeClass("not-square"); // apply css that keeps the polar maps equal aspect ratio 
            map.options.crs = projDefs["EPSG:3031"];
            //var center = [-90, 0];
            map.setMaxBounds(initialBoundsList[actvCrs]);
            map.fitBounds(initialBoundsList[actvCrs]);
            //map._resetView(center, 1, true);

            map.invalidateSize();
        } else if (actvCrs == "EPSG:4326") {
            // Global
            $(".mapWrap ").removeClass("not-square"); // apply css that changes the aspect ratio to closer to the 4326 ratio
            $(".mapWrap ").addClass("not-square");
            map.invalidateSize();
            map.options.crs = projDefs["EPSG:4326"];
            var center = [0, 0];
            map.setMaxBounds(initialBoundsList[actvCrs]);
            map._resetView(center, 1, true);
            // to do : will want to get the bounds of the erddap base layer and use those to set max bounds
            //console.log(initialBoundsList[actvCrs])
            //console.log(map.getBounds())
            map.setMaxBounds(initialBoundsList[actvCrs]);
            map.invalidateSize();
        }
        urlUpdates = {
            'newProj': actvProjection
        }
        updateUrl(urlUpdates);
        //updateUrl(actvSubname, actvParameters, actvTime, actvProjection, actvColorBar);
        console.log(pageLoad)
        // call python with the new info
        // get new images in new projection
        if (pageLoad) {
            // don't call python here, it's called right after this on click

            //if (pageLoad == 0){
            //update new request to have the new projection
            //    for ( i = 0; i < reqs.length; i++ ) { 
            //      req = reqs[i]
            //      req["projection"] = actvProjection
            //    }
            //    console.log('calling python from projection onclick')
            //    callPython(reqs)
            //}
        } else {
            //call python here
            reqs = [];
            //console.log(actvProjection)
            //console.log(actvDatasetId)
            console.log(actvParameters);
            //console.log(actvTime)
            //console.log(actvSubname)
            //console.log(dataset)
            // Create the info to send to getImage script
            for (i = 0; i < dataset.parameters.length; i++) {
                req = {
                    "catalog_v": catalog_v,
                    "projection": actvProjection,
                    "datasetId": actvDatasetId,
                    "entryId": entry["entryId"],
                    "parameter": dataset.parameters[i]["name"],
                    "time": actvTime,
                    "tab": actvSubname,
                    "colorBar": dataset.parameters[i]["colorbar"]["query"]
                };
                reqs.push(req);
            }
            callPython(reqs);
        }
    }); // end change projection


    function aBetterAntimeridianLat(latLngA, latLngB) {
        if (latLngA.lat > latLngB.lat) {
            var temp = latLngA;
            latLngA = latLngB;
            latLngB = temp;
        }
        lat0 = latLngA.lat;
        lon0 = latLngA.lng;
        lat1 = latLngB.lat;
        lon1 = latLngB.lng;

        console.log(lat0);

        //console.log(lon0)

        console.log(lat1);
        //console.log(lon1)

        x0 = Math.cos(lon0) * Math.sin(lat0);
        y0 = Math.sin(lon0) * Math.sin(lat0);
        z0 = Math.cos(lat0);

        x1 = Math.cos(lon1) * Math.sin(lat1);
        y1 = Math.sin(lon1) * Math.sin(lat1);
        z1 = Math.cos(lat1);

        t = y1 / (y1 - y0);

        x = t * x0 + (1 - t) * x1;
        y = 0;
        z = t * z0 + (1 - t) * z1;

        //console.log(x)
        //console.log(y)
        //console.log(z)

        lat2 = Math.atan(z / x);
        console.log(lat2);
        console.log(90 - Math.abs(lat2));
    }

    /**
     * Download This Click Function - from button
     * sends info to download form
     * captures spatial extent from either map bounds or polygon bounds (if there is one)
     * captures time
     * captures dataset
     * captures variable
     * may need to capture cbar info too?
     **/
    $(".goToDownloadBtn").click(function () {

        // Check to see if there is a ploygon
        // ...

        // If no polygon on map already, use whole map bounds
        // get extent in lat/lon for erddap request

        mapBounds = map.getBounds();
        console.log(mapBounds);

        // This needs to become part of the projection onclick routine
        // need to have a check somewhere to see if there is an existing polygon
        // if so save the points before removing it from the display
        // recreate a representation of that polygon in the new projection
        // there are routines that seem to do this well with raster data
        // "warping", but perhaps not vector data? Will need to do more 
        // testing on that in vbox now that I have a polygon that 
        // respresents the extent in the flat projection

        if (typeof prevProjPoly != "undefined") {
            console.log("adding previos poly to this map");
            console.log(prevProjPolyPoints);
            remadepolygon = L.polygon(prevProjPolyPoints); //.addTo(map);
            console.log(remadepolygon);
        }

        //console.log(reqs[0]["projection"])
        //console.log(proj4defs)
        //console.log(getProj4Key[reqs[0]["projection"]])

        // Do special stuff if its a polar projected map
        console.log(reqs[0]["projection"]);
        if (reqs[0]["projection"] == "epsg3413" || reqs[0]["projection"] == "epsg3031") {
            console.log(reqs[0]["projection"]);
            var latlonProj4Str = proj4defs["EPSG:4326"]; // Projection of Leaflet getBounds() and the projection for ERDDAP        
            var mapProj4Str = proj4defs[getProj4Key[reqs[0]["projection"]]]; // Projection for current Map
            console.log(mapProj4Str);

            tr = {
                "lat": mapBounds._northEast.lat,
                "lon": mapBounds._northEast.lng
            };
            ll = {
                "lat": mapBounds._southWest.lat,
                "lon": mapBounds._southWest.lng
                // Get projected coordinates of the bounds and add to coordinate object
                // Proj4 uses order lon, lat 
            };tr_projCoords = proj4(latlonProj4Str, mapProj4Str, [mapBounds._northEast.lng, mapBounds._northEast.lat]);
            tr["x"] = tr_projCoords[0];
            tr["y"] = tr_projCoords[1];
            ll_projCoords = proj4(latlonProj4Str, mapProj4Str, [mapBounds._southWest.lng, mapBounds._southWest.lat]);
            ll["x"] = ll_projCoords[0];
            ll["y"] = ll_projCoords[1];

            // Calculate the other corners of the map
            // Other corners in projected coordinates
            tl_projCoords = [ll.x, tr.y];
            tl = {
                "x": tl_projCoords[0],
                "y": tl_projCoords[1]
            };
            lr_projCoords = [tr.x, ll.y];
            lr = {
                "x": lr_projCoords[0],
                "y": lr_projCoords[1]
                // Get lat/lon of other corners
                // Convert to back to lat and lon
            };tl_lonlat = proj4(mapProj4Str, latlonProj4Str, [ll.x, tr.y]);
            lr_lonlat = proj4(mapProj4Str, latlonProj4Str, [tr.x, ll.y]); //Convert to back to lat and lon
            tl.lon = tl_lonlat[0];
            tl.lat = tl_lonlat[1];
            lr.lon = lr_lonlat[0];
            lr.lat = lr_lonlat[1];

            // Show markers on the map where the points for the calculated corners are
            var trmarker = L.marker([tr.lat, tr.lon]); //.addTo(map);
            var llmarker = L.marker([ll.lat, ll.lon]); //.addTo(map);
            var tlmarker = L.marker([tl.lat, tl.lon]); //.addTo(map);
            var lrmarker = L.marker([lr.lat, lr.lon]); //.addTo(map);

            // Create a polygon with those points
            // Those points are not the information needed for ERDDAP
            // because they do not represent the min/max latitude and longitude
            // They represent the min/max projected coordinated
            // When reprojecting to lat/lon they are no longer mins and maxs
            // if the area crosses the antimeridian or if it covers the pole
            // In part creating to conceptualize/test how this will work with a drawn polygon
            // and to see how to generate the info needed for ERDDAP

            var myPointList = [[tl.lat, tl.lon], [tr.lat, tr.lon], [lr.lat, lr.lon], [ll.lat, ll.lon]];

            console.log(myPointList);

            initialPolygon = new L.Polygon(myPointList, {
                color: "red",
                weight: 3,
                opacity: 0.5,
                smoothFactor: 1,
                noWrap: true
            });
            //initialPolygon.addTo(map);
            console.log(initialPolygon);

            // Now we work in projected space to see if the polygon crosses the pole
            // if it does, add points at the ends (or antimeridian if applicable) to connect it to the pole

            // Make a list of the projected coordinates
            var projectedPointList = [];
            for (i = 0; i < myPointList.length; i++) {
                thisPointLon = myPointList[i][1];
                thisPointLat = myPointList[i][0];
                var projCoords = proj4(latlonProj4Str, mapProj4Str, [thisPointLon, thisPointLat]);
                projectedPointList.push(projCoords);
            }
            console.log(projectedPointList);

            // Check for point in polygon with projected point list
            // algorithm has known errors if the point is exactly on the edge of the polygon
            // pole is always [0,0] whether N or S, because we are working in projected space
            console.log("Check if polygon contains pole:");

            var polyContainsPole = pip([0, 0], projectedPointList);
            console.log(polyContainsPole);

            // To get appropriate bounds for erddap longitude we need 
            // to know if polygon crosses the antimeridian
            // if it crosses add a point in the point list at the 
            // antimeridian intersection to represent the min and max longitude
            // To do this, for each segment in the polygon test to see if 
            // the segment crosses the antimeridian
            // Using function from Leaflet.Antimeridian plugin
            // isCrossMeridian(latLngA, latLngB)

            pointListWithAntimeridian = [];
            needsSplitting = 0;

            // For each point in the initial polygon 
            for (i = 0; i < myPointList.length; i++) {
                console.log(i);
                // Create the segments
                if (i < myPointList.length - 1) {
                    // connect this point to next point to create segment
                    var latLngA = new L.latLng(myPointList[i]);
                    var latLngB = new L.latLng(myPointList[i + 1]);
                } else {
                    // connect this last point to the first point for last segment
                    var latLngA = new L.latLng(myPointList[i]);
                    var latLngB = new L.latLng(myPointList[0]);
                }
                // Test the segment for crossing the meridian/antimeridian
                // This will need checks and balances
                // my current extent ends exactly on the antimeridian at -180
                // what happens if no points are ON the line
                // why is it not catching the meridian itself like it is supposed to
                console.log(latLngA);
                console.log(latLngB);
                xM = L.Wrapped.isCrossMeridian(latLngA, latLngB);
                
                xAM = Math.abs(latLngA.lng - latLngB.lng) >= 180;
                if (xAM) {
                    // If the segement crosses the antimeridian
                    console.log("Crosses the antimeridian at this segment");
                    // add current starting point to the growing point list
                    pointListWithAntimeridian.push(myPointList[i]);
                    //console.log(xM)
                    //console.log(latLngA)
                    // at antimeridian need to know if a point is needed at the minimum 
                    // or at the maximum and where exactly to put it in the list
                    lonIncreasing = latLngA.lng - latLngB.lng > 0;
                    console.log(lonIncreasing);

                    // Test to see if we also need to add points at the north/south pole
                    // Add polygon point at antimeridian
                    // First Calculate Latitude at which polygon segment crosses the antimeridia
                    // Then insert that point into the polygon
                    xM_lat = L.Wrapped.calculateAntimeridianLat(latLngA, latLngB);

                    console.log(xM_lat);
                    xmlatstr = xM_lat.toString();
                    console.log(xmlatstr.indexOf("."));
                    xM_lat = parseFloat(xmlatstr.slice(0, xmlatstr.indexOf(".") + 5));
                    aBetterAntimeridianLat(latLngA, latLngB);
                    xM_point1 = [xM_lat, -180];
                    xM_point2 = [xM_lat, 180]; // its ok to do this because these points are just for erddap and for my map view

                    if (polyContainsPole) {
                        console.log("Making a 360 degree polygon that ends at antimeridian");
                        if (lonIncreasing) {
                            pointListWithAntimeridian.push([xM_lat, 180]); // add new point at the maximum lon
                            // if contains pole also add points for the pole
                            if (polyContainsPole) {
                                pointListWithAntimeridian.push([89.999, 180]);
                                pointListWithAntimeridian.push([89.999, -180]);
                            }
                            pointListWithAntimeridian.push([xM_lat, -180]); // add new point at the minimum lon
                        } else {
                            // segment vertex point could alreadybe on the antimeridian 
                            // dont duplicate if already has value at this lon
                            if ([xM_lat, -180] !== myPointList[i]) {
                                pointListWithAntimeridian.push([xM_lat, -180]); // add new point at the minimum lon
                            }
                            if (polyContainsPole) {
                                pointListWithAntimeridian.push([89.999, -180]);
                                pointListWithAntimeridian.push([89.999, 180]);
                            }
                            pointListWithAntimeridian.push([xM_lat, 180]); // add new point at the maximum lon
                        }
                    } else {
                        console.log("making a small polygon (that crosses the antimeridian");
                        needsSplitting = 1;
                        // dont just add points at the antimeridian, break the polygon at this point.
                        // create a point at the antimeridian
                        if (lonIncreasing) {
                            pointListWithAntimeridian.push([xM_lat, 180]); // add new point at the maximum lon
                            pointListWithAntimeridian.push([xM_lat, -180]); // add new point at the minimum lon 
                        } else {
                            // segment vertex point could alreadybe on the antimeridian 
                            // dont duplicate if already has value at this lon
                            if ([xM_lat, -180] !== myPointList[i]) {
                                pointListWithAntimeridian.push([xM_lat, -180]); // add new point at the minimum lon
                            }
                            pointListWithAntimeridian.push([xM_lat, 180]); // add new point at the maximum lon
                        }
                    }
                } else {
                    console.log("segment does not cross the antimeridian");
                    // But may still contain a pole...
                    // !!!!
                    pointListWithAntimeridian.push(myPointList[i]);
                }
            } // polygon created
            console.log(pointListWithAntimeridian);
            console.log(needsSplitting);

            if (needsSplitting == 1) {
                polygonList = [];
                thisPolygon = [];

                positiveP = [];
                negativeP = [];

                // Look at the segments again, see which segement to break the polygon into two
                for (i = 0; i < pointListWithAntimeridian.length; i++) {
                    if (i < pointListWithAntimeridian.length - 1) {
                        // connect this point to next point to create segment
                        var latLngA = new L.latLng(pointListWithAntimeridian[i]);
                        var latLngB = new L.latLng(pointListWithAntimeridian[i + 1]);
                    } else {
                        // connect this last point to the first point for last segment
                        var latLngA = new L.latLng(pointListWithAntimeridian[i]);
                        var latLngB = new L.latLng(pointListWithAntimeridian[0]);
                    }

                    if (latLngA.lng > 0) {
                        //add to positive side poly
                        positiveP.push([latLngA.lat, latLngA.lng]);
                    } else {
                        negativeP.push([latLngA.lat, latLngA.lng]);
                    }

                    segEndsOnAM = latLngB.lng == 180 || latLngB.lng == -180;

                    console.log(latLngB.lng);

                    if (segEndsOnAM) {
                        // If the segement crosses the antimeridian
                        //console.log("Segment ends on the antimeridian ")
                        //thisPolygon.push(latLngA) // add start of segment
                    } else {
                            //console.log("segment doesn't end on antimeridian")
                            //thisPolygon.push(latLngA) // add start of segment
                        }
                }

                negPolygon = new L.Polygon(negativeP, {
                    color: "black",
                    weight: 3,
                    opacity: 0.9,
                    smoothFactor: 1,
                    noWrap: true
                });
                //negPolygon.addTo(map);
                console.log(negPolygon.getBounds());

                posPolygon = new L.Polygon(positiveP, {
                    color: "red",
                    weight: 3,
                    opacity: 0.9,
                    smoothFactor: 1,
                    noWrap: true
                });
                console.log(posPolygon.getBounds());
                posPolygon; //.addTo(map);
            }

            // if contains pole our polygon extends all the way to 90 degrees north
            // but the vertices don't reflect that
            // so add those extra polygon vertices at the start and end of the 
            // polygon to extend it all the way to the north or south
            // will need to use projection info to determine whether to use 90 or -90
            // hardcoding for test
            /*
            // Can still use this if there are no segments that cross the antimeridian?
            if (polyContainsPole) {
                firstpoint = pointListWithAntimeridian[0]
                lastpoint = pointListWithAntimeridian[pointListWithAntimeridian.length - 1]
                //console.log(firstpoint)
                //console.log(lastpoint)
                newFirstPoint = [89.999999, firstpoint[1]]
                newLastPoint = [89.9999, lastpoint[1]]
                pointListWithAntimeridian.unshift(newFirstPoint) // add to beginning
                pointListWithAntimeridian.push(newLastPoint) // add to end
            }
            */
            // Confirm that this polygon looks the same as the direct bounds ploygon
            fullPolygon = new L.Polygon(pointListWithAntimeridian, {
                color: "green",
                weight: 3,
                opacity: 0.9,
                smoothFactor: 1,
                noWrap: true
            });
            //fullPolygon.addTo(map);
            console.log(fullPolygon);

            varsForERDDAP = getActive("var");
            timeForERDDAP = getActive("time");
            datasetForERDDAP = getActive("dataset");

            requests = [];

            // Create the request for the extent of the request
            // if crosses antimeridian produce the request for the large download
            boundsForERDDAP = fullPolygon.getBounds();
            console.log(boundsForERDDAP);

            latMax = boundsForERDDAP._northEast.lat;
            latMax = setDecimalsString(latMax, 5);

            latMin = boundsForERDDAP._southWest.lat;
            latMin = setDecimalsString(latMin, 5);

            lonMax = boundsForERDDAP._northEast.lng;
            lonMax = setDecimalsString(lonMax, 5);

            lonMin = boundsForERDDAP._southWest.lng;
            lonMin = setDecimalsString(lonMin, 5);

            thisQueryString = "?dataset=" + datasetForERDDAP + "&var=" + varsForERDDAP + "&maxLat=" + latMax + "&minLat=" + latMin + "&maxLon=" + lonMax + "&minLon=" + lonMin + "&minTime=" + timeForERDDAP + "&maxTime=" + timeForERDDAP;
            console.log(thisQueryString);
            requests.push(thisQueryString);

            // Now if crosses antimeridian also create the two requests for the smaller download (not full 360)
            // will likely not use it in the future in the hopes that
            // there will be a solution for requesting these areas with one request from ERDDAP
            // by creating a zero to 360 dataset that doesn't have the antimeridian discontinuity

            if (needsSplitting == 1) {

                boundsForERDDAP = posPolygon.getBounds();
                console.log(boundsForERDDAP);

                latMax = boundsForERDDAP._northEast.lat;
                latMax = setDecimalsString(latMax, 5);

                latMin = boundsForERDDAP._southWest.lat;
                latMin = setDecimalsString(latMin, 5);

                lonMax = boundsForERDDAP._northEast.lng;
                lonMax = setDecimalsString(lonMax, 5);

                lonMin = boundsForERDDAP._southWest.lng;
                lonMin = setDecimalsString(lonMin, 5);

                thisQueryString = "?dataset=" + datasetForERDDAP + "&var=" + varsForERDDAP + "&maxLat=" + latMax + "&minLat=" + latMin + "&maxLon=" + lonMax + "&minLon=" + lonMin + "&minTime=" + timeForERDDAP + "&maxTime=" + timeForERDDAP;
                //console.log(thisQueryString)

                requests.push(thisQueryString);
                boundsForERDDAP = negPolygon.getBounds();

                latMax = boundsForERDDAP._northEast.lat;
                latMax = setDecimalsString(latMax, 5);

                latMin = boundsForERDDAP._southWest.lat;
                latMin = setDecimalsString(latMin, 5);

                lonMax = boundsForERDDAP._northEast.lng;
                lonMax = setDecimalsString(lonMax, 5);

                lonMin = boundsForERDDAP._southWest.lng;
                lonMin = setDecimalsString(lonMin, 5);

                thisQueryString = "?dataset=" + datasetForERDDAP + "&var=" + varsForERDDAP + "&maxLat=" + latMax + "&minLat=" + latMin + "&maxLon=" + lonMax + "&minLon=" + lonMin + "&minTime=" + timeForERDDAP + "&maxTime=" + timeForERDDAP;

                requests.push(thisQueryString);
            }
            console.log(requests);

            pnl = window.location.pathname.split("/");
            downloadPageUrlRoot = window.location.protocol + "//" + window.location.host + "/" + pnl[1] + "/" + pnl[2] + "/download/";

            if (requests.length == 1) {
                for (i = 0; i < requests.length; i++) {
                    //console.log(requests[i])
                    pnl = window.location.pathname.split("/");
                    downloadPageUrl = downloadPageUrlRoot + requests[i];
                    console.log(downloadPageUrl);
                    //window.open(downloadPageUrl, "_blank", "true");
                    window.open(downloadPageUrl, "_self", "true");
                }
            } else if (requests.length == 3) {
                // Show Modal
                $("#downloadConfModal").modal("show");

                $(".download-all-btn").attr("href", downloadPageUrlRoot + requests[0]);
                $(".download-1-btn").attr("href", downloadPageUrlRoot + requests[1]);
                $(".download-2-btn").attr("href", downloadPageUrlRoot + requests[2]);
            } else {
                console.log("SOMETHINGS UP WITH REQUESTS LENGTH");
                console.log(requests.length);
            }
            //to do reducre decimal place on calculated lats

            //pathnameList = window.location.pathname.split('/')
            //downloadPageUrl = window.location.protocol +"//"+window.location.host +'/'+ pathnameList[1]+'/'+pathnameList[2]+'/download/'+thisQueryString
            //console.log(downloadPageUrl)
            //window.open(downloadPageUrl, "_target");

            //console.log(pointListWithAntimeridian)

            // This polygon will only make sense in 4326
            polygonPoints = [];
            // create the lat,lon points for the wrapped polygon
            for (i = 0; i < pointListWithAntimeridian.length; i++) {
                //console.log(pointListWithAntimeridian[i])
                thisPoint = new L.LatLng(pointListWithAntimeridian[i][0], pointListWithAntimeridian[i][1]);
                //console.log(thisPoint)
                polygonPoints.push(thisPoint);
            }
            //console.log(polygonPoints)

            // console.log(map.distance(myPointList[0],myPointList[1]))
            //        console.log(map.distance(myPointList[1],myPointList[2]))
            //        console.log(map.distance(myPointList[2],myPointList[3]))
            //        console.log(map.distance(myPointList[3],myPointList[0]))

            //        console.log(map.distance(projected_pointList[0],projected_pointList[1]))
            //        console.log(map.distance(projected_pointList[1],projected_pointList[2]))
            //        console.log(map.distance(projected_pointList[2],projected_pointList[3]))
            //        console.log(map.distance(projected_pointList[3],projected_pointList[0]))

            //var polygon = L.polygon(myPointList).addTo(map);

            // Test getting mins in projected coords
            boundsList = [tl, tr, lr, ll];
            xList = [];
            yList = [];
            for (i in boundsList) {
                xList.push(boundsList[i]["x"]);
                yList.push(boundsList[i]["y"]);
            }

            x_max = Math.max.apply(Math, xList);
            x_min = Math.min.apply(Math, xList);

            y_max = Math.max.apply(Math, yList);
            y_min = Math.min.apply(Math, yList);

            // Now convert these minimums and maximums to a lat lon box for erddap - again in lon lat order here

            etl_lonlat = proj4(mapProj4Str, latlonProj4Str, [x_min, y_max]); // ymax and xmin
            etr_lonlat = proj4(mapProj4Str, latlonProj4Str, [x_max, y_max]); // ymax and xmax
            elr_lonlat = proj4(mapProj4Str, latlonProj4Str, [x_max, y_min]); // ymin xmax
            ell_lonlat = proj4(mapProj4Str, latlonProj4Str, [x_min, y_min]); // ymin xmin

            console.log(etl_lonlat);
            etl = {
                "lon": etl_lonlat[0],
                "lat": etl_lonlat[1]
            };
            etr = {
                "lon": etr_lonlat[0],
                "lat": etr_lonlat[1]
            };
            elr = {
                "lon": elr_lonlat[0],
                "lat": elr_lonlat[1]
            };
            ell = {
                "lon": ell_lonlat[0],
                "lat": ell_lonlat[1]
            };

            ebox = [etl, etr, elr, ell];

            epointList = [[etl.lat, etl.lon], [etr.lat, etr.lon], [elr.lat, elr.lon], [ell.lat, ell.lon]];

            // map var is the same for different projections (just changing map settings)
            // on projection change need to remove the polygon for this projection and create a new one?
            //polygon = L.polygon(epointList).addTo(map);
            //console.log('adding polygon')
            //console.log(polygon)
            //console.log(JSON.stringify(polygon.toGeoJSON()));
            console.log(epointList);
            console.log(map);
            var etrmarker = L.marker([etr.lat, etr.lon]); //.addTo(map);
            var ellmarker = L.marker([ell.lat, ell.lon]); //.addTo(map);
            var etlmarker = L.marker([etl.lat, etl.lon]); //.addTo(map);
            var elrmarker = L.marker([elr.lat, elr.lon]); //.addTo(map);

            //console.log(etr)
            //console.log(etl)
            //console.log(elr)
            //console.log(ell)

            // Check for passing the antimeridian

            //elons = [etl.lon, etr.lon,elr.lon, ell.lon]

            // clockwise
            // compare thislon to next lon, if there is a jump fr

            // create coordinate bounds for errdap (bounding box object)
            errdapCoords = {
                "minLon": ell.lon,
                "maxLon": etr.lon,
                "minLat": ell.lat,
                "maxLat": etr.lat
                //console.log(errdapCoords)

            };
        }
    });
});