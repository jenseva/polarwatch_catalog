
function searchStringInArray (str, strArray) { // using for max an min time finding
  for (var j=0; j<strArray.length; j++) {
    if (strArray[j].match(str)) return j;
  }
  return -1;
  }

$(document).ready(function() {
  
  //pagePath = window.location.host + window.location.pathname  
  //console.log(window.location.pathname)
  //console.log(window.location.search)
  
  //Set Catalog query based on page url
  if (window.location.search !== ''){
    pageQuery = window.location.search.substr(1)
  } else {
    pageQuery = ''
  }

  // Run Load Catalog Function
  // input is page query string (if one exists)
  loadCatalog(pageQuery); 
   
  
  // On Click remove filter from Selected Filters List
  $(".filterSelBtn").on('click', function() {
     btnToRemove = ($(this).attr('id'))
     console.log(btnToRemove)
     filterToRemove = btnToRemove.substring(0,btnToRemove.indexOf('SelBtn'))
     removeFilter(filterToRemove)
  });

 $( function() {
    // sets up two date pickers for start, end time
    maxtime = $( "#maxTime" )
      .datepicker({
        changeMonth: true,
        changeYear: true,
        yearRange: "1950:2100",  // set this to erddap min and max
        dateformat:'mm/dd/yyyy',
        maxDate: new Date()
      })
      .on( "change", function() {      // updating calendar options setting time limit in "start date" calendar
        filterMaxTime = $("#maxTime").datepicker('getDate')
        mintime.datepicker( "option", "maxDate", filterMaxTime);
      }),
    mintime = $( "#minTime" ).datepicker({
        changeMonth: true,
        changeYear: true,
        yearRange: "1950:2100",  // set this to erddap min and max
        dateformat:'mm/dd/yyyy',
        maxDate: new Date()
      })
      .on( "change", function() {    // updating calendar options with new "end date" calendar max 
        filterMinTime = $("#minTime").datepicker('getDate')
        maxtime.datepicker( "option", "minDate", filterMinTime); 
    });
   
    function getDate( element ) {
      var date;
      try {
        date = $.datepicker.parseDate( dateFormat, element.value );
      } catch( error ) {
        date = null;
      }
      return date;
    }
  });



});  // end doc ready

// reduces Datepicker available range based on first input
// not sure I like the way this is working
$("#minTime").onchange = function() {               // set other date picker to have reduced range
  if ($("#maxTime").datepicker('getDate') !== null) {       // check older than maxTime
     filterMaxTime = $("#maxTime").datepicker('getDate').getTime();
     if ($("#minTime").datepicker('getDate') !== null) {              //extra check for if clearing calendar
       filterMinTime = $("#minTime").datepicker('getDate').getTime();
       if (filterMinTime >= filterMaxTime){
        console.log('try again, time must be older than max time')
        $("#minTime").addClass("input-warn")
       }    
    }  
  }
}      
$("#maxTime").onchange = function() {                     // set other datepicker to reduced range
  maxTimeInput = $("#maxTime").datepicker('getDate');     // check older than maxTime
  if ($("#minTime").datepicker('getDate') !== null) {
    if ($("#maxTime").datepicker('getDate') !== null) {
     filterMaxTime = $("#maxTime").datepicker('getDate').getTime();
     filterMinTime = $("#minTime").datepicker('getDate').getTime();
     if (filterMaxTime <= filterMaxTime){
      console.log('try again, time must be newer than min time')
      $("#maxTime").addClass("input-warn")
     }      
    }
  }
}

/*
/* Populates Filter Form based on Url Parameters
/* Runs when moving from a dataset page or the catalog is bookmarked with a query
/* FilterJson is called directly after this
*/
function popFromUrl(urlQuery){   
  // Runs through each filter in query string    
  // sets form elements to match
  // the values in the Query string
  
  activeFilters = urlQuery.split('&')
 
  $.each(activeFilters, function(i, activeFilter) {     
      param = activeFilter.split("=");
      console.log(param[0])
      console.log(param[0].indexOf('inst'))

      if (param[0].indexOf('searchFor') !== -1 ) {
        $('#searchInput').val(param[1])
      } else if (param[0].indexOf('minTime') !== -1 ) {
        $('#minTime').val(param[1])
      } else if (param[0].indexOf('maxTime') !== -1 ) {
        $('#maxTime').val(param[1])
      } else if (param[0].indexOf('np') !== -1 ) {
        $('#np').prop('checked', true)
      } else if (param[0].indexOf('sp') !== -1 ) {
        $('#sp').prop('checked',true)
      } else if (param[0].indexOf('instNOAA') !== -1 ) {
        $('#instNOAA').prop('checked',true)
      } else if (param[0].indexOf('ssh') !== -1 ) {
        $('#ssh').prop('checked',true)
      } else if (param[0].indexOf('wtemp') !== -1 ) {
        $('#wtemp').prop('checked',true)
      } else if (param[0].indexOf('wind') !== -1 ) {
        $('#wind').prop('checked',true)
      } else if (param[0].indexOf('sal') !== -1 ) {
        $('#sal').prop('checked',true)
      } else if (param[0].indexOf('ice') !== -1 ) {
        $('#ice').prop('checked',true)
      } else if (param[0].indexOf('color') !== -1 ) {
        $('#color').prop('checked',true)
      } else if (param[0] === 'par'){
        thisparli = '#parSelect li.par-' + param[1].toLowerCase()
        $(thisparli).addClass('selected');
      } else if (param[0].indexOf('inst') !== 1 ){
        thisinstli = '#instSelect li.inst-' + param[1].toLowerCase()
        $(thisinstli).addClass('selected');
      }
  });
}


function sortResults() {
  
  console.log('in sort resuts')
  
  var entryWrapper = $('#products'); 
  
  entryWrapper.find('.entrydiv').sort(function(a,b) {
    //console.log('in sort resuts')
    return +b.getAttribute('data-default-rank') - +a.getAttribute('data-default-rank');
  })
  .appendTo(entryWrapper)

}


function removeFilter(filterToRemove){
  //get all filters from url
  //if it doesn't match the remove filter keep it
  //pass new filte list back to url
  console.log('Removing: '+ filterToRemove)

  // first remove selection from the form
  // then remove string from url
  // then force an update

  // Remove Form Selection Settings per filter to remove

  if (filterToRemove == "searchFor"){
    $('#searchInput').val("")
  } else if (filterToRemove == "inst"){
    $('#instSelect').find('.selected').removeClass('selected');
  } else if (filterToRemove == "sp"){
     $('#sp').prop('checked', false);
  } else if (filterToRemove == "np"){
     $('#np').prop('checked', false);
  } else if (filterToRemove == "instNOAA"){
     $('#instNOAA').prop('checked', false);
  } else if (filterToRemove == "ssh"){
     $('#ssh').prop('checked', false);
  } else if (filterToRemove == "color"){
     $('#color').prop('checked', false);
  } else if (filterToRemove == "ice"){
     $('#ice').prop('checked', false);
  } else if (filterToRemove == "sal"){
     $('#sal').prop('checked', false);
  } else if (filterToRemove == "wtemp"){
     $('#wtemp').prop('checked', false);
  } else if (filterToRemove == "wind"){
     $('#wind').prop('checked', false);
  } else if (filterToRemove == "par"){
    $('#parSelect').find('.selected').removeClass('selected');
  } else if (filterToRemove =="minTime"){
    $('#minTime').val(null);
    $("#minTime").change();//needed because datepickers are synced
  } else if (filterToRemove =="maxTime"){
    /*today = new Date();
    var dd = today.getDate();
    var mm = today.getMonth() + 1;
    var yyyy = today.getFullYear();
    if (dd < 10) {
      dd = '0' + dd;
    }
    if (mm < 10){
      mm = '0' + mm;
    }
    maxTimeValue = mm +'/'+ dd +'/'+ yyyy
    console.log(maxTimeValue)
    */
    $('#maxTime').val(null)
    $("#maxTime").change();//datepicker('setDate',maxTimeValue);
  }

  urlQuery = window.location.search.substr(1);
  
  activeFilters = urlQuery.split('&')
  
  newUrlQueries = []
  

  $.each(activeFilters, function(i, activeFilter) {  
    param = activeFilter.split("=");   
    if (param[0] !== filterToRemove){
      newUrlQueries.push(activeFilter)
    }  
  });
  
  newUrlQuery = newUrlQueries.join('&')
  
  console.log(newUrlQuery)
  
  if (newUrlQuery !== ''){
    //console.log(newUrlQuery)
    history.pushState(null, pagePath, '?'+ newUrlQuery);  
  } else {
    //console.log(pagePath)
    history.pushState(null, pagePath,'?' );  
  }
  
  pagePath = window.location.host + window.location.pathname  
  
  //console.log(window.location.pathname)
  //console.log(window.location.search)
  
  processForm();
}  


function filterJson(urlQuery, catalog){
  
  // called on page load, calls filter entries
  // inputs: URL query string and full catalog
  // filters and redisplays the results

  console.log('in filterJson')
  console.log(urlQuery)

  $('#error-message').html('')
  $('#error-message').removeClass('hidden')
  $('#error-message').addClass('hidden')
  
  // Make the catalog entries look like they are refreshing  
  
  $( ".entrydiv" ).fadeOut(10); 
  $( ".entrydiv" ).fadeIn(10);
 
  // if you were scrolled down bring you back to the top 
  
  $('html, body').animate({scrollTop: '0px'}, 700);          
  
  pagePath = window.location.host + window.location.pathname  
  activeFilters = urlQuery.split('&')

  console.log(catalog)

  var parDisplayNameDict = {
    sal:'salinity',
    wtemp:'Water Temperature',
    color:'Ocean Color',
    wind:'Winds',
    ice:'Ice',
    ssh:'Sea Surface Height'
  }

  var foundIds = [];
  
  
  hasSearch = 0
  
  console.log('---filter json active filter loop ---')
  
  // hide all selected filter buttons
  $(".filterSelBtn").removeClass('hidden'); 
  $(".filterSelBtn").addClass('hidden')

  
  // CREATE ACTIVE FILTER BUTTONS
  // above the search results for each active filter (from url)
  // indicate which filters are active
  // and allow user to deselect/remove the filter
    
  $.each(activeFilters, function(i, activeFilter) {     
      
      param = activeFilter.split("=");
     
      selFilterKey = param[0]
      selFilterVal = param[1]
     
      console.log(selFilterKey +': '+selFilterVal)

      // Set the text of the button
      btnText = ''
      if (selFilterKey == 'par'){
        btnText = parDisplayNameDict[selFilterVal]
      } else if (selFilterKey == 'inst'){
        btnText = selFilterVal
      } else if (selFilterKey == 'minTime') {
        btnText = 'Newer than ' +selFilterVal
      } else if (selFilterKey == 'maxTime') {
        btnText = 'Not Newer than ' +selFilterVal
      } else if (selFilterKey == 'sp') {
        btnText = 'Antarctic'
      } else if (selFilterKey == 'np') {
        btnText = 'Arctic'
      } else if (selFilterKey == 'instNOAA') {
        btnText = 'NOAA'
      } else if (selFilterKey == 'ssh') {
        btnText = 'Sea Surface Height'
      } else if (selFilterKey == 'ice') {
        btnText = 'Ice'
      } else if (selFilterKey == 'wind') {
        btnText = 'Wind'
      } else if (selFilterKey == 'sal') {
        btnText = 'Salinity'
      } else if (selFilterKey == 'color') {
        btnText = 'Ocean Color'
      } else if (selFilterKey == 'wtemp') {
        btnText = 'Water Temperature'
      } else if (selFilterKey == 'searchFor') {
        console.log('trying to set search button')
        btnText = selFilterVal
      }

      // SHOW active filter button      
      thisBtnEl = '#' + selFilterKey +'SelBtn'
      console.log(thisBtnEl)
      $(thisBtnEl).removeClass('hidden')
      $(thisBtnEl + 'Text').text(btnText)
  
      /* Search directly with erddap */
      // Loops through the URl Query String
      // Only filter datasets returned from search
      // if searchFor is in query string limit foundids
      // if not, dont limit found ids

      if ( param[0].indexOf('searchFor') !== -1 ) {

        hasSearch = 1
        // Query Erddap using catalog query string 'searchFor' values   
        // outputs entries where search term(s) are found
        // can be multiple terms, For value used directly in erddap query
        // calls filter entries which then hides corresponding divs  
      
        searchUrl = 'https://polarwatch.noaa.gov/erddap/search/index.json?'+ activeFilter

        var searchxhr = $.getJSON( searchUrl, {
          })
          .done(function() {   
            searchResponse = searchxhr.responseJSON;            
            $.each(searchResponse.table.rows, function(index_found, foundDataset) {   
              foundDatasetId = foundDataset[15]
              foundIds.push(foundDatasetId)
            });
            // Running filter entries after processing search
            filterEntries(foundIds)
          })
          .fail(function() {
            $('#error-message').html('Error connecting to erddap. cannot search results')
            $('#error-message').removeClass('hidden')
            console.log( "error searching" );
          })
        return searchxhr.responseJSON;
      } 
  
  }); // end active filter loop
   
  // For cases where filter list does not contain 'searchFor'
  // run filterEntries and hide corresponding divs

  if (hasSearch == 0)  {
  
        for (var entryName in catalog) {
          entry = catalog[entryName]
          $.each(entry.ids, function(i, id) {   
              foundIds.push(id)
          });
        } 
        console.log('No search terms submitted, running filters on all entries')
        filterEntries(foundIds)
  }


  // filterEntries is called in three cases:
  //  - when form is submitted
  //  - when filters are removed
  //  - on page load 
  // uses query string 
  // input is result of ERDDAP search (if any)

  function filterEntries (foundIds) { 
    console.log('in filterEntries')

    // Looping through Catalog Entries

    for (var entryName in catalog) {
      
      entry = catalog[entryName]
      
      // LIMIT TO VALID ENTRIES

      if (entry.firstValidDataset == -1){
        console.log('Skipping Entry')
        console.log(entry)
        continue // skip this entry
      
      } else {
        // CHECK EACH ENTRY DATASET FOR SEARCH TERM 
        // if there is a match this entry is not hidden
        
        //console.log(entryName)    // entryName id the group id
        if (entry.datasets) {
          entryTimeMin = entry.datasets[entry.firstValidDataset]['time']['start']
          entryTimeMax = entry.datasets[entry.firstValidDataset]['time']['end']
          parTag = entry.parameterTags
          entryInst = entry.providerCredit
          

          activeCategories = [];
          categories = $('#collapseCategory').find(':checkbox');
          categoryIds = []

          $.each(categories, function(i,category){
            categoryIds.push(category.id)
          })

          // Reset to show all entries
          $( '#' + entryName ).removeClass("hidden" ) 

          // Handle Search response of found search term
          // Compare found dataset ids to dataset ids in this entry
          // Hide if not in found array (search term is not in entry)
          
          var arrays = [entry.ids, foundIds];
          
          var result = arrays.shift().reduce(function(res,v) {
            if (res.indexOf(v) === -1 && arrays.every(function(a) {
              return a.indexOf(v) !== -1;
            })) res.push(v);
              return res;
            }, []);

          if (result.length == 0) {
            $( '#'+ entryName ).addClass("hidden")
          }

          //console.log('--- Hide or show entry based on active filters ---')
          
          // LOOP THROUGH OTHER ACTIVE FILTERS TO HIDE ENTRIES
          // USES catalog URL query string parameters

          // specifically looking at categories
          // if entry doesn't match any of the selected categories, hide it
          
          $.each(activeFilters, function(iActiveFilter, activeFilter) {
          
            activeFilter = activeFilter.split("=");
            selFilterKey = activeFilter[0]
          
            if (categoryIds.indexOf(selFilterKey) > -1){
              activeCategories.push(selFilterKey)
            };

          });
          
          if (activeCategories.length > 0 ){
            if (activeCategories.indexOf(parTag[0]) === -1){
              console.log('Hiding entry because not a selected category')
              console.log(entryName)
              $( '#'+ entryName ).addClass("hidden" )
            }
          }

          // NEXT Run through each remaining filter and hide coresponding divs    
          // keeps hiding additional entries with each filter loop

          $.each(activeFilters, function(iActiveFilter, activeFilter) {
                        
            activeFilter = activeFilter.split("=");
            selFilterKey = activeFilter[0]
            selFilterVal = activeFilter[1]
              
              if (selFilterKey === 'instNOAA') {
                if (entryInst.indexOf('NOAA') == -1){
                 $( '#'+ entryName ).addClass("hidden" )
                }
              }

              // ARCTIC CHECK BOX
              if (selFilterKey ==='np' ) {
                if ( selFilterVal === 'y' ) {

                  // First, look to see if antarctic is also checked
                  if ( activeFilters.indexOf('sp=y') !== -1 ) {
                    console.log('both arctic and antarctic checked, making sure nothing is hidden')
                  }
                  else {
                    //check entry, show only if arctic
                    if ( $( '#'+ entryName ).hasClass( "antarctic" )){
                      if ( $( '#'+ entryName ).hasClass( "arctic" )){
                        //both arctic and antarctic data for entry - it will never be hidden by this toggle!
                      } else {
                        // Hiding Entries
                        if ($( '#' + entryName ).hasClass("hidden" )) {
                          console.log('I would hide it, but its already well hidden')
                        } else {
                          console.log('hiding antarctic entry')
                          $( '#'+ entryName ).addClass("hidden" )
                        }
                      }
                    }
                  }
                }
              }
              
              // ANTARCTIC CHECK BOX
              if (param[0]==='sp') { 
                if (param[1] === 'y') {                               //look to see if arctic is also checked
                  if ( activeFilters.indexOf('np=y') !== -1 ) {           //'both arctic and antarctic checked, nothing will be hidden')
                  }
                  else {                                              // show only antarctic
                    if ( $( '#'+ entryName ).hasClass( "arctic" )){
                      if ( $( '#'+ entryName ).hasClass( "antarctic" )){
                      } else {
                        if ($( '#'+entryName ).hasClass("hidden" )) {     // I would hide it, but its already well hidden
                        } else {                                      // hiding
                          $( '#'+entryName ).addClass("hidden" )
                        }
                      }
                    }
                  }
                }            
              }

              // PROCESSING MAX TIME INPUT

              // input is in mm/dd/yy format from calendar input
              if (param[0]=== 'maxTime'){
                //console.log('processing time with max')
                // see if min time is set if so pull that for the time range of interest
                
                filterMaxTime = new Date(param[1]).getTime();
                dataMaxTime = new Date(entryTimeMax).getTime(); 
               
                dataMinTime = new Date(entryTimeMin).getTime();
                minTimeCheck = searchStringInArray("minTime", activeFilters)
             
                if (minTimeCheck !== -1){                                // set min time from other calendar
                  minTimeQuery = activeFilters[minTimeCheck].split("=")
                  minTimeValue = minTimeQuery[1];     
                } else {                                                 // set fake time
                  minTimeValue ="01/01/1800"
                }
                
                filterMinTime = new Date(minTimeValue).getTime();
              
                if ( Math.min(filterMinTime, filterMaxTime) <= Math.max(dataMinTime, dataMaxTime) && Math.max(filterMinTime, filterMaxTime) >= Math.min(dataMinTime, dataMaxTime) ) {
                    // data found within range
                } else {                                                 // no data in range
                    $( '#'+ entryName ).addClass("hidden" )
                }
                
                // many entries don't have dates remove them in python
                // many entries are climatologies and have odd dates (will remove them for now)
                // add validators to the form
                // don't let start date be after end date (and vice versa)
              }

              // PROCESSING MINTIME
              if (param[0]=== 'minTime'){                                     
                //console.log('proc min')
                maxTimeCheck = searchStringInArray("maxTime", activeFilters)     // if maxTime exists bypass, catch it in maxTime processor
             
                filterMinTime = new Date(param[1]).getTime();
                
                dataMaxTime = new Date(entryTimeMax).getTime(); 
                dataMinTime = new Date(entryTimeMin).getTime();
               
                if (maxTimeCheck !== -1){                              // add max time to query
                  maxTimeQuery = activeFilters[maxTimeCheck].split("=")
                  maxTimeValue = maxTimeQuery[1];     
                } else {                                               // set fake high max time
                  maxTimeValue ="01/01/2500"
                }
                filterMaxTime = new Date(maxTimeValue).getTime();
              
                if ( Math.min(filterMinTime, filterMaxTime) <= Math.max(dataMinTime, dataMaxTime) && Math.max(filterMinTime, filterMaxTime) >= Math.min(dataMinTime, dataMaxTime) ) {
                    //console.log('data found within range')
                } else {                                               // no data in range
                    $( '#'+entryName ).addClass("hidden" )
                }
                
                // many entries don't have dates remove them in python
                // many entries are climatologies and have odd dates (will remove them for now)
                // add validators to the form
                // don't let start date be after end date (and vice versa)
              }

            }); // END REMAINING ACTIVE FILTER LOOP
        }
      } // END IF VALID ENTRY
      console.log(activeCategories)
    }

  // Item and result count
  
  entrydivNo = $(".entrydiv").length
  resultCount = entrydivNo - $(".hidden").length
  resultCount2 = entrydivNo - $("#products .entrydiv.hidden").length
  
  $("#resultCount").html( resultCount2 + ' of '+ entrydivNo)
  
  // there was an issue here with counts being different,
  // when I think they should be the same...
  //  with first resultcount sometimes saw a -1 returned, 
  // trying with resultcount2 now
}
}

// to do: create no arctic coverage and ' no antarctic' coverage default graphics, use in python to push with images

// Loads the catalog json file (which is generated daily with python)
// If there is a query string in the url it is passed to this function
// which will load the catalog config and then filter it based on the 
// search parameters in the url

function loadCatalog(pageQuery){
  //console.log(pageQuery)

  // check that we really need to reload info from catalog.json
  if ($(".entrydiv").length > 0) {                              
    console.log('we already have a populated catalog')      // fix for firing twice from refreshing or clicking too fast?
  }
  else {
    console.log('Loading Catalog')
    
    var jqxhr = $.getJSON( 'config/catalog.json', {
      })
      .done(function() {                                   
        
        catalog = jqxhr.responseJSON;
        //console.log(catalog)
        
        writeResults(catalog)
       
        if (pageQuery !== ''){
          console.log('Running filters on page load')
          popFromUrl(pageQuery)
          filterJson(pageQuery, catalog)
        }
        sortResults();
      })
      .fail(function() {
        console.log( "error fetching metadata, cant populate catalog" );
      })
      .always(function() {                                 //console.log( "complete" );
      });
      jqxhr.complete(function() {                          // another completion function for the request above
      });
    return jqxhr.responseJSON;
  }
}
