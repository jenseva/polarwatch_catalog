<!DOCTYPE html>
<html>
<head>
	
<title>PolarWatch Data Catalog</title>

<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="shortcut icon" href="https://coastwatch.pfeg.noaa.gov/erddap/images/favicon.ico">

<link rel="stylesheet" href="./lib/bootstrap-3.3.7-dist/css/bootstrap.css" type="text/css" >
<link href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700,900" rel="stylesheet">
<link href="./css/catalog_v08_2.css" rel="stylesheet">
<link href="https://fonts.googleapis.com/css?family=Open+Sans:300,400,500,600" rel="stylesheet">
<link href="https://fonts.googleapis.com/css?family=Montserrat:400,500,600" rel="stylesheet">
<link rel="stylesheet" href="https://code.jquery.com/ui/1.12.1/themes/base/jquery-ui.css">
<link rel="stylesheet" href="./lib/font-awesome-4.7.0/css/font-awesome.min.css">
<link rel="stylesheet" href="https://polarwatch.noaa.gov/sites/all/libraries/superfish/css/superfish.css">
<script src="https://code.jquery.com/jquery-1.12.4.js"></script>
<script src="https://code.jquery.com/ui/1.12.1/jquery-ui.js"></script>
<script type="text/javascript" src="./js/writeResults_v08_2.js"></script>
<script type="text/javascript" src="./js/common_v08_2.js"></script>
<script type="text/javascript" src="./js/catalog_v08_2.js"></script>
<script type="text/javascript" src="./lib/bootstrap-3.3.7-dist/js/bootstrap.min.js" ></script>
<script type="stylesheet" src="../paper/assets/css/ct-paper.css"></script>
<script>
  function getDecDigits(input) {
    inputStr = input.toString();
    if (inputStr.indexOf('.') != -1) {
      decimalDigits = inputStr.length - inputStr.lastIndexOf('.');
    } else {
      decimalDigits = 0;
    }
  return decimalDigits;
  }
</script>

</head>

<body>


<!-- PolarWatch Main Menu -->
  <header class="navbar navbar-inverse container-fluid" id="navbar" role="banner">
    <div class="navbar-header">
      <div class="region region-navigation">
        <a class="logo navbar-btn pull-left" href="https://polarwatch.noaa.gov/" title="Home" rel="home">
        <img src="https://polarwatch.noaa.gov/themes/pwtheme/noaa_logo_circle_38.svg" alt="Home" />
        </a>
        <a class="name navbar-brand" href="https://polarwatch.noaa.gov/" title="Home" rel="home">PolarWatch</a>
        <section id="block-mainnavigation-2" class="block block-superfish block-superfishmain clearfix">
          <ul id="superfish-main" class="menu sf-menu sf-main sf-horizontal sf-style-none">
          <li id="main-menu-link-contentad21dab3-b481-491a-a665-c2dc7722e2bf"
               class="sf-depth-1 menu-list-item sf-no-children"><a href="https://polarwatch.noaa.gov/about" class="sf-depth-1">About</a></li><li id="main-menu-link-contenta28f6c6c-d747-4e9f-9ca9-8ad2311d508f"
               class="sf-depth-1 menu-list-item sf-no-children"><a href="https://polarwatch.noaa.gov/catalog" title="Find and download datasets" class="sf-depth-1 is-active">Data Catalog</a></li>
               <!--<li id="main-menu-link-content97b0c74c-b06f-41ee-8e00-930f03963564"
               class="sf-depth-1 menu-list-item sf-no-children"><a href="https://polarwatch.noaa.gov/data-server" class="sf-depth-1">Data Server</a></li>--><li id="main-menu-link-content37c3f82b-81ce-48ad-9246-f86757ab46b1"
               class="active-trail sf-depth-1 menu-list-item sf-no-children"><a href="/training" class=" sf-depth-1">Training</a></li>
          </ul>
        </section>
      </div>
    </div>
  </header>
  
  <div class="col-sm-3 sidebar" >

    <form  class="catalogForm" name="search-form" method="GET" action="/results/">

    <div class="row search-banner" style="">
      
      <div class="searchSection col-sm-12" style="background-color: transparent; width: 100%;" >
        <div id="search-wrap" class="input-group">
          <input id="searchInput" type="text" class="form-control" name="searchFor" placeholder="Search Datasets" onfocus="this.placeholder='' ">
          <span class="search-btn input-group-btn">
              <button type="submit" class="btn btn-default" type="button"><span class="glyphicon glyphicon-search"></span></button>
          </span>
        </div>
      </div>

      <div id="filter-panels" class="col-sm-12" >


<h2>Refine</h2>
        <div class="panel-group" id="filterAccordion">

 <div class="panel panel-default">
                        <div class="panel-heading">
                          <h4 class="panel-title">
                            <a data-toggle="collapse" href="#collapseCategory" ><i class="fa fa-star-o" aria-hidden="true"></i><span style="padding-left: 15px;">Category</span></a>
                          </h4>
                        </div>
                        <div id="collapseCategory" class="panel-collapse collapse in">
                          <div class="panel-body">
                            <div class="checkbox wtempCheckbox label-wrap ">
                                    <label><input id="wtemp" name="wtemp" type="checkbox"> Temperature</label>
                                </div> 
                            <div class="checkbox salCheckbox label-wrap ">
                                    <label><input id="sal" name="sal" type="checkbox"> Salinity</label>
                                </div> 
                            <div class="checkbox iceCheckbox label-wrap ">
                                    <label><input id="ice" name="ice" type="checkbox"> Ice</label>
                                </div> 
                            <div class="checkbox windCheckbox label-wrap ">
                                    <label><input id="wind" name="wind" type="checkbox"> Winds</label>
                                </div> 
                            <div class="checkbox colorCheckbox label-wrap ">
                                    <label><input id="color" name="color" type="checkbox"> Ocean Color</label>
                                </div> 
                            <div class="checkbox sshCheckbox label-wrap ">
                                    <label><input id="ssh" name="ssh" type="checkbox"> Sea Surface Height</label>
                                </div> 
                          </div>
                        </div>
                      </div>


                      <div class="panel panel-default">
                        <div class="panel-heading">
                          <h4 class="panel-title">
                            <a data-toggle="collapse" href="#collapseTime" class="collapsed"><i class="fa fa-calendar" aria-hidden="true"></i><span style="padding-left: 15px;">Time</span></a>
                          </h4>
                        </div>
                        <div id="collapseTime" class="panel-collapse collapse">
                          <div class="panel-body">
                             <div class="time-filters">
                                <input id="minTime" class="filterTimeInput" alt="minTime" name="minTime" type="text" value="" placeholder="Start Date" />        
                                <input id="maxTime" class="filterTimeInput" alt="maxTime" name="maxTime" type="text" value="" placeholder="End Date" />
                             </div>  
                          </div>
                        </div>
                      </div>

                      <div class="panel panel-default">
                        <div class="panel-heading">
                          <h4 class="panel-title">
                            <a data-toggle="collapse" href="#collapseLocation" class="collapsed"><i class="fa fa-globe" aria-hidden="true"></i><span style="padding-left: 15px;">Location</span></a>
                          </h4>
                        </div>
                        <div id="collapseLocation" class="panel-collapse collapse">
                          <div class="panel-body">
                            <div class="location-filters" style="text-align: left">
                                <div class="checkbox npCheckbox label-wrap ">
                                    <label><input id="np" name="np" type="checkbox"> Arctic</label>
                                </div>
                                <div class="checkbox spCheckbox label-wrap ">
                                    <label><input id="sp" name="sp" type="checkbox"> Antarctic</label>
                                </div> 
                              </div>
                          </div>
                        </div>
                      </div>

                     

                      <div class="panel panel-default">
                        <div class="panel-heading">
                          <h4 class="panel-title">
                            <a data-toggle="collapse" href="#collapseSource" class="collapsed"><i class="fa fa-university" aria-hidden="true"></i><span style="padding-left: 15px;">Source</span></a>
                          </h4>
                        </div>
                        <div id="collapseSource" class="panel-collapse collapse">
                          <div class="panel-body">
                            <div class="checkbox instNoaaCheckbox label-wrap ">
                                    <label><input id="instNOAA" name="instNOAA" type="checkbox"> NOAA Only</label>
                                </div> 
                           
                          </div>
                      </div>

                    </div>
                  </div>
            </div>
          </div>
        </div>
      </div>  
    </form>
  </div>  
   

<div class="col-sm-9 results-area" >
  <div class="alert notification-banner" style="">
 <i class="fa fa-exclamation-triangle" aria-hidden="true"></i>&nbsp;&nbsp;This catalog is in active development, for more information see our <a href="https://polarwatch.noaa.gov/about/roadmap" target="_blank">roadmap</a>.
  </div>

<div id="results">

<!--SEARCH VIEW -->
  <div id="searchView" class="row">

    <div class="col-sm-12 main">
      
      <div id="error-message" class="hidden"></div>
      
      <div class="results-header">
      
        <div style="overflow:auto; font-weight:500; font-size: 13px; color: #333;">
          <div class="pull-left">Displaying</div>
          <div class="pull-left" style="padding-left:5px" id="resultCount">All</div>
          <div class="pull-left" style="padding-left:5px;">Listings</div>
        </div>
      
        <div id="applied-filter-list"></div>

          <button id="searchForSelBtn" type="button" class="btn btn-default btn-xs hidden filterSelBtn"><div id="searchForSelBtnText" class="filterSelBtnText"></div><span class="glyphicon glyphicon-remove"></span></button>
          
          <button id="parSelBtn" type="button" class="btn btn-default btn-xs hidden filterSelBtn"><div id="parSelBtnText" class="filterSelBtnText"></div><span class="glyphicon glyphicon-remove"></span></button>
          
          <button id="instNOAASelBtn" type="button" class="btn btn-default btn-xs hidden filterSelBtn"><div id="instNOAASelBtnText" class="filterSelBtnText"></div><span class="glyphicon glyphicon-remove"></span></button>

          <button id="sshSelBtn" type="button" class="btn btn-default btn-xs hidden filterSelBtn"><div id="sshSelBtnText" class="filterSelBtnText"></div><span class="glyphicon glyphicon-remove"></span></button>
          
          <button id="iceSelBtn" type="button" class="btn btn-default btn-xs hidden filterSelBtn"><div id="iceSelBtnText" class="filterSelBtnText"></div
          ><span class="glyphicon glyphicon-remove"></span></button>
          
          <button id="colorSelBtn" type="button" class="btn btn-default btn-xs hidden filterSelBtn"><div id="colorSelBtnText" class="filterSelBtnText"></div><span class="glyphicon glyphicon-remove"></span></button>

          <button id="salSelBtn" type="button" class="btn btn-default btn-xs hidden filterSelBtn"><div id="salSelBtnText" class="filterSelBtnText"></div><span class="glyphicon glyphicon-remove"></span></button>

          <button id="windSelBtn" type="button" class="btn btn-default btn-xs hidden filterSelBtn"><div id="windSelBtnText" class="filterSelBtnText"></div><span class="glyphicon glyphicon-remove"></span></button>

          <button id="wtempSelBtn" type="button" class="btn btn-default btn-xs hidden filterSelBtn"><div id="wtempSelBtnText" class="filterSelBtnText"></div><span class="glyphicon glyphicon-remove"></span></button>

          <button id="minTimeSelBtn" type="button" class="btn btn-default btn-xs hidden filterSelBtn"><div id="minTimeSelBtnText" class="filterSelBtnText"></div><span class="glyphicon glyphicon-remove"></span></button>

          <button id="maxTimeSelBtn" type="button" class="btn btn-default btn-xs hidden filterSelBtn"><div id="maxTimeSelBtnText" class="filterSelBtnText"></div><span class="glyphicon glyphicon-remove"></span></button>

          <button id="spSelBtn" type="button" class="btn btn-default btn-xs hidden filterSelBtn"><div id="spSelBtnText" class="filterSelBtnText"></div><span class="glyphicon glyphicon-remove"></span></button>

          <button id="npSelBtn" type="button" class="btn btn-default btn-xs hidden filterSelBtn"><div id="npSelBtnText" class="filterSelBtnText"></div><span class="glyphicon glyphicon-remove"></span></button>
        
        </div>

        <div id="products" class="row products-list list-group"></div>
      </div>
    </div>
  </div>

</div> 

</div>
</div>

</body>
</html>
