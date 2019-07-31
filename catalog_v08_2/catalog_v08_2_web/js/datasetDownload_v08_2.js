function getDecDigits(input) {
    inputStr = input.toString();
    if (inputStr.indexOf('.') != -1) {
      decimalDigits = inputStr.length - inputStr.lastIndexOf('.');
    } else {
      decimalDigits = 0;
    }
    return decimalDigits;
  }


/**
* Returns the closest number from a sorted array.
* Using to determine closest time within dataset to the user requested time
**/
function closest(arr, target, bigger) {

    var closestObj = {}
    if (!(arr) || arr.length == 0){
      //array is length of 0, breaking
      return null;
    }
    if (!(arr) || arr.length == 1) {
      //array is length of one breaking
      return null;
    }
    for (var i=1; i<arr.length; i++) {
        // As soon as a number bigger than target is found, return the previous or current
        // number depending on which has smaller difference to the target.
        if (arr[i] == target) {
          //EXACT MATCH
          closestObj['closestTime'] =arr[0];
          closestObj['exactTimeMatch'] = 1
          return closestObj
        } else if (arr[i] > target) {
            //returning closest
            var p = arr[i-1];
            var c = arr[i]

            if (bigger == 1){
              //provide the next larger value
              closestObj['closestTime']= c
            } else {
              //provide the closest lower value
              closestObj['closestTime']= p
            }
            closestObj['exactTimeMatch'] = 0
            //console.log(closestObj)
            return closestObj
        } 
    }
    //No number in array is bigger so return the last
    closestObj['closestTime'] = arr[arr.length-1];
    closestObj['exactTimeMatch'] = 0
    //console.log(closestObj)
    return closestObj
}

/*
   *  Some data formats only allow one timestamp
   *  This checks the data format and the selected date range
   *  If more than one time stamp is selected
   *  A form validation error message and help text are displayed
   *  In the date entry section
   */  
  function validateTimeCount() {
    console.log('Validating format/time stamp compatability')
    validTimeCountFlag = 1
    // get selected format
    fmt = getActive('fmt')
    // check if format is an image format
    if ( fmt == "largePng" || fmt == "tif" ){ 
      // get the current number of time stamps selected
      // This is calculated as part of the getSize Estimate function
      try {
        // if get Size Estimate has run already, we will already have a count
        timestamp_count 
      } catch (err){
        var sizeEstimate = getSizeEstimate(); // run getsize estimate to get timestamp count
      }
      if ( timestamp_count > 1 ){
        // Set flag so on sumbit catches this
        validTimeCountFlag = 0
        activeDateValidationErrors = activeDatasetPanelEl + ' .dateValidationErrors'
        if ($(activeDateValidationErrors).children('.time-count-error').length < 1) {
          $(activeDateValidationErrors).append('<div class="time-count-error alert alert-danger fade in "><p><i class="fa fa-exclamation-triangle" '+
                  'aria-hidden="true"></i> Please select a single time stamp. An image format is selected, which requires one time stamp instead of a range.</p></div>')
          $(activeDateValidationErrors).removeClass('hidden')  
        }

        //$('.timeCountError').html('<p><i class="fa fa-exclamation-triangle" '+
        //          'aria-hidden="true"></i> Please select a single time stamp. You have selected an image format which requires one time stamp instead of a range.</p>')
        //$('.timeCountError').removeClass('hidden')
        // Highlight date inputs as invalid
        if ( !($('.time-min-input').hasClass('invalidInput'))){
          $('.time-min-input').addClass('invalidInput')    
        }
        if ( !($('.time-max-input').hasClass('invalidInput'))){
          $('.time-max-input').addClass('invalidInput')    
        }
        // dates may be within range but need to show as invalid, remove valid date indicator
        if ($('.time-min-validationIcon').hasClass('fa fa-check-circle')) {
          $('.time-min-validationIcon').removeClass('fa fa-check-circle')
        }
        if ($('.time-max-validationIcon').hasClass('fa fa-check-circle')) {
          $('.time-max-validationIcon').removeClass('fa fa-check-circle')
        }
      } else {
        // valid make sure no error message is displayed on date field
        if ($('.time-count-error').hasClass('hidden')) {
          //skip
        } else {
          //console.log('format ok, hiding error If there was one')
          $('.time-count-error').addClass('hidden')
        }
        $('.time-min-input').removeClass('invalidInput')   
        $('.time-max-input').removeClass('invalidInput')   
      }
    } else {
      // not an image format , any number of timestamps is ok
      if ($('.time-count-error').hasClass('hidden')) {
          //skip
      } else {
          //console.log('format ok, hiding error If there was one')
          $('.time-count-error').addClass('hidden')
      }
      $('.time-min-input').removeClass('invalidInput')   
      $('.time-max-input').removeClass('invalidInput')   
    }
  }  

function getDifference(startNum, endNum){
  var diff
  if (endNum >= 0 && startNum >= 0) {
    // Both positive
    diff = Math.abs(startNum - endNum)
  } else if ( endNum < 0 && startNum < 0) {
    //both negative 
    diff = Math.abs(startNum - endNum)
  } else if (endNum >= 0 && startNum < 0 ){
    //not same sign
    diff = Math.abs(startNum) + Math.abs(endNum)
  } else if (startNum >= 0 && endNum < 0 ){
    //not same sign
    diff = Math.abs(startNum) + Math.abs(endNum)
  }
  return diff
}


/*
 * Convert to iso date 
 * for consistency across preview and download interfaces
 * could be a variety of inputs incuding js or time string
 * Adding May 24, 2018
 */
function makeErddapDate (inputDate) {
    //console.log(inputDate)
    inputDate = new Date(Date.parse(inputDate))
    //console.log(inputDate)
    // looked into useing this: isoDate = inputDate.toISOString()
    // but because calendar has to fake being iso cant use it
    // manually forming ERDDAP date
    erddapDate = inputDate
    return erddapDate
}

/*
 * Get the query part of the page url
 * Return strings as a list
 */
function getQueryStrings(){
    var urlParts = window.location.pathname.split("/")
    var queryStrings = window.location.search.substr(1) // remove the ?
    queryStrings = queryStrings.split("&")
    return queryStrings
}

/*
 * Show/Hide help text and warning messages 
 * depending on requested format and estimated size 
 */
function validateRequestSize(){
  console.log('validateRequestSize() Start')
  var fmt = getActive('fmt')
  if ( fmt == 'nc' || fmt == 'mat' ){
    var sizeEstimate = getSizeEstimate()
    //console.log(sizeEstimate)
    if ( sizeEstimate.Mb >= 2000 ){
      //console.log(active_ycoord_strideBtnEl)
      //console.log($(active_ycoord_strideBtnEl).html())
      //console.log(active_time_strideBtnEl)
      //console.log('over 2GB')
      if (! ($(".sizeEstimateNetCDF").hasClass("text-danger")) ){
        $(".sizeEstimateNetCDF").addClass('text-danger');
      }
      if (! ($(".downloadFormSubmitBtn").hasClass('disabled'))){
         $(".downloadFormSubmitBtn").addClass('disabled'); 
      }
     
      $(".xl-size-help").removeClass('hidden');
    } else {
      
      if (! $(".xl-size-help").hasClass('hidden')){
        $(".xl-size-help").addClass('hidden');
      }
      if ($(".sizeEstimateNetCDF").hasClass("text-danger")){
        $(".sizeEstimateNetCDF").removeClass('text-danger');
      }
      if ($(".downloadFormSubmitBtn").hasClass('disabled')){
         $(".downloadFormSubmitBtn").removeClass('disabled'); 
      }
    }
    if ( sizeEstimate.Mb > 30 ) {
     $(".size-help").removeClass('hidden'); 
   } else {
    if (! $(".size-help").hasClass('hidden')){
        $(".size-help").addClass('hidden');
      }
   }
    if ( sizeEstimate.Mb > 30 && sizeEstimate.Mb < 2000 ){
      // Set color of size sentence text
      if (! ($(".sizeEstimateNetCDF").hasClass("text-warning")) ){
        $(".sizeEstimateNetCDF").addClass('text-warning');
      }
    } else {
      if ($(".sizeEstimateNetCDF").hasClass("text-warning")){
        $(".sizeEstimateNetCDF").removeClass('text-warning');
      }
    }
    $(".sizeEstimate").text(sizeEstimate.Sentence);
    $(".sizeEstimateNetCDF").removeClass('hidden');
  } else {
    // Not NetCDF or Mat
    if (! $(".sizeEstimateNetCDF").hasClass('hidden')){
      $(".sizeEstimateNetCDF").addClass('hidden');
    }
    if (! $(".xl-size-help").hasClass('hidden')){
      $(".xl-size-help").addClass('hidden');
    }
  }
  console.log('validateRequestSize() End')
}

/*
 * Update the url with new info
 */
function updateUrl(urlUpdates) {

    pageLoad = 0
    console.log('## UPDATING URL ##')

    // Get all url query string parameters and values to establish state before updates
    var subname = getActive('dataset')      // Get active subname from url    
    var vars = getActive('var')
    var y_min = getActive('y_min'); //console.log(y_min)
    var y_stride = getActive('y_stride')
    var y_max = getActive('y_max')
    var x_min = getActive('x_min')
    var x_stride = getActive('x_stride')
    var x_max = getActive('x_max')
    var time_min = getActive('time_min')
    var time_stride = getActive('time_stride'); //console.log(time_stride)
    var time_max = getActive('time_max')
    var fmt = getActive('fmt')

    // Iterate over the updated queries submitted to this function
    Object.keys(urlUpdates).forEach(function(key) {
      //console.log(key, urlUpdates[key]);
      if(key =="new_time_min"){
        time_min = urlUpdates[key]; //console.log('new_time_min submitted to url'); console.log(time_min)
      } else if(key =="new_time_stride"){
        time_stride = urlUpdates[key]; //console.log('new time_stride submitted to url'); console.log(time_stride)
      } else if(key =="new_time_max"){
        time_max = urlUpdates[key]; //console.log('new_time_max submitted to url')
      } else if(key =="new_ycoord_min"){
        y_min = urlUpdates[key]; //console.log('new_ycoord_min submitted to url')
      } else if(key =="new_ycoord_max"){
        y_max = urlUpdates[key]; //console.log('new_ycoord_max submitted to url')
      } else if(key =="new_ycoord_stride"){
        y_stride = urlUpdates[key]; //console.log('new y_stride submitted to url')
      } else if(key =="new_xcoord_min"){
        x_min = urlUpdates[key]; //console.log('newmin lon submitted to url')
      } else if(key =="new_xcoord_stride"){
        x_stride = urlUpdates[key]; //console.log('new x_stride submitted to url')
      } else if(key =="new_xcoord_max"){
        x_max = urlUpdates[key]; //console.log('new max lon submitted to url')
      } else if(key =="new_vars"){
        vars = urlUpdates[key]; //console.log('new vars submitted to url')
      } else if(key =="new_subname"){
        subname = urlUpdates[key]; //console.log('new subname submitted to url')
      } else if(key =="newFmt"){
        fmt = urlUpdates[key]; //console.log('new format submitted to url')
      }
    });

    // Update the Url
    queries = []
    queries.push("dataset=" + subname.toLowerCase())
    queries.push("var=" + vars)
    if (typeof time_min !=  "undefined") { 
      queries.push("time_min=" + time_min)
    }
    if (typeof time_stride !=  "undefined") { 
      queries.push("time_stride=" + time_stride)
    }
    if (typeof time_max !=  "undefined") { 
      queries.push("time_max=" + time_max)
    }
    if (typeof y_min !=  "undefined") { 
      queries.push("y_min=" + y_min)
    }
    if (typeof y_stride !=  "undefined") { 
      queries.push("y_stride=" + y_stride)
    }
    if (typeof y_max !=  "undefined") {
      queries.push("y_max=" + y_max)
    }
    if (typeof x_min !=  "undefined") {
      queries.push("x_min=" + x_min)
    }
    if (typeof x_stride !=  "undefined") {
      queries.push("x_stride=" + x_stride)
    }
    if (typeof x_max !=  "undefined") {
      queries.push("x_max=" + x_max)
    }
    if (typeof fmt !=  "undefined") {
      queries.push("fmt=" + fmt)
    }
    //console.log(queries)
    var urlParts = window.location.pathname.split("/")
    var newUrl = window.location.pathname + "?" + queries.join("&")  

    // SEND ACTIVE DATASET info to url   
    history.replaceState(null, null, newUrl);
    console.log('calling get size estimate')
    getSizeEstimate()
    console.log('calling validate request size')
    validateRequestSize()
    console.log('*** URL UPDATE COMPLETE ***')
}

function jsDate2mmddyyyy (milliDate) {
  jsdate = new Date(milliDate);
  var dd = jsdate.getDate();
  var mm = jsdate.getMonth() + 1;
  var yyyy = jsdate.getFullYear();
  if (dd < 10) {
    dd = '0' + dd;
  }
  if (mm < 10){
    mm = '0' + mm;
  }
  mmddyyy = mm +'/'+ dd +'/'+ yyyy
  return mmddyyy
}

/*
 * Calculate the average difference between timestamps 
 * Used for file size estimates 
 */
function getDatasetTimeResolution(dataset){
  timeListDate = []
  for ( i = 0; i < dataset.time.timeList.length; i++ ) { 
    timeListDate.push(new Date(Date.parse(dataset.time.timeList[i])))
  }
  const averageDelta = ([x,...xs]) => {
  if (x === undefined)
    return NaN
  else
    return xs.reduce(
      ([acc, last], x) => [acc + (x - last), x],
      [0, x]
    ) [0] / xs.length
  };
  time_spacingMs = averageDelta(timeListDate)
  return time_spacingMs
}

/*
 *  Calculate approximate requested file size
 *  Uses Lat(Min, Max, Spacing), 
 *       Lon(Min, Max, Spacing), 
 *       Time(Min, Max, Spacing)
 *       number of parameters to estimate netcdf/mat file sizes
 */
function getSizeEstimate(){

  //console.log('Starting calculate Size estimate')

  ycoord_start = getActive('y_min'), 
  ycoord_spacing = getActive('y_stride'), 
  ycoord_end = getActive('y_max'), 
  
  xcoord_start = getActive('x_min'), 
  xcoord_spacing = getActive('x_stride'), 
  xcoord_end = getActive('x_max'), 
  
  time_start = getActive('time_min'), 
  time_spacing = getActive('time_stride'), 
  time_end = getActive('time_max'),
  parList = getActive('var')
  //console.log(ycoord_start)
  //console.log(ycoord_spacing)
  //console.log(ycoord_end)
  //console.log(xcoord_start)
  //console.log(xcoord_spacing)
  //console.log(xcoord_end)
  //console.log(time_start)
  //console.log(time_spacing)
  //console.log(time_end)
  //console.log(parList)
  // Could make this more flexible based more loosely on dimensions
  // Get Dataset Info
  activeDatasetId = getActive('datasetid')
  //console.log(dataset)
  //dataset = getDatasetInfoById(activeDatasetId)
  //console.log(dataset)
  datasetTimeSpacingMs = getDatasetTimeResolution(dataset)
  //console.log(datasetTimeSpacingMs)
  reqTimeDiffMs = new Date(Date.parse(getActive('time_max'))) - new Date(Date.parse(getActive('time_min')))
  timestamp_count = Math.round( reqTimeDiffMs / datasetTimeSpacingMs ) + 1
  
  ycoord_range = getDifference(ycoord_start, ycoord_end)
  //console.log(ycoord_range)
  ycoord_fullCount = Math.round(ycoord_range / parseFloat(dataset.ycoord.resolution_val))
  //console.log(ycoord_fullCount)
  ycoord_count = ycoord_fullCount / ycoord_spacing 
  //console.log(ycoord_count)

  xcoord_range = getDifference(xcoord_start, xcoord_end)
  xcoord_fullCount = Math.round(xcoord_range / parseFloat(dataset.xcoord.resolution_val))
  xcoord_count = xcoord_fullCount / xcoord_spacing

  var_count = parList.split(',').length
  //console.log('Time Count = ', timestamp_count.toString())
  //console.log('xcoord (or lon) Count = ', xcoord_count.toString())
  //console.log('ycoord (or lat) Count = ', ycoord_count.toString())
  //console.log('Param Count = ', var_count.toString())
  sizeEstimateBits = (timestamp_count*64) + (xcoord_count*64) + (ycoord_count*64) + (var_count*timestamp_count*xcoord_count*ycoord_count*64)
  //console.log(sizeEstimateBits)
  sizeEstimateMB = Math.round((sizeEstimateBits/8) / 1000000)
  if ( sizeEstimateBits < 8388608 ){
    // show KB
    sizeEstimateKB = Math.round((sizeEstimateBits/8) / 1000)
    sizeEstimateString = '< 1MB'//parseFloat(sizeEstimateKB) + ' KB'
  } else if ( sizeEstimateBits >= 8388608 &&  sizeEstimateBits < 8589934592 ){ 
    // show MB
    sizeEstimateString = parseFloat(sizeEstimateMB) + ' MB'
  } else {
    // show GB
    sizeEstimateGB = Math.round((sizeEstimateBits/8) / 1000000000)
    sizeEstimateString = parseFloat(sizeEstimateGB) + ' GB'
  }
  sizeEstimateSentence = "Download size estimate as configured: " + sizeEstimateString  
  sizeEstimate = {
    'Mb':sizeEstimateMB,
    'String': sizeEstimateString,
    'Sentence': sizeEstimateSentence
  } 
  //console.log(sizeEstimate.Sentence)
  $(".sizeEstimate").text(sizeEstimate.Sentence);
  return sizeEstimate
}

/*
 * Checks input upper latitude against dataset metadata
 * Resets field to dataset maximum if it is out of range
 * called on update form values
 * To Do: add an indication to the user that the value has been adjusted
 */
function validate_ycoord_min(y_coord_min) {
  console.log('Validating ycoord/Lat Min')
  activeDatasetId = getActive('datasetid')
  // Don't allow form change to outside minimum range
  // Autofill with lowest possible value
  if (parseFloat(y_coord_min) < parseFloat(dataset.ycoord.min)){
    //console.log(pageLoad)
      // Display a message if this was user input
      if (pageLoad == 0){
        console.log('showing min lat (ycoord) warning')
        // Set it to the min allowed andd alert
        y_coord_min = dataset.ycoord.min
        //console.log(active_ycoord_min_el)
        $(active_ycoord_min_el).addClass('dim-input-danger')
        $(active_ycoord_min_el).val(y_coord_min)
        $('<div class="y_minErrorMsg">Input value was lower than the minimum for this dataset. Autocorrected to the dataset minimum.</div').insertAfter(active_ycoord_min_el)
      } else {
        // just Set it to the min allowed
        console.log('increasing ycoord (lat) min to the extent allowed for this dataset')
        y_coord_min = dataset.ycoord.min
        $(active_ycoord_min_el).val(y_coord_min)
      }
  }
  return y_coord_min
}

/*
 * Checks input upper latitude against dataset metadata
 * Resets field to dataset maximum if it is out of range
 * called on update form values
 * To Do: add an indication to the user that the value has been adjusted
 */
function validate_ycoord_max(y_coord_max) {
  console.log('Validating ycoord/Lat Max')
  activeDatasetId = getActive('datasetid')
  // Get dataset info from metadata
  // dataset = getDatasetInfoById(activeDatasetId)
  if (parseFloat(y_coord_max) > parseFloat(dataset.ycoord.max)){
    // Set it to the max allowed
    console.log('Setting lat (ycoord) max value to the maximum allowed for this dataset')
    y_coord_max = dataset.ycoord.max
  } 
  //console.log(y_coord_max)
  return y_coord_max
}

/*
 * Checks input lower longitude against dataset metadata
 * Resets field to dataset minimum if it is out of range
 * To Do: add an indication to the user that the value has been adjusted
 */
function validate_xcoord_min(x_coord_min) {
  console.log('Validating Min xcoord/Lon')
  // Compare request to what is in ERDDAP (to determine if req is within range)
  // Called on updateFormValues(). 
  activeDatasetId = getActive('datasetid')
  // Get dataset info from metadata
  //dataset = getDatasetInfoById(activeDatasetId) 
  // Compare to erddap limit
  if (parseFloat(x_coord_min) < parseFloat(dataset.xcoord.min)){
    // Set it to the lower limit allowed
    console.log('increasing min lon to the maximum allowed for this dataset')
    x_coord_min = dataset.xcoord.min
  } 
  return x_coord_min
}

/*
 * Checks input upper longitude against dataset metadata
 * Resets field to dataset maximum if it is out of range
 * To Do: add an indication to the user that the value has been adjusted
 */
function validate_xcoord_max(x_coord_max) {
  console.log('Validating Max xcoord/Lon')
  // Compare req to what is in ERDDAP (to determine if req is within range) 
  // Called on updateFormValues()
  activeDatasetId = getActive('datasetid')
  // Get dataset info from metadata
  //dataset = getDatasetInfoById(activeDatasetId) 
  // Compare to erddap limit
  if (parseFloat(x_coord_max) > parseFloat(dataset.xcoord.max)){
    // Set it to the lower limit allowed
    console.log('reducing max lon to the maximum allowed for this dataset')
    x_coord_max = dataset.xcoord.max
  } 
  return x_coord_max
}

function validateTimeStride() {
  // if times are the same, check that the stide is set to 1
  // If conitions are met hide/show error/warning message(s)
  // To do: add check that stride is not larger than appropriate for date range
  
  console.log('validating time stride')
  var requestedTimeInt = getActive('time_stride')//$(time_strideField).val()
  var time_min = getActive('time_min')
  var time_max = getActive('time_max')

  activeDateValidationErrors = activeDatasetPanelEl + ' .dateValidationErrors'
  
  if (time_min !== time_max){
    // To do: add check that stride is not larger than appropriate for date range
    return 1
  } else {
    //console.log('single time')
    // if times are the same, check that the stide is set to 1
    if (requestedTimeInt > 1) {
      //console.log('time int requested is greater than 1')
      // alert user to set stride to 1 
      new_time_stride = '1'
      //check if stride int error already shown, if not add it
      if ($(activeDateValidationErrors).children('.time-stride-error').length < 1) {
        //console.log(time_strideField)
        //console.log('does this warning stick?')
        $(activeDateValidationErrors).append('<div class="time-stride-error alert alert-danger alert-dismissible fade in" role="alert"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">×</span></button>Stride has been reset to 1. A stride greater than 1 cannot be applied on a single timestamp</div>')
        $(activeDateValidationErrors).removeClass('hidden').fadeOut(50).fadeIn(50)
      } else {
        //console.log('make it flash')
        $(".time-stride-error").fadeIn(200).fadeOut(200).fadeIn(200);
      }
      return new_time_stride
    } else {
      // stride is ok, make sure error meassage is cleared
      if ($(activeDateValidationErrors).children('.time-stride-error').length > 0){
        $('.time-stride-error').remove()
        $(time_strideField).removeClass('invalidInput')
      }
      return new_time_stride
    }
  }
  console.log('validating time stride finished')
}

/*
 * Toggles help display based on data request format
 */
function validateFmt() {
  console.log('starting validate format, called by format onchange function')
  fmt = getActive('fmt');

  if (fmt == "nc" || fmt == "mat") {
      // show size estimate block
      $('.sizeEstimateNetCDF').removeClass('hidden')
  } else {
      // hide size estimate block
      if (!($('.sizeEstimateNetCDF').hasClass('hidden'))){
        $('.sizeEstimateNetCDF').addClass('hidden')
      } 
  }
}

/*
 * Called on page load (in createDatePickers)
 * AND Called on dataset change
 */
function updateFormValues() {
  pageLoad = 1
  console.log('UPDATING FORM VALUES BASED ON URL ***')

  // TRY TO GET ACTIVE DATASET (SUBNAME), UPDATE ACTIVE TAB/FORM
  actvSubname = getActive('dataset')      // Get active subname from url    
  console.log(' - seeing if dataset needs to be updated')
  if ( actvSubname == ""){
        // No dataset specified in the url query string use the default tab (usually daily)
        console.log("url does not specify a dataset - loading default")
        actvLi = $(".tab-pane.active").attr("id") 
        defaultDatasetId = actvLi.substring( 0, actvLi.indexOf("panel") )
        dataset = getDatasetInfoById(defaultDatasetId)
        actvSubname = dataset["subname"].toLowerCase()
        activeDatasetId = dataset["id"]
        activeDatasetPanelEl = '#'+activeDatasetId+'panel'
  } else {
        // Using dataset indicated in the query string to show/hide the active form panel    
        dataset = getDatasetInfoBySubname(actvSubname)
        activeDatasetId = dataset["id"]
        $(".tab-pane").removeClass("active in");
        activeDatasetPanelEl = '#'+activeDatasetId+'panel'
        $(activeDatasetPanelEl).addClass("active in");
        $('a[href="'+ activeDatasetPanelEl +'"]').tab('show');
  }

  // UFV-TRY TO GET DATASET VARIABLES FROM URL AND UPDATE FORM RADIOS
  new_vars = getActive('var')
  console.log(' - Seeing if variables need to be selected or unselected')
  if (new_vars !== ''){
    // Using variables from url
    // Clear all checkboxes (uncheck them)
    parSelectors = activeDatasetPanelEl + ' .parameters-filters input:checked';
    $(parSelectors).each(function() {
        $(this).prop('checked', false);
    });
    // Check the appropriate check boxes
    new_vars = new_vars.split(',');
    for (x in new_vars){
        theElement = activeDatasetPanelEl + ' .parameters-filters input[value="'+ new_vars[x] + '"]'
        $(theElement).prop('checked', true);
    }
  } else {
    // No variables defined in url, use default
    var parList = [];
    parSelector = activeDatasetPanelEl + ' .parameters-filters input:checked';
    $(parSelector).each(function() {
      parList.push($(this).attr('value'));
    })
    new_vars = parList.join(',')
  }

  // UFV-TRY TO GET y_min FROM URL AND UPDATE INPUT FIELD
  new_ycoord_min = getActive('y_min') //console.log(new_ycoord_min)
  //console.log(active_ycoord_min_el)
  if (new_ycoord_min !== ''){
    //console.log('calling y_min validate')
    new_ycoord_min = validate_ycoord_min(new_ycoord_min) //console.log(new_ycoord_min)
    $(active_ycoord_min_el).val(new_ycoord_min) 
  } else {
    new_ycoord_min = $(active_ycoord_min_el).val()            // use default, no value in url
  }
  
  // UpdateFormValues() -TRY TO GET y_stride SPACING from URL AND UPDATE INPUT FIELD
  new_ycoord_stride = getActive('y_stride')
  active_ycoord_strideBtnEl = '#' + $('#downloadPanel .tab-pane.active .ycoord-stride-btn').attr('id')
  active_ycoord_strideInputEl = '#' + $('#downloadPanel .tab-pane.active .ycoord-stride-input-wrap').attr('id')
  active_ycoord_strideField = '#' + activeDatasetId + '-getData-ycoord-stride'
  //console.log(new_ycoord_stride)
  //console.log(y_strideField)
  //y_strideField = '#' + activeDatasetId + '-getDatay_stride'
  if (new_ycoord_stride !== '' && new_ycoord_stride !== '1'){
    console.log('calling y_stride validate')
    //new_ycoord_stride = validate_ycoord_max(new_ycoord_stride)
    $(active_ycoord_strideField).val(new_ycoord_stride)          // set value
    $(active_ycoord_strideBtnEl).addClass('hidden')      // hide button
    $(active_ycoord_strideInputEl).removeClass('hidden') // show hidden element
  } else {
    //console.log(active_ycoord_strideField.val())
    new_ycoord_stride = $(active_ycoord_strideField).val()       // use default, no value in url
  }
  
  new_ycoord_max = getActive('y_max')                   // UFV-TRY TO GET y_max from URL AND UPDATE INPUT FIELD
  if (new_ycoord_max !== ''){
    new_ycoord_max = validate_ycoord_max(new_ycoord_max)
    $(active_ycoord_max_el).val(new_ycoord_max) 
  } else {
    new_ycoord_max = $(active_ycoord_max_el).val()             // use default, no value in url
  }
   
  new_xcoord_min = getActive('x_min')                   // TRY TO GET x_min FROM URL, UPDATE FORM INPUT FIELD
  //console.log(new_xcoord_min)
  if (new_xcoord_min !== ''){
    new_xcoord_min = validate_xcoord_min(new_xcoord_min)
    $(active_xcoord_min_el).val(new_xcoord_min)                // update form field with value from url
  } else {
    new_xcoord_min = $(active_xcoord_min_el).val()             // use default, no value in url
  }
  //console.log(new_xcoord_min)
  
  new_xcoord_stride = getActive('x_stride')                   // TRY TO GET x_min FROM URL, UPDATE FORM INPUT FIELD
  if (new_xcoord_stride !== '' && new_xcoord_stride !== '1'){
    $(active_xcoord_StrideField).val(new_xcoord_stride)
    $(active_xcoord_StrideBtnEl).addClass('hidden')      // hide button
    $(active_xcoord_StrideInputEl).removeClass('hidden') // show hidden element
  } else {
    new_xcoord_stride = $(active_ycoord_strideField).val()       // use default, no value in url
  }
  
  new_xcoord_max = getActive('x_max')                   // TRY TO GET x_max FROM URL, UPDATE FORM INPUT FIELD
  if (new_xcoord_max !== ''){
    new_xcoord_max = validate_xcoord_max(new_xcoord_max)
    $(active_xcoord_max_el).val(new_xcoord_max)                // update form field with value from url
  } else {
    //console.log(active_xcoord_max_el)
    new_xcoord_max = $(active_xcoord_max_el).val()             // use default, no value in url
  }

  console.log('update form values checking if form format needs to be updated')
  newFmt = getActive('fmt')                         // TRY TO GET FORMAT FROM URL, UPDATE FORM Select FIELD
  if (newFmt !== ''){
    $(activeFmtField).val(newFmt)                   // update form field with value from url
    $(activeFmtField).trigger('change');            // show and hide the calc div as needed
  } else {
    newFmt = $(activeFmtField).val()                // use default, no value in url
  }


  new_time_min = getActive('time_min')                 // TRY TO GET time_min FROM URL, UPDATE FORM INPUT FIELD
  time_minField = '#'+activeDatasetId+'-getData-time-min'
  if (new_time_min !== ''){
    $(time_minField).data("DateTimePicker").date(new Date(new_time_min))       // Use time in url to set the time in the date picker
    var $radios = $('input:radio[name=timeradio]');                         // Set custom radio button to be checked
    $radios.filter('[value=custom]').prop('checked', true);
    $('.dateCustom').removeClass('hidden')                                  // show the custom div
    //console.log(active_time_min_el)
    var datasetStart = $(active_time_min_el).attr('data-dataset-time-min') 
    //console.log(datasetStart)
    var datasetEnd = $(active_time_max_el).attr('data-dataset-time-max')
    //$(time_minField).trigger('change')
    console.log('update form values seeing if start time is valid for this dataset')
    validateDates = validateDateRequest(datasetStart, datasetEnd)
    //console.log(validatedDates)
    if (validatedDates.startDateFlag=='new' && validatedDates.endDateFlag == 'new'){
      //console.log('updateUrl with new min time and new max time')
      new_time_min = validatedDates.startDateStr
      new_time_max = validatedDates.endDateStr
    } else if (validatedDates.startDateFlag=='new'){
      //console.log('updateUrl with new min time')
      new_time_min = validatedDates.startDateStr
    } else if (validatedDates.endDateFlag=='new' ){
      //console.log('updateUrl with new max time')
       new_time_max = validatedDates.endDateStr
    }
  } else {
    // No time_min specified in url, getting value from active form
    // Not used now that I fill the empty fields... 11/28/2018
    new_time_min = $('#downloadPanel .tab-pane.active .dateSelect input:checked').attr('data-datereq-iso-min')  
    //console.log(new_time_min)
  }

  new_time_stride = getActive('time_stride')           // TRY TO GET Time stride interval FROM URL, UPDATE FORM INPUT FIELD
  //console.log(new_time_stride)
  time_strideField = '#' + activeDatasetId + '-getData-time-stride'
  if (new_time_stride !== '') {
    var $radios = $('input:radio[name=timeradio]');    
    $radios.filter('[value=custom]').prop('checked', true);  // Set custom radio button to be checked
    if ($('.dateCustom').hasClass('hidden')){
      $('.dateCustom').removeClass('hidden')                 // show the custom div
    }
    console.log('update form values is calling validateTimeStride')
    //console.log(new_time_stride)
    new_time_stride = validateTimeStride()
    //console.log(new_time_stride)
    $(time_strideField).val(new_time_stride)                          // update int form field with value from url
    //console.log($(active_time_strideBtnEl))
    //active_time_strideBtnEl = '#' + $('#downloadPanel .tab-pane.active .time-stride-btn').attr('id')
    if (!($(active_time_strideBtnEl).hasClass('hidden'))){   // if button is not hidden already
      $(active_time_strideBtnEl).addClass('hidden')            // hide button
    } else {
      console.log(' time stride button alreday hidden')
    }
    if ($(active_time_strideInputEl).hasClass('hidden')){
      $(active_time_strideInputEl).removeClass('hidden')       // show hidden element
    }
  } else {
    //console.log('no stride in url')
    new_time_stride = $(time_strideField).val() // no time stride in url, default time_stride
  }
  
  // TRY TO GET MAXTME FROM URL, UPDATE FORM INPUT FIELD
  new_time_max = getActive('time_max')
  time_maxField = '#' + activeDatasetId + '-getData-time-max'
  if (new_time_max !== ''){
    $(time_maxField).data("DateTimePicker").date(new Date(new_time_max)) // Use url time to set time in date picker
    var $radios = $('input:radio[name=timeradio]');
    $radios.filter('[value=custom]').prop('checked', true);     // Set custom radio button to be checked
    $('.dateCustom').removeClass('hidden') // show the custom div
    //validateDateRequest(datasetStart, datasetEnd)
    //console.log(validatedDates)
    if (validatedDates.startDateFlag == 'new' && validatedDates.endDateFlag == 'new'){
      console.log('updateUrl with new min time and new max time')
      new_time_min = validatedDates.startDateStr
      new_time_max = validatedDates.endDateStr
    } else if (validatedDates.startDateFlag=='new'){
      //console.log('updateUrl with new min time')
      new_time_min = validatedDates.startDateStr
    } else if (validatedDates.endDateFlag=='new' ){
      //console.log('updateUrl with new max time')
       new_time_max = validatedDates.endDateStr
    }
  } else {
    // No time_min specified in url, getting value from active form
    new_time_max = $('#downloadPanel .tab-pane.active .dateSelect input:checked').attr('data-datereq-iso-max')
  }

  // PASS VALUES BACK TO THE URL
  // This populates the url with any values that were left to default
  urlUpdates = {
    'new_subname':actvSubname,
    'new_vars': new_vars,
    'new_time_min': new_time_min,
    'new_time_stride': new_time_stride,
    'new_time_max': new_time_max,
    'new_ycoord_min': new_ycoord_min,
    'new_ycoord_stride': new_ycoord_stride,
    'new_ycoord_max': new_ycoord_max,
    'new_xcoord_min': new_xcoord_min,
    'new_xcoord_stride': new_xcoord_stride,
    'new_xcoord_max': new_xcoord_max,
    'newFmt': newFmt
    }
  //console.log(urlUpdates)
  console.log('updateFormValues() is now populating the url with any default values')
  updateUrl(urlUpdates) 
  pageLoad = 0
  console.log('*** PAGE LOAD COMPLETE')
}

/*
 * Get the active state of the designated URL query string 
 * key is a string
 */
function getActive(key){
  
    var actvVal = ''
    var i, actvLi;

    if (key.toLowerCase() == 'datasetid'){
        //tracking dataset only by tab, not url
        actvLi = $(".subEntryTabs .active").attr("id")
        actvVal = actvLi.substring(0,actvLi.indexOf("-tab"))
    } else {
        // get info from url
        queryStrings = getQueryStrings()    
        for ( i in queryStrings ){
            queryKey = queryStrings[i].split("=")[0]
            queryVal = queryStrings[i].split("=")[1]
            
            if ( queryKey == key ){
                if (queryVal == ''){
                    //console.log('there is a key but no value set')
                } else {
                    actvVal = queryVal
                }
            }
        }
    }
    return actvVal
}

/*
 * Look through the loaded entry (from json) to get info associated with the given dataset
 */
function getDatasetInfoById(datasetId) {
    var dataset, i;
    //console.log(entry)
    for ( i = 0; i < entry.datasets.length; i++ ) {     
        dataset = entry.datasets[i]
        //console.log(dataset["id"])
        if (dataset["id"] == datasetId){
            dataset["ref"] = i //add reference for pulling out datasetinfo from coresponding lists like colorbars
            return dataset
            break
        }
    }
}

function getDatasetInfoBySubname(datasetSubname) {
    var dataset
    //console.log(entry)
    for ( var i = 0; i < entry.datasets.length; i++ ) {     
        dataset = entry.datasets[i]
        if (dataset["subname"].toLowerCase() == datasetSubname.toLowerCase()){
            dataset["ref"]= i //add reference for pulling out out parameters from lists like colorbars
            return dataset
            break
        }
    }
}

function validateDateRequest(datasetStart, datasetEnd) {

    // returns validated dates
    // if dates should be updated on the form that is handled after this
    console.log('*** Validating Date Request, getting values from url...***')
    //console.log(dataset)

    // Make a time list for this dataset as jsdate
    var timeListJs = []
    for ( i = 0; i < dataset.time.timeList.length; i++ ) { 
      timeListJs.push(Date.parse(dataset.time.timeList[i]))
    }
    // get requested dates from the URL
    reqStart = getActive('time_min')
    reqEnd = getActive('time_max')
    
    //console.log('Url Values: '+reqStart+', '+ reqEnd)
   
    datasetStartDate = moment.utc(datasetStart);
    reqStartDate = moment.utc(reqStart);
    datasetEndDate = moment.utc(datasetEnd);
    reqEndDate = moment.utc(reqEnd); 

    //console.log(datasetStart)
    //console.log(datasetEnd)
    // These will get populated with new dates for auto correcting
    var startDateStr = ''
    var endDateStr = ''
    var startDateWarningHtml = ''
    var endDateWarningHtml = ''
    
    if (reqStart == ''){
      // No start date entered, autofilling
      // use jquery to add comment that start date needs to be filled in
      startDateStr = datasetEndDate
      startDateWarningHtml = 'Start date empty. Autofilled to dataset end' 
      startDateFlag='new'
    } else {
      // requested start date is reqStart a time string in z
      // COMPARE REQUEST START TO DATASET START
      if (reqStartDate < datasetStartDate) {
        // The start date requested is before the start of the dataset record
        // resetting to earliest available time stamp
        startDateWarningHtml = 'Start date invalid. ' + datasetStart + '.'
        startDateFlag = 'new'
        startDateStr = datasetStart
      } else if ( reqStartDate > datasetEndDate){
        // The start date requested is after the end of the dataset record
        // Setting both datepickers to last
        var dateForDatepicker = moment.utc(timeListJs[timeListJs.length-1])
        startDateStr = dateForDatepicker.format("YYYY-MM-DD[T]HH:mm:ss[Z]")
        endDateStr = startDateStr
        startDateFlag = 'new'        
        endDateFlag = 'new'
        startDateWarningHtml = 'Start date reset. Updated to the extent of the dataset range.'
        endDateWarningHtml='End Date Reset'
      } else {
        // Start Date is within available range
        // Now check if an exact match with a time
        // Inputs are time list for this dataset, this date, 
        // Returns lower outside time stamp
        closestJsTimeObj = closest(timeListJs, reqStartDate, 0) 
        
        if (closestJsTimeObj.exactTimeMatch !== 1){
          // Checking the closest valid min timestamp for this dataset
          var closestStartTime = moment.utc(closestJsTimeObj.closestTime)
          startDateStr = closestStartTime.format("YYYY-MM-DD[T]HH:mm:ss[Z]")
          startDateFlag = 'new'
          startDateWarningHtml = 'Start Date Reset to Closest timestamp:' + startDateStr

        } else {
          // exact match
          startDateStr = reqStart
          startDateFlag = 'same'
        }
        
        if (reqEnd == '' ){
          // Start date was valid (or close to valid), but no end date specified. 
          // Setting to match start date
          // no end date specified, autofilling end date with one day after requested start date')
          // This is used when the url doesn't have full dates specified
          
          // Format date for datepicker
          autoReqEndDate = reqStartDate //+ (1000 * 60 * 60 * 24) // start date plus one day in ms
          endDate = moment.utc(autoReqEndDate)   // convert to date string for datepicker
          endDateStr = dateForDatepicker.format("YYYY-MM-DD[T]HH:mm:ss[Z]")
          endDateFlag = 'new'
          endDateWarningHtml = 'No end date specified. Request set to single date.'

        } else {
          // Start date was valid (or close to valid), end date specified. 
          // Checking closest end date
          closestJsTimeObj = closest(timeListJs, reqEndDate, 0) // time list for this dataset, this date, return lower outside time stamp
        
          if (closestJsTimeObj.exactTimeMatch !== 1){
            // Checking for the closest valid end timestamp for this dataset
            var closestEndTime = moment.utc(closestJsTimeObj.closestTime)
            endDateStr = closestEndTime.format("YYYY-MM-DD[T]HH:mm:ss[Z]")
            endDateFlag = 'new'
            endDateWarningHtml = 'End date set to closest timestamp:' + endDateStr
          } else {
            // exact match for end time too
            endDateStr = reqEnd
            endDateFlag = 'same'
          }
        }
      }
    }

    // Check that an end date request was entered and validate
    // If no date, alert to enter an end date
    // if yes validate that it is within range
    // if validates, set validated flag for submit check
    
    if (endDateStr == "") {
      // only run this if we haven't already created a corrected end date
      console.log('Starting End Date Validation')
      reqEnd = getActive('time_max')
      
      if (reqEnd == ''){
        console.log(' Autofilling end date to dataset end')
        endDateStr = datasetEnd
        endDateFlag = 'new'
        endDateWarningHtml = 'End date empty. filling with dataset end'
      } else {
          //console.log(reqEnd)
        if (reqEndDate > datasetEndDate) {
          console.log('requested end date is after dataset end')
          endDatWarningHtml = 'End date invalid. Data available up to ' + datasetEnd
          //showEndDateWarning(warningHtml)
          endDateStr = datasetEnd
          endDateFlag = 'new'
        } else if ( reqEndDate < datasetStartDate) {
          endDateWarningHtml = 'Requested end date before beginnig of dataset range, resetting both start and end dates'
          //showEndDateWarning(warningHtml)      
          endDateStr = datasetStartDate
          endDateFlag = 'new'
          startDateStr = datasetStartDate
          startDateFlag = 'new'
          startDateWarningHtml = 'start date reset to dataset start date'
        } else {
          console.log('End Date is within available range')
          endDateStr = reqEndDate
          endDateFlag = 'same'
          //hideEndDateWarning()
         
          if (reqStart == '' ){
            console.log('No start date, autofilling start date with end date')
            //console.log(reqEndDate)
            autoReqStartDate = reqEndDate //- (1000 * 60 * 60 * 24)
            startDateStr = moment.utc(autoReqStartDate).format("YYYY-MM-DD[T]HH:mm:ss[Z]")
            startDateFlag = 'new'
            startDateWarningHtml = 'start date reset to end date'
          }
        }
      }
    } else {
      console.log('created new end date str on start date check, not evaluating again')
    }


    //console.log(endDateStr)

    var sizeEstimate = getSizeEstimate()
    //console.log(timestamp_count)

    validateTimeCount()

    if (startDateFlag == 'new'){
      showStartDateWarning(startDateWarningHtml)
    } else {
      hideStartDateWarning()
    }

    if (endDateFlag == 'new') {
      showEndDateWarning(endDateWarningHtml)
    } else {
      hideEndDateWarning()
    }
    //console.log(endDateStr)
    validatedDates = {
      'startDateStr' : startDateStr,
      'startDateFlag': startDateFlag,
      'startDateWarning': startDateWarningHtml,
      'endDateStr' : endDateStr,
      'endDateFlag': endDateFlag,
      'endDateWarning': endDateWarningHtml
    }
    
    return validatedDates
  } // End validateDateRequest()

function showStartDateWarning(warningHtml){
  $('.minDateError').html('<p><i class="fa fa-exclamation-triangle" '+
            'aria-hidden="true"></i> '+warningHtml+'</p>')
  $('.minDateError').removeClass('hidden')
  //$('.time-min-validationIcon').removeClass('fa fa-exclamation-triangle')
  //$('.time-min-validationIcon').removeClass('fa fa-check-circle')
  //$('.time-min-validationIcon').addClass('fa fa-exclamation-triangle')
  $('.time-min-input').removeClass('invalidInput') 
  $('.time-min-input').removeClass('validInput') 
  $('.time-min-input').addClass('invalidInput') 
} 

function hideStartDateWarning(){
  
  $('.minDateError').html('')
  
  if (!($('.minDateError').hasClass('hidden'))){
    $('.minDateError').addClass('hidden')
  }
  
  //$('.time-min-validationIcon').addClass('fa fa-exclamation-triangle')
  //$('.time-min-validationIcon').removeClass('fa fa-check-circle')
  
  $('.time-min-input').removeClass('invalidInput') 
  
  if (!($('.time-min-input').hasClass('validInput'))){
    $('.time-min-input').addClass('validInput') 
  }

} 

function showEndDateWarning(warningHtml) {
  $('.maxDateError').html('<p><i class="fa fa-exclamation-triangle" '+
        'aria-hidden="true"></i>'+ warningHtml +'</p>')
  $('.maxDateError').removeClass('hidden')
  //$('.time-max-validationIcon').removeClass('fa fa-exclamation-triangle')
  //$('.time-max-validationIcon').removeClass('fa fa-check-circle')
  //$('.time-max-validationIcon').addClass('fa fa-exclamation-triangle')
  $('.time-max-input').removeClass('invalidInput') 
  $('.time-max-input').removeClass('validInput') 
  $('.time-max-input').addClass('invalidInput') 
}

function hideEndDateWarning() {
  $('.maxDateError').html('')
  $('.maxDateError').removeClass('hidden')
  $('.maxDateError').addClass('hidden')
  $('.time-max-input').removeClass('invalidInput') 
  $('.time-max-input').removeClass('validInput') 
  $('.time-max-input').addClass('validInput')
  //$('.time-max-validationIcon').removeClass('fa fa-exclamation-triangle')
  //$('.time-max-validationIcon').removeClass('fa fa-check-circle')
  //$('.time-max-validationIcon').addClass('fa fa-check-circle')
}


function clearErddapUrlDisplay() {
  if ($('.erddapUrlDisplay').hasClass('hidden')) {
    $('.erddapUrlDisplay').addClass('hidden')
  }
  $('.erddapUrlDisplay').html('')
}

$(document).ready(function() {

  console.log('DOC READY!')
  // prevent form submit on hitting enter
  $(window).keydown(function(event){
    if(event.keyCode == 13) {
      event.preventDefault();
      return false;
    }
  });

  //$('.atooltip').tooltip();
  $('[data-toggle="tooltip"]').tooltip({
    animated: 'fade',
    placement: 'bottom',
    trigger: 'click'
  });

  // Use current date to calculate how much data is available
  var dateNow = Date.now()

  console.log('Waiting for catalog JSON')

  var jqxhr = $.getJSON( '../../config/catalog.json', {
    })
    .done(function() {                              
      config = jqxhr.responseJSON;
      pagePath =  window.location.pathname.split('/')
      urlId = pagePath[2]
      //console.log(urlId) // entry id
      console.log(config)
      // get info for this entry
      configFileHandler(config, urlId)

      // Catalog Entry Loop    
      for (var entryId in config) { 

          // setup entry as global
          entry = config[entryId]
        
          // Lookup Entry info based on page url
          // Get info about this dataset to use on the page
        
          if (entryId == urlId) {
              //console.log(entry)
              // Dataset Loop
              $.each(entry.ids, function(i, id){
                  //console.log(id)
                  // Sets up alt query once for whole entry
                  // to do: set this up per dataset and handler with dataset onchange
                  minAlt = entry.datasetsXml[i][16]
                  if (minAlt == null){
                    altQuery = ""
                    hasAlt = 0
                  } else if (minAlt == 'null'){
                    altQuery = ""
                    hasAlt = 0
                  } else if ( minAlt ? minAlt : null) {
                    altQuery = ""
                    hasAlt = 0
                  } else {
                    hasAlt = 1
                    altQuery = "[("+ entry.datasetsXml[i][16]+"):1:("+ entry.datasetsXml[i][17] +")]"
                  }
              });// end dataset loop
              
              //console.log(entry.ids)
              totalCalendars = entry.ids.length
              //console.log(totalCalendars)
              createDatepickers(entry);

          break  
        }
      }

      // On initial load

      // find active tab, when tabs are clicked update date ranges etc
      activeLi = $('#downloadPanel .subEntryTabs .active').attr('id')
      console.log(activeLi)
      activeDatasetId = activeLi.substring(0,activeLi.indexOf('-tab'))
      console.log(activeDatasetId)
      dataset = getDatasetInfoById(activeDatasetId)  

      // Show projected data message
      console.log(dataset.proj_crs_code)
      if (dataset.proj_crs_code !== "EPSG:4326"){
        $(".projectedDownloadText").removeClass('hidden')
      }

      fmt = $(".format-filters option:selected").val()

      baseUrl = "https://polarwatch.noaa.gov/erddap/griddap/" + activeDatasetId +"."+fmt+"?" // changes for each dataset within entry
      //console.log(baseUrl)
      activeForm = '#' + $('#downloadPanel .tab-pane.active form').attr('id')
      console.log(activeForm)

      // Get the date input dom elements
      active_time_maxEl = '#' + $('#downloadPanel .tab-pane.active .time-max-input').attr('id')
      active_time_minEl = '#' + $('#downloadPanel .tab-pane.active .time-min-input').attr('id')

      // Input wrapper dom element
      active_time_max_el = '#' + activeDatasetId + '-dataset-time-max'
      active_time_min_el = '#' + activeDatasetId + '-dataset-time-min'
      
      // get valid ycoord (lat) range, stored in html
      active_ycoord_max_el = '#' + activeDatasetId + '-getData-ycoord-max'
      active_ycoord_min_el = '#' + activeDatasetId + '-getData-ycoord-min'

      active_ycoord_strideBtnEl = '#' + $('#downloadPanel .tab-pane.active .ycoord-stride-btn').attr('id')
      console.log(active_ycoord_strideBtnEl)
      
      active_ycoord_strideInputEl = '#' + $('#downloadPanel .tab-pane.active .ycoord-stride-input-wrap').attr('id')
      active_ycoord_strideField = '#' + activeDatasetId + '-getData-ycoord-stride'

      active_xcoord_max_el = '#' + activeDatasetId + '-getData-xcoord-max'
      console.log(active_xcoord_max_el)
      active_xcoord_min_el = '#' + activeDatasetId + '-getData-xcoord-min'
      
      active_time_strideBtnEl = '#' + $('#downloadPanel .tab-pane.active .time-stride-btn').attr('id')
      active_time_strideInputEl = '#' + $('#downloadPanel .tab-pane.active .time-stride-input').attr('id')
      active_time_strideField = '#' + activeDatasetId + '-getData-time-stride'
      
      active_xcoord_StrideBtnEl = '#' + $('#downloadPanel .tab-pane.active .xcoord-stride-btn').attr('id')
      active_xcoord_StrideInputEl = '#' + $('#downloadPanel .tab-pane.active .xcoord-stride-input').attr('id')
      active_xcoord_StrideField = '#' + activeDatasetId + '-getData-xcoord-stride'

      activeFmtWrap = '#' + $('#downloadPanel .tab-pane.active .format-filters').attr('id') + ' select'
      activeFmtField = '#' + $('#downloadPanel .tab-pane.active .getdataformat').attr('id') 
     //fmtField = $(".format-filters option:selected")
      console.log(activeFmtField)
     
      // get default dates, stored in the html
      var reqStart = $('#downloadPanel .tab-pane.active .dateSelect input:checked').attr('data-datereq-iso-min')  
      var reqEnd = $('#downloadPanel .tab-pane.active .dateSelect input:checked').attr('data-datereq-iso-max')
      
      // get how latitude is represented in this dataset, is stored in html
      var isIncreasing = $('#downloadPanel .tab-pane.active .coord-input').attr('data-isIncreasing')
      //console.log('is increasing?: '+parseFloat(isIncreasing))

      // get valid date range for this dataset, stored in html 
      var datasetStart = $(active_time_min_el).attr('data-dataset-time-min') 
      console.log(datasetStart)
      var datasetEnd = $(active_time_max_el).attr('data-dataset-time-max')


      //hide previous url if new changes are made to the form
      $('.getData input').change(function(){
        clearErddapUrlDisplay()
      });

      /*
       * TOGGLE SUBNAME TABS (daily, weekly...)
       * Update Form Info on click
       */
      $('.subEntryTabs a[data-toggle="pill"]').on('shown.bs.tab', function (e) {
        clearErddapUrlDisplay()
        console.log('* Toggling dataset tabs on the Data download page *')
        activeLi = ($(e.target).parent().attr('id'))
        console.log(activeLi)
        activeDatasetId = activeLi.substring(0,activeLi.indexOf('-tab'))
        dataset = getDatasetInfoById(activeDatasetId)       // Get dataset info from metadata
        console.log(dataset) 
        // Get defaults for this dataset
        new_subname = dataset["subname"]
        console.log(new_subname)
        // To deal with some datasets being missing
        // Try to get iso latest time stamp for this dataset from metadata
        // To Do: check on this, think there are now catches in the template writing and do not have to do this in js
        try {
            new_time = dataset.allDatasets[10]
        } catch (err){
            console.log('display dataset not active message')
        }

        // Set new default parameters
        // this is a new dataset, need to use new dataset info and reset active parameter as this dataset's first parameter
        // To Do: Add check to see if we should keep vars from url, if parname is an exact match go ahead and keep it checked, don't set to default
        for ( j = 0; j < dataset.parameters.length; j++ ) { 
            parameter = dataset.parameters[j]["name"]
            if ( j == 0 ){
                new_vars = parameter
                break
            }
        }

        // Check url 
        //     if url has time(s) then look for that exact datetime, 
        //     to do: if has dates and that date is not valid then look for the closest datetime 
        //     to do: if using nearest date alert the user
        new_time_min = getActive('time_min')
        new_time_stride = getActive('time_stride')
        new_time_max = getActive('time_max')
        new_ycoord_min = getActive('y_min')    // Preserve previously selected spatial extent
        new_ycoord_stride = getActive('y_stride')
        new_ycoord_max = getActive('y_max')
        new_xcoord_min = getActive('x_min')
        new_xcoord_stride = getActive('x_stride')
        new_xcoord_max = getActive('x_max')
        newFmt = getActive('fmt')
        console.log(new_xcoord_max)
        // Specific updates to Data Download Form
        baseUrl = "https://polarwatch.noaa.gov/erddap/griddap/" + activeDatasetId +"."+newFmt+"?"
        // Update the active form
        activeForm = '#' + $('#downloadPanel .tab-pane.active form').attr('id')
        console.log(activeForm)

        // SET NEW ACTIVE INPUT ELEMENTS
        active_time_maxEl = '#' + $('#downloadPanel .tab-pane.active .time-max-input').attr('id')
        active_time_minEl = '#' + $('#downloadPanel .tab-pane.active .time-min-input').attr('id')
        console.log(active_time_maxEl)
        active_time_strideBtnEl = '#' + $('#downloadPanel .tab-pane.active .time-stride-btn').attr('id')
        active_time_strideInputEl = '#' + $('#downloadPanel .tab-pane.active .time-stride-input').attr('id')
        active_time_strideField = '#' + activeDatasetId + '-getData-time-stride'
        active_ycoord_strideBtnEl = '#' + $('#downloadPanel .tab-pane.active .ycoord-stride-btn').attr('id')
        active_ycoord_strideInputEl = '#' + $('#downloadPanel .tab-pane.active .ycoord-stride-input-wrap').attr('id')
        active_ycoord_strideField = '#' + activeDatasetId + '-getData-ycoord-stride'
        console.log(active_ycoord_strideBtnEl)
        active_ycoord_max_el = '#' + activeDatasetId + '-getData-ycoord-max'
        active_ycoord_min_el = '#' + activeDatasetId + '-getData-ycoord-min'
        console.log(active_ycoord_max_el)
        active_xcoord_StrideBtnEl = '#' + $('#downloadPanel .tab-pane.active .xcoord-stride-btn').attr('id')
        active_xcoord_StrideInputEl = '#' + $('#downloadPanel .tab-pane.active .xcoord-stride-input').attr('id')
        active_xcoord_StrideField = '#' + activeDatasetId + '-getData-xcoord-stride'
        active_xcoord_max_el = '#' + activeDatasetId + '-getData-xcoord_max'
        console.log(active_xcoord_max_el)
        active_xcoord_min_el = '#' + activeDatasetId + '-getData-xcoord-min'
        isIncreasing = $('#downloadPanel .tab-pane.active .coord-input').attr('data-isIncreasing')
        
        // Set default REQUEST START & END TIMES 
        if (new_time_min == ''){
          // Update default time requests to this datasets latest time
          reqStart = $('#downloadPanel .tab-pane.active .dateSelect input:checked').attr('data-datereq-iso-min')  
          new_time_min = reqStart
          console.log(new_time_min)
        }
        if (new_time_max == ''){
          reqEnd = $('#downloadPanel .tab-pane.active .dateSelect input:checked').attr('data-datereq-iso-max')
          console.log(reqEnd)
          new_time_max = reqEnd
          console.log(new_time_max)
        }
        // Get Dataset Date Range inputs
        active_time_max_el = '#' + activeDatasetId + '-dataset-time-max'
        active_time_min_el = '#' + activeDatasetId + '-dataset-time-min'
        //activeFmtField = '#' + $('#downloadPanel .tab-pane.active .getdataformat').attr('id')
        //activeFmtField = '#' + $('#downloadPanel .tab-pane.active .format-filters').attr('id') + " select"
        activeFmtField = '#' + $('#downloadPanel .tab-pane.active .getdataformat').attr('id') 
        console.log(activeFmtField)
       
        // Using the default full time range of the dataset that I write into the html 
        // Okay but need to be careful not to change those attr values in the html
        datasetStart = $(active_time_min_el).attr('data-dataset-time-min') // these must be part of the html (calculated by python)
        datasetEnd = $(active_time_max_el).attr('data-dataset-time-max')
        
        //validatedDates = validateDateRequest(datasetStart, datasetEnd)

        // Update Url with new dataset
         urlUpdates = {
          'new_subname':new_subname,
          'new_vars': new_vars,
          'new_time_min': new_time_min,
          'new_time_stride': new_time_stride,
          'new_time_max': new_time_max,
          'new_ycoord_min': new_ycoord_min,
          'new_ycoord_stride': new_ycoord_stride,
          'new_ycoord_max': new_ycoord_max,
          'new_xcoord_min': new_xcoord_min,
          'new_xcoord_stride': new_xcoord_stride,
          'new_xcoord_max': new_xcoord_max,
          'newFmt': newFmt
        }
        updateUrl(urlUpdates) 
        updateFormValues()
        console.log('form values updated')

        // Clear Individual Validation Indicators
        $('.time-min-input').removeClass('invalidInput') 
        $('.time-min-input').removeClass('validInput') 
        $('.time-max-input').removeClass('invalidInput') 
        $('.time-max-input').removeClass('validInput') 
        $('.time-min-validationIcon').removeClass('fa fa-exclamation-triangle')  
        $('.time-min-validationIcon').removeClass('fa fa-check-circle')
        $('.time-max-validationIcon').removeClass('fa fa-exclamation-triangle')  
        $('.time-max-validationIcon').removeClass('fa fa-check-circle')
        $('.minDateError').removeClass('hidden')
        $('.minDateError').addClass('hidden')
        $('.maxDateError').removeClass('hidden')
        $('.maxDateError').addClass('hidden')

        // Was setting calendars to default, want to be able to accept input from url
        //$(active_time_maxEl).datepicker( 'setDate', null)
        //$(active_time_minEl).datepicker( 'setDate', null)        

        /*
         * SHOW/HIDE Date/time selectors
         * make sure the calendar displayed correlates to the selected subname tab
         * loop through all calendars, show active, hide non-active
         * calendars are submitted on click, so this will work
       
         
        var timeSectionEl = activeDatasetId+"-get-data-time" 
        $(".get-data-time-selector").each(function(k, obj) {
            thisTimeSectionDivId = $(obj).attr("id")
            console.log(thisTimeSectionDivId)
            console.log(timeSectionEl)
            if ( thisTimeSectionDivId == timeSectionEl ){
                console.log("active calendar")
                $(obj).removeClass("hidden")
            } else {
                console.log("inactive calendar")
                $(obj).removeClass("hidden")
                $(obj).addClass("hidden")
            }
        });
          */    
          console.log('* End dataset tab toggle function *')
      }); // end dataset tab toggle function

      /*
       * TOGGLE DOWNLOAD, MAP, SUMMARY TABS
       * Think these are now separate pages not tabs 12/29/17
      
       $('#datasetIdActions a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
        console.log('toggling top level tabs (download, map, summary)')
        activeSubEntryPanel = '#' + $('#plotPanel .tab-pane.active').attr('id')
        console.log(activeSubEntryPanel)
        activeDatasetId = activeSubEntryPanel.substring(0,activeSubEntryPanel.indexOf('graph-panel'))
        thisMapId = activeDatasetId+'-map'
        console.log(thisMapId)
        //thisMapElement = '#' + thisMapId
        thisMap = $(thisMapId).data('map')
        console.log(thisMap)
        thisMap.updateSize() // trying to force map to redraw, sometimes it doesn't load
        //thisMap.renderSync()
      }); */

      // Location buttons - hide and show divs
      //$('.areabtn').click(function(){
          // hide all divs
        //  if ($('.areadiv').not('.hidden')){
          //  $('.areadiv').addClass('hidden')
            //console.log('hiding all1')
         // }
         // myDiv = '#'+this.id+'Div'
         // console.log('1 showingthis' + myDiv)
         // $('#'+this.id+'Div').removeClass('hidden')
      //});

      // on any min lat input element run this
      // Pass form updates to url  
      $('.ycoord-min-input').change(function(){
        validated_ycoord_min = validate_ycoord_min($(active_ycoord_min_el).val())
        var urlUpdates = {
          'new_ycoord_min': validated_ycoord_min
          }
        updateUrl(urlUpdates) 
      });
      $(active_ycoord_strideField).change(function(){
        console.log('ycoord stride field clicked')
        console.log(active_ycoord_strideField)
        var urlUpdates = {
          'new_ycoord_stride': $(active_ycoord_strideField).val()
          }
        updateUrl(urlUpdates) 
      });

      $(active_ycoord_max_el).change(function(){
        var urlUpdates = {
          'new_ycoord_max': $(active_ycoord_max_el).val()
          }
        updateUrl(urlUpdates) 
      });


      $(active_xcoord_min_el).change(function(){
        var urlUpdates = {
          'new_xcoord_min': $(active_xcoord_min_el).val()
          }
        updateUrl(urlUpdates) 
      });
      $(active_xcoord_StrideField).change(function(){
        var urlUpdates = {
          'new_xcoord_stride': $(active_xcoord_StrideField).val()
          }
        updateUrl(urlUpdates) 
      });
      $(active_xcoord_max_el).change(function(){
        var urlUpdates = {
          'new_xcoord_max': $(active_xcoord_max_el).val()
          }
        updateUrl(urlUpdates) 
      });

      // DATE REQUEST RADIO HANDLER
      // TO DO: ADD PEICE THAT PRINTS OUT URL REQUEST TO SCREEN 
      //        BY WRITING A FUNCTION THAT IS CALLED ON ANY FORM ELEMENT CHANGE EVENT
      //        CAN MODIFY CODE THAT IS CURRENTLY ONLY CALLED ON FORM SUMBIT
      $('input:radio[name="timeradio"]').change(function(){
          console.log($('input[name=timeradio]:checked').val())
          if ($(this).val() === 'custom') {
            // Show the custom date entry div
            console.log('custom checked')
            $(this).prop('checked', true);
            $('.dateCustom').removeClass('hidden') 
            // Datepickers should always reflect what is in the url
          } else {
            // clear time_max and time_min fields in custom
            // used if switching to a non-custom entry after trying/entering custom dates
            console.log('clearing custom dates, using dates for this option')
            var urlUpdates = {
              'new_time_min': $('.tab-pane.active input[name=timeradio]:checked').attr('data-datereq-iso-min'),
              'new_time_max': $('.tab-pane.active input[name=timeradio]:checked').attr('data-datereq-iso-max') 
            }
            updateUrl(urlUpdates) 
            $('.dateCustom').removeClass('hidden')
            $('.dateCustom').addClass('hidden')
          }
      });

      // show option to input time stride on click 
      $('.time-stride-btn').click(function(){
        console.log('time stride button clicked')
        $(active_time_strideBtnEl).addClass('hidden')
        $(active_time_strideInputEl).removeClass('hidden')
        $(active_time_strideInputEl).focus();
      });
      
      // stride interval input fieldchange function
      $('.time-stride-input').change(function(){
      
        console.log('time stride changed')
        
        var urlUpdates = {
            'new_time_stride': $(time_strideField).val()
        }  
        updateUrl(urlUpdates) 
        new_time_stride = validateTimeStride($(time_strideField).val())
        var urlUpdates = {
            'new_time_stride': new_time_stride
        }
        updateUrl(urlUpdates) 
        $(time_strideField).val(new_time_stride)
      });

      // show option to input lat stride on click 
      $('.ycoord-stride-btn').click(function(){
        console.log('ycoord stride btn clicked')
        $(active_ycoord_strideBtnEl).addClass('hidden')
        $(active_ycoord_strideInputEl).removeClass('hidden')
        $(active_ycoord_strideInputEl).focus();
        console.log(active_ycoord_strideField)
      });
      // stride interval input fieldchange function
      $('.ycoord-stride-input').change(function(){
        console.log('ycoord stride changed')
        var urlUpdates = {
          'new_ycoord_stride': $(active_ycoord_strideField).val()
          }
        updateUrl(urlUpdates) 
      });

      // show option to input lon stride on click 
      $('.xcoord-stride-btn').click(function(){
        console.log('showing xcoord stride input option')
        $(active_xcoord_StrideBtnEl).addClass('hidden')
        $(active_xcoord_StrideInputEl).removeClass('hidden')
        $(active_xcoord_StrideInputEl).focus();
      });
      // stride interval input fieldchange function
      $('.xcoord-stride-input').change(function(){
        console.log('xcoord stride changed')
        var urlUpdates = {
          'new_xcoord_stride': $(active_xcoord_StrideField).val()
          }
        updateUrl(urlUpdates) 
      });
      

        // this needs to be the class here, having a hard time accessing the id
      $('.getdataformat').change(function(){
        console.log('format changed function ')
        clearErddapUrlDisplay()
        //console.log(activeFmtField)
        fmt = $(activeFmtField).val()
        //console.log(fmt)
        //console.log($(".getdataformat option:selected").val())
        baseUrl = "https://polarwatch.noaa.gov/erddap/griddap/" + activeDatasetId +"."+fmt+"?" 
        console.log(baseUrl)
        var urlUpdates = {
            'newFmt': fmt
            }
        updateUrl(urlUpdates) 
        validateFmt();
        validateVarRequest();
        validateTimeCount();
      })

      // Validate Date is called on change of one of the download form date fields 

      // On min time change in the calendar update the url
      // These can change by datepicker selection, text input or url input
      $(".time-min-input").on("dp.change", function (e) {
        console.log('Min TIME CHANGED')
        $(".min-time-wrap .dropdown-menu").hide() // after date changed by datepicker, force hide the calendar display
        $(".time-min-input").blur() // so cursor doesn't go to input box and calendar can be reopened easily
        clearErddapUrlDisplay()  // hide url written to page if it is there
        
        // if this is triggered by page load createdatepicker don't run this
        if (inCreateDatePickers == 0) {
          console.log('setting new min time in url')
          thisdatasetId = getActive('datasetid')
          var new_time_minCalEl = '#' + thisdatasetId + "-getData-time-min"
          var dateFromDatepicker = $(new_time_minCalEl).data('DateTimePicker').date();
          var dateFromDatepickerString = dateFromDatepicker.format("YYYY-MM-DD[T]HH:mm:ss[Z]")
          console.log(dateFromDatepickerString)
          var urlUpdates = {
            'new_time_min': dateFromDatepickerString
            }
          updateUrl(urlUpdates) 
          //reqStart = $(new_time_minCalEl).val()
          //reqEnd = $(new_time_minCalEl).val()
          validateTimeCount()
          validateTimeStride()
          console.log('datepicker change calling validate dates')
          validatedDates = validateDateRequest(datasetStart, datasetEnd)
          // now update the url with validated dates if needed
          console.log(validatedDates)
          /*if (validatedDates.startDateFlag=='new' && validatedDates.endDateFlag == 'new'){
            console.log('updateUrl with new min time and new max time')
          } else if (validatedDates.startDateFlag=='new'){
            console.log('updateUrl with new min time')
          } else if (validatedDates.endDateFlag=='new' ){
            console.log('updateUrl with new max time')
          }*/
        } else {
          console.log('just creating date pickers, not processing the time here')
        }
      });

      // on max time change in the calendar update the url
      $(".time-max-input").on("dp.change", function (e) {
        console.log('Max TIME CHANGED')
        clearErddapUrlDisplay()
        $(".time-max-wrap .dropdown-menu").hide()
        $(".time-max-input").blur()
        if (inCreateDatePickers == 0) {
          console.log('setting new max time in url')
          //console.log($('.time-max-input').val())
          thisdatasetId = getActive('datasetid')
          new_time_maxCalEl = '#'+ thisdatasetId + "-getData-time-max"
          var dateFromDatepicker = $(new_time_maxCalEl).data('DateTimePicker').date();
          var dateFromDatepickerString = dateFromDatepicker.format("YYYY-MM-DD[T]HH:mm:ss[Z]")
          var urlUpdates = {
            'new_time_max': dateFromDatepickerString
            }
          updateUrl(urlUpdates) 
          validatedDates = validateDateRequest(datasetStart, datasetEnd)
          // now update the url with validated dates if needed
          console.log(validatedDates)
          //console.log(datasetStart)
          //console.log(datasetEnd)
          console.log('time-max-input change is calling validate dates')
          validatedDates = validateDateRequest(datasetStart, datasetEnd)
          // returns validated dates, if dates should be changed we then push them the url again

          reqStart = $('.time-min-input').val()
          reqEnd = $('.time-max-input').val()
          validateTimeCount()
          validateTimeStride()

        } else {
          console.log('in create date pickers, not processing the time here')
        }
      });

      $(".parameterSelect .checkbox").change(function() {
          // get all the currently selected checkboxes and use that for the url
          parSelector = activeForm + ' .parameters-filters input:checked';
          parList = [];
          $(parSelector).each(function() {
            parList.push($(this).attr('value'));
          })    
          var urlUpdates = {
            'new_vars': parList.join(',')
            }
          updateUrl(urlUpdates)
          validateVarRequest()
      });
      
      

      /* 
       * called on format change and on parameter change 
       * some formats like images require only one parameter be selected
       */
      function validateVarRequest() {
        console.log('validating number of variables')
        validVarsFlag = 1
        fmt = getActive('fmt');
        if ( fmt == "largePng" || fmt == "geotif" ) {
          // hide size estimate block when image format is selected
          if (!($('.sizeEstimateNetCDF').hasClass('hidden'))){
            $('.sizeEstimateNetCDF').addClass('hidden')
          }
          
          // check to make sure that only one paramter is selected for image downloads
          varList = getActive('var');
          // if more than one variable and an image format, present an error
          if (varList.split(',').length > 1){
            validVarsFlag = 0;
            console.log('error - too many vars for this format')
            $('.varsErrors').html('<p class="var-count-error"><i class="fa fa-exclamation-triangle" '+
                    'aria-hidden="true"></i> Select a single parameter for image requests.</p>')
              $('.varsErrors').removeClass('hidden')
          } else {
            console.log('number of vars is ok for this format')
            if ($('.varsErrors').hasClass('hidden')) {
              //skip
            } else {
              $('.varsErrors').addClass('hidden')
            }
          }
        } else {
          console.log('any number of vars is ok for this format')
            if ($('.varsErrors').hasClass('hidden')) {
              //skip
            } else {
              $('.varsErrors').addClass('hidden')
            }
          }
      }
     
     function getDownloadUrl() {
      console.log('Getting download URL')
      //Check that all fields passed their individual validations
   
        console.log('validating time count')
        validateTimeCount()
        console.log('done validating time coutn')

        console.log(baseUrl)
        if ( validTimeCountFlag == 1 ) {
          console.log('# of times is ok. ')
          if ($('.submitError').hasClass('hidden')) {
            $('.submitError').removeClass('hidden')
          }
          // TIME QUERY FROM URL
          dateQuery = "[("+ getActive('time_min') +"):"+getActive('time_stride')+":("+ getActive('time_max') +")]"

          // LATITUDE QUERY
          var getdatacompleted = [];
          var y_minInput = ''
          var y_maxInput = ''

          // GET VALUES FROM URL
          x_maxQuery = getActive('x_max')
          x_minQuery = getActive('x_min')
          y_maxInput = getActive('y_max')
          y_minInput = getActive('y_min')
          //console.log(y_minInput)
          
          fmt = getActive('fmt')
          console.log(fmt)
          // SET LATITUDE QUERY
          // - check which lat field should be first in the query
          // - this is dependent on the way data is loaded into ERDDAP/Stored in file
          // Want to do this in javascript not python, so that it is transparent to the user
          // otherwise the form is not consistent looking to the user
          // updating to use a data attribute for isReversed write into template in python
          
          if (isIncreasing == 1) {
            // if answer is negative then latmin goes first
            // first number must be lower than second number
            // To do: to add validation
            //console.log('Lat Is INCREASING')
            //console.log(y_minInput)
            if (y_minInput !== '') {
              y_minQuery = y_minInput;
            }
            if (y_maxInput !== '') {
              y_maxQuery = y_maxInput
            }
          } else {
            if (y_minInput !== '') {
              y_maxQuery = y_minInput;
            } else {
              y_maxQuery = y_minQuery;
            }
            if (y_maxInput !== '') {
              y_minQuery = y_maxInput;
            } else {
              y_minQuery = y_maxQuery;
            }
          }
          ycoordQuery = "[("+ y_minQuery +"):"+getActive('y_stride')+":("+ y_maxQuery +")]";

          // SET LONGITUDE QUERY
          xcoordQuery="[("+x_minQuery+"):"+getActive('x_stride')+":("+x_maxQuery+")]";

          // SET FORMAT Specific Query items
          if (fmt == "largePng"){
            fmtQuery = "&.draw=surface&.trim=0"
          } else {
            fmtQuery = ""
          }

          // SET PARAMETERS
          var parList = [];
          parSelector = activeForm + ' .parameters-filters input:checked';
          $(parSelector).each(function() {
            parList.push($(this).attr('value'));
          })    
          //console.log(parList)

          // form url
          if (parList.length > 1){  
            parQueries = []
            if (hasAlt == 1){
              $(parList).each(function(i, par) {
                query = par + dateQuery + altQuery + ycoordQuery + xcoordQuery + fmtQuery
                parQueries.push(query)
              });
            } else {   
              $(parList).each(function(i, par) {
                query = par + dateQuery + ycoordQuery + xcoordQuery + fmtQuery
                parQueries.push(query)
              });
            }
            parQueriesString = parQueries.join(',')
            console.log(parQueriesString)
            fullUrl = baseUrl + parQueriesString
          } else if (parList.length == 1){
            query = []
            $(parList).each(function(pari, par){
              if (hasAlt == 1 ){
                query.push(par + dateQuery + altQuery + ycoordQuery + xcoordQuery + fmtQuery)
              } else {
                query.push(par + dateQuery + ycoordQuery + xcoordQuery + fmtQuery)
              }  
            })
            fullUrl = baseUrl + query
          }
        } else {
          console.log('errors to be fixed by user on form')
          //$(".submitError").text('See above errors on form, fix them');

           $('.submitError').html('<p><i class="fa fa-exclamation-triangle" '+
                  'aria-hidden="true"></i> Please fix the highlighted form errors.</p>')
           $('.submitError').removeClass('hidden')
        }
        console.log('data request url: ' + fullUrl)
        return fullUrl
     }

     $('.getData .btn-default.downloadFormSubmitBtn').click(function(event) {
        
        console.log('Procesing form:' + activeForm)
        event.preventDefault(); 

        // Insert a summary of the download that will be called
        // 1. Did you really mean to submit this form?
        // 2. Here are approximations for file size
        // 3. If very large - Here are recommendations for other ways to access this data if you need such a large quantity
        // 4. Confirm
        fullUrl = getDownloadUrl()
        console.log(fullUrl)   
        $('.erddapUrlDisplay').html('<div class="">'+fullUrl+'</div>')
        $('.erddapUrlDisplay').removeClass('hidden')
      });

      /*
       * GET-DATA FORM SUBMIT HANDLER
       * 11/27/18 changed to only 'submit' on click
       * to match ERDDAP download form behavior and prevent downloads from starting accidentally
       */
      $('.getData .btn-primary.downloadFormSubmitBtn').click(function(event) {
        console.log('Procesing form:' + activeForm)
        event.preventDefault(); 

        // Insert a summary of the download that will be called
        // 1. Did you really mean to submit this form?
        // 2. Here are approximations for file size
        // 3. If very large - Here are recommendations for other ways to access this data if you need such a large quantity
        // 4. Confirm
        fullUrl = getDownloadUrl()   
        fmt = getActive('fmt')

        if (fmt == "nc" || fmt == "mat") {
          var sizeEstimate = getSizeEstimate()  // Estimate request size
          // Dynamically add request size value to the pop-up modal text
          $(".requestSizeValue").text(parseFloat(sizeEstimate.String));
          if (sizeEstimate.Mb >= 30 && sizeEstimate.Mb <= 2000) {
            // show an alert, maybe have another check 
            // if we can estimate the clients download speed and it is fast then don't show the message
            $("#downloadSizeAlertModal").modal("show");
          } else {
            console.log('size okay, making call to erddap')
            window.open(fullUrl);  // MAKE DATA CALL TO ERDDAP 
          }
        } else {
          // not netdf or mat
          console.log('making call to erddap')
          window.open(fullUrl);  // MAKE DATA CALL TO ERDDAP 
        }
        
      }); // end form submit request

      /*
       * Large Downoad Modal Pop-up handlers
       */
      $('.download-confirm-btn').click(function(){
        console.log('confirmed')
        $('#downloadSizeAlertModal').modal('hide')
        window.open(fullUrl);  // MAKE DATA CALL TO ERDDAP 
      });



    })
    .fail(function() {
      console.log( "error fetching metadata, cant populate page" );
    })


  

  // Load Active Subentry Tab from URL
  // Includes check to make sure the hash is a valid tab, if not selects first tab  
  
  /*
  if (window.location.hash){
    
    if($(window.location.hash).length == 0) {
      
      console.log('has invalid hash, show first tab')
      firstTabUrl = window.location.protocol +"//"+window.location.host + window.location.pathname
      window.open(firstTabUrl, "_self");
    
    } else {
    
      console.log('valid hash, processing as usual')
      $(".tab-pane").removeClass("active in");
      $(window.location.hash).addClass("active in");
      $('a[href="'+ window.location.hash +'"]').tab('show');
    
    }
  }
  */


  
  


}); // end ready




// DATA IS INPUT FROM loadJson function which is called in the html generated by python
var ycoordQuery, dateQuery, hasAlt
var x_minQuery, x_maxQuery

/*
 * on page load get valid times for ALL datasets in this entry (from erddap),
 * use to populate calendar for image selection, python writes a json object
 * populate all calendars on page load, return active_time for first map
 * just one request to timelist
*/

function createDatepickers(entry){
    // Calendar is now in GMT

    console.log("create datepickers and getValidTimes Starting ")
    var tick = performance.now();
    var a = $.getJSON( "../timeList.json" , {
    })
    .done(function() { 
        tock = performance.now() -tick
        console.log('timelist.json open took' + parseFloat(tock)+' ms, Now processing json')
        
        var resp = a.responseJSON;
        entry["calendars"] = []
    
        // Get current browser timezone offset
        //var browserDate = new Date();
        //var browserOffsetHr = browserDate.getTimezoneOffset() / 60;
        
        // For all datasets on this page, Populate valid dates in repective datepicker
        // First format the dates and store in theseTimes        
        
        inCreateDatePickers = 1
        
        for ( var i = 0; i < entry["datasets"].length; i++ ) {
            var thisdatasetId = entry["datasets"][i]["id"]
            new_time_minCalId = thisdatasetId +"-getData-time-min"
            new_time_maxCalId = thisdatasetId +"-getData-time-max"
            for ( var j=0; j<resp["ids"].length ; j++ ) {
                // Match calendar id to response's id and add the info to that calendar 
                if ( resp["ids"][j] == thisdatasetId ){
                    // populate a calendar list for the entry
                    entry["calendars"].push(new_time_minCalId)  
                    entry["calendars"].push(new_time_maxCalId)
                    
                    // create timelist for each dataset
                    entry["datasets"][i]["time"]["timeList"] = resp["timeList"][j]
                    
                    var theseTimes = resp["timeList"][j]                    
                    
                    // create timelist in the date format the calendar needs
                    newCalTimes = []
                    for ( var k = 0; k < theseTimes.length; k++ ){
                        newCalTimes.push(moment.utc(theseTimes[k][0]))
                    }
                    
                    // see whether to use default dataset date or one from the url
                    timeMinUrl = getActive('time_min')
                    if (timeMinUrl !== ''){
                      console.log(timeMinUrl)
                      // will need checks here to make sure it is a valid date in this calendar
                      // or more broadly write some code that finds the nearest time 
                      //to the selected time for when toggling between datasets
                      // will need a display on the screen that lets the user know their 
                      //chosen time was not valid and we've attempted to use the closest one
                      // for now we will see how it works without that fancy stuff
                      timeMinDefault = timeMinUrl
                    } else {
                      timeMinDefault = newCalTimes[newCalTimes.length-1]
                    }
                    console.log(timeMinDefault)

                    urltime_max = getActive('time_max')
                    if (urltime_max !== ''){
                      //console.log(urltime_max)
                      // will need checks here to make sure it is a valid date in this calendar
                      // or more broadly write some code that finds the nearest time 
                      //to the selected time for when toggling between datasets
                      // will need a display on the screen that lets the user know their 
                      //chosen time was not valid and we've attempted to use the closest one
                      // for now we will see how it works without that fancy stuff
                      timeMaxDefault = urltime_max
                    } else {
                      timeMaxDefault = newCalTimes[newCalTimes.length-1]
                    }

                    //console.log(new_time_minCalId)
                    //console.log(newCalTimes)
                    new_time_minCalEl = '#'+new_time_minCalId
                    new_time_maxCalEl = '#'+new_time_maxCalId
                    //console.log(new_time_minCalEl)
                    //console.log(timeMinDefault)
                    // Use dates to populate picker
                    $(new_time_minCalEl).datetimepicker({
                        defaultDate: timeMinDefault,
                        enabledDates: newCalTimes,
                        widgetPositioning: {
                          vertical:'bottom'
                        },
                        timeZone:'UTC',
                        format:'MM/DD/YYYY HH:mm[Z]'
                    })
                    //$('#datetimepicker').data("DateTimePicker").OPTION()
                    //console.log($(new_time_minCalEl).datetimepicker)
                    //console.log(moment.utc($(new_time_minCalEl).val()))
                    try {
                      dateValue = $(new_time_minCalEl).data('DateTimePicker').date();
                    } catch(err) {
                      console.log('didnt work on first try, does it work now?')
                      dateValue = $(new_time_minCalEl).data('DateTimePicker').date();
                    }
                    //console.log(dateValue.toISOString())
                    //console.log(dateValue.format("dddd, MMMM Do YYYY, h:mm:ss a"))
                    // Use dates to populate picker
                    $(new_time_maxCalEl).datetimepicker({
                        defaultDate: timeMaxDefault,
                        enabledDates: newCalTimes,
                        widgetPositioning: {
                          vertical:'bottom'
                        },
                        timeZone:'UTC',
                        format:'MM/DD/YYYY HH:mm[Z]'
                    })
                    break
                } 
            }
        }
        inCreateDatePickers = 0
        console.log("Finished creating datepickers:")
        
        updateFormValues()
        })
        .fail(function() {
          console.log( "error fetching dataset times, cant populate page" );
        })
        //console.log(dataset["time"])
        //console.log(dataset["time"]["timeList"])
        //return validTimeLists
}

// called on load after bringing in json file

function configFileHandler (data, urlId, datasetid) {  
  console.log('In Config file handler Function') 
  
  
  //console.log('here')
  //activeDatasetId = getActive('datasetid') // active tab (not url)
  

}

