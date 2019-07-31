// *
// Search and Filter Form 
// catalog page and dataset pages search bar
// *

function processForm() {

    console.log('In processForm()')

    // Process Catalog Form Inputs 
    // Called by changes to the form input 
    var completed = [];
    
    $('.catalogForm input').map(function() { 
      
      var pair
      
      if (this.value !== '' || this.value !== 'null' || this.value ? this.value : null){
        
        console.log(this.name)

        if (this.name.indexOf("searchFor") !== -1){     // query string for search
          y = this.value.replace(' ', '+')
          pair = '&' + this.name + '=' + y
        }  
        else if (this.name.indexOf("sp") !== -1) {      // query string for antarctic
          if ($('#sp').is( ":checked" )) {
            pair = '&' + this.name + '=' + 'y'
          }
        }
        else if (this.name.indexOf("np") !== -1) {      // query string for arctic
          if ($('#np').is( ":checked" )) {
            pair = '&' + this.name + '=' + 'y'
          }  
        }
        else if (this.name.indexOf("instNOAA") !== -1) {      
          if ($('#instNOAA').is( ":checked" )) {
            pair = '&' + this.name + '=' + 'y'
          }  
        }
        else if (this.name.indexOf("ssh") !== -1) {      
          if ($('#ssh').is( ":checked" )) {
            pair = '&' + this.name + '=' + 'y'
          }  
        }
        else if (this.name.indexOf("ice") !== -1) {      
          if ($('#ice').is( ":checked" )) {
            pair = '&' + this.name + '=' + 'y'
          }  
        }
        else if (this.name.indexOf("wind") !== -1) {      
          if ($('#wind').is( ":checked" )) {
            pair = '&' + this.name + '=' + 'y'
          }  
        }
        else if (this.name.indexOf("color") !== -1) {      
          if ($('#color').is( ":checked" )) {
            pair = '&' + this.name + '=' + 'y'
          }  
        }
        else if (this.name.indexOf("sal") !== -1) {      
          if ($('#sal').is( ":checked" )) {
            pair = '&' + this.name + '=' + 'y'
          }  
        }
        else if (this.name.indexOf("wtemp") !== -1) {      
          if ($('#wtemp').is( ":checked" )) {
            pair = '&' + this.name + '=' + 'y'
          }  
        }
        else if (this.name.indexOf("maxTime") !== -1) {      
            pair = '&' + this.name + '=' + this.value
        }
        else if (this.name.indexOf("minTime") !== -1) {      
            pair = '&' + this.name + '=' + this.value
        }
        else {
          // catching the ones not defined above
          pair_undefined = '&' + this.name + '=' + this.value      
          console.log('ALERT: processForm function is showing a new filter type: ' + pair_undefined)
        }
        completed.push(pair)
       }
      return pair; 
    })


    joined = completed.join('')
    joined = joined.substring(1, joined.length)
    
    console.log(joined)

    pagePath = window.location.host + window.location.pathname  
    locationArray = window.location.pathname.split('/')
      
    if (joined){
      // pushing parameters to url
      if (locationArray[2] !== '' && locationArray[2] !== 'index.php'){
        // assume form was sumbitted from a dataset page if 
        // there is text after catalog/ and it isn't index.php
        // opens up a catalog page with the search string appended
        // and then filters the results
        console.log('processForm says: not currently on catalog page, forwarding now with search terms')
        catalogUrl = "/" + locationArray[1] + "?"+joined;
        window.open(catalogUrl, '_self')
        //console.log(data)
        //filterJson(joined, data)
      } else {
        // form submitted from catalog page
        // console.log('already on catalog page')
        // update the url with history api
        // and then filter the results based on the new url
        pagePath = '/'+locationArray[1]
        history.pushState(null, pagePath, '?'+ joined);       // to do set to push and pop better
        console.log('processForm is calling filterJson')
      
        filterJson(joined, catalog)
      }
    } else {

      // Runs when filters are removed by the filter buttons, leaving no query string left
      // 12/12/17 - Can use this to clear all filters if I create a button for that
      
      console.log(' ** trying to reset the catalog in processForm, about to call filterJson')
      pagePath = "/" + locationArray[1]
      console.log(pagePath)
      history.pushState(null, pagePath,'?');       // to do set to push and pop better
      joined = '';
      filterJson(joined, catalog)
    }        
}


$(document).ready(function() {
  // Filter Handlers
  // Individual responses to each filter field

  $('#minTime').change(function(){
    console.log('Catalog form submitted by minTime')
    processForm(); // ProcessForm calls popfrom url and filterJson
  });
  
  $('#maxTime').change(function(){
    console.log('Catalog form submitted by maxTime')
    processForm();
  });

  $('#np').click(function(){
    console.log('Catalog form submitted by np checkbox')
    if ($('#np').is( ":checked" )) {
     console.log('checked')
     //$('#applied-filter-list #arctic-filter-on').removeClass('hidden')
     //$('#np').prop('checked', false)  
    } else {
      console.log('not checked')
      //$('#np').prop('checked', true) 
    }
    processForm();
  });   
  $('#sp').click(function(){
    console.log('Catalog form submitted by sp checkbox')
    processForm();
  });
  $('#instNOAA').click(function(){
    console.log('Catalog form submitted by inst NOAA checkbox')
    processForm();
  });
  $('#ssh').click(function(){
    console.log('Catalog form submitted by ssh checkbox')
    processForm();
  });
  $('#color').click(function(){
    console.log('Catalog form submitted by color checkbox')
    processForm();
  });
  $('#ice').click(function(){
    processForm();
  });
  $('#sal').click(function(){
    console.log('Catalog form submitted by sal checkbox')
    processForm();
  });
  $('#wind').click(function(){
    console.log('Catalog form submitted by wind checkbox')
    processForm();
  });
  $('#wtemp').click(function(){
    console.log('Catalog form submitted by wtemp checkbox')
    processForm();
  });

  $('#parSelect li').click(function() {
      $('#parSelect li.selected').removeClass('selected');
      $(this).closest('li').addClass('selected');
      processForm()
  })
  
  $('#instSelect li').click(function() {
      $('#instSelect li.selected').removeClass('selected');
      $(this).closest('li').addClass('selected');
      processForm()
  })
  
  // Submit Button for Filter Form (doesn't exist anymore? - 12/27/17)
  $('.catalogForm').submit(function(event) {    
    event.preventDefault();
    console.log('catalog form submitted')
    processForm();
  });

});