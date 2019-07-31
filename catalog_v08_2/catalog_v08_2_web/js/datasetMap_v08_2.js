
var catalog_v = "catalogv08_2";
var production = 0;

if (production == 1) {
    catalog_v = "catalog";
}

var getProj4Key = {
    "epsg4326": "EPSG:4326",
    "epsg3031": "EPSG:3031",
    "epsg3413": "EPSG:3413"
};

// adding todays date to image request and filename to help with cached image issues
// this will force making a new image and using the new image if images are more than a day old
// will have a separate script that cleans them up
               
cache_date = new Date();
var dd = cache_date.getDate();
var mm = cache_date.getMonth(); //January is 0!
var yyyy = cache_date.getFullYear();
cache_date = yyyy.toString() +mm.toString()+dd.toString()
//console.log(cache_date)
/*
 * dataset index.html from python CALLs THIS on load
 * loads catalog.json file and calls mapData
*/

console.log('PAGE LOAD - reading entry info from JSON')
var jqxhr = $.getJSON("../../config/catalog.json", {}).done(function () {
    data = jqxhr.responseJSON;
    console.log(data);
    locationArray = window.location.pathname.split("/");
    entryName = locationArray[2];
    // Get info from page config info from loadJson
    entry = getEntry(entryName, data);
    console.log(entry);
    // Set active dataset tab

    if (typeof entry != "undefined") {
        $(document).ready(function () {
            try {
                createMap(entry);
            } catch (err) {
                console.log(err)
                console.log("Error in createMap()")
                $(".mapArea").html('<div class="dataUnavailble">Sorry, this dataset is not currently available. Attempting to load the next composite. </div>');//We could not access data from the data provider. (applies any time a dataset is missing from errdap)
                
                
                
                console.log('here')
            }
        });
    } else {
        console.log("Error Entry undefined")
        $(".mapArea").html("Sorry, this entry is not currently available. ");//We could not access data from the data provider. (applies any time a dataset is missing from errdap)
    }
}).fail(function () {
    console.log("error fetching metadata, cant populate page");
    $(".mapArea").html("Error: Could not access dataset metadata");
});


function myajaxrequest(fromPyFn) {
    
    console.log('trying to open json')
    console.log(fromPyFn)
    fullUrl = "https://polarwatch.noaa.gov" + fromPyFn
    $.ajax({
        url:fullUrl,
        datatype:"json",
        type:"GET",
        tryCount: 0,
        retryLimit: 3,
        success: function(json) {
            console.log("Test function Successful")
        },
        error: function (xhr, textStatus, errorThrown) {
            //console.log(xhr)
            console.log(textStatus)
            console.log(errorThrown)
            this.tryCount++;
            console.log(this.tryCount)
            if (this.tryCount <= this.retryLimit){
                $.ajax(this);
                return;
            }
        } 
    })
}

function makeLayer(req) {    
    
    console.log('start of makeLayer')

    //setTimeout(function(){ 
    //    console.log("After 5 seconds!");

    var thisReq = req // required because of async/scope
    var imageDir = "/map_images/" + catalog_v + "/" + thisReq["entryId"] + "/" + thisReq["ds_id"] + "/";
    var fromPyFn = imageDir + thisReq["parameter"] + "_" + thisReq["projection"] + "_" + timep + "_" + thisReq["cache_date"]+".json";
    
    // perhaps second ajax call is still loading the response from the first call 
    // which is just meant to check/verify if a file has been created
    // see if adapting to a ure ajax call helps

    //Test pure aja call to same file:

    //myajaxrequest(fromPyFn)

    //$.getJSON(fromPyFn, {

    $.ajax({
        url:fromPyFn,
        datatype:"json",
        type:"GET",
        tryCount: 0,
        retryLimit: 3,

    }).fail(function () {
        console.log("DID NOT GET IMAGE DETAILS");
        console.log(fromPyFn)
        $(".loader-wrap").addClass("hidden");
        $(".loader-text").html("<p>Error. Could not make layer.<p>");
        //add a display message to the user that the requested image could not be generated
        console.log('makeLayer() End')
    }).done(function (imgInfo) {
        //console.log("got image details successfully")
        //console.log(imgInfo)
        // Get the image ready for adding to the map
        // Get the image bounds
        try {
            //console.log('Able to open image info file')
            //console.log(imgInfo)
            var bound0 = imgInfo["boundsProjected"][0][0];
            var bound1 = imgInfo["boundsProjected"][1][1];
            var bound2 = imgInfo["boundsProjected"][3][0];
            var bound3 = imgInfo["boundsProjected"][3][1];
            //console.log(imgInfo["boundsLeaflet"][0])
            var imageBounds = L.bounds([[bound0, bound1], [bound2, bound3]]);
            //console.log(imageBounds)

            // Get the location of the image because this is async...
            var imageDir = "/map_images/" + catalog_v + "/" + thisReq["entryId"] + "/" + thisReq["ds_id"] + "/";
            var overlayName = imgInfo["parameter"] + "_" + imgInfo["projection"] + "_" + imgInfo["timep"];
            var overlayFn = imageDir + overlayName + "_" + thisReq["cache_date"] + ".png";

            // Set the name of the image layer for the layer control
            var overlayDisplayName = imgInfo["parameter"];

            //console.log(overlayFn)
            //console.log(map)
            //console.log(map.getPixelBounds())
            //console.log(map.getPixelWorldBounds())

            // Make the layer (but don't add it to the map)
            var myLayer = L.Proj.imageOverlay(overlayFn, imageBounds);

            // Add CRS field
            imgInfo["crs"] = crsLookup[imgInfo["projection"]];
            a_crs = imgInfo["crs"]
            if (typeof entry_lyrs[a_crs] != "undefined") {
                //console.log("exists")
            } else {
                entry_lyrs[a_crs] = {};
                entry_lyrs[a_crs]["overlayDetails"] = {};
            }

            //console.log(imgInfo)

            // Put info into layer tracker object                
            entry_lyrs[a_crs]["overlayDetails"][overlayName] = { "overlayName": overlayName };
            entry_lyrs[a_crs]["overlayDetails"][overlayName]["overlayDisplayName"] = overlayDisplayName;
            entry_lyrs[a_crs]["overlayDetails"][overlayName]["projection"] = a_crs;
            entry_lyrs[a_crs]["overlayDetails"][overlayName]["ds_id"] = imgInfo["dataset_id"];
            entry_lyrs[a_crs]["overlayDetails"][overlayName]["parameter"] = imgInfo["parameter"];
            entry_lyrs[a_crs]["overlayDetails"][overlayName]["subname"] = imgInfo["tab"];
            entry_lyrs[a_crs]["overlayDetails"][overlayName]["time"] = imgInfo["timep"];
            entry_lyrs[a_crs]["overlayDetails"][overlayName][overlayName] = myLayer;

            // Update the map display
            console.log('FROM makeLayer()- CALLING UPDATE LAYER DISPLAY')
            updateLayerDisplay(imgInfo);
            $(".time-prev-btn").removeAttr("disabled");
            $(".time-next-btn").removeAttr("disabled");
            $(".time-latest-btn").removeAttr("disabled");
            $(".calendar").removeAttr("disabled", "disabled");
            $(".calendar a").removeAttr("disabled", "disabled");
        } catch (err) {
            $(".loader").addClass("hidden");
            $(".loader-text").html("Error while making data layer");
            console.log(err)
        }
        console.log('makeLayer() End')
    });

    //}, 5000);
    
}
/*
 * Lookup Entry Info Based on Page Url
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
    timesplit = a_time.split("_");
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

function updateMapState() {
    // Update the map view
    // Projections available for global datasets are 3413, 3031, 4326
    // Projections available for projected datasets (??)
    console.log("updating map state");
    
    if (a_crs == "EPSG:3413") {
        //console.log('Arctic Map')
        // Arctic
        $(".mapWrap ").removeClass("not-square"); // apply css that keeps the polar maps equal aspect ratio
        //console.log('--------')
        ///console.log(map.getMinZoom())
        //console.log(map.getMaxZoom())
        //console.log(map.getZoom())
        //console.log(map.getBounds())
        //console.log('--------')
        // Reset the projection of the map
        map.options.crs = projDefs[a_crs];

        //console.log(map.getMinZoom())
        //console.log(map.getMaxZoom())
        //c/onsole.log(map.getZoom())
        //console.log(map.getBounds())
        //console.log('--------')
        //console.log(initialBoundsList[a_crs])
        //map.setMaxBounds(initialBoundsList["EPSG:4326"]);
        //console.log(initialBoundsList[a_crs])
        //map.fitBounds([[48.46606914015194, 89.87517279115114],[48.46606914015194, -89.87517279115114]])
        map.fitBounds(initialBoundsList[a_crs])
        //map.fitWorld() // no effect
        var center = [90, 0];
        //console.log(map.getZoom())
        map._resetView(center, 0, true);
        //map._resetView(map.getCenter(), map.getZoom(), true);
        //console.log(epsg3413BasemapInfo)//[0]["boundsProjected"][0][0]
        map.invalidateSize(); // to make sure the map takes the new aspect ratio
        //console.log('--------')
        //console.log(map.getMinZoom())
        //console.log(map.getMaxZoom())
        //console.log(map.getZoom())
        //console.log(map.getBounds())
        //console.log('--------')

    } else if (a_crs == "EPSG:3031") {
        // Antarctic
        $(".mapWrap ").removeClass("not-square"); // apply css that keeps the polar maps equal aspect ratio 
        map.options.crs = projDefs["EPSG:3031"];
        var center = [-90, 0];
        //map.setMaxBounds(initialBoundsList[a_crs]); // removed because of weird flashing behavior onclick 10/10
        //map.fitBounds(initialBoundsList[a_crs]);
        map._resetView(center, 0, true);
        map.invalidateSize();
    } else if (a_crs == "EPSG:4326") {
        // Global
        $(".mapWrap ").removeClass("not-square"); // apply css that changes the aspect ratio to closer to the 4326 ratio
        $(".mapWrap ").addClass("not-square");
        map.invalidateSize();
        map.options.crs = projDefs["EPSG:4326"];
        var center = [0, 0];
        map.setMaxBounds(initialBoundsList[a_crs]);
        map._resetView(center, 1, true);
        // to do : will want to get the bounds of the erddap base layer and use those to set max bounds
        //console.log(initialBoundsList[a_crs])
        //console.log(map.getBounds())
        map.setMaxBounds(initialBoundsList[a_crs]);
        map.invalidateSize();
    }
    console.log('MAP PROJECTION UPDATED')
}

/*
 * On page load get valid times for all datasets in this entry (from erddap),
 * use to populate calendar for image selection, python writes a json object
 * populate all calendars on page load, return activeTime for first map
 */

function createDatepicker() {
    
    console.log("Starting createDatepickers with ajax call...");
    
    var a = $.getJSON("../timeList.json", {}).done(function () {
    
        console.log("Creating datepicker - Success getting dataset Time list");
    
        var resp = a.responseJSON;
        idateTimes = {};
        entry["calendars"] = [];
        
        // Get current browser timezone offset
        //var browserDate = new Date();
        //var browserOffsetHr = browserDate.getTimezoneOffset() / 60;
    
        // For each dataset on this page, Populate valid dates in repective datepicker
        // First format the dates and store in idateTimes
        
        for (var i = 0; i < entry["datasets"].length; i++) {
    
            var ds_id = entry["datasets"][i]["id"];
            newCalId = ds_id + "-datetimepicker";
    
            for (var j = 0; j < resp["ids"].length; j++) {
    
                // Match calendar id to response's id and add the info to that calendar
                
                if (resp["ids"][j] == ds_id) {
                    // create a calendar list in entry
                    entry["calendars"].push(newCalId); 
                    entry["datasets"][i]["time"]["timeList"] = resp["timeList"][j];
                    var theseTimes = resp["timeList"][j];
                    newCalTimes = [];
                    
                    // create timelist in the date format the calendar needs
                    // bootstrap datetimepicker requires moment js to set times to utc
                    for (var k = 0; k < theseTimes.length; k++) { 
                        newCalTimes.push(moment.utc(theseTimes[k][0]));
                    }
                    //console.log(newCalTimes)
                    
                    newCalEl = "#" + newCalId;
                    
                    // Use dates to populate new picker
                    $(newCalEl).datetimepicker({
                        defaultDate: newCalTimes[newCalTimes.length - 1],
                        enabledDates: newCalTimes,
                        date: newCalTimes[newCalTimes.length - 1],
                        timeZone:'UTC',
                        format:'MM/DD/YYYY HH:mm[Z]'
                    });
                    break;
                }
            }
        }
        console.log("Creating Datepickers finished");
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
        //projmaxY = projBbox[0]
        //projminY = projBbox[2]
        //projmaxX = projBbox[1]
        //projminX = projBbox[3]
        console.log(projBbox[2]);
        infoToPass = {
            "catalog_v": catalog_v,
            "projectionEPSG": "3338",
            "projmaxY": projBbox[0],
            "projminY": projBbox[2],
            "projmaxX": projBbox[1],
            "projminX": projBbox[3]
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

    console.log(" ### In callPython() ### ");
    console.log(reqs);
    
    reqProjection = reqs[0]["projection"];
    $(".loader-wrap").removeClass("hidden");
    $(".loader-text").html("<p>Fetching Data...<p>");
    $(".mapTitleArea").addClass("hidden");
    a_subname = getActive("dataset"); // from url
    a_parameters = getActive("var"); // from url
    a_time = getActive("time"); // from url
    a_projection = getActive("proj"); // from url
    a_colorbar = getActive("colorBar"); // from url
    
    firstActiveParameter = a_parameters.split(',')[0]
    //console.log("these are the url state before the request is made and before the url is updated with new request")
    //console.log(a_subname)
    //console.log(a_parameters)
    //console.log(a_time)
    //console.log(a_projection)
    //console.log(a_colorbar)

    // On page load request inputs is determined from entry metadata
    // on tab click request inputs is determined by user input
    // A request is formed for each dataset and each parameter within that dataset
    // Requests are sent to python
    // When python responds then javascript looks for 
    // the image and the image info returned from python

    console.log("  Number of Requests: " + reqs.length);
    var firstActivePromise =[]
    var promises = [];
    var firstpromise = [];
    promiseList = [];

    // request inputs only has more than one input when
    // there is more than one variable for a dataset (like MUR)
    
    //console.log(firstActiveParameter)
    for (var i = 0; i < reqs.length; i++) {
        var req = reqs[i];
        if (req["parameter"] == firstActiveParameter) {
            firstActiveReq = req;
        }
    }

    // Store requests with dataset
    ds_info = getDatasetInfoById(reqs[0].ds_id);
    ds_info["lastRequest"] = reqs;
       
    reqCrs = crsLookup[reqProjection];
    timep = makeDatePrint(req["time"]);

    // CALL PYTHON VIA PHP
    p1 = performance.now();
    //console.log(Date.now())

    // only call this if needed




    // This ajax created issues when more than one request input. 
    // python now keeps track of intermediate files properly (they are now distinct)
    // 2/7 still experiencing slow loading of datasets (particularly MUR which has four calls)
    // could either adapt python or change so that only one parameter is fetched at a time. 
    // Could also setup some deferreds so that the script continues after the first request without waiting for all requests
    

    postUrl = "/" + catalog_v + "/preview.php";
    console.log(postUrl)
    
    ajax = jQuery.ajax({
        type: "POST",
        url: postUrl,
        data: firstActiveReq,
        success: function success(response) {
            console.log(response);
    
            // Testing to speed up the rendering of the image
            // display first image asap without waiting for other responses to come back
            // generally because the calls are async doesn"t make a huge difference
            // but occassionally one of the calls takes a longer time due to internet vagueries

                
                console.log("**** first active parameter promise returned, making layer")
                //console.log(performance.now() - p1);
                //console.log(req)
                // First response is handled separately
                setTimeout(makeLayer(firstActiveReq, 100));
                    
        },
        error: function error(jqXHR, textStatus, errorThrown) {
            console.log(textStatus, errorThrown);
        }

    });

/*
    post_projected_demo_Url = "/" + catalog_v + "/projected_data_demo.php";
    console.log(post_projected_demo_Url)
    
    ajax = jQuery.ajax({
        type: "POST",
        url: post_projected_demo_Url,
        data: firstActiveReq,
        success: function success(response) {
            console.log(response);
    
            // Testing to speed up the rendering of the image
            // display first image asap without waiting for other responses to come back
            // generally because the calls are async doesn"t make a huge difference
            // but occassionally one of the calls takes a longer time due to internet vagueries

                
                console.log("**** first active parameter promise returned")
                console.log(performance.now() - p1);
                console.log(req)
              
                //setTimeout(makeLayer(firstActiveReq, 10));
                    
        },
        error: function error(jqXHR, textStatus, errorThrown) {
            console.log(textStatus, errorThrown);
        }

    });
*/


    //promises.push(ajax)

    for (var i = 0; i < reqs.length; i++) {

        var nonactivereq = reqs[i];

        if (nonactivereq["parameter"] !== firstActiveParameter) {
        
            reqCrs = crsLookup[reqProjection];
            timep = makeDatePrint(nonactivereq["time"]);

            // CALL PYTHON VIA PHP
            console.log("  calling Python for: " + nonactivereq["ds_id"]);
            p1 = performance.now();
            // This ajax created issues when more than one request input. 
            // python now keeps track of intermediate files properly (they are now distinct)
            // 2/7 still experiencing slow loading of datasets (particularly MUR which has four calls)
            // could either adapt python or change so that only one parameter is fetched at a time. 
            // Could also setup some deferreds so that the script continues after the first request without waiting for all requests
            
            postUrl = "/" + catalog_v + "/preview.php";
            console.log(postUrl)
            
            nonactiveajax = jQuery.ajax({
                type: "POST",
                url: postUrl,
                data: nonactivereq,
                success: function success(response) {
                    console.log(response);
                },
                error: function error(jqXHR, textStatus, errorThrown) {
                    console.log(textStatus, errorThrown);
                }
            });
            promises.push(nonactiveajax);
        }
    }

    // Once all of the promises are returned display the other parameters to the map
    $.when.apply(null, promises).done(function () {

        console.log("AFTER all promises returned - PYTHON COMPLETE.");
        //console.log(" - Clearing all map images");
        // This was previously at the start of this callPython function, 
        // moved here to fix issue with multiple layers being displayed when
        // user clicked a new calendar date before the prior selection was fetched
        // Sep 20, 2018 - noticed remaining issue with hitting any of the other buttons before the first map is done loading.
        // need to make all buttons disabled for that 4 seconds
        
        // Using my own clear layers because of issues with the leaflet provided clear layers 
        // it was impacting other things (url)
        // This Clear both basemaps layers and overlays
        // Added using clearMap var so the url and titles are not updated with every map clearing
        
        //Clear all layers (basemaps and overlays from layer control)
        //console.log(" - Clearing Layer control...");
        
        //console.log("Number of requests: "+ reqs.length)
        //console.log(reqs)
        //console.log(entry_lyrs)

        // Requests are for images from erddap, I've been making one for each parameter in a dataset and loading them all at once.
        // Sep 20. Refactor to load non-displayed parameters in background
        // only request if layer isn;t already in layer list

        for (var i = 0; i < reqs.length; i++) {

            var req = reqs[i];
            //console.log(req["parameter"])
            if (req["parameter"] !== firstActiveParameter){
              // First response is handled separately
              setTimeout(makeLayer(req, 10));   // add catch in make layer to not remake layer if already exists 
            }
        }

        //$(".loading").addClass("hidden");
        
        pageLoad = 0;
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

/*
 * Get the active state of the designated query string from the url
 * key is a string
 */
function getActive(key) {
    //console.log('getting active')
    var a_Val = "", i, a_Li;

    if (key.toLowerCase() == "ds_id") {
        //tracking dataset only by tab, not url
        a_Li = $(".subEntryTabs .active").attr("id");
        a_Val = a_Li.substring(0, a_Li.indexOf("-tab"));
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
                    a_Val = queryVal;
                }
            }
        }
    }
    return a_Val;
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
    a_Variables = getActive("var");
    a_Variables = a_Variables.split(",");
    a_time = getActive("time");
    //console.log(a_time)
    a_timePrint = a_time.slice(5, 7) + "/" + a_time.slice(8, 10) + "/" + a_time.slice(0, 4) +' '+a_time.slice(11, 16)+'Z' ;
    $(".mapTimeStamp").html(a_timePrint);
    $(".mapTitle").text(a_subname + " ");

    if (a_Variables.length > 0) {
        for (i = 0; i < a_Variables.length; i++) {
            if (i == 0) {
                $(".mapTitle").append(a_Variables[i].split("_").join(" "));
            } else {
                $(".mapTitle").append(" and " + a_Variables[i].split("_").join(" "));
            }
        }
    }
}

function updateLegend() {
    console.log("## UPDATING LEGEND ##");

    var i, imageDir, legendName, legendFn, thisPar;
    a_ds_id = getActive("ds_id");
    var ds_info = getDatasetInfoById(getActive("ds_id"));
    console.log(ds_info)
    //show the legend for each active parameter
    a_vars = getActive("var");
    //console.log(a_vars)
    a_time = getActive("time");
    legendProjection = a_crs.toLowerCase(); // data is different depending on extent so legend may be different as well
    legendProjection = legendProjection.split(":");
    legendProjection = legendProjection[0] + legendProjection[1];
    
    //console.log('  clearing map legends')
    $(".mapLegend").html("");
    
    if (a_vars.length > 0) {
        //console.log('adding active legends')

        a_vars = a_vars.split(",");
        
        for (i in a_vars) {
            //Get parameter index reference for dataset object
            a_Idx = "";
            for (j = 0; j < ds_info.variables.length; j++) {
                if (a_vars[i] == ds_info.variables[j].name) {
                    a_Idx = j;
                    thisUnits = ds_info.variables[j].units;
                }
            }
                
            imageDir = "/map_images/" + catalog_v + "/" + entryName + "/" + a_ds_id + "/";
            legendName = a_vars[i] + "_" + legendProjection + "_" + makeDatePrint(a_time);
            legendFn = imageDir + legendName + "_legend_"+cache_date+".png";
            //console.log(legendFn);
            //add legend to legend area
            thisPar = a_vars[i].split("_").join(" ");
            if (thisUnits !== '1'){
              legendTitleHtml = '<div class="legendTitle">' + thisPar + ' (' + thisUnits + ')' + '</div>';
            } else {
              legendTitleHtml = '<div class="legendTitle">' + thisPar + '</div>';  
            }
            legendImageHtml = '<img src="' + legendFn + '"/>';
            legendHtml = '<div class="mapLegend">' + legendTitleHtml + legendImageHtml + '</div>';
            $(".mapLegends").append(legendHtml);
        }

    } else {
        console.log("no variables displayed");
        $(".mapLegend").html();
    }

    /* Keep in case we decide to change how we handle this
    //displayedPar = getDisplayedPar(queryStrings)
    if (displayedPar !== ''){
        var imageDir = "/map_images/forv5/"+ entryName +"/"+ a_Dataset+"/"; 
        //console.log(imageDir)
        var legendName = a_Dataset + "_" + displayedPar + "_" + legendProjection + "_" + a_time
        //console.log(legendName)
        var legendFn = imageDir + legendName + "_legend.png"
        console.log(legendFn)
        $(".mapLegend").html('<img src="'+ legendFn +'"/>')
    } else {
        $(".mapLegend").html('')
    }*/
}

function getLayerDetails(tab, projection, time, parameter) {
    //Pass info about the layer : dataset (or subname), timestamp, parameter
    //console.log(tab, projection, time, parameter)
    var layerList, layerDetails, i, j;

    // Loop through each projection
    for (i in entry_lyrs) {

        if (entry_lyrs[i]["projection"] == projection) {
            layerList = entry_lyrs[i]["overlayDetails"];
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
    return 0;
}


/* 
 * Only called at end of callPython() by the active request
 * Shows/hides dataset map layers
 */

function updateLayerDisplay(imgInfo) {
    console.log("* Updating Map Overlays *");

    // use response from image request to see what the active parameters are
    // only called from one place (callPython)
    // console.log(imgInfo);
    // cannot rely on leaflet layer control to control layers, it is not persistent, use my own tracker
    // Multiple requests can run this at the same time
    // need to know if it's the request that will be displayed or not

    clearLandmasks('map=1', 'layer_control=1')// HEREE

    a_parameters = getActive("var");
    a_projection = getActive("proj");
    console.log(imgInfo)
    a_subname = imgInfo["tab"].toLowerCase();
    a_crs = imgInfo["crs"];
    a_time = imgInfo["time"];

    var tab = imgInfo["tab"];
    var timep = imgInfo["timep"];
    var crs = imgInfo["crs"];
    var parameter = imgInfo["parameter"];

    console.log(tab)
    console.log(a_crs)
    console.log(timep)
    console.log(parameter)
    // make global Get list of layers for this dataset, with names and layer refs
    var layerDetails = getLayerDetails(tab, a_crs, timep, parameter);
    //console.log(layerDetails)

    var displayName = layerDetails["overlayDisplayName"];
    var layerName = layerDetails["overlayName"];
    // Find active overlay(s)
    
    var a_VarList = a_parameters.split(",");
    var a_Var;
    var isActiveLayer = 0;
    console.log(a_VarList)
    

    for (var i in a_VarList) {
        a_Var = a_VarList[i];
        if (layerDetails["parameter"] == a_Var) {
            isActiveLayer = 1;
            break;
        }
    }
    console.log(a_Var)
    console.log(isActiveLayer)
    console.log(layerDetails)
    if (isActiveLayer == 1) {
        console.log("  - adding active parameter overlay to map and layer control: " + layerDetails["overlayName"]);        
        // Update Layer control
        layerControl.removeLayer(layerDetails[layerName], displayName);
        layerControl.addOverlay(layerDetails[layerName], displayName); // add to layer control
        console.log('layer added to layer control list')

        // Update map
        console.log(layerDetails[layerName])
        if (map.hasLayer(layerDetails[layerName])){
            console.log('Already had a layer with this reference removing that')
            map.removeLayer(layerDetails[layerName])
        }
        if (! (map.hasLayer(layerDetails[layerName]))){
            console.log('confirmed, this layer is not displayed on the map, adding it')
            map.addLayer(layerDetails[layerName], displayName); // show layer on Map if not already displayed
            layerDetails[layerName].bringToFront()
        }
            console.log('after map.addlayer()')
            console.log(map.hasLayer(layerDetails[layerName]))
        

        // !! These were being called twice on page load and new python queries
        // !! The add overlay function is called automatically from the commands above
        // Commenting these out for now (8/23/18)
        // uncommented (on pages with multiple parameters, there were duplicates of first parameter in the url)
        updateUrl(a_subname, a_parameters, a_time, a_projection, a_colorbar); // Commenting 10/4, this should be call on map.overlay add
        updateLegend();  // Commenting 10/4, this should be call on map.overlay add
        updateTitle();
        //map on add is called before this and is not layer aware')
    } else {
        // Add to layer control as disabled
        console.log("  - adding overlay to layer control only: " + layerDetails["overlayName"]);
        layerControl.removeLayer(layerDetails[layerName], displayName); 
        layerControl.addOverlay(layerDetails[layerName], displayName);
        //console.log('    layer added to layer control list')
    }
    $(".mapTitleArea").removeClass("hidden");
    addLandMask(a_crs)
    //addMapExtentBorder(a_crs)
    $(".loader-wrap").addClass("hidden");
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

function clearDataOverlays() {
    console.log('Start clear data overlays')
    // use entry_lyrs to decide which overlays are active and clear just the overlays
    // necessary because we have some "layers" that we will want to keep sometimes like the land mask
    // that layer should only change on projection switch
    // only clears layers in the current projection
    var a_projection = getActive('proj')
    var a_crs = crsLookup[a_projection]
    var a_subname = getActive('dataset')
    var a_time = getActive('time')
    var a_vars=getActive('var')
    var a_varlist = a_vars.split(',')
    var time_p = makeDatePrint(a_time)

    for (var i = 0; i < a_varlist.length; i++) {
        layerDetails = getLayerDetails(a_subname, a_crs, time_p, a_varlist[i]);
        //console.log(layerDetails)
        if (layerDetails !== 0) {

            //console.log(layerDetails[layerDetails["overlayName"]])
            //console.log(map.hasLayer(layerDetails[layerDetails["overlayName"]]))
            if (map.hasLayer(layerDetails[layerDetails["overlayName"]])){
                map.removeLayer(layerDetails[layerDetails["overlayName"]])
            }
        }
    }
    
    console.log('End clear data overlays')
}

function clearLandmasks(map_flag, layer_control_flag){

    console.log('Clearing Landmasks')

    var map_flag = map_flag.split('=')[1]
    var layer_control_flag = layer_control_flag.split('=')[1]
    var thisLandmask;
    //console.log(entry_lyrs)
    //console.log(map_flag)
    //console.log(layer_control_flag)

    for (var i in entry_lyrs) {

        if (!dictIsEmpty(entry_lyrs[i]["landmask"])) {
            //console.log(entry_lyrs[i]["landmask"])
            thisLandmask = entry_lyrs[i]["landmask"]
            //console.log(thisLandmask)
    
            // Remove Layer from map
            try_flag = 1
            try {
                map.removeLayer(thisLandmask);
            } catch (err) { 
                console.log('could not remove Layer:')
                console.log(thisLandmask)
                try_flag = 0;
            }
            if (try_flag == 1){
                
            }
            // Remove layer display in layer conrol
            try_flag =1
            try {
                //console.log('trying to remove land mask')
                //console.log(thisLandmask)
                layerControl.removeLayer(thisLandmask, 'Land Mask'); // remove from layer control
            } catch (err) { 
                console.log('could not remove from Layercontrol:')
                console.log(thisLandmask)
                try_flag = 0;
            }
            if (try_flag == 1){
                
            }
        }
    }
    console.log('done clearing landmasks')
}

function clearBasemaps(map_flag, layer_control_flag) {
    console.log(' in clearBasemaps()')
    map_flag = map_flag.split('=')[1]
    layer_control_flag = layer_control_flag.split('=')[1]
    //console.log(map_flag)
    //console.log(layer_control_flag)

    var basemap;

    for (var i in entry_lyrs) {

        if (!dictIsEmpty(entry_lyrs[i]["basemaps"])) {

            for (j in entry_lyrs[i]["basemaps"]) {

                basemap = entry_lyrs[i]["basemaps"][j];
                //console.log(basemap)

                if (map_flag == '1' ){
                    //console.log('Remove basemap Layer from map')
                    try_flag = 1;
                    try {
                        map.removeLayer(basemap);
                    } catch (err) { 
                        try_flag = 0;
                    }
                    if (try_flag == 1) {
                        //console.log('basemap removed from map:')
                        //console.log(basemap)
                    }
                }
                if (layer_control_flag == '1' ){
                    //console.log('Removing basemap display in layer conrol')
                    try_flag = 1;
                    try {
                        layerControl.removeLayer(basemap); 
                    } catch (err) { 
                        try_flag = 0
                    }
                    if (try_flag == 1) {
                        //console.log('basemap removed from layer control:')
                        //console.log(basemap)
                    }
                }
            }
        }
    }
    console.log(' end clearBasemaps()')
}

function clearLayerControlBasemaps() {
    console.log(" - clearing basemaps...");
    var basemap;
    for (var i in entry_lyrs) {
        if (!dictIsEmpty(entry_lyrs[i]["basemaps"])) {
            for (j in entry_lyrs[i]["basemaps"]) {
                basemap = entry_lyrs[i]["basemaps"][j];
                layerControl.removeLayer(basemap);
            }
        }
    }
}

function clearLayerControlOverlays() {
    console.log(" - clearing layer control overlays...");
    var olayInfo;
    for (var i in entry_lyrs) {
        if (!dictIsEmpty(entry_lyrs[i]["overlayDetails"])) {
            for (j in entry_lyrs[i]["overlayDetails"]) {
                olayInfo = entry_lyrs[i]["overlayDetails"][j];
                olayId = entry_lyrs[i]["overlayDetails"][j]["overlayName"];
                olay = entry_lyrs[i]["overlayDetails"][j][olayId];
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

function updateUrl(a_subname, a_parameters, a_time, a_projection, a_colorbar) {
    console.log("## UPDATING URL ##");
    //Working towards: a_subname, a_parameters, a_time, a_Basemap
    //Set which layer is checked
    //console.log(a_subname)
    //console.log(a_parameters)
    //console.log(a_time)
    //console.log(a_projection)
    //console.log(a_colorbar)
    //console.log("##")
    var dsQueryString = "dataset=" + a_subname.toLowerCase();
    var parameterQueryString = "var=" + a_parameters;
    var timeQueryString = "time=" + a_time;
    var projectionQueryString = "proj=" + a_projection;
    var colorbarQueryString = "colorBar=" + a_colorbar;
    var queries = [dsQueryString, parameterQueryString, timeQueryString, projectionQueryString, colorbarQueryString];
    var urlParts = window.location.pathname.split("/");
    var newUrl = window.location.pathname + "?" + queries.join("&");
    console.log(newUrl)
    // SEND ACTIVE DATASET info to url
    history.replaceState(null, null, newUrl);
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
function getDatasetInfoById(ds_id) {
    var ds_info, i;
    for (i = 0; i < entry.datasets.length; i++) {
        ds_info = entry.datasets[i];
        if (ds_info["id"] == ds_id) {
            ds_info["ref"] = i; //reference for pulling out datasetinfo from coresponding lists like colorbars
            return ds_info;
            break;
        }
    }
}

function getDatasetInfoBySubname(dsSubname) {
    var ds_info;
    for (var i = 0; i < entry.datasets.length; i++) {
        ds_info = entry.datasets[i];
        if (ds_info["subname"].toLowerCase() == dsSubname.toLowerCase()) {
            ds_info["ref"] = i; //reference for pulling out out parameters from lists like colorbars
            return ds_info;
            break;
        }
    }
}

function setupBasemaps(){
    //epsg3413EtopoBasemap = L.Proj.imageOverlay(epsg3413OverlayFn, epsg3413BasemapBounds);
    //Put layer into layer tracker...
    //entry_lyrs["EPSG:3413"]["basemaps"]["Topography"] = epsg3413EtopoBasemap;

    var arcticGibsTemplate =
      "//map1{s}.vis.earthdata.nasa.gov/wmts-arctic/" +
      "{layer}/default/{time}/{tileMatrixSet}/{z}/{y}/{x}.jpg";
        
    var arcticGibsLayer = L.tileLayer(arcticGibsTemplate, {
        layer: "MODIS_Terra_correctedReflectance_TrueColor",
        tileMatrixSet: "EPSG3413_250m",
        time: "2013-06-15",
        tileSize: 512,
        subdomains: "abc",
        noWrap: true,
        continuousWorld: true,
        attribution:
            "<a href='https://wiki.earthdata.nasa.gov/display/GIBS'>" +
            "NASA EOSDIS GIBS</a>&nbsp;&nbsp;&nbsp;" +
            "<a href='https://github.com/nasa-gibs/web-examples/blob/release/examples/leaflet/arctic-epsg3413.js'>" +
            "View Source" +
            "</a>"
    });

    // HACK: BEGIN
    // Leaflet does not yet handle these kind of projections nicely. Monkey
    // patch the getTileUrl function to ensure requests are within
    // tile matrix set boundaries.
    var superGetTileUrl = arcticGibsLayer.getTileUrl;

    arcticGibsLayer.getTileUrl = function(coords) {
        var max = Math.pow(2, arcticGibsLayer._getZoomForUrl() + 1);
        if ( coords.x < 0 ) { return ""; }
        if ( coords.y < 0 ) { return ""; }
        if ( coords.x >= max ) { return ""; }
        if ( coords.y >= max ) { return ""; }
        return superGetTileUrl.call(arcticGibsLayer, coords);
    };
    // HACK: END
    
    //entry_lyrs["EPSG:3413"]["basemaps"]["Satellite"] = arcticGibsLayer 



    //epsg4326EtopoBasemap = L.Proj.imageOverlay(epsg4326OverlayFn, epsg4326BasemapBounds);
    //Add layer to layer tracker...
    //entry_lyrs["EPSG:4326"]["basemaps"]["Topography"] = epsg4326EtopoBasemap;

    //epsg3031EtopoBasemap = L.Proj.imageOverlay(epsg3031OverlayFn, epsg3031BasemapBounds);
    //Add layer to layer tracker...
    //entry_lyrs["EPSG:3031"]["basemaps"]["Topography"] = epsg3031EtopoBasemap;

}

function setupErddapLandMasks(erddapLandMasksInfo){

    console.log('Starting setup erddaplandmasks')
    //console.log(erddapLandMasksInfo)
    landMaskDir = "/" + catalog_v + "/basemaps/landmasks/";
    
    for (landMask_idx in erddapLandMasksInfo){
        landMaskInfo = erddapLandMasksInfo[landMask_idx][0];
        //console.log(landMaskInfo)
        landMaskOverlayFn = landMaskDir + 'erddap_gray_etopo_land_mask_'+landMaskInfo["projection"]+'.png';
        //console.log(landMaskOverlayFn)
        bound0 = landMaskInfo["boundsProjected"][0][0];
        bound1 = landMaskInfo["boundsProjected"][1][1];
        bound2 = landMaskInfo["boundsProjected"][3][0];
        bound3 = landMaskInfo["boundsProjected"][3][1];
        landMaskBounds = L.bounds([[bound0, bound1], [bound2, bound3]]);
        //console.log(landMaskBounds)
        entry_lyrs[landMaskInfo["crs"]]["landmask"] = L.Proj.imageOverlay(landMaskOverlayFn, landMaskBounds);
    }


    console.log(entry_lyrs)
    console.log('finished setupErddapLandMasks')
}


function addMapExtentBorder(crs){
    console.log('Adding map extent border to maps of projected data.')
    // this hides the overage on the previews of projected data
    // 4325 Datasets appear nice and clean, better without this hack

    if (ds_info["proj_crs_code"] != "EPSG:4326") {
        var customLayer = L.geoJson(null, {
            // http://leafletjs.com/reference.html#geojson-style
            style: function(feature) {
                return { color: '#fff' , weight:100};
            }
        });

        kml_dir = '/'+catalog_v+'/config/masks/'
        if (crs == 'EPSG:3031'){
          kmlfilename = kml_dir +    'SouthernHemisphereMapExtent.kml'
          omnivore.kml(kmlfilename, null, customLayer).addTo(map);
        } else if (crs == 'EPSG:3413') {
            kmlfilename = kml_dir +    'NorthernHemisphereMapExtent.kml'
            omnivore.kml(kmlfilename, null, customLayer).addTo(map);
        }
    }
}

function addLandMask(crs){
    console.log('@@@ in add land mask')
    //console.log(map)
    //console.log(entry_lyrs)
    //console.log(entry_lyrs[crs]["landmask"])
    thisLandMask = entry_lyrs[crs]["landmask"].addTo(map);
    layerControl.addOverlay(thisLandMask, 'Land Mask'); // add to layer control
    console.log('land mask added')
}

function addShoreLine () {
    var shorelineLayer = omnivore.topojson('/'+catalog_v+'/basemaps/shoreline.json').addTo(map);
    console.log('added shoreline')
    shorelineLayer.bringToFront()
    //entry_lyrs["EPSG:4326"]["basemaps"]["Shoreline"] = epsg4326EtopoBasemap;
}

// If we continue using this, break this down so we can use it for any projection
function setupErddapBasemaps(erddapBasemapsInfo) {
    // basemap info comes from json file
    
    console.log("Start Making basemap layers");
    
    basemapDir = "/" + catalog_v + "/basemaps/";

    for ( basemap_idx in erddapBasemapsInfo ){

        try {
            basemapInfo = erddapBasemapsInfo[basemap_idx][0];
            //console.log(basemapInfo)
            basemapOverlayFn = basemapDir + 'erddap_gray_etopo_'+basemapInfo["projection"]+'.png';
            //console.log(basemapOverlayFn)
            
            bound0 = basemapInfo["boundsProjected"][0][0];
            bound1 = basemapInfo["boundsProjected"][1][1];
            bound2 = basemapInfo["boundsProjected"][3][0];
            bound3 = basemapInfo["boundsProjected"][3][1];

            basemapBounds = L.bounds([[bound0, bound1], [bound2, bound3]]);
            
            //console.log(basemapBounds)
            //console.log(entry_lyrs)
            
            // use proj4 leaflet to create an image overlay with projected bounds
            entry_lyrs[basemapInfo["crs"]]["basemaps"]["Basemap"] = L.Proj.imageOverlay(basemapOverlayFn, basemapBounds);
            //console.log(entry_lyrs[basemapInfo["crs"]]["basemaps"]["Basemap"])

            //entry_lyrs[basemapInfo["crs"]]["basemaps"]["Topography"] = L.Proj.imageOverlay(basemapOverlayFn, basemapBounds);
            //console.log(entry_lyrs[basemapInfo["crs"]]["basemaps"]["Topography"])
        }
        catch(err){
            console.log(err)
        }
    }
    console.log("End Making basemap layers");
}

/*
 * Runs on page load, from createMap()
 * make default colorbar queries for all datasets
 * Makes colorbar url format and stores it with dataset (like parameters list)
 */
function makeDefaultColorbarQueries(entry) {
    for (i = 0; i < entry["datasets"].length; i++) {

        var ds_info = entry["datasets"][i];

        for (j = 0; j < ds_info.parameters.length; j++) {
            var colorbarInfo = ds_info.parameters[j]["colorbar"];
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
            ds_info.parameters[j]["colorbar"]["query"] = cbitems.join(",");
        }
    }
}

function createMap(entry) {
    
    console.log('START CREATE MAP')
    //console.log(entry)

    var polygon, epointList, prevProjPoly, prevProjPolyPoints;
    var i, a_Li, d_ds_id, a_subname, a_ds_id, a_projection, a_crs, a_parameters;
    var entryName = entry.entryId;

    pageLoad = 1;

    // Get this page's default dataset
    // Template writer takes into account invalid datasets
    // Giving inactive datasets a class of "disabled" on the li a 
    
    a_Li = $(".subEntryTabs li").first().attr("id");
    //console.log(a_Li)
    d_ds_id = a_Li.substring(0, a_Li.indexOf("-tab"));

    
    // SET ACTIVE DATASET
    a_subname = getActive("dataset"); // Get active subname from url

    if (a_subname == "") {
        // If no dataset is specified in the query string use the default tab (usually daily)
        // Will need to set this to first valid dataset
        ds_info = getDatasetInfoById(d_ds_id);
        a_subname = ds_info["subname"].toLowerCase();
        a_ds_id = d_ds_id;
    } else {
        // if there is a dataset indicated in the query string use it to set the active Dataset
        ds_info = getDatasetInfoBySubname(a_subname);
        a_ds_id = ds_info["id"];
    }
    //console.log(a_subname)

    if (ds_info.inERDDAP == 0) { 
        console.log('this is an inactive dataset. Handling it.')

        $( ".subEntryTabs li:nth-child(2)" ).attr("id");
        //console.log(a_Li)
        a_ds_id = $( ".subEntryTabs li:nth-child(2)" ).attr("id").substring(0, a_Li.indexOf("-tab"));
        //Get new dataset info
        ds_info = getDatasetInfoById(a_ds_id);
        //Set new subname, composite ref, required for all getActive() requests
        a_subname = ds_info["subname"].toLowerCase();
        console.log(a_subname)
        a_parameters = getActive("var");
        a_time = getActive("time");
        a_projection = getActive("proj");
        a_colorbar = getActive("colorBar");
        console.log(a_parameters)
        updateUrl(a_subname, a_parameters, a_time, a_projection, a_colorbar);

    }


    // GET ACTIVE PROJECTION
    // from url, if none set to default
    // All datasets in an entry must workk for the default projection

    a_projection = getActive("proj");
    //console.log(a_projection)
    if (a_projection == "") {
        $(".map-projection li").first().addClass("active")
        a_projection = $(".map-projection li.active").attr("id");
        a_crs = crsLookup[a_projection];
    } else {
        a_crs = crsLookup[a_projection];
    }

    //console.log(a_crs)
    // GET ACTIVE PARAMETERS
    // from Url, if none, set to default
    a_parameters = getActive("var");
    if (a_parameters == "") {
        // SET DEFAULT PARAMETER (AS 1ST PARAMETER) - SST, ice concentration...
        // Not really setting the "default paramter, setting the active parameter
        // change to look for active layer on map and get parameter name
        //console.log(ds_info.parameters);
        a_parameters = ds_info.parameters[0].name;
        ds_info["displayedParameters"] = a_parameters;
    }

    makeDefaultColorbarQueries(entry);

    // GET ACTIVE COLORBAR SETTINGS 
    // from url
    
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
    a_colorbar = getActive("colorBar");
    
    // set the active colorbar query to pass to url
    if (a_colorbar == "") {
        
        a_colorbar = [];
        colorbarIdxs = [];
        
        // get parameter idx to use as colorbar query idx
        var parameterList = a_parameters.split(",");
        
        for (var i in parameterList) {
            for (var j in ds_info["parameters"]) {
                if (parameterList[i] == ds_info["parameters"][j]["name"]) {
                    colorbarIdxs.push(j);
                }
            }
        }
        
        for (var i in colorbarIdxs) {
            thiscb = ds_info["parameters"][i]["colorbar"]["query"].split(",").join("|");
        }
        
        a_colorbar.push(thiscb);
    
    }

    // SETUP CALENDAR
    // Time selector population
    createDatepicker(); 

    map = new L.Map("map", {
        crs: projDefs[a_crs],
        noWrap: true
    });

    L.Map.include({
        "clearLayers": function clearLayers() {
            this.eachLayer(function (layer) {
                this.removeLayer(layer);
            }, this);
        }
    });

    L.control.mousePosition().addTo(map);

    var popup = L.popup();

    // Testing Map interactivity and getting projected and unprojected output from the map
    function onMapClick(e) {
        var latlon = e.latlng;
        //proj4("EPSG:4326", "EPSG:3031",[-63,-57] )
        console.log(e.latlng);
        //console.log(e.latlng.lng);
        var coords3031 = proj4("EPSG:4326", "EPSG:3031", [e.latlng.lat, e.latlng.lng]);
        console.log(coords3031);
        /*popup
            .setLatLng(e.latlng)
            .setContent("You clicked the map at " + e.latlng.toString())
            .openOn(map);
        */
    }
    map.on("click", onMapClick);

    // Update parameter selected in leaflet layer control
    // called when layer controller updates
    map.on("overlayadd", function (e) {
        console.log('in on overlayadd function:')
        //console.log(pageLoad)
        //console.log(e)
        if (e.name !== "Land Mask" && pageLoad == 0) { 
            // just a change of parameter
            // we don't need to call python here, because an earlier call to python got all parameters (layers)
            console.log("Active Overlay Set (through layer control, so updating url, adding colorbar to legend, adding par to title");
            a_subname = getActive("dataset");
            a_time = getActive("time");
            a_parameters = getActive("var");
            //console.log(a_parameters)
            // Sets parameter to the clicked one if there weren't any to start with
            if (a_parameters ==''){
                a_parameters = e.name;
            } else {
                console.log('add the new overlay to parameter list to pass to the url')
                a_parameters = a_parameters+','+e.name
            }
            //console.log(a_parameters)
            a_colorbar = getActive("colorBar");

            // Add coresponding colorbar query to the url colorbar list (for reference)
            //get info from dataset
            var activeIdx = [];
            for (var i = 0; i < ds_info.parameters.length; i++) {
                if (ds_info.parameters[i]["name"] == e.name) {
                    activeIdx.push(i);
                }
            }
            // Only keeping one colorbar info set in url...
            cbquery = ds_info.parameters[activeIdx]["colorbar"]["query"];
            a_colorbar = cbquery.split(",").join("|");
            updateUrl(a_subname, a_parameters, a_time, a_projection, a_colorbar);
            updateLegend();
            updateTitle();
        } else {
            if (e.name == "Land Mask"){
                console.log('SKIPPING ON OVERLAYADD - this is a land mask')
            }
            if (pageLoad == 0) { 
                 console.log('SKIPPING ON OVERLAYADD - page load')
            }
        }
        console.log('-- END overlayadd function --')
    });

    //listener to track which parameters are in leaflet layer control
    map.on("overlayremove", function (e) {
        console.log('in automatic on overlay removed function')
        console.log(e)
        // called both by click of layer control layer and by my own calls to remove layers
        if (e.name !== "Land Mask") { 
            console.log(' START data overlay removed, doing stuff')
            // just a change of parameter, don't need to call python here,
            // because a prior call to python got all parameters (layers) for this dataset

            //I think I am doing this just to be safe, should only be the parameters that change here
            a_subname = getActive("dataset");
            a_time = getActive("time");
            a_projection = getActive("proj");
            a_colorbar = getActive("colorBar");

            // See if there are parameters in the initial loaded url
            // If so, pass those along as the active parameters
            a_parameters = getActive("var");
            removeIdx = 0;

            if (a_parameters !== "") {
                var newVarList = [];
                a_pars = a_parameters.split(",");
                a_pars;
                for (var i = 0; i < a_pars.length; i++) {
                    if (a_pars[i] !== e.name) {
                        // if doenst match current layer to remove add to new list
                        newVarList.push(a_pars[i]);
                    } else {
                        removeIdx = i;
                    }
                }
                a_parameters = newVarList.join(",");
            }
            console.log(a_parameters)

            // there should be existing colorbar queries in the url
            // loop through those and remove the ones associated with this layer
            // use layer index from loop above
            if (a_colorbar !== "") {
                var newCbList = [];
                a_cbList = a_colorbar.split(",");
                for (var i = 0; i < a_cbList.length; i++) {
                    if (i !== removeIdx) {
                        newCbList.push(a_cbList[i]);
                    }
                }
                a_colorbar = newCbList.join(",");
            }
            
            // Only update these things if it's an onclick
            // Otherwise it messes up parameter tracking
            // only update the url when the active layer is ADDED to map
            if (clearMap == 0) {
                console.log("   - overlay removed so updating url, legend, title");
                updateUrl(a_subname, a_parameters, a_time, a_projection, a_colorbar);
                updateLegend();
                updateTitle();
            } else {
                console.log('overlay removed programatically, not updating url, legend, title here')
            }
            console.log(' -- END OVERLAY REMOVED --')
        } else {
            //console.log('Bypassing automatic onOverlayremoved Function')
        }
        
    });

    entry_lyrs = {
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
        /*
            var polygon = L.polygon([
            [-63.73427, -57.93823],
            [-64.5288, -29.3415],
            [-61.57959, 119.23794]
        ]).addTo(map);*/

        // Have the priciples of this figured out...
        // will use lowest lon (-57.9...), highest lon (119.2..), 
        // will need something fancy to calculate min lat (because polygon could contain the pole)
        // could set to dataset min for testing
        // highest lat (-61.57) 

        /*
        var antarcticCompositeBasemap = L.esri.tiledMapLayer({
          url: "http://discovery.pgc.umn.edu/arcgis/rest/services/public/AntarcticCompositeBasemap/MapServer"
        })
        antarcticCompositeBasemap.addTo(map);
        entry_lyrs["EPSG:3031"]["basemaps"]["Mosaic"] = antarcticCompositeBasemap
        */

        //map.attributionControl.addAttribution('hello there!'); //this works
        //map.attributionControl.setPrefix('Hello there!'); //this doesnt work

        /* found layer that combines the land imagery with bathymetry 2/22/18 
         * Developed and provided by ESRI 
         * Disadvantage is that it does not extend as far as I would like. 
         * May still like to look into a custom solution for PW.
         * Removing this June 25 to use ERDDAP basemap only. Could look into adding additional basemap options in the future eatimate that 
         * integration may take a week because of tiling differences between basemap versions...
         */

        /*var antarcticBasemap = L.esri.tiledMapLayer({
            url: "https://services.arcgisonline.com/arcgis/rest/services/Polar/Antarctic_Imagery/MapServer",
           attribution: "Earthstar Geographics"
        }).addTo(map);
        entry_lyrs["EPSG:3031"]["basemaps"]["esri basemap"] = antarcticBasemap*/

        /*
            var arcticGibsTemplate =
              "//map1{s}.vis.earthdata.nasa.gov/wmts-arctic/" +
              "{layer}/default/{time}/{tileMatrixSet}/{z}/{y}/{x}.jpg";
        
            var arcticGibsLayer = L.tileLayer(arcticGibsTemplate, {
                layer: "MODIS_Terra_correctedReflectance_TrueColor",
                tileMatrixSet: "EPSG3413_250m",
                time: "2013-06-15",
                tileSize: 512,
                subdomains: "abc",
                noWrap: true,
                continuousWorld: true,
                attribution:
                    "<a href='https://wiki.earthdata.nasa.gov/display/GIBS'>" +
                    "NASA EOSDIS GIBS</a>&nbsp;&nbsp;&nbsp;" +
                    "<a href='https://github.com/nasa-gibs/web-examples/blob/release/examples/leaflet/arctic-epsg3413.js'>" +
                    "View Source" +
                    "</a>"
            });
        
            // HACK: BEGIN
            // Leaflet does not yet handle these kind of projections nicely. Monkey
            // patch the getTileUrl function to ensure requests are within
            // tile matrix set boundaries.
            var superGetTileUrl = arcticGibsLayer.getTileUrl;
        
            arcticGibsLayer.getTileUrl = function(coords) {
                var max = Math.pow(2, arcticGibsLayer._getZoomForUrl() + 1);
                if ( coords.x < 0 ) { return ""; }
                if ( coords.y < 0 ) { return ""; }
                if ( coords.x >= max ) { return ""; }
                if ( coords.y >= max ) { return ""; }
                return superGetTileUrl.call(arcticGibsLayer, coords);
            };
            // HACK: END
            
        
            //entry_lyrs["EPSG:3413"]["basemaps"]["GIBS"] = arcticGibsLayer 
            // I don't really like this layer provide as option, also provide ESRI basemap (not in 3031 though...)
        
            // add a marker in the given location
            //L.marker(center).addTo(map);
            
            // Initialise the FeatureGroup to store editable layers
            var editableLayers = new L.FeatureGroup();
        
            map.addLayer(editableLayers);
            entry_lyrs["EPSG:3031"]["otherLayers"]["editableLayers"] = editableLayers
          
            var drawPluginOptions = {
                position: "topright",
                draw: {
                polygon: {
                    allowIntersection: false, // Restricts shapes to simple polygons
                    drawError: {
                    color: "#e1e100", // Color the shape will turn when intersects
                    message: '<strong>Oh snap!<strong> you can\'t draw that!' // Message that will show when intersect
                    },
                    shapeOptions: {
                    color: "#97009c"
                    }
                },
                // disable toolbar item by setting it to false
                polyline: false,
                circle: false, // Turns off this drawing tool
                rectangle: false,
                marker: false,
                },
                edit: {
                featureGroup: editableLayers, //REQUIRED!!
                remove: false
                }
            };
            // Initialise the draw control and pass it the FeatureGroup of editable layers
            var drawControl = new L.Control.Draw(drawPluginOptions);
            map.addControl(drawControl);
            map.on("draw:created", function(e) {
                var type = e.layerType,
                layer = e.layer;
                if (type === "marker") {
                layer.bindPopup("A popup!");
                }
                editableLayers.addLayer(layer);
                console.log(JSON.stringify(layer.toGeoJSON()));
            });
            */
            
    };
    
    // Setup Pane for Shoreline
    //map.createPane('shoreline');

    // Set z-index of this pane to be above the other layers (but below layer control)
    //map.getPane('shoreline').style.zIndex = 650;

    // Set to not pick up pointer events on the shoreline pane
    //map.getPane('shoreline').style.pointerEvents = 'none';

    console.log("  populating initial (no overlays yet) layer control");
    //console.log(entry_lyrs)
    //console.log(entry_lyrs[a_crs])
    //console.log(entry_lyrs[a_crs]["basemaps"])
    layerControl = L.control.layers(entry_lyrs[a_crs]["basemaps"], {}, { collapsed: true }).addTo(map);

    initialBoundsList = {
        "EPSG:3031": [[-45.72594458145447, 44.92245898902086], [-45.725944862100214, -134.92245898847855]],
        "EPSG:3413": [[29.7, 44], [29.7, -134.63]],
        "EPSG:4326": [[90, 180.1, -90, -180.1]]   
    };
    initialBoundsList = {
        "EPSG:3031": [[-45.72594458145447, 44.92245898902086], [-45.725944862100214, -134.92245898847855]],
        "EPSG:3413": [[20, 178], [20,1]],
        "EPSG:4326": [[90, 180.1, -90, -180.1]]   
    };

    
    //document.getElementsByClassName( 'leaflet-control-attribution' )[0].style.display = 'none';
    //$(".leaflet-control-attribution").before('<div style="text-align:right; font-size: 11px; padding-right: 5px;color: #333; background: rgba(255, 255, 255, 0.7)"> * For preview only, does not represent resolution of data</div> <span style="font-size: 11px; color: #333; padding: 3px 0px 1px 0px;background: rgba(255, 255, 255, 0.7)">NOAA PolarWatch |</span> ')

    // Make requests to python for all parameters within the active Dataset

    reqs = [];
    //console.log(a_ds_id)
    //ds_info = getDatasetInfoById(a_ds_id)
    //console.log(ds_info)
    //console.log(ds_info.subname)
    console.log(ds_info.parameters)
    console.log(ds_info)

    
// Set Default Time
        a_time = ds_info.allDatasets[10];
        a_timePrint = makeDatePrint(a_time);
        a_time = a_time;

        a_vars = getActive('var')
        a_vars = a_vars.split(",");

        // Create the info to send to getImage script
        // getting only checked parameters

        // For each active parameter, look up corresponding info from the dataset
        // Updating again, Oct 11
        // Will put all requests in to create layers
        // Will try to load map when just the first layer is returned
        for (var var_idx =0; var_idx < a_vars.length; var_idx++){
            //console.log(a_vars[var_idx])
            for (var j = 0; j < ds_info.parameters.length; j++) {
                
                parameter = ds_info.parameters[j]["name"]; // always get all parameters
                try {
                    mask_vals = ds_info.parameters[j]["maskedValues"];
                }
                catch(err) {
                    mask_vals = 'None'
                }
                //console.log(parameter)

                    //php to python cant handle the | char keeping that separate and just for url
                    cbquery = ds_info.parameters[j]["colorbar"]["query"]; 
                    //console.log(parameter)
                    console.log(a_ds_id)

                    req = {
                        "catalog_v": catalog_v,
                        "projection": a_projection,
                        "ds_id": a_ds_id,
                        "entryId": entryName,
                        "parameter": parameter,
                        "time": a_time,
                        "tab": a_subname,
                        "colorBar": cbquery,
                        "cache_date": cache_date,
                        "mask_vals": mask_vals
                    };
                    reqs.push(req);
                //}
            } //End par for
        }
        
    /*for (var var_idx =0; var_idx < a_vars.length; var_idx++){
        console.log(a_vars[var_idx])
        for (var j = 0; j < ds_info.parameters.length; j++) {
            
            parameter = ds_info.parameters[j]["name"]; // always get all parameters
            console.log(parameter)
            if (a_vars[var_idx] == parameter){
                console.log('parameter match')
            
            cbquery = ds_info.parameters[j]["colorbar"]["query"]; //php to python cant handle the | char keeping that separate and just for url
            //console.log(parameter)
            console.log(a_ds_id)
            req = {
                "catalog_v": catalog_v,
                "projection": a_projection,
                "ds_id": a_ds_id,
                "entryId": entryName,
                "parameter": parameter,
                "time": a_time,
                "tab": a_subname,
                "colorBar": cbquery
            };
            reqs.push(req);
            }
        } //End par for
    }*/
    
    //console.log(reqs)


    // SETUP ERDDAP BASEMAPS AND LAND MASKS
    epsg3413BasemapInfoFn = "/" + catalog_v + "/basemaps/erddap_gray_etopo_epsg3413.json";
    promise1 = $.getJSON(epsg3413BasemapInfoFn);

    epsg4326BasemapInfoFn = "/" + catalog_v + "/basemaps/erddap_gray_etopo_epsg4326.json";
    promise2 = $.getJSON(epsg4326BasemapInfoFn);

    epsg3031BasemapInfoFn = "/" + catalog_v + "/basemaps/erddap_gray_etopo_epsg3031.json";
    promise3 = $.getJSON(epsg3031BasemapInfoFn);

    promise4 = $.getJSON("/" + catalog_v + "/basemaps/landmasks/erddap_gray_etopo_land_mask_epsg3031.json");
    promise5 = $.getJSON("/" + catalog_v + "/basemaps/landmasks/erddap_gray_etopo_land_mask_epsg3413.json");
    promise6 = $.getJSON("/" + catalog_v + "/basemaps/landmasks/erddap_gray_etopo_land_mask_epsg4326.json");

    // Once we have basemap info 
    //  1. setup the basemaps, 
    //  2. update the url with complete corresponding info
    //  3. ...
    $.when(promise1, promise2, promise3, promise4, promise5, promise6).done(function (epsg3413BasemapInfo, epsg4326BasemapInfo, epsg3031BasemapInfo, epsg3031LandMaskInfo,epsg3413LandMaskInfo,epsg4326LandMaskInfo) {
        console.log(' Basemap promises complete')
        //console.log(epsg3031BasemapInfo);
        //setupBasemaps() // Adds GIBS Basemap

        erddapBasemapsInfo = [epsg3413BasemapInfo, epsg4326BasemapInfo, epsg3031BasemapInfo]
        erddapLandMasksInfo = [epsg3031LandMaskInfo, epsg3413LandMaskInfo, epsg4326LandMaskInfo]

        setupErddapBasemaps(erddapBasemapsInfo);
        setupErddapLandMasks(erddapLandMasksInfo);

        // Set initial map state - default view of antarctica
     
            var center = [-90, 0];
            map.setView(center, 0);

            //Does this help with responsive map?
            mapBounds = map.getBounds();
            //console.log(mapBounds);
            //console.log(a_crs);
            //console.log(initialBoundsList[a_crs]);
            //map.fitBounds(initialBoundsList[a_crs])
            //map.setMaxBounds(initialBoundsList[a_crs]); // This prevents panning outside of initial extent (to some extent, can still zoom out and can still attempt to pan out of this range)
            //console.log(a_subname, a_parameters, a_time, a_projection, a_colorbar)
        

            // Here we update the url to pass the parameters when there arent any yet
            updateUrl(a_subname, a_parameters, a_time, a_projection, a_colorbar);
            //var queryStrings = getQueryStrings() 
            //a_ds_id = getActive('ds_id') // this method uses the current tab, here we need to calculate it from the url
            //console.log(d_ds_id);
            // get active ds_info Id from url
            
            // Get image from ERDDAP via Python
            // If the request is for the default ds_info, go straight to call python
            // The request can be for a different ds_info because we are using input from the url
            // If that is the case, update the page state and then call python

            ds_info = getDatasetInfoBySubname(a_subname);
            //console.log(ds_info)
            a_ds_id = ds_info["id"];
            //console.log(a_ds_id)

            //console.log(reqs)
            if (a_ds_id == d_ds_id) {
                console.log("Create Map End, Dataset is default, Triggering click of projection tab");
                //console.log(pageLoad)
                a_projection = projLookup[a_crs];
                a_projectionTab = "#" + a_projection;
                $(".map-projection li").removeClass("active"); // remove active class from all tabs
                $(a_projectionTab).addClass("active"); // add active class to this tab
                $(a_projectionTab).trigger("click"); // do stuff to map then call python (or not, if it's a page load)
            } else {
                console.log("Create Map End - dataset is not default, Triggering dataset tab switch on page load");
                a_DatasetTab = "#" + a_ds_id + "-tab";
                $(a_DatasetTab).trigger("click"); // does stuff, then checks projection, then calls python
            }
        
    });
} // END createMap

/*
 * num input should be a string, output will be a string
 * decimal place should be a num
 */
function setDecimalsString(num, decimal_places) {
    num = num.toString(); // make sure we are working with a string

    //Look for decimal place
    decimal_location = num.indexOf(".");

    if (decimal_location != -1) {
        num = num.slice(0, decimal_location + decimal_places);
    }

    return num;
}

$(document).ready(function () {
    $(".subEntryTabs li").first().addClass("active")
    $(".map-projection li").first().addClass("active")
    
    $(".mapTitleArea.loading").html("loading...");
    
    proj4defs = {
        "EPSG:3031": "+proj=stere +lat_0=-90 +lat_ts=-71 +lon_0=0 +k=1 +x_0=0 +y_0=0 " + "+ellps=WGS84 +datum=WGS84 +units=m +no_defs",
        "EPSG:3413": "+proj=stere +lat_0=90 +lat_ts=70 +lon_0=-45 +k=1 +x_0=0 +y_0=0 " + "+ellps=WGS84 +datum=WGS84 +units=m +no_defs",
        "EPSG:4326": "+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs",
        "EPSG:3411": "+proj=stere +lat_0=90 +lat_ts=70 +lon_0=-45 +k=1 +x_0=0 +y_0=0 +a=6378273 +b=6356889.449 +units=m +no_defs",
        "EPSG:3412": "+proj=stere +lat_0=-90 +lat_ts=-70 +lon_0=0 +k=1 +x_0=0 +y_0=0 +a=6378273 +b=6356889.449 +units=m +no_defs"

        /*
        EPSG3031CRS = new L.Proj.CRS("EPSG:3031", "+proj=stere +lat_0=-90 +lat_ts=-71 +lon_0=0 +k=1 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs", {
            origin: [-30636100, 30636100],
            resolutions: [32000.000000000004, 16000.000000000002, 8000.000000000001, 4000.0000000000005, 2000.0000000000002, 1000.0000000000001, 500.00000000000006, 250.00000000000003, 120, 60, 30, 15, 8, 4, 2, 1, .5],
            bounds: L.bounds([
              [-2668252, -2294490],
              [2813873, 2362335]
            ])
          }) ;
        */
    };

    // Specify Map Projection Details For Leaflet
    EPSG3031CRS = new L.Proj.CRS("EPSG:3031", "+proj=stere +lat_0=-90 +lat_ts=-71 +lon_0=0 +k=1 +x_0=0 +y_0=0 +ellps=WGS84 +datum=WGS84 +units=m +no_defs", {
        origin: [-3.369955099203E7, 3.369955101703E7],
        resolutions: [14925.675834625032, 7462.837917312516, 3731.4189586563907, 1865.709479328063, 932.8547396640315, 466.42736983214803, 233.21368491607402, 116.60684245803701, 58.30342122888621, 29.151710614575396, 14.5758553072877, 7.28792765351156, 3.64396382688807, 1.82198191331174],
        bounds: L.bounds([[-3.0635955947272874E7, -3.063595594727252E7], [3.0635955947272874E7, 3.0635955947272986E7]])
    });

    EPSG3413CRS = new L.Proj.CRS("EPSG:3413", "+proj=stere +lat_0=90 +lat_ts=70 +lon_0=-45 +k=1 +x_0=0 +y_0=0 " + "+ellps=WGS84 +datum=WGS84 +units=m +no_defs", {
        origin: [-4194304, 4194304],
        resolutions: [8192.0, 4096.0, 2048.0, 1024.0, 512.0, 256.0],
        bounds: L.bounds([[-4194304, -4194304], [4194304, 4194304]])
    });

    EPSG3413CRS = new L.Proj.CRS("EPSG:3413", "+proj=stere +lat_0=90 +lat_ts=70 +lon_0=-45 +k=1 +x_0=0 +y_0=0 " + "+ellps=WGS84 +datum=WGS84 +units=m +no_defs", {
        origin: [-4194304, 4194304],
        resolutions: [14925.675834625032, 7462.837917312516, 3731.4189586563907, 1865.709479328063, 932.8547396640315, 466.42736983214803, 233.21368491607402, 116.60684245803701, 58.30342122888621, 29.151710614575396, 14.5758553072877, 7.28792765351156, 3.64396382688807, 1.82198191331174],
        bounds: L.bounds([[-4194304, -4194304], [4194304, 4194304]])
    });

       

    EPSG4326CRS = L.CRS.EPSG4326;

    projDefs = {
        "EPSG:3031": EPSG3031CRS,
        "EPSG:3413": EPSG3413CRS,
        "EPSG:4326": EPSG4326CRS
    };

    a_Li = $(".subEntryTabs .active").attr("id");
    a_ds_id = a_Li.substring(0, a_Li.indexOf("-tab"));
   
    /*
     * Time prev button click handler
     * ds_info is global (and only changed by dataset onclick)
     */

    $(".time-prev-btn").click(function () {
        //a_ds_id = getActive('ds_id')
        //var ds_info = getDatasetInfoById(a_ds_id)  //Get current dataset
        console.log(' * START PREV TIME BUTTON CLICK FUNCTION * ')
        
        // Clear active map image
        clearMap = 1;
        console.log("clearing data overlays");
        clearDataOverlays();
        clearLayerControlOverlays();  // Clear overlays in layer control
        clearMap = 0;

        // get current time 
        a_timeList = ds_info["time"]["timeList"];
        a_time = getActive("time");

        // find index of current time in time list
        for (i in a_timeList) {
            if (a_timeList[i][0] == a_time) {
                //console.log("found");
                a_timeIdx = parseInt(i);
                break;
            }
        }
        //console.log(a_timeIdx);

        latestTimeIdx = a_timeList.length - 1;
        
        //make sure we can go back one (not alredy on oldest)
        if (a_timeIdx !== 0) {
        
            newTimeIdx = a_timeIdx - 1;
            newTime = a_timeList[newTimeIdx][0];
            newTimep = makeDatePrint(newTime);

            for (var j = 0; j < reqs.length; j++) {
                reqs[j]["time"] = newTime;
            }
        
            console.log("*** New Time Selected ***");
        
            // Get active dataset, variable, time, etc
            // the new time is from this action
            a_time = newTime;
            // use the selected tab to get the active dataset subname
            a_subname = getActive("dataset");
            // Get the rest of the info from the url
            a_ds_id = getActive("ds_id");
            a_calEl = "#" + a_ds_id + "-datetimepicker";
            ds_info = getDatasetInfoById(a_ds_id);
            a_parameters = getActive("var");
            a_projection = getActive("proj");
            a_colorbar = getActive("colorBar");
            //Update the Url with the new info (new time)
            updateUrl(a_subname, a_parameters, a_time, a_projection, a_colorbar);
            //console.log(ds_info.parameters.length)
            //update calendar 
            //this calls python function
            console.log(a_calEl)
            console.log(a_time)
            $(a_calEl).data("DateTimePicker").date(new Date(a_time));
            $(".time-prev-btn").attr("disabled", "disabled");
            $(".time-latest-btn").attr("disabled", "disabled");
            $(".time-next-btn").attr("disabled", "disabled");
        } else {
            console.log("doing nothing, on oldest time stamp");
        }
    });

    //Time next Testing
    $(".time-next-btn").click(function () {
        //dataset is global (and only changed by dataset onclick)
        //a_ds_id = getActive('ds_id')
        //var ds_info = getDatasetInfoById(a_ds_id)  //Get current dataset

        console.log(' * START NEXT TIME BUTTON CLICK FUNCTION * ')
        clearMap = 1;
        // Clear active map image
        console.log("clearing data overlays");
        clearDataOverlays();
        clearLayerControlOverlays(); // Clear overlays in layer control
        clearMap = 0;

        a_timeList = ds_info["time"]["timeList"];

        //look for current time in timelist
        a_time = getActive("time");
        var a_timeIdx;
        //console.log(a_timeIso)
        //console.log(a_timeList)
        for (i in a_timeList) {
            if (a_timeList[i][0] == a_time) {
                //console.log('found')
                a_timeIdx = parseInt(i);
                break;
            }
        }
        //console.log(a_timeIdx)
        latestTimeIdx = a_timeList.length - 1;
        //console.log(a_timeIdx)
        //make sure we can go forward one (not alredy on latest)
        if (a_timeIdx != latestTimeIdx) {
            newTimeIdx = a_timeIdx + 1;
            //console.log(newTimeIdx)
            newTime = a_timeList[newTimeIdx][0];
            newTimep = makeDatePrint(newTime);

            a_time = newTime;
            a_subname = getActive("dataset"); // all from url
            a_ds_id = getActive("ds_id");
            a_calEl = "#" + a_ds_id + "-datetimepicker";
            ds_info = getDatasetInfoById(a_ds_id);
            a_parameters = getActive("var");
            a_projection = getActive("proj");
            a_colorbar = getActive("colorBar");

            updateUrl(a_subname, a_parameters, a_time, a_projection, a_colorbar); // update the url
            //console.log(ds_info.parameters.length);

            //update calendar (calls py)
            console.log(a_calEl)
            console.log(a_time)
            $(a_calEl).data("DateTimePicker").date(new Date(a_time));
           
            $(".time-next-btn").attr("disabled", "disabled");
            $(".time-prev-btn").attr("disabled", "disabled");
            $(".time-latest-btn").attr("disabled", "disabled");
        } else {
            console.log("doing nothing, on latest time stamp");
        }
    });

    /*
     * Time latest 
     * ds_info is global (and only changed by dataset onclick)
     */
    $(".time-latest-btn").click(function () {

        clearMap = 1;
        console.log("clearing data overlays");
        clearDataOverlays();
        clearLayerControlOverlays(); // Clear overlays in layer control
        clearMap = 0;

        //look for current time in timelist
        a_timeList = ds_info["time"]["timeList"];
        a_time = getActive("time");

        var a_timeIdx;
        //console.log(a_timeIso)
        //console.log(a_timeList)
        for (i in a_timeList) {
            if (a_timeList[i][0] == a_time) {
                a_timeIdx = parseInt(i);
                break;
            }
        }
        //console.log(a_timeIdx)
        latestTimeIdx = a_timeList.length - 1;
        //console.log(a_timeIdx)
        //make sure we need to make a change
        if (a_timeIdx != latestTimeIdx) {
            newTime = a_timeList[latestTimeIdx][0];
            newTimep = makeDatePrint(newTime);
            a_time = newTime;
            a_subname = getActive("dataset");
            // all from url
            a_ds_id = getActive("ds_id");
            a_calEl = "#" + a_ds_id + "-datetimepicker";
            ds_info = getDatasetInfoById(a_ds_id);
            a_parameters = getActive("var");
            a_projection = getActive("proj");
            a_colorbar = getActive("colorBar");

            updateUrl(a_subname, a_parameters, a_time, a_projection, a_colorbar); // update the url
            console.log('here')

            //update calendar (calls py)
            $(a_calEl).data("DateTimePicker").date(new Date(a_time));
            $(".time-latest-btn").attr("disabled", "disabled");
            $(".time-prev-btn").attr("disabled", "disabled");
            $(".time-next-btn").attr("disabled", "disabled");
        } else {
            console.log("doing nothing, on latest time stamp");
        }
    });


    // Dataset Tab Click Function
    // Can be a button click or can be tiggered by createMap()

    $(".subEntryTabs li").click(function () {
        console.log("## TOGGLING DATASET TABS ##");
        // Check to make sure this dataset was in erddap last time we checked
        // Catalog now has the ability to display entries where one dataset is missing but others were there
        // 3/27/18 example of this is NASA VIIRS Monthly dataset not accessed but Daily and weekly are available

        var i, j;

        // Get info from the selected tab 
        // If triggered by page load then the correct tab is set to active before this is called
        // Set this  dataset button to active
        $(".subEntryTabs .active").removeClass("active");
        $(this).addClass("active");
        a_Li = $(".subEntryTabs .active").attr("id");
        a_ds_id = a_Li.substring(0, a_Li.indexOf("-tab"));
        console.log(a_ds_id)

        if($(this).find('a.disabled').length !== 0){
          console.log('DISABLED TAB')
          $(".mapArea").removeClass('hidden')
          $(".mapArea").addClass('hidden')
          $(".inactiveDatasetMessage").removeClass('hidden')
          $("ul.map-projection").find('li').addClass('disabled');
          $("ul.map-projection").find('li').removeClass('active');
          $(".map-time-selector").removeClass('hidden');
          $(".map-time-selector").addClass('hidden');
        } else {
          $(".mapArea").removeClass('hidden')
          $(".inactiveDatasetMessage").removeClass('hidden')
          $(".inactiveDatasetMessage").addClass('hidden')
          $("ul.map-projection").find('li').removeClass('disabled');
          $(".map-time-selector").removeClass('hidden');
        }
        
        // Clearing Data Overlay Layers and Layer Contoller
        // doing this also in call python so don't really need to do it here too, but
        // it is nice to have the layers removed earlier
        // improves user experience, indicates that something is happening right away
        console.log('Dataset click is calling clear data overlays')
        clearMap = 1;
        clearDataOverlays(); // Clear active map image
        clearLayerControlOverlays(); // Clear overlays in layer control
        clearMap = 0;

        // Get dataset info from metadata
        ds_info = getDatasetInfoById(a_ds_id);

        // Get iso latest time stamp from metadata
        try {
            a_time = ds_info.allDatasets[10];
        } catch (err) {  
            console.log("display ds_info not active message");
        }

        a_subname = ds_info["subname"];
        a_projection = getActive("proj");
        
        //console.log(pageLoad)

        // Set active parameters
        // This is a new dataset, need to use new dataset info and reset active parameter as this dataset's first parameter
        for (j = 0; j < ds_info.parameters.length; j++) {
            parameter = ds_info.parameters[j]["name"];
            a_colorbar = ds_info.parameters[j]["colorbar"]["query"]
            // Hardcode first parameter to be displayed
            if (j == 0) {
                a_parameters = parameter;
                break;
            }
        }
      

        // TIME
        // Each dataset has different times available, reverts to default (latest)
        // to do: if toggling between monthly and daily tabs want to remember the last used time and go back to that

        /*
         * SHOW/HIDE Date/time selectors and data details section
         * make sure the calendar displayed correlates to the selected subname tab
         * loop through all calendars, show active, hide non-active
         * calendars are submitted on click, so this will work
         */
        $(".map-time-selector").each(function (k, obj) {
            thisTimeSectionDivId = $(obj).attr("id");
            if (thisTimeSectionDivId == a_ds_id + "-map-time") {
                $(obj).removeClass("hidden");
            } else {
                $(obj).removeClass("hidden");
                $(obj).addClass("hidden");
            }
        });

        // Show/Hide corresponding dataset details html
        $(".dataset-details").each(function (k, obj) {
            thisDetailsSectionDivId = $(obj).attr("id");
            if (thisDetailsSectionDivId == a_ds_id + "-dataset-details") {
                $(obj).removeClass("hidden");
            } else {
                $(obj).removeClass("hidden");
                $(obj).addClass("hidden");
            }
        });

        //update the dataset subname and default parameter in the url

        updateUrl(a_subname, a_parameters, a_time, a_projection, a_colorbar);

        console.log("Triggering the click of the appropriate projection tab");
        //console.log(pageLoad)
        if (pageLoad == 1) {
            // See if we use the default map or if we need to switch the projection view too
            //console.log('Map CRS: ')
            //console.log(map.options.crs.code)
        }

        a_projectionTab = "#" + a_projection;
        $(".map-projection li").removeClass("active"); // remove active class from all tabs
        $(a_projectionTab).addClass("active"); // add active class to this tab
        $(a_projectionTab).trigger("click"); // do some stuff to the map and then call python (or not, if it's a page load)
        //alert('The projection input from the url is not currently supported.')


        // new dataset, cannot keep the time from the previous dataset because they have different time spacing(daily, monthly)
        // well we could remember if this dataset had a time selected before and default to that
        // will require a time variable for each available dataset.

        //a_time = ds_info.allDatasets[10]
        //a_time = makeDatePrint(a_time)
        console.log('END DATASET click')

    });// end dataset click


    a_ds_id = getActive("ds_id");
    calEl = "#" + a_ds_id + "-datetimepicker";
    //console.log(calEl);

    $(".calendar").on("dp.change", function (e) {
        // check to make sure it was the calendar for the active dataset
        // if not ignore the change, it's just the setting up of the other calendars
        a_ds_id = getActive("ds_id");
        a_calEl = a_ds_id+"-datetimepicker"
        if (e.target.id !== a_calEl){
            //console.log('not this calendar')
        } else {
            console.log('* START CALENDAR CHANGE FUNCTION *')
            $(".calendar").attr("disabled", "disabled");
            $(".calendar a").attr("disabled", "disabled");

            clearMap = 1;
            console.log("clearing data overlays");
            clearDataOverlays(); // clears map overlays
            clearLayerControlOverlays(); // Clear overlays in layer control
            clearMap = 0;

            //console.log('time changed in calendar');
            //console.log(e.target.id)
            dateFromDp = e.date;
            dateFromDpIso = dateFromDp.toISOString();
            a_time = dateFromDp.utc().format();
            a_subname = getActive("dataset"); 
            ds_info = getDatasetInfoById(a_ds_id);
            a_parameters = getActive("var");
            a_projection = getActive("proj");
            a_colorbar = getActive("colorBar");

            updateUrl(a_subname, a_parameters, a_time, a_projection, a_colorbar); // update the url
            // check for initial load
            if (e.oldDate) {
                // make sure date was actually changed
                if (e.date !== e.oldDate) {
                    reqs = [];
                
                    // Create the info to send to getImage script
                    for (i = 0; i < ds_info.parameters.length; i++) {

                        try {
                            mask_vals = ds_info.parameters[j]["maskedValues"];
                        }
                        catch(err) {
                            mask_vals = 'None'
                        }
                        req = {
                            "catalog_v": catalog_v,
                            "projection": a_projection,
                            "ds_id": a_ds_id,
                            "entryId": entry["entryId"],
                            "parameter": ds_info.parameters[i]["name"],
                            "time": a_time,
                            "tab": a_subname,
                            "colorBar": ds_info.parameters[i]["colorbar"]["query"],
                            "cache_date": cache_date,
                            "mask_vals": mask_vals
                        };
                        reqs.push(req);
                    }
                    console.log(reqs);
                    console.log(' - calendar change function is calling python')
                    
                    // See if we already have that image
                    timep = makeDatePrint(req["time"]);
                    var imageDir = "/map_images/" + catalog_v + "/" + reqs[0]["entryId"] + "/" + reqs[0]["ds_id"] + "/";
                    var fromPyFn = imageDir + reqs[0]["parameter"] + "_" + reqs[0]["projection"] + "_" + timep + "_" + reqs[0]["cache_date"]+".json";
                    
                    try {
                        $.ajax({
                            url:fromPyFn,
                            datatype:"json",
                            type:"GET",
                            tryCount: 0,
                            retryLimit: 3,
                        //$.getJSON(fromPyFn, {

                        }).fail(function () {
                            console.log("No image yet, call python");
                            callPython(reqs);
                        }).done(function (imgInfo) {
                            console.log('Have an image already, just use that')
                            for (var i = 0; i < reqs.length; i++) {
                                var req = reqs[i];
                                makeLayer(req);
                            }
                        });
                    } catch(err){

                    }
                }
            }
        }
    }); // end calendar click

    /**
     * PROJECTION Click Function - from button
     * projection Change projection
     **/
    $(".map-projection li").click(function () {

        console.log("IN PROJECTION BUTTON CLICKED");
        /*
        // This was in gotodownloadbutton click function with the following note, but maybe it was already integrated:
        // needs to become part of the projection onclick routine
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
        */

        clearMap = 1; // using this to override onadd function

        // change map settings
        // dataset info stays the same 
        // working towards keeping the parameter the same here too, need to add that...

        if (typeof polygon != "undefined") {
            console.log("saving last polygon");
            //console.log(polygon);
            //console.log(epointList);
            prevProjPoly = polygon;
            prevProjPolyPoints = epointList;
            remadepolygon = L.polygon(epointList); //.addTo(map);
        }

        var i;

        a_subname = getActive("dataset");
        a_ds_id = getActive("ds_id");
        // Get dataset info from metadata
        ds_info = getDatasetInfoById(a_ds_id);

        //clear all buttons then set this projection button to active
        $(".map-projection li.active").removeClass("active");
        $(this).addClass("active");

        // Set active projection (from tab)
        var a_projBtn = $(".map-projection li.active");
        var a_projection = a_projBtn.attr("id");
        a_crs = crsLookup[a_projection];
        a_time = getActive("time");
        a_colorbar = getActive("colorBar");
        a_parameters = getActive("var");

        // This is where initial basemap is added on pageload
        // This is where basemaps are updated on projection change
        //console.log("Checking for Appropriate Basemaps");
        //console.log('Map CRS: ')
        //console.log(map.options.crs.code)
        //console.log('Data Request CRS:')
        //console.log(a_crs)
        //console.log(pageLoad)
        
        if (a_crs !== map.options.crs.code || pageLoad == 1 ){
            //console.log('either projection change or pageload')

            if (a_crs !== map.options.crs.code){
                console.log('Need to change the map projection, data request is different than current map state')
                console.log(" - clearing all existing basemaps, landmasks, data layers");
                
                clearBasemaps('map=1', 'layer_control=1')
                clearLandmasks('map=1', 'layer_control=1')
                clearDataOverlays()
                clearLayerControlOverlays(); // Clear overlays in layer control             
                updateMapState()
            }

             if (pageLoad == 1 ){
                console.log('Pageload changing map projection')
                console.log(" - clearing all existing basemaps, landmasks, data layers");
                //console.log(map)
                clearBasemaps('map=1', 'layer_control=1')
                clearLandmasks('map=1', 'layer_control=1')
                clearDataOverlays()
                // Clear overlays in layer control
                clearLayerControlOverlays(); // Think I can remove this
                //console.log(map);
                updateMapState()
            }
           
            //console.log(entry_lyrs)
            // Add approp basemap back
            //console.log('adding basemap for projection:')
            //console.log(a_crs)
            // only want to do this once and should only happen on projection change 
            // Looks at info stored for this projection and updates the layer control with the approp. bmap
            for (var group in entry_lyrs) {
                // Overlays are grouped by projection
                if (entry_lyrs[group]["projection"] == a_crs) {
                    //console.log(entry_lyrs[group]);
                    var bmapListing = entry_lyrs[group]["basemaps"];
                    var bmapKeys = Object.keys(bmapListing);

                    for (var i = 0; i < bmapKeys.length; i++) {
                        bmapKey = bmapKeys[i];
                        var basemap = bmapListing[bmapKey];
                        //console.log(basemap);
                        if (!map.hasLayer(basemap)) {
                            console.log("adding basemap layer to map");
                            basemap.addTo(map);
                            // test setting extent to show whole basemap as fix for arctic zoom issue
                            //console.log(basemap)
                            //console.log(basemap.getBounds())
                            //map.fitWorld() // didt help
                        }
                        layerControl.removeLayer(basemap, bmapKey);
                        layerControl.addBaseLayer(basemap, bmapKey);
                    }
                }
            }

        }

        // Set new default parameter
        // Do this whether or not projection changes, dataset is new
        if (a_parameters == "") {
            console.log(" - SET PARAMETER (AS 1ST PARAMETER)"); // - SST, ice concentration...
            // to do: change to use previous if exists
            for (i = 0; i < ds_info.parameters.length; i++) {
                parameter = ds_info.parameters[i]["name"];
                if (i == 0) {
                    a_parameters = parameter;
                    break;
                }
            }
        }
        //console.log(a_parameters)
        console.log('Projection Click is updating the url now')
        updateUrl(a_subname, a_parameters, a_time, a_projection, a_colorbar);
        //console.log(pageLoad)
        // call python with the new info
        // get new images in new projection
        //if (pageLoad) {
            // don't call python here, it's called right after this on click

            //if (pageLoad == 0){
            //update new request to have the new projection
            //    for ( i = 0; i < reqs.length; i++ ) { 
            //      req = reqs[i]
            //      req["projection"] = a_projection
            //    }
            //    console.log('calling python from projection onclick')
            //    callPython(reqs)
            //}
        //} else {
            //call python here
            reqs = [];
            //console.log(a_projection)
            //console.log(a_ds_id)
            if (pageLoad !== 1){
                console.log('NOT PAGE LOAD');
            }
            //console.log(a_time)
            //console.log(a_subname)
                
            //console.log(ds_info)
            // Create the info to send to getImage script
            for (i = 0; i < ds_info.parameters.length; i++) {
                try {
                    mask_vals = ds_info.parameters[j]["maskedValues"];
                }
                catch(err) {
                    mask_vals = 'None'
                }
                //if (i==0){
                    req = {
                        "catalog_v": catalog_v,
                        "projection": a_projection,
                        "ds_id": a_ds_id,
                        "entryId": entry["entryId"],
                        "parameter": ds_info.parameters[i]["name"],
                        "time": a_time,
                        "tab": a_subname,
                        "colorBar": ds_info.parameters[i]["colorbar"]["query"],
                        "cache_date": cache_date,
                        "mask_vals": mask_vals
                    };
                    reqs.push(req);
                //} // hack to only use first
            }
            console.log('Projection Click is calling python now')
            
            timep = makeDatePrint(req["time"]);
            var imageDir = "/map_images/" + catalog_v + "/" + reqs[0]["entryId"] + "/" + reqs[0]["ds_id"] + "/";
            var fromPyFn = imageDir + reqs[0]["parameter"] + "_" + reqs[0]["projection"] + "_" + timep + "_" + reqs[0]["cache_date"]+".json";
          
            
            try{
                $.getJSON(fromPyFn, {}).fail(function () {
                    console.log("No image yet, call python");
                    callPython(reqs);
                }).done(function (imgInfo) {
                    console.log('Have an image already, just use that')
                    for (var i = 0; i < reqs.length; i++) {
                        var req = reqs[i];
                        makeLayer(req);
                    }
                });
            } catch(err){

            }
        //}
        clearMap = 0;
    }); // end change projection



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
        console.log('button clicked')
        console.log(ds_info["proj_crs_code"])
        if (ds_info["proj_crs_code"] != "EPSG:4326") {

        }

        // In the future, check to see if there is a polygon drawn on the map
        
        // If no polygon on map already, use whole map bounds
        // Get map extent in lat/lon 
        mapBounds = map.getBounds();

        //console.log(reqs[0]["projection"])
        //console.log(proj4defs)
        //console.log(getProj4Key[reqs[0]["projection"]])

        // *** Make the ERDDAP download form request ***
        // If this is a polar projected map and the data is in 4326 
        //   there is a bunch of stuff to do to get the correct request/requests
        // Straightforward for the 4326 Map
        // Cases could be :
        //   the map is in polar projection but the data is in 4326
        //   the map is in polar projection and the data is in a polar projection that is not exactly the same i.e. 3031/3412, 
        //console.log(reqs[0]["projection"]);
        
        if ((reqs[0]["projection"] == "epsg3413" || reqs[0]["projection"] == "epsg3031") && (ds_info["proj_crs_code"] == "EPSG:4326")) { //& data_projection == "EPSG:4326") {
            // Polar Map but 4326 Data
            // Convert map bounds (polar coordinates) to the lat/lon bounds needed for an ERDDAP request
            //console.log(reqs[0]["projection"]);
            
            // use map projection to set the pole latitude
            if (reqs[0]["projection"] == "epsg3413") {
                poleLat = 90
            } else if (reqs[0]["projection"] == "epsg3031"){
                poleLat = -90
            }
            
            // Projection of Leaflet getBounds() and the projection for ERDDAP 
            var latlonProj4Str = proj4defs["EPSG:4326"];   
            // Projection for current Map
            var mapProj4Str = proj4defs[getProj4Key[reqs[0]["projection"]]]; 

            // Get 4326 Map Extent Coordinates
            // not useful as is, we don't have all four corners
            // need to convert to polar coordinates to get the other corners
            tr = {
                "lat": mapBounds._northEast.lat,
                "lon": mapBounds._northEast.lng
            };
            ll = {
                "lat": mapBounds._southWest.lat,
                "lon": mapBounds._southWest.lng
            };


            // Get projected coordinates of the bounds and add to coordinate object
            // Proj4 uses order lon, lat 
            // Get Projected Map Extent Coordinates
            tr_projCoords = proj4(latlonProj4Str, mapProj4Str, [mapBounds._northEast.lng, mapBounds._northEast.lat]);
            tr["x"] = tr_projCoords[0];
            tr["y"] = tr_projCoords[1];
            ll_projCoords = proj4(latlonProj4Str, mapProj4Str, [mapBounds._southWest.lng, mapBounds._southWest.lat]);
            ll["x"] = ll_projCoords[0];
            ll["y"] = ll_projCoords[1];


            // Calculate the other corners of the map in projected coordinates
            tl_projCoords = [ll.x, tr.y];
            tl = {
                "x": tl_projCoords[0],
                "y": tl_projCoords[1]
            };
            lr_projCoords = [tr.x, ll.y];
            lr = {
                "x": lr_projCoords[0],
                "y": lr_projCoords[1]
            };

            // Convert the new corners to 4326 Coods (lat and lon)
            tl_lonlat = proj4(mapProj4Str, latlonProj4Str, [ll.x, tr.y]);
            lr_lonlat = proj4(mapProj4Str, latlonProj4Str, [tr.x, ll.y]); 
            tl.lon = tl_lonlat[0];
            tl.lat = tl_lonlat[1];
            lr.lon = lr_lonlat[0];
            lr.lat = lr_lonlat[1];

            // Confirm we now have the four corners
            // Show markers on the map where the points for the calculated corners are
            // Even though the map is projected, Leaflet wants these in 4326
            //var trmarker = L.marker([tr.lat, tr.lon]); //.addTo(map);
            //var llmarker = L.marker([ll.lat, ll.lon]); //.addTo(map);
            //var tlmarker = L.marker([tl.lat, tl.lon]); //.addTo(map);
            //var lrmarker = L.marker([lr.lat, lr.lon]); //.addTo(map);            

            
            // Those points are not the information needed for ERDDAP
            //  because they do not represent the min/max latitude and longitude
            //  They represent the min/max projected coordinates
            // When reprojecting to lat/lon they are no longer mins and maxs
            // There are also special cases if:
            //    the area crosses the antimeridian 
            //    the area covers the pole
            // Creating a polygon to conceptualize/test how this will work 
            //    and to see how to generate the info needed for ERDDAP
            
            // Create a polygon with the four corner points in lat/lon
            var myPointList = [[tl.lat, tl.lon], [tr.lat, tr.lon], [lr.lat, lr.lon], [ll.lat, ll.lon]];
            //console.log(myPointList);

            initialPolygon = new L.Polygon(myPointList, {
                color: "red",
                weight: 3,
                opacity: 0.5,
                smoothFactor: 1,
                noWrap: true
            });
            //initialPolygon.addTo(map);
            //console.log(initialPolygon);

            // Now work in projected space to see if the polygon crosses the pole
            // if it does, add points at either the ends (or antimeridian) to connect it to the pole

            // Make a list of the projected coordinates
            var projectedPointList = [];
            for (i = 0; i < myPointList.length; i++) {
                thisPointLon = myPointList[i][1];
                thisPointLat = myPointList[i][0];
                var projCoords = proj4(latlonProj4Str, mapProj4Str, [thisPointLon, thisPointLat]);
                projectedPointList.push(projCoords);
            }
            //console.log(projectedPointList);

            // Check if polygon contains pole
            // Check for point in polygon with projected point list
            // This algorithm has known errors if the point is exactly on the edge of the polygon
            // The pole is always [0,0] whether N or S, because we are working in projected space
            console.log("Check if polygon contains pole:");
            var polyContainsPole = pip([0, 0], projectedPointList);
            console.log(polyContainsPole);

            // Check for Antimeridian Crossing

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
                //console.log(latLngA);
                //console.log(latLngB);
                xM = L.Wrapped.isCrossMeridian(latLngA, latLngB);
                
                xAM = Math.abs(latLngA.lng - latLngB.lng) >= 180;
                if (xAM) {
                    // If the segement crosses the antimeridian
                    console.log("Crosses the antimeridian at this segment");
                    // add current starting point to the growing point list
                    pointListWithAntimeridian.push(myPointList[i]);
                    
                    // at antimeridian need to know if a point is needed at the minimum 
                    // or at the maximum and where exactly to put it in the list
                    lonIncreasing = latLngA.lng - latLngB.lng > 0;

                    // Test to see if we also need to add points at the north/south pole
                    // Add polygon point at antimeridian
                    // First Calculate Latitude at which polygon segment crosses the antimeridia
                    // Then insert that point into the polygon
                    xM_lat = L.Wrapped.calculateAntimeridianLat(latLngA, latLngB);

                    xmlatstr = xM_lat.toString();
                    xM_lat = parseFloat(xmlatstr.slice(0, xmlatstr.indexOf(".") + 5));
                    //aBetterAntimeridianLat(latLngA, latLngB);
                    xM_point1 = [xM_lat, -180];
                    xM_point2 = [xM_lat, 180]; // its ok to do this because these points are just for erddap and for my map view

                    if (polyContainsPole) {
                        console.log("Making a 360 degree polygon that ends at antimeridian");
                        if (lonIncreasing) {
                            pointListWithAntimeridian.push([xM_lat, 180]); // add new point at the maximum lon
                            // if contains pole also add points for the pole
                            if (polyContainsPole) {
                                pointListWithAntimeridian.push([poleLat, 180]);
                                pointListWithAntimeridian.push([poleLat, -180]);
                            }
                            pointListWithAntimeridian.push([xM_lat, -180]); // add new point at the minimum lon
                        } else {
                            // segment vertex point could alreadybe on the antimeridian 
                            // dont duplicate if already has value at this lon
                            if ([xM_lat, -180] !== myPointList[i]) {
                                pointListWithAntimeridian.push([xM_lat, -180]); // add new point at the minimum lon
                            }
                            if (polyContainsPole) {
                                pointListWithAntimeridian.push([poleLat, -180]);
                                pointListWithAntimeridian.push([poleLat, 180]);
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
                    //console.log("segment does not cross the antimeridian");
                    // But may still contain a pole...
                    // !!!!
                    pointListWithAntimeridian.push(myPointList[i]);
                }
            } // polygon created
            
            // If Crosses Antimeridian
            // make two requests, creating two polygons to do this
            //console.log(pointListWithAntimeridian);
            //console.log(needsSplitting);

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

                    //console.log(latLngB.lng);

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
                //console.log(negPolygon.getBounds());

                posPolygon = new L.Polygon(positiveP, {
                    color: "red",
                    weight: 3,
                    opacity: 0.9,
                    smoothFactor: 1,
                    noWrap: true
                });
                //console.log(posPolygon.getBounds());
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
            //console.log(fullPolygon);

            varsForERDDAP = getActive("var");
            timeForERDDAP = getActive("time");
            dsForERDDAP = getActive("dataset");

            requests = [];

            // Create the request for the full extent 
            // if crosses antimeridian still produce this request for the large download
            boundsForERDDAP = fullPolygon.getBounds();
            //console.log(boundsForERDDAP);
            yMax = boundsForERDDAP._northEast.lat;
            yMax = setDecimalsString(yMax, 3); // limit to two decimal places
            yMin = boundsForERDDAP._southWest.lat;
            yMin = setDecimalsString(yMin, 3);
            xMax = boundsForERDDAP._northEast.lng;
            xMax = setDecimalsString(xMax, 3);
            xMin = boundsForERDDAP._southWest.lng;
            xMin = setDecimalsString(xMin, 3);
            thisQueryString = "?dataset=" + dsForERDDAP + "&var=" + varsForERDDAP + "&y_max=" + yMax + "&y_min=" + yMin + "&x_max=" + xMax + "&x_min=" + xMin + "&time_min=" + timeForERDDAP + "&time_max=" + timeForERDDAP;
            //console.log(thisQueryString);
            requests.push(thisQueryString);

            // If crosses antimeridian also create the two requests for the smaller download (not full 360)
            // will likely not use it in the future in the hopes that
            // there will be a solution for requesting these areas with one request from ERDDAP
            // by creating a zero to 360 dataset that doesn't have the antimeridian discontinuity

            if (needsSplitting == 1) {

                boundsForERDDAP = posPolygon.getBounds();
                //console.log(boundsForERDDAP);
                yMax = boundsForERDDAP._northEast.lat;
                yMax = setDecimalsString(yMax, 3);
                yMin = boundsForERDDAP._southWest.lat;
                yMin = setDecimalsString(yMin, 3);
                xMax = boundsForERDDAP._northEast.lng;
                xMax = setDecimalsString(xMax, 3);
                xMin = boundsForERDDAP._southWest.lng;
                xMin = setDecimalsString(xMin, 3);
                thisQueryString = "?dataset=" + dsForERDDAP + "&var=" + varsForERDDAP + "&y_max=" + yMax + "&y_min=" + yMin + "&x_max=" + xMax + "&x_min=" + xMin + "&time_min=" + timeForERDDAP + "&time_max=" + timeForERDDAP;
                //console.log(thisQueryString)
                requests.push(thisQueryString);

                boundsForERDDAP = negPolygon.getBounds();
                yMax = boundsForERDDAP._northEast.lat;
                yMax = setDecimalsString(yMax, 3);
                yMin = boundsForERDDAP._southWest.lat;
                yMin = setDecimalsString(yMin, 3);
                xMax = boundsForERDDAP._northEast.lng;
                xMax = setDecimalsString(xMax, 3);
                xMin = boundsForERDDAP._southWest.lng;
                xMin = setDecimalsString(xMin, 3);
                thisQueryString = "?dataset=" + dsForERDDAP + "&var=" + varsForERDDAP + "&y_max=" + yMax + "&y_min=" + yMin + "&x_max=" + xMax + "&x_min=" + xMin + "&time_min=" + timeForERDDAP + "&time_max=" + timeForERDDAP;
                requests.push(thisQueryString);
            }
            console.log(requests);

            pnl = window.location.pathname.split("/");
            downloadPageUrlRoot = window.location.protocol + "//" + window.location.host + "/" + pnl[1] + "/" + pnl[2] + "/download/";

            if (requests.length == 1) {
                // Does not cross antimeridian, one request
                for (i = 0; i < requests.length; i++) {
                    //console.log(requests[i])
                    pnl = window.location.pathname.split("/");
                    downloadPageUrl = downloadPageUrlRoot + requests[i];
                    //console.log(downloadPageUrl);
                    //window.open(downloadPageUrl, "_blank", "true");
                    window.open(downloadPageUrl, "_self", "true");
                }
            } else if (requests.length == 3) {
                // crosses antimeridian, offer one large request or two split requests
                // Show Modal
                $("#downloadConfModal").modal("show");
                $(".download-all-btn").attr("href", downloadPageUrlRoot + requests[0]);
                $(".download-1-btn").attr("href", downloadPageUrlRoot + requests[1]);
                $(".download-2-btn").attr("href", downloadPageUrlRoot + requests[2]);
            } else {
                console.log("SOMETHINGS UP WITH REQUESTS LENGTH");
                console.log(requests.length);
            }
        }
        else if (reqs[0]["projection"] == "epsg4326" && ds_info["proj_crs_code"] == "EPSG:4326"){
            // Global Map and 4326 Data
            console.log('global')
            // Get 4326 Map Extent Coordinates
            yMax = mapBounds._northEast.lat;
            yMax = setDecimalsString(yMax, 3);
            yMin = mapBounds._southWest.lat;
            yMin = setDecimalsString(yMin, 3);
            xMax = mapBounds._northEast.lng;
            xMax = setDecimalsString(xMax, 3);
            xMin = mapBounds._southWest.lng;
            xMin = setDecimalsString(xMin, 3);

            varsForERDDAP = getActive("var");
            timeForERDDAP = getActive("time");
            dsForERDDAP = getActive("dataset");

            thisQueryString = "?dataset=" + dsForERDDAP + "&var=" + varsForERDDAP + "&y_max=" + yMax + "&y_min=" + yMin + "&x_max=" + xMax + "&x_min=" + xMin + "&time_min=" + timeForERDDAP + "&time_max=" + timeForERDDAP;
            //console.log(thisQueryString);

            pnl = window.location.pathname.split("/");
            downloadPageUrlRoot = window.location.protocol + "//" + window.location.host + "/" + pnl[1] + "/" + pnl[2] + "/download/";
            downloadPageUrl = downloadPageUrlRoot + thisQueryString;
            //console.log(downloadPageUrl)
            window.open(downloadPageUrl, "_self", "true");
        } else {
            // Arctic Map 3413 and 3411 NSIDC polar projected data
            // Get map extent and convert polar 3031 coordinates
            // Convert map extent to the data projection coordinates (should be very close...)
            // Pass the form the request in projected coordinates

            // Projection of Leaflet getBounds() and the projection for ERDDAP 
            var latlonProj4Str = proj4defs["EPSG:4326"];   

            // Projection for current Map
            var mapProj4Str = proj4defs[getProj4Key[reqs[0]["projection"]]]; 
            var dataProj4Str = proj4defs[ds_info["proj_crs_code"]]
            // Get 4326 Map Extent Coordinates
            // not useful as is, we don't have all four corners
            // need to convert to polar coordinates to get the other corners
            tr = {
                "lat": mapBounds._northEast.lat,
                "lon": mapBounds._northEast.lng
            };
            ll = {
                "lat": mapBounds._southWest.lat,
                "lon": mapBounds._southWest.lng
            };


            // Get projected coordinates of the bounds and add to coordinate object
            // Proj4 uses order lon, lat 
            // Get Projected Map Extent Coordinates
            // From the default leaflet response (4326)
            // To the projection of the data (i.e. 3411)
            tr_projCoords = proj4(latlonProj4Str, dataProj4Str, [mapBounds._northEast.lng, mapBounds._northEast.lat]);
            tr["x"] = tr_projCoords[0];
            tr["y"] = tr_projCoords[1];
            ll_projCoords = proj4(latlonProj4Str, dataProj4Str, [mapBounds._southWest.lng, mapBounds._southWest.lat]);
            ll["x"] = ll_projCoords[0];
            ll["y"] = ll_projCoords[1];
            // Derive the other corners of the map in projected coordinates
            tl_projCoords = [ll.x, tr.y];
            tl = {
                "x": tl_projCoords[0],
                "y": tl_projCoords[1]
            };
            lr_projCoords = [tr.x, ll.y];
            lr = {
                "x": lr_projCoords[0],
                "y": lr_projCoords[1]
            };

            // was creating a polygon and using get bounds to set the erddap request for the other cases
            // will try to not do that, but may need to
            yMax = tl.y;
            yMax = setDecimalsString(yMax, 3);
            yMin = lr.y;
            yMin = setDecimalsString(yMin, 3);
            xMax = lr.x;
            xMax = setDecimalsString(xMax, 3);
            xMin = tl.x;
            xMin = setDecimalsString(xMin, 3);

            varsForERDDAP = getActive("var");
            timeForERDDAP = getActive("time");
            dsForERDDAP = getActive("dataset");

            thisQueryString = "?dataset=" + dsForERDDAP + "&var=" + varsForERDDAP + "&y_max=" + yMax + "&y_min=" + yMin + "&x_max=" + xMax + "&x_min=" + xMin + "&time_min=" + timeForERDDAP + "&time_max=" + timeForERDDAP;
            //console.log(thisQueryString);

            pnl = window.location.pathname.split("/");
            downloadPageUrlRoot = window.location.protocol + "//" + window.location.host + "/" + pnl[1] + "/" + pnl[2] + "/download/";
            downloadPageUrl = downloadPageUrlRoot + thisQueryString;
            //console.log(downloadPageUrl)
            window.open(downloadPageUrl, "_self", "true");
        } 
    });

    //Bounds Button for Testing
    $(".getBoundsBtn").click(function () {
        pixelBounds = map.getPixelBounds();
        //console.log(pixelBounds);
        pixelmaxX = pixelBounds["max"]["x"];
        pixelmaxY = pixelBounds["max"]["y"];
        //console.log(pixelmaxX, pixelmaxY);
        mapBounds = map.getBounds();
        console.log(mapBounds);
        worldBounds = map.getPixelWorldBounds();
        console.log(worldBounds);
        console.log(EPSG4326CRS);
        console.log(EPSG3031CRS);
        in3031 = proj4("EPSG:4326", "EPSG:3031", [-63, -57]);
        console.log(in3031);
        var TIPmaxmarker = L.marker(in3031); //.addTo(map);
        //var worldmaxmarker = L.marker([worldmaxX, worldmaxY]).addTo(map);
        //$(".displayBounds").html("<p>"+map.getPixelBounds()+"</p><p>"+map.getPixelWorldBounds()+" </p>")
    });
});