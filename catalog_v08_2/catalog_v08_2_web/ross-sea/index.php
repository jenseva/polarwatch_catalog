<!doctype html>
<html lang="en">
  <head>
    <!-- Required meta tags -->
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
<meta http-equiv="Pragma" content="no-cache">
<meta http-equiv="Expires" content="0">
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
<title></title>

<link rel="shortcut icon" href="../css/favicon.png">
<!--<link rel="stylesheet" href="../bootstrap/css/bootstrap.min.css" type="text/css" >-->
<link rel="stylesheet" href="../lib/font-awesome-4.7.0/css/font-awesome.min.css">
<link rel="stylesheet" href="../css/paper.css" type="text/css" >
<!--<link rel="stylesheet" href="../lib/bootstrap-4.1.3-dist/css/bootstrap.min.css">-->
<link rel="stylesheet" href="../css/bootstrap-datetimepicker.min.css" type="text/css" >
<link href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700,900" rel="stylesheet">
<!--<link rel="stylesheet" href="../css/bootstrap-yeti.css" type="text/css" >-->
<link href="../css/catalog.css" rel="stylesheet">
<link href="../css/dataset.css" rel="stylesheet">
<link href="../css/ross.css" rel="stylesheet">
<link href="https://fonts.googleapis.com/css?family=Montserrat:400,600" rel="stylesheet">
<link rel="stylesheet" href="https://code.jquery.com/ui/1.12.1/themes/base/jquery-ui.css">
<link rel="stylesheet" href="https://polarwatch.noaa.gov/sites/all/libraries/superfish/css/superfish.css">

<!--<script src="https://code.jquery.com/jquery-1.12.4.js"></script>-->
<script
  src="https://code.jquery.com/jquery-3.3.1.min.js"
  integrity="sha256-FgpCb/KJQlLNfOu91ta32o/NMZxltwRo8QtmkMRdAu8="
  crossorigin="anonymous"></script>

<script src="https://code.jquery.com/ui/1.12.1/jquery-ui.js"></script>

<script type="text/javascript" src="../js/rossMap.js"></script>
<script type="text/javascript" src="../js/common.js"></script>
<script type="text/javascript" src="../lib/bootstrap-3.3.7-dist/js/bootstrap.min.js" ></script>
<!--<script type="text/javascript" src="../lib/bootstrap-4.1.3-dist/js/bootstrap.min.js" ></script>-->
<script type="text/javascript" src="../js/moment-with-locales.min.js"></script>
<script type="text/javascript" src="../js/bootstrap-datetimepicker.js"></script>


<!--<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.2.0/leaflet.js"></script>-->

<script type="text/javascript" src="../js/leaflet-1.3.3/leaflet.js"></script>
<script src='https://api.mapbox.com/mapbox.js/plugins/leaflet-omnivore/v0.2.0/leaflet-omnivore.min.js'></script>
<script type="text/javascript" src="../js/L.Graticule.js"></script>
<script type="text/javascript" src="../lib/leaflet_antimeridian/Leaflet.Antimeridian.js" ></script>
<link rel="stylesheet" href="../js/leaflet-1.3.3/leaflet.css"/>

<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/0.4.13/leaflet.draw.js"></script>

<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/0.4.13/leaflet.draw.css"/>

<script src="https://cdnjs.cloudflare.com/ajax/libs/proj4js/2.4.4/proj4.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/proj4leaflet/1.0.2/proj4leaflet.min.js"></script>
<script src="https://unpkg.com/esri-leaflet@2.0.8/dist/esri-leaflet-debug.js"></script>

</head>
<body class="ross-sea">

<header class="navbar navbar-inverse container-fluid" id="navbar" role="banner">
  <div class="navbar-header">
  <div class="region region-navigation">
    <a class="logo navbar-btn pull-left" href="https://polarwatch.noaa.gov/" title="Home" rel="home">
    <img src="https://polarwatch.noaa.gov/themes/pwtheme/noaa_logo_circle_38.svg" alt="Home" />
    </a>
    <a class="name navbar-brand" href="/" title="Home" rel="home">PolarWatch</a>
    <section id="block-mainnavigation-2" class="block block-superfish block-superfishmain clearfix">
    <ul id="superfish-main" class="menu sf-menu sf-main sf-horizontal sf-style-none">

    <li id="main-menu-link-contentad21dab3-b481-491a-a665-c2dc7722e2bf"
   class="sf-depth-1 menu-list-item sf-no-children"><a href="https://polarwatch.noaa.gov/about" class="sf-depth-1">About</a></li><li id="main-menu-link-contenta28f6c6c-d747-4e9f-9ca9-8ad2311d508f"
   class="sf-depth-1 menu-list-item sf-no-children"><a href="https://polarwatch.noaa.gov/catalog" title="Find and download datasets" class="sf-depth-1 is-active">Data Catalog</a></li>
    <!--<li id="main-menu-link-content97b0c74c-b06f-41ee-8e00-930f03963564"
   class="sf-depth-1 menu-list-item sf-no-children"><a href="https://polarwatch.noaa.gov/data-server" class="sf-depth-1">Data Server</a></li>-->
    <li id="main-menu-link-content37c3f82b-81ce-48ad-9246-f86757ab46b1"
   class="active-trail sf-depth-1 menu-list-item sf-no-children"><a href="/training" class=" sf-depth-1">Training</a></li>
    </ul>
    </section>
  </div>
  </div>
</header>




<!-- Modal -->
<!-- Leaving this for now, people won't make the two downloads and piece them together. They can just download the whole ring for now. If Bob really is goiing to do the 180 to 360 dataset option then we will use that instead of creating a system to generate and provide files ourselves -->
<div class="modal fade" id="downloadConfModal" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
  <div class="modal-dialog" role="document">
    <div class="modal-content">
      <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
        <h2 class="modal-title" id="myModalLabel">Alert: Special Case Download</h2>
      </div>
      <div class="modal-body">

        <p>The area currently selected crosses the antimeridian. To download this area you can either download the full 360 degree span or download just the mapped section with two downloads.</p>
        
        <div class="row">
          <div class="col-sm-6">
            <h3 style="text-align: center">Single Download</h3>
            <a class="btn btn-primary download-all-btn" href="#" target="_self" role="button">Full 360 degrees</a>
          </div>
          <div class="col-sm-6">
            <h3 style="text-align: center">Download in two parts</h3>
            <div class="center-block" style="text-align: center">
              <a class="btn btn-primary download-1-btn" href="#"  target="_blank" role="button">Part 1</a>
              <a class="btn btn-primary download-2-btn" href="#" target="_blank" role="button">Part 2</a>
            </div>
          </div>
        </div>
        
        <div class="well" style="margin-top:20px;">Need help joining the two downloads? Check out our example that demonstrates doing this with NetCDF Operator Tools (NCO Tools) a command line interface for manipulating NetCDF files. <a class="" href="https://polarwatch.noaa.gov/node/52"">View Example</a></div>
        
      </div>
      <!--<div class="modal-footer">
        <button type="button" class="btn btn-default" data-dismiss="modal">Quick Download NetCDF</button>
        <button type="button" class="btn btn-primary">Refine with Download Form</button>
      </div-->
    </div>
  </div>
</div>



<div class="container-fluid datasetView">  
  <!--Dataset View-->
  <div class=" row">
    <div class="col-sm-12 entryTitle" >
      <h1 class="dataViewTitle">Ross Sea Datasets</h1>
    </div>
  </div>  
  
  <div class="row main-content">
    <div class="col-sm-4 col-md-4 col-lg-4 previewSidebarFirst" >
        <ul class="entryList">
        <li>Water Temperature
          <ul>
          
            
              
            
          
            
               
                
                <li id="sst-MUR-tab" class="active"><a class="nav-link" href="#">Sea Surface Temperature from MUR</a></li>
                
              
            
          
            
              
            
          
            
              
            
          
            
              
            
          
            
              
            
          
            
              
            
          
            
              
            
          
            
              
            
          
            
               
                
                <li id="sst-OSTIA-tab" class="active"><a class="nav-link" href="#">Sea Surface Temperature from OSTIA</a></li>
                
              
            
          
            
              
            
          
            
              
            
          
            
              
            
          
            
              
            
          
            
              
            
          
            
              
            
          
            
              
            
          
            
              
            
          
            
              
            
          
            
              
            
          
            
              
            
          
            
              
            
          
            
              
            
          
          </ul>
        </li>
        <li>Sea Ice
          <ul>
          
            
              
            
          
            
              
            
          
            
              
            
          
            
              
            
          
            
               
               <li id="ice-nrt-sh-nsidc-cdr-tab"><a class="nav-link" href="#">Sea Ice Concentration from NSIDC NRT CDR, Antarctic</a></li>
              
            
          
            
              
            
          
            
              
            
          
            
               
               <li id="ice-MUR-tab"><a class="nav-link" href="#">Sea Ice Concentration from OSI SAF</a></li>
              
            
          
            
               
               <li id="ice-sq-sh-nsidc-cdr-tab"><a class="nav-link" href="#">Sea Ice Concentration from NSIDC CDR, Antarctic</a></li>
              
            
          
            
              
            
          
            
              
            
          
            
              
            
          
            
              
            
          
            
              
            
          
            
               
               <li id="ice-nrt-nh-nsidc-cdr-tab"><a class="nav-link" href="#">Sea Ice Concentration from NSIDC NRT CDR, Arctic</a></li>
              
            
          
            
              
            
          
            
              
            
          
            
              
            
          
            
              
            
          
            
              
            
          
            
              
            
          
            
               
               <li id="ice-sq-nh-nsidc-cdr-tab"><a class="nav-link" href="#">Sea Ice Concentration from NSIDC CDR, Arctic</a></li>
              
            
          
            
              
            
          
          </ul>
        </li>
        <li>Sea Surface Height
          <ul>
          
            
              
            
          
            
              
            
          
            
              
            
          
            
               
               <li id="ssh-noaa-sla-tab"><a class="nav-link" href="#">Sea Surface Height from NOAA Experimental</a></li>
              
            
          
            
              
            
          
            
              
            
          
            
              
            
          
            
              
            
          
            
              
            
          
            
              
            
          
            
              
            
          
            
              
            
          
            
              
            
          
            
              
            
          
            
              
            
          
            
              
            
          
            
              
            
          
            
              
            
          
            
              
            
          
            
              
            
          
            
              
            
          
            
              
            
          
            
               
               <li id="ssh-aviso-tab"><a class="nav-link" href="#">Sea Surface Height from AVISO</a></li>
              
            
          
          </ul>
        </li>
        <li>Salinity
          <ul>
          
            
              
            
          
            
              
            
          
            
              
            
          
            
              
            
          
            
              
            
          
            
              
            
          
            
               
               <li id="salinity-smos-tab"><a class="nav-link" href="#">Salinity from SMOS</a></li>
              
            
          
            
              
            
          
            
              
            
          
            
              
            
          
            
              
            
          
            
               
               <li id="salinity-aquarius-tab"><a class="nav-link" href="#">Salinity from Aquarius</a></li>
              
            
          
            
              
            
          
            
              
            
          
            
              
            
          
            
              
            
          
            
              
            
          
            
              
            
          
            
              
            
          
            
              
            
          
            
              
            
          
            
              
            
          
            
              
            
          
          </ul>
        </li>        
        <li>Ocean Color
          <ul>
          
            
               
               <li id="chl-VIIRS-NASA-tab"><a class="nav-link" href="#">Chlorophyll from NASA VIIRS Near-Real-Time</a></li>
              
            
          
            
              
            
          
            
               
               <li id="kdpar-VIIRS-NOAA-SQ-tab"><a class="nav-link" href="#">Diffuse Attenuation kdpar NOAA VIIRS Science Quality</a></li>
              
            
          
            
              
            
          
            
              
            
          
            
               
               <li id="nLw671-VIIRS-NOAA-SQ-tab"><a class="nav-link" href="#">Water Leaving Radiance nLw671 NOAA VIIRS Science Quality</a></li>
              
            
          
            
              
            
          
            
              
            
          
            
              
            
          
            
              
            
          
            
               
               <li id="nLw410-VIIRS-NOAA-SQ-tab"><a class="nav-link" href="#">Water Leaving Radiance nLw410 NOAA VIIRS Science Quality</a></li>
              
            
          
            
              
            
          
            
               
               <li id="chl-VIIRS-NOAA-tab"><a class="nav-link" href="#">Chlorophyll from NOAA VIIRS NRT</a></li>
              
            
          
            
               
               <li id="chl-aqua-tab"><a class="nav-link" href="#">Chlorophyll from Aqua MODIS</a></li>
              
            
          
            
              
            
          
            
               
               <li id="kd490-VIIRS-NOAA-SQ-tab"><a class="nav-link" href="#">Diffuse Attenuation kd490 NOAA VIIRS Science Quality</a></li>
              
            
          
            
               
               <li id="nLw486-VIIRS-NOAA-SQ-tab"><a class="nav-link" href="#">Water Leaving Radiance nLw486 NOAA VIIRS Science Quality</a></li>
              
            
          
            
              
            
          
            
               
               <li id="chl-VIIRS-NOAA-SQ-tab"><a class="nav-link" href="#">Chlorophyll from NOAA VIIRS Science Quality</a></li>
              
            
          
            
               
               <li id="nLw443-VIIRS-NOAA-SQ-tab"><a class="nav-link" href="#">Water Leaving Radiance nLw443 NOAA VIIRS Science Quality</a></li>
              
            
          
            
               
               <li id="nLw551-VIIRS-NOAA-SQ-tab"><a class="nav-link" href="#">Water Leaving Radiance nLw551 NOAA VIIRS Science Quality</a></li>
              
            
          
            
              
            
          
            
              
            
          
          </ul>
        </li>
      </ul>
      </div>

      <div class="col-sm-8 col-md-8 col-lg-8 previewArea">

        
          
            
          
          
          
             
            

            <div class="previewMenu">
              <div class="previewMenuSection">
                <h3 class="first">Dataset</h3>
                <div class="datasetTabWrapper">
                    
                    <ul class="subEntryTabs nav nav-pills" role="tablist">
                    
                      
                      
                        <li role="presentation" class="active" id="jplMURSST41-tab"><a href="#jplMURSST41graph-panel" aria-controls="jplMURSST41graph-panel" id="firstSubEntryTab" role="tab" data-toggle="pill">Daily</a></li>
                      
                    
                       
                      
                        <li role="presentation" id="jplMURSST41mday-tab"><a href="#jplMURSST41mdaygraph-panel" aria-controls="jplMURSST41mdaygraph-panel" role="tab" data-toggle="pill">Monthly</a></li>
                      
                    
                    </ul>
                </div>
              </div>
              
              <div class="previewMenuSection last">
                  <h3>Time</h3>
                  
                      
                      <div class="form-group map-time-selector" id="jplMURSST41-map-time">
                          <div class="btn btn-sm btn-primary time-prev-btn"><i class="fa fa-angle-left"></i></div>
                          <div class='input-group date'>
                              <input type="text" id="jplMURSST41-datetimepicker" class="calendar form-control" />
                              <span class="input-group-addon">
                                  <span class="glyphicon glyphicon-calendar"></span>
                              </span>
                          </div>
                          <div class="btn btn-sm btn-primary time-next-btn"><i class="fa fa-angle-right"></i></div>
                          <div class="btn btn-sm btn-primary time-latest-btn"><i class="fa fa-angle-double-right"></i></div>
                      </div>
                    
                  
                     
                      <div class="form-group map-time-selector hidden" id="jplMURSST41mday-map-time">
                          <div class="btn btn-sm btn-primary time-prev-btn"><i class="fa fa-angle-left"></i></div>
                          <div class='input-group date'>
                              <input type="text" id="jplMURSST41mday-datetimepicker" class="calendar form-control" />
                              <span class="input-group-addon">
                                  <span class="glyphicon glyphicon-calendar"></span>
                              </span>
                          </div>
                          <div class="btn btn-sm btn-primary time-next-btn"><i class="fa fa-angle-right"></i></div>
                          <div class="btn btn-sm btn-primary time-latest-btn"><i class="fa fa-angle-double-right"></i></div>
                      </div>
                    
                  
              </div>
            </div>

          <div class="mapArea">
            <div class="mapTitleArea">
              <div class="mapTitle">&nbsp;</div>,
              <div class="mapTimeStamp">&nbsp;</div>                                
            </div>
            
            <div id="plotPanel">  
              <div class="mapWrap center-block">
                <div id="map" class="datasetMap"></div>
                <div class="loader hidden"></div>
                <div id="mapAlert"></div>
              </div><!-- end mapwrapper-->
              <div class="mapLegendArea">
                  <div class="mapLegends"></div>      
                  <!--<div class="mapLegendSettings"><a href="#"><span class="glyphicon glyphicon-cog"></span></a></div>-->
              </div>  
              <div class="btn btn-sm btn-primary goToDownloadBtn">Refine & Download</div>
            </div>

            <!--<div class="btn btn-sm btn-primary goToDownloadBtn">Refine & Download</div>-->
            <!-- Button trigger modal -->
            <!--<button type="button" class="btn btn-primary btn-lg goToDownloadBtn" data-toggle="modal" data-target="#downloadConfModal">
              Download
            </button>-->
          </div>
          
          
          
          
          
            
          
          
          
            
          
          
          
            
          
          
          
            
          
          
          
            
          
          
          
            
          
          
          
            
          
          
          
             
            

            <div class="previewMenu">
              <div class="previewMenuSection">
                <h3 class="first">Dataset</h3>
                <div class="datasetTabWrapper">
                    
                    <ul class="subEntryTabs nav nav-pills" role="tablist">
                    
                      
                      
                        <li role="presentation" class="active" id="jplUKMO_OSTIAv20-tab"><a href="#jplUKMO_OSTIAv20graph-panel" aria-controls="jplUKMO_OSTIAv20graph-panel" id="firstSubEntryTab" role="tab" data-toggle="pill">Daily</a></li>
                      
                    
                    </ul>
                </div>
              </div>
              
              <div class="previewMenuSection last">
                  <h3>Time</h3>
                  
                      
                      <div class="form-group map-time-selector" id="jplUKMO_OSTIAv20-map-time">
                          <div class="btn btn-sm btn-primary time-prev-btn"><i class="fa fa-angle-left"></i></div>
                          <div class='input-group date'>
                              <input type="text" id="jplUKMO_OSTIAv20-datetimepicker" class="calendar form-control" />
                              <span class="input-group-addon">
                                  <span class="glyphicon glyphicon-calendar"></span>
                              </span>
                          </div>
                          <div class="btn btn-sm btn-primary time-next-btn"><i class="fa fa-angle-right"></i></div>
                          <div class="btn btn-sm btn-primary time-latest-btn"><i class="fa fa-angle-double-right"></i></div>
                      </div>
                    
                  
              </div>
            </div>

          <div class="mapArea">
            <div class="mapTitleArea">
              <div class="mapTitle">&nbsp;</div>,
              <div class="mapTimeStamp">&nbsp;</div>                                
            </div>
            
            <div id="plotPanel">  
              <div class="mapWrap center-block">
                <div id="map" class="datasetMap"></div>
                <div class="loader hidden"></div>
                <div id="mapAlert"></div>
              </div><!-- end mapwrapper-->
              <div class="mapLegendArea">
                  <div class="mapLegends"></div>      
                  <!--<div class="mapLegendSettings"><a href="#"><span class="glyphicon glyphicon-cog"></span></a></div>-->
              </div>  
              <div class="btn btn-sm btn-primary goToDownloadBtn">Refine & Download</div>
            </div>

            <!--<div class="btn btn-sm btn-primary goToDownloadBtn">Refine & Download</div>-->
            <!-- Button trigger modal -->
            <!--<button type="button" class="btn btn-primary btn-lg goToDownloadBtn" data-toggle="modal" data-target="#downloadConfModal">
              Download
            </button>-->
          </div>
          
          
          
          
          
            
          
          
          
            
          
          
          
            
          
          
          
            
          
          
          
            
          
          
          
            
          
          
          
            
          
          
          
            
          
          
          
            
          
          
          
            
          
          
          
            
          
          
          
            
          
          
          
            
          
          
        </div>
      </div>
    </div>
  </div>
</div>
</body>
</html>