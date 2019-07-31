/*
This function writes the html for each catalog entry.
This call is made once on page load after the json 
configuration file is loaded.
Writing the results in javascript is a relic of the original 
catalog interface which was written solely in javascript.
Other portions of the portal ar newer and use python 
but this hasn't required updating and remains js.
*/

/* Input is data a javscript object that stores all the 
   information about each of the entries in the polarwatch catalog.
   
*/
function writeResults(data){
    
    console.log(data)
    console.log('Writing Catalog Entries')

    var showData = $('#products'); 
 
    ECount = 0;
    
    var entryList = [];
    
    // Loop through each catalog entry\
    for (var entryId in data) {
      
        entry = data[entryId]
        //console.log(entry)
        
        // Create blank html for the entry
        E = ''
        
        if (entry.entryId) {
            
            // Check to see how many datasets are in this entry
            // To determine if creating tabs or not
            numSubentries = entry.datasets.length
            if (numSubentries > 1){
                // process with tabs
                tabbed = numSubentries
            } else {
                tabbed = 0
            }
            
            if (numSubentries > 0) {    
                
                // check if entry is valid
                if (entry.firstValidDataset == -1){
                    continue  // skip this entry
                } else {
                    entryList.push(entryId)
                    //console.log(entry)
                    console.log('writing'+ entry.entryId)
                    // console.log(entryList)
                    // Add classes to entrys to distinguish arctic vs antarctic
                    sourceRank = entry.weightFactors[0].source
                    parameterRank = entry.weightFactors[0].parameter
                    qualityRank = entry.weightFactors[0].quality
                    rankScore = ((sourceRank *2) + (parameterRank *1.5 ) *qualityRank)/3
                        
                    latmin = entry.datasets[entry.firstValidDataset].ycoord.min
                    latmax = entry.datasets[entry.firstValidDataset].ycoord.max
                        
                    // Start of entry html

                    // Set arctic and/or antarctic classes here
                    // Updatated March 2019 to use regions instead of lat
                    //console.log(entry.regions)
                    //console.log(Object.entries(entry["regions"]))
                    //regions = Object.entries(entry["regions"])
                    //console.log(regions[1])
                    arctic = 0; antarctic = 0; alaska = 0;
                    for (i = 0; i < entry["regions"].length; i++) {
                        regions = Object.entries(entry["regions"][i])
                        //console.log(regions)
                        for (j = 0; j < regions.length; j++) {
                            //console.log(regions[j])
                            if (regions[j][0] == 'arctic' && regions[j][1] == 1) {
                                //console.log('add arctic class')
                                arctic = 1
                            } else if (regions[j][0] == 'antarctic' && regions[j][1] == 1) {
                                antarctic = 1
                            } else if (regions[j][0] == 'alaska' && regions[j][1] == 1) {
                                alaska = 1
                            }
                        }
                    }
                    //console.log(arctic, antarctic)
                    if (arctic == 1 && antarctic == 1 ){
                        //console.log('creating bipolar card')
                        E  = '<div class="entrydiv arctic antarctic col-xs-12 col-sm-6 col-lg-4" data-default-rank="'+rankScore+'" id="' + entryId + '">'  
                    } else if (arctic == 0 && antarctic == 1) {
                        //console.log('creating antarc card')
                        E = '<div class="entrydiv antarctic col-xs-12 col-sm-6 col-lg-4 " data-default-rank="'+rankScore+'" id="' + entryId + '">'
                    } else if (arctic ==1 && antarctic == 0) {
                        console.log('creating arctic card')
                        E  = '<div class="entrydiv arctic col-xs-12 col-sm-6 col-lg-4" data-default-rank="'+ rankScore+'" id="' + entryId + '">' 
                    } 
                        
                    E += '<div class="entrydiv-inner"><div class="caption col-sm-12 ">'
                          
                    // Write title and link to the individual dataset summary page
                    E += '<div class="entryHeader">'
                      
                    E += '<div class="entrydivTitle"  id="'+ entryId +'"><a class="entryLinkHeader" href="./'+entryId+'/preview">' +
                            entry.entryName +'</a></div>'


                    E +=  '<!-- Nav tabs -->'
                    E +=  '<ul class="nav nav-tabs" role="tablist">'
                  
                    // Loop for individual Datasets

                    // Active tab is set in config file, 
                    // Indiv datasets may be invalid 
                    // need to confirm that the one that is set to be active is also valid
                    
                    // Check that active tab is valid
                    if (entry.datasets[entry.activeTab].inERDDAP == 1){
                        activeTab = entry.activeTab
                    } else {
                        console.log('modifying active tab')
                        activeTab = entry.firstValidDataset // untested - no current case
                    }
                    
                    // Create dataset tabs

                    datasetCounter = 0
                        
                    for (var x in entry.datasets ){
                        
                        datasetInEntry = entry.datasets[x]
                        
                        var datasetId = datasetInEntry.id
                        var subname = datasetInEntry.subname
                                                        
                        if (datasetCounter == activeTab) {
                                //console.log('making active button')
                                E += '<li role="presentation" class="active"><a href="#'+entryId+'-'+datasetId+'" aria-controls="'+entryId+'-'+datasetId+'" role="tab" data-toggle="tab">'+subname+'</a></li>'
                        } else {
                                //console.log('making inactive button')
                                E += '<li role="presentation"><a href="#'+entryId+'-'+datasetId+'" aria-controls="'+entryId+'-'+datasetId+'" role="tab" data-toggle="tab">'+subname+'</a></li>'
                        }
                        datasetCounter = datasetCounter + 1;
                        
                    }
                    E += '</ul>'
                    E += '</div>'

                    // Create dataset tab content

                    E += '<div class="entryTabWrap">'  // Start Tab Wrapper
                    E += '<!-- Tab panes -->'
                    E += '<div class="tab-content">'
                        
                    for (var x in entry.datasets ){
                        
                        datasetInEntry = entry.datasets[x];

                        var datasetId = datasetInEntry.id
                        var subname = datasetInEntry.subname
                        console.log(datasetInEntry.inERDDAP)
                        if (datasetInEntry.inERDDAP ==0 ){
                            console.log('not a valid dataset')
                            E += '<div role="tabpanel" class="tab-pane" id="'+entryId+'-'+datasetId+'">'
                            E += '<div class="tabContent">'
                            E += '<p>The remote server for this dataset is temporarily inaccessible</p>'
                            E +='</div>' 
                            E +='</div>' 
                        } else {
                            if (x == activeTab) {
                                //console.log('making active tab pane')
                                E += '<div role="tabpanel" class="tab-pane active" id="'+entryId+'-'+datasetId+'">'
                            } else {
                                //console.log('making inactive tab pane')
                                E += '<div role="tabpanel" class="tab-pane" id="'+entryId+'-'+datasetId+'">'
                            }
                            
                            // Content of each dataset tab                            
                            E += '<div class="tabContent">'
                            E += '<a href="./'+ entryId +'/preview">'
                            
                            //***        
                            // DATE RANGE - Erddap ISO times in more readable format
                            //***
                                
                            E += '<div class="entryDateRange" style="font-size: 12px;">'
                            E += '<span class="cardInfoLabel">Date Range</span>&nbsp;&nbsp;&nbsp; ' + datasetInEntry.time.startstr +' to '+ datasetInEntry.time.endstr
                            E += '</div>'
                                    
                            E += '<div class="entryDateRange" style="font-size: 12px;"><span class="cardInfoLabel">Resolution</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; '+ datasetInEntry.avgRes; +'</div>'
                                
                            E += '<div class="entryDateRange" style="font-size: 12px;"><span class="cardInfoLabel">Data Source</span>&nbsp;&nbsp; '+ entry.providerCredit +'</div>'
                            console.log(entry["datasets"][0]["proj_crs_code"])
                            E += '<div class="entryDateRange" style="font-size: 12px;"><span class="cardInfoLabel">Projection</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; '+ entry["datasets"][0]["proj_crs_code"] +'</div>'
                            
                            /*
                                E += '<div>'
                                E += '<div class="tableWrapper"><table class="table table-bordered table-condensed entryTable"><tbody>'
                                E += '<tr><td>Resolution <div class="tableValue">';
                                E += entry.resolution;
                                E += '<div></td><td>Quality <div class="tableValue">';
                                E += entry.qualityLevel[x];
                                E += '<div></td></tr>'
                                E += '<tr><td>Processing <div class="tableValue">';
                                E += entry.processLevel[x];
                                E += '<div></td><td>Type <div class="tableValue">';
                                E += entry.dataType[x]
                                E += '<div></td></tr>'
                                E += '</tbody></table></div>'
                                E += '</div>' 
                            */
                            /*
                                E += '<div class="entryDesc">This is a '
                                E += subname.toLowerCase();
                                E += ' '
                                E += entry.processLevel[x];
                                E += ' '
                                E += entry.qualityLevel[x];
                                E += ' '
                                
                                E += entry.dataType[x]
                                E += ' dataset with an average resolution of '
                                E += entry.resolution;
                                E +='.</div>' */
                            E += '<div class="entryDatasetCircle">'
                            E += datasetInEntry.avgRes +'<br> <span style="font-size: 9px; color: rgba(255,255,255,0.8)"></span>';
                            E +='</div>'   
                            E += '<div style="overflow:auto;clear:both; border-top: 1px solid #eee; margin-top: 6px; padding-top: 5px; ">' 

                            plotTitle = "Latest "+subname+" Data"
                            
                            E += '<div class="thumbnail-caption" style="color: rgba(0,0,0,0.5); font-weight: 500;">'+plotTitle+'<span style="color: #aaa"> | </span>'+datasetInEntry.time.plotTime+'</div>' 
                            E += '<div class="thumbnail-wrapper">'
                            $.each(entry.plotList, function (ploti, plot){
                                console.log(datasetInEntry.inERDDAP)

                                pfn = (entry.entryId + '-' + subname + '-' + entry.plotList[ploti]) + '.png'
                                console.log(pfn)
                                // Conditional is for cases when there is one image, formatting is different
                                if (ploti == 0 && ploti == entry.plotList.length-1 ) {
                                    E += '<div class="mapimage first last"><img src="./images/'+ pfn +'"/></div>' //has not been tested, no current use case
                                } else if (ploti == 0) {
                                    E += '<div class="mapimage first"><img src="./images/'+ pfn +'"/></div>'
                                } else if (ploti == entry.plotList.length-1) {
                                    E += '<div class="mapimage last"><img src="./images/'+ pfn +'"/></div>'
                                }
                            });
                            E += '</div>' 
                            E += '</div>' 
                            E += '</div>' 

                            //***
                            // Provider recognition
                            //***
                            //E += '<div class="providerCredit"><em>Provided by '+ entry.datasetsXml[0][1] +'</em></div>'

                            /*E += '<div class="providerCredit"><em>Data Source: '+ entry.providerCredit +'</em></div>'*/
                            E += '</div>' // End TabContent
                               
                            /* E += '<div class="tabFooter">'
                                
                            E += '<a href="'+entry.erddapUrls[x]+'" target="_blank" class="btn btn-primary">ERDDAP</a>'

                            console.log(entry.threddsWmsUrls.length)
                            if (entry.threddsWmsUrls.length > 0){
                            E += '<a href="' + entryId +'" target="_blank" class="btn btn-primary">PolarWatch Beta</a>'
                            }
                            E += '</div>' // End Tab Footer*/

                            E += '</div>' // End Tab Panel
                        } // end else
                    }// end for
                        
                        E += '</a>'
                        E += '</div>' // End TabContent of each dataset tab
                        E += '</div>' // End Tab Pane
                        E += '</div>' // End tab-content
                            
                        //***
                        // Summary Description
                        //  - Look for index end of first sentence in summary, print it and a more link
                        
                        /*
                        summaryBreak = entry.datasetsXml[0][14].lastIndexOf(" ", 110)
                        E += '<p class="group inner entry-text">' + entry.datasetsXml[0][14].substring(0,summaryBreak)+ '...  <a class="btn btn-default btn-xs" data-toggle="collapse" href="#collapse'+ entryId +'" aria-expanded="false" aria-controls="collapse'+ entryId +'"> more </a>' +'</p>'
                        E += '<div class="collapse" id="collapse'+ entryId +'">'
                        var descExpStart = 110;                          // set cutoff for description trimmed length characters
                        
                        // print remaining text in a button triggered div
                        E += '<div class="card card-block">'
                        E += '<p>'+ entry.datasetsXml[0][14].substring(summaryBreak, entry.datasetsXml[0][14].length)+'</p></div>'
                        E += '</div>'  // end collapse
                        */


                        // UPDATE FREQUENCY (using Temporal Range from datasets xml need to change this)
                        //updInt = entry.datasetsXml[0][11]
                        //E += ' (updated every'
                        //if (updInt !== null ){
                        //    updateFreqSec = parseFloat(updInt)  
                            // if greater than threshold show days, if less use hours
                        //    if (updateFreqSec < 86399) {
                        //      updateFreqStr = (parseFloat(updInt)/60/60).toFixed(0)+' hours)'
                        //    } else if (updateFreqSec >= 86399 && updateFreqSec <= (86400*2)){
                        //      updateFreqStr = (parseFloat(updInt)/60/60/24).toFixed(0)+'  days)'
                        //    }else {
                        //      updateFreqStr = (parseFloat(updInt)/60/60/24).toFixed(0)+' days)'
                        //   }
                        //   E +=' '+ updateFreqStr +'</div>'
                        //} else {
                        //    updateFreqStr = 'field_empty';
                        //    E += updateFreqStr+'</div>'
                        //}
                        
                        E += '</div>' // end thumb
                        E += '</div>'
                        E += '</div>' // end E
                    //}
                }

                ECount = ECount +1;
                //console.log(E)
                showData.append(E)
            }
        }
    }
    // to do: try to set this to only force list view on initial load
    $("#list").trigger('click'); // leftover from initial grid/list view, may not need anymore?      
}