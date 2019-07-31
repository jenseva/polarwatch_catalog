# runs on geo3jupyter, which is the jupyter env that maps to geo3 python env

import sys
sys.executable
sys.path.append('/home/jpatterson/pythonscripts/projected_data_demo') # using this because of custom kml converter

# for converting from KML
from keyholemarkup_converter import keyholemarkup2x  #requires pandas


# for importing and working with shape files
import fiona
from shapely.geometry import shape
from shapely.geometry import MultiPolygon
from shapely.geometry import Polygon
from shapely.geometry import mapping
from functools import partial
import pyproj
from shapely.ops import transform

#for fetching and working with the satellite data
import urllib3 
import json
from netCDF4 import Dataset as netcdf_dataset
import numpy as np

#for masking and plotting the data
from shapely.prepared import prep
import matplotlib
matplotlib.use('Agg')
from matplotlib import path

import matplotlib.pyplot as plt
import matplotlib.patches as patches
import cartopy
import cartopy.crs as ccrs

#for outputting data for web
import json
import math 
import csv

from cartopy.io import shapereader
from cartopy.mpl.gridliner import LONGITUDE_FORMATTER, LATITUDE_FORMATTER
from datetime import datetime
import os
import logging

# A function that fetches metadata from an ERDDAP server
# Provides details about the dataset that we can use to
# formulate our data request. We do this to determine the available
# extent (time, lat and lon) of the dataset which prevents us from making 
# unreasonable data requests that the server will reject

#Input: ERDDAP ID
#Output: Info about dataset for checking extents and forming data query

def getDatasetInfo(datasetId):

    http = urllib3.PoolManager()

    metadataUrl = 'https://polarwatch.noaa.gov/erddap/info/'+datasetId+'/index.json'

    try:
        response = http.request('GET', metadataUrl)
    except HTTPError as e:
        print('The server couldnt fullfill the request')
        print('Error Code: ', e.code)
    except URLError as e:
        print('Failed to reach erddap server for: '+ metadataUrl)
        print('reason: ', e.reason)
    else:
        # load information about dataset
        datasetMeta = json.loads(response.data.decode('utf-8'))
               
    return datasetMeta

def makemd(datasetMeta):
    # A newer, better version of this is somewhere...
    
    # There's a lot of information about the dataset
    # Pull out what we are interested in

    # set a flag to indicate if the dataset includes altitude dimension
    md = {'altf':0} 
    parameters = [];

    # Metadata Loop
    for x in datasetMeta['table']['rows']:   

        # list the parameters, latitude range, longitude range, time range and altitude range (if any)
        if x[0] == 'variable':               
            parameters.append(x[1])
        if x[0] == 'attribute' and x[1] == 'latitude' and x[2] == 'actual_range':
            md['latRange'] = x[4].split(',')
        if x[0] == 'attribute' and x[1] == 'longitude' and x[2] == 'actual_range':
            md['lonRange'] = x[4].split(',')
        if x[0] == 'attribute' and x[1] == 'xgrid' and x[2] == 'actual_range':
            md['xgridRange'] = x[4].split(',')
        if x[0] == 'attribute' and x[1] == 'ygrid' and x[2] == 'actual_range':
            md['ygridRange'] = x[4].split(',')
        if x[0] == 'attribute' and x[2] == 'time_coverage_end':
            md['time_coverage_end'] = x[4]
        if x[0] == 'attribute' and x[2] == 'time_coverage_start':
            md['time_coverage_start'] = x[4]
        if x[0] == 'attribute' and x[1] == 'altitude':
            md['altf'] = 1

    md['parameters'] = parameters
    return md


def getDimensionInfo(dimensions, dimensionName, field):
    for dimension in dimensions:
        if dimension["name"] == dimensionName:
            return dimension[field]
            break


# Get Dimension List and header info

def getDimensions(metadata):
    #Get Dimension List and header info
    dimensions = []
    for x in metadata['table']['rows']:
        dimension = {}
        # pull info from first line (header) in dimension
        if x[0] == 'dimension':
            dimension["name"] = x[1]
            dh = x[4].split(',')
            for dhi in dh:
                dhi_split = dhi.split('=')
                dhi_key = dhi_split[0].lstrip()
                dimension[dhi_key] = dhi_split[1]
            dimensions.append(dimension)
    # Get dimension details
    for x in metadata['table']['rows']:
        for dimension in dimensions:
            if x[0] == 'attribute' and x[1] == dimension["name"]:
                dim_field_val = x[4].split(',')
                if len(dim_field_val) > 1:
                    dimension[x[2]] = dim_field_val
                elif len(dim_field_val) == 1:
                    dimension[x[2]] = dim_field_val[0]
                else:
                    pass

    return dimensions



 # input is ERDDAP dataset info query json response
# output is a list of parameters (variables) for the dataset
def getParameterList(datasetMeta):
    parameters = []
    for x in datasetMeta['table']['rows']:
        if x[0] == 'variable':
            print(x)
            parameters.append(x[1])
    return parameters
    

# This function retrieves satellite data from an ERDDAP server
# Inputs define the data request:
# the dataset id, the parameter, lat/lon/altitude bounds (4326), and time range 
# Output: data for bounds in 4326

# Set this up to be in a loop and not just one request because one request is too large
# breaking it down into smaller geographic chunks makes this doable through the REST API

def getData(dId, parameter, bounds, time, sub):
    print(bounds)
    print(parameter)
    print(time)

    lat1 = bounds[0]
    lat2 = bounds[1]
    lon1 = bounds[2]
    lon2 = bounds[3]
    altf = bounds[4]
    
    time1 = time # using just one timestamp for this example
    time2 = time
    
    if altf == 1:
        #write query with altitude, haven't tested this
        alt1 = bounds[5]
        alt2 = bounds[6]
        altsub = 1
        query = parameter+'[(%s):%s:(%s)][(%f):%s:(%f)][(%f):%s:(%f)][(%f):%s:(%f)]' % (time1,sub,time2,alt1, altsub, alt2, lat1,sub,lat2,lon1,sub,lon2) 

    else:
        #write query without altitude
        query = parameter+'[(%s):%s:(%s)][(%f):%s:(%f)][(%f):%s:(%f)]' % (time1,sub,time2,lat1,sub,lat2,lon1,sub,lon2) 
    
    base_url = 'http://polarwatch.noaa.gov/erddap/griddap/'+ dId +'.nc?'
    url = base_url + query
    
    print(url)
    
    file = 'dataset.nc'

    http = urllib3.PoolManager()
    r = http.request('GET', url, preload_content=False)

    with open(file, 'wb') as out:
        while True:
            data = r.read(1024*1024)
            if not data:
                break
            out.write(data)

    r.release_conn()
    
    # add a real check here
    print ('Satellite Data File Retrieved')

    datafile = netcdf_dataset(file)
    dataset={
        "data":datafile,
        "url":url
    }
    return dataset



def getRequestBounds(md, req):
    print("Getting Bounds for ERDDAP Request...")
    # Uses ERDDAP lat_range and lon_range to determine request 
    # resests values to within dataset limits and sets the lat order
    
    bounds = req["bounds"]
    
    # LATITUDE
    # Note: latRange is already in the order that erddap needs 
    #       latRange field is created in the catalog.py script
    d_ycoord_1 = float(req['ycoord_range'][0])
    d_ycoord_2 = float(req['ycoord_range'][1])
    
    if d_ycoord_1 < d_ycoord_2:
        # Lower latitude value goes first in data query
        ycoord1 = float(bounds[1])
        ycoord2 = float(bounds[0])
        ycoordOrder = "lowtohigh"
        if ycoord1 < d_ycoord_1: ycoord1 = d_ycoord_1  # Adjust min ycoord to data extent
        if ycoord2 > d_ycoord_2: ycoord2 = d_ycoord_2  # Adjust max ycoord to data extent')    
    elif d_ycoord_1 > d_ycoord_2:
        # Lower latitude value goes second in data query
        ycoord1 = float(bounds[0])
        ycoord2 = float(bounds[1])
        ycoordOrder = "hightolow"
        if ycoord1 > d_ycoord_1: ycoord1 = d_ycoord_1  # Adjust max ycoord to data extent
        if ycoord2 < d_ycoord_2: ycoord2 = d_ycoord_2  # Adjust min ycoord to data extent
    else:
        print('stop script and send alert, this dataset might have incorrect metadata')
    
    # LONGITUDE
    d_xcoord_1 = float(req['xcoord_range'][0])
    d_xcoord_2 = float(req['xcoord_range'][1])
    xcoord1 = float(bounds[2])
    xcoord2 = float(bounds[3])
    if xcoord1 < d_xcoord_1: xcoord1 = d_xcoord_1   # Adjust min xcoord to data extent
    if xcoord2 > d_xcoord_2: xcoord2 = d_xcoord_2   # Adjust max xcoord to data extent

    # Setup Altitude Query 
    if getDimensionInfo(md["dimensions"], 'altitude', 'onlyValue'):
        thisAltVal = getDimensionInfo(md["dimensions"], 'altitude', 'onlyValue')
        alt1 = thisAltVal
        alt2 = thisAltVal
        qbounds = [ycoord1, ycoord2, xcoord1, xcoord2, ycoordOrder, 1, alt1, alt2]
    else:
        qbounds = [ycoord1, ycoord2, xcoord1, xcoord2, ycoordOrder, 0]
    
    return qbounds 

def main():
    
    print(sys.argv)

    catalog_v = sys.argv[1]
    projection = sys.argv[2]
    datasetId = sys.argv[3]
    entryId = sys.argv[4]
    parameter = sys.argv[5]
    time = sys.argv[6]
    tab = sys.argv[7]
    colorBar = sys.argv[8]

    print(projection)

    print('Starting')

    # Polygon

    # Convert KML file to Shape File
    # (because I had existing code for working with shape files)
    # Wont use this here, but do want to make sure I can get the kml converter working for future use
    # after testing pull straight from the pre-generated shp file

    myShape = keyholemarkup2x('./config/masks/antarctic_bounds/polymask.kml',output='shp')
    
    #print(myShape)
    # Open Shapefiles, read coverage areas
    # get extents, then query Erddap
    # use shapely to pull data from within polygons

    areaProps = []

    for pol in fiona.open('./config/masks/antarctic_bounds/polymask.shp'):
        areaProps.append(pol['properties'])

    Multi = MultiPolygon([shape(pol['geometry']) for pol in fiona.open('./config/masks/antarctic_bounds/polymask.shp')])
    #Multi.wkt
       

    polygon = Multi[0] # we only have one polygon

    # the shapefile data, satellite data and plotting projections are all different
    # this step transforms the shapefile data to the 4326 projection of the satellite data
    # requests to the server need to be in 4326
    #print(polygon.bounds)


    # if working with a projected shapefile instead of kml file
    # see the 06_09_ShapefileLoad notebook for demo of how to work with a shape file that is projected

    epsg4326 = pyproj.Proj(init='epsg:4326')      # lon/lat coordinate system (polygon kml file)
    epsg3031 = pyproj.Proj(init='epsg:3031')      # South polar stereo plots)
    epsg3412 = pyproj.Proj(init='epsg:3412')      # South polar stereo (data coordinates)
    esri102020 = pyproj.Proj(init='esri:102020')  # Antarctic equal area (area calculations)

    #convert polygon to dataset projection
    project = partial(
        pyproj.transform,
        pyproj.Proj(init='epsg:4326'),   # lon/lat coordinate system
        pyproj.Proj(init='epsg:3412'))   # south polar stereo

    p3412 = transform(project, polygon)  # new shapely polygon with new projection

    #print(p3412.bounds) #minx, miny, maxx, maxy

    # Erddap want the bounds in a different order (miny, maxy, minx, maxx)
    p3412boundSwap = [p3412.bounds[1],p3412.bounds[0],p3412.bounds[3],p3412.bounds[2]]


    # Convert original polygon to equal area projection 
    # Calculate the area of the polygon
    areaProj = partial( 
        pyproj.transform,
        pyproj.Proj(init='epsg:4326'),     # lon/lat coordinate system
        pyproj.Proj(init='esri:102020'))   # antarctic equal area

    p102020 = transform(areaProj, polygon)           # new shapely polygon in new projection, used later?
    p102020_area = transform(areaProj, polygon).area # area of projected polygon in meters (projection units)
    study_area_km = p102020_area/1000000             # area of polygon in km squared
    #print(study_area_km)

    study_area_info = {'study_area_square_km':study_area_km}

    # Get polygon path for data masking and plotting
    polyListx, polyListy = p3412.exterior.xy              # perimeter of polygon 
    polyList = list(zip(list(polyListx),list(polyListy))) # formatted perimeter
    studyAreaPath = path.Path(polyList)                   # path for data mask, in EPSG:3031 


    # Dataset Info

    # What is the id of the dataset you want to work with?
    # Will use the NSIDC CDR Sea Ice Concentration Monthly when it is loaded in
    dId = 'nsidcSISQSHmday'

    # Get dataset metadata info from ERDDAP in preparation for data request
    erddap_metadata = getDatasetInfo(dId)
    md = makemd(erddap_metadata)
    md["dimensions"] = getDimensions(erddap_metadata)
    md["parameters"] = getParameterList(erddap_metadata)

    # Get valid times for this dataset to later loop through each timestep

    # Customize start time because we know the cdr data actually doesn't start until July 1987 
    # (the way the data is published the timestamps go back further but there is no data prior to July 1987)
    timeStart = '1987-07-01T00:00:00Z'
    timeEnd = md["time_coverage_end"]

    validTimesUrl = 'https://polarwatch.noaa.gov/erddap/griddap/' + dId + '.json?time[(' + timeStart + '):1:(' + timeEnd+ ')]'

    http = urllib3.PoolManager()


    projection = 'epsg3031'
    tab = 'monthly'
    colorBar = 'KT_ice,,,0,1,'
    parameter='seaice_conc_monthly_cdr'
    m0 = datetime.now()
    entryId = 'ice-nsidc-cdr'
    datasetId = 'nsidcSISQSHmday'
    time='2017-01-18T00:00:00Z'

    # apache needs to make these directories here for the permissions to be set correctly    
    mapImageDirRoot = '/home/jpatterson/pythonscripts/projected_data_demo/'
    if not os.path.exists(mapImageDirRoot): os.makedirs(mapImageDirRoot)

    logdir = mapImageDirRoot+'logs'
    if not os.path.exists(logdir): os.makedirs(logdir)  

    mapImageDir = mapImageDirRoot + entryId+'/'+datasetId
    if not os.path.exists(mapImageDir):
        try:
            os.makedirs(mapImageDir) # creates with default perms 0777
            os.chmod(mapImageDir, 0o4775 )
        except:
            print('could not make image directory')

    # ** Setup logging system **
    todayStr = datetime.today().strftime("%m_%d_%Y")
    log_fn = mapImageDirRoot + '/logs/catalog.log'
    logger = logging.getLogger(__name__)
    logger.setLevel(logging.INFO)
    # create a file handler
    handler = logging.FileHandler(log_fn)
    handler.setLevel(logging.INFO)
    # create a logging format
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    # add the handlers to the logger
    logger.addHandler(handler)                  # file writing
    logger.addHandler(logging.StreamHandler())  # print to console
    # to include in log file for records
    scriptstart = datetime.now()
    scriptstartstr = scriptstart.strftime("%Y-%m-%d %H:%M:%S")
    #logger.info('PREVIEW.PY START: ' + scriptstartstr)

    mm = time[5:7]
    dd = time[8:10]
    yyyy = time[0:4]
    HH = time[11:13]
    MM = time[14:16]
    timep = yyyy + '_' + mm +'_'+dd+'_'+HH+'_'+MM

    #Keep track of the input info to pass back to the webpage
    req = {
        'projection': projection,
        'datasetId': datasetId,
        'time':time,
        'timep': timep,
        'scriptstarttime': scriptstartstr ,
        'entryId': entryId,
        'parameter':parameter,
        'tab':tab,
        'colorBar':colorBar
    }  



    dimensions = getDimensions(erddap_metadata)

    ycoord_dimension = next((dimension for dimension in dimensions if dimension["axis"] == "Y"))
    xcoord_dimension = next((dimension for dimension in dimensions if dimension["axis"] == "X"))        
    logger.info(ycoord_dimension["name"])

    #working on rewriting this section to use the structure I am creating for the info
    # stopped here 1/22/18 shutdown
    ycoord_cells = getDimensionInfo(dimensions, ycoord_dimension["name"], 'nValues')
    xcoord_cells = getDimensionInfo(dimensions, xcoord_dimension["name"], 'nValues')

    # use erddap info to determine if latitude is increasing or decreasing
    req["ycoord_range"] = getDimensionInfo(dimensions, ycoord_dimension["name"], 'actual_range') 
    ycoord_avgSpacing = getDimensionInfo(dimensions, ycoord_dimension["name"], 'averageSpacing') # used in check bounds

    if float(ycoord_avgSpacing) >= 0:
        ycoord_1 = str(float(req["ycoord_range"][0]))
        ycoord_2 = str(float(req["ycoord_range"][1]))
    else:
        ycoord_1 = str(float(req["ycoord_range"][1]))
        ycoord_2 = str(float(req["ycoord_range"][0]))
        
    req["ycoord_range"] = [ycoord_1,ycoord_2]

    req["xcoord_range"] = getDimensionInfo(dimensions, xcoord_dimension["name"], 'actual_range')

    #req["ycoord_res"] = getDimensionInfo(dimensions, ycoord_dimension["name"], 'averageSpacing')
    #req["xcoord_res"] = getDimensionInfo(dimensions, xcoord_dimension["name"], 'averageSpacing')

    # Note: Cannot use ERDDAP actual range plus resolution to determine extent (innaccurate)

    # using erddap provided dataset size to determine how large of spacing to use for dataset request.
    # want images to be less than 1000px
    ycoord_sub = float(ycoord_cells)/800
    xcoord_sub = float(xcoord_cells)/800

    # pick the larger of the two spacing options, should usually be the lon sub
    if ycoord_sub <= xcoord_sub: sub = xcoord_sub
    else: sub = ycoord_sub
    #sub = (lat_sub + lon_sub)/2         # Use the average of the two 
    req["sub"] = str((math.ceil(sub)))  # Round up to largest whole number

    # ?add a check that dataset has data in this region (arctic, antarctic)
    # if not pass something back to the webpage that says it doesn't have data in the area
                                       
    # Use polygon maximum bounds to make sure there should be data available in the polygon
    # return the bounds in the format required by the data server
    ycoord_min = ycoord_dimension['valid_range'][0]
    ycoord_max = ycoord_dimension['valid_range'][1]
    xcoord_min = xcoord_dimension['valid_range'][0]
    xcoord_max = xcoord_dimension['valid_range'][1]

    req["bounds"] = [ycoord_max, ycoord_min, xcoord_min, xcoord_max]
    print(req["bounds"])

    #adjust bounds order for erddap if needed
    qbounds = getRequestBounds(md, req)
    print(qbounds)

    # Set the name of the parameter to access
    parameter = 'seaice_conc_monthly_cdr'

    # You can reduce the resolution of the data returned from the server
    # This can be helpful during testing if the dataset is very large
    # Set this to one for full resolution, two for half, and so on
    sub = '1'
    print(req["sub"])

    #shp = shapereader.Reader('/home/jenn/aerdData/shoreline/GSHHS_shp/i/GSHHS_i_L6')

    timestamp=req["time"]
    timestamp = '2016-08-17T00:00:00Z'
    print(timestamp)
    m0 = datetime.now()
    dataset = getData(dId, parameter, qbounds, timestamp, sub)
    m1 = datetime.now()

    data3412 = dataset['data'] 


    m0 = datetime.now()
    # check data file for expected altitude dimension response 
    if len(np.shape(data3412.variables[parameter])) == 3: data = data3412.variables[parameter][0, :, :]
    elif len(np.shape(data3412.variables[parameter])) == 4: data = data3412.variables[parameter][0, 0,:, :]   

    xgrid = data3412.variables['xgrid'][:]
    ygrid = data3412.variables['ygrid'][:]

        
    xmin = float(xgrid[0])

    xmax = float(xgrid[len(xgrid)-1])
    ymin = float(ygrid[len(ygrid)-1])
    ymax = float(ygrid[0])             # note: ymax should be bigger than ymin and is towards top of plot


    # output projected bounds corner points for leaflet
    # format to pass is top left, bottom left, bottom right, top right
    top_left = [xmin,ymax]
    bottom_left = [xmin, ymin]
    bottom_right = [xmax, ymin]
    top_right = [xmax, ymax]
    req["boundsProjected"] = [top_left, bottom_left, bottom_right, top_right]


    #xrange = abs(xmin) + abs(xmax)
    #yrange = abs(ymin) + abs(ymax)

    cellWidth = 25000 #25 km = 25000 meters
    cellHeight = 25000 

    xgridMod = xgrid - (cellWidth/2)

    extraX = xgridMod[len(xgridMod)-1] + cellWidth
    xgridMod = np.append(xgridMod, extraX)
    ygridMod = ygrid + (cellHeight/2)
    extraY = ygridMod[len(ygridMod)-1] - cellHeight
    ygridMod = np.append(ygridMod, extraY)
    #adjust start left by half pixel width (move to the left)
    startLeft = xgrid[0] - (cellWidth/2)
    #adjust start top by half pixel width ( move towards the top)
    startTop = ygrid[0] + (cellHeight/2)

    rows = len(ygrid)-1
    cols = len(xgrid)-1



    m0 = datetime.now()
    X, Y = np.meshgrid(xgrid, ygrid) #create the grid
    points = np.array((X.flatten(), Y.flatten())).T #break it down
    mask = studyAreaPath.contains_points(points).reshape(X.shape) # calc and grid a mask based on polygon path

    datamasked = np.ma.masked_where(mask != True, data) # create masked data array

    study_area_data_cells = datamasked.count()
    print(study_area_data_cells) #print(np.asscalar(study_area_data_cells))

    try: 
        mymin = np.min(datamasked[~datamasked.mask])
    except ValueError:
        print('no data within polygon for this timestamp')
        print('either before start of data (pre 1987) or all ice concentration values are 0 (summertime)')
    else:
        if "num_data_cells" not in study_area_info:
            print("some ice in polygon, can calculate number of cells")
            study_area_info["num_data_cells"] = np.asscalar(study_area_data_cells)

    # fill data = 255, land = 254, coastline = 253, lakes = 252
    # check for any non-data values 
    fillSpot = np.where(datamasked == 255)
    for i in range(len(fillSpot)):
        if fillSpot[i]:print('FOUND A FILL VALUE')
    landSpot = np.where(datamasked == 254)
    for i in range(len(landSpot)):
        if landSpot[i]:print('FOUND A LAND VALUE')
    coastSpot = np.where(datamasked == 253)
    for i in range(len(coastSpot)):
        if coastSpot[i]:print('FOUND A COAST VALUE')
    lakeSpot = np.where(datamasked == 252)
    for i in range(len(lakeSpot)):
        if lakeSpot[i]:print('FOUND A LAKE VALUE')
    m1 = datetime.now()
    print(m1-m0)


    epsg3412 = ccrs.epsg(3412)

    #show all erddap data within study area
    thisproj = ccrs.SouthPolarStereo()
    # Notes on cartopy map projection options
    # cannot directly specify the projection with a proj4 string or a crs id
    # different projections have different options that can be passed to them
    # south polar stereo, north polar stereo and plate caree are the PW standard map projections
    # I haven't been passing other options to the plots but now that they will go on maps I may have to.
    # Albers is an option and I would have to pass it some options to get it centered on alaska I think.
    # Documentation says that specifying crs with espg via epsg.io should work. Not working for espg 3031 or 3412 though

    fig = plt.figure()    
    ax1 = plt.axes(projection = thisproj ) # set projection to sps
    ax1.set_global()
    '''
    #add shoreline shape file as plate carree
    for record, geometry in zip(shp.records(), shp.geometries()):
        ax1.add_geometries([geometry], ccrs.PlateCarree(), facecolor='lightgray',
                          edgecolor='black')
    '''
    dataplt = ax1.pcolormesh(xgridMod,ygridMod,datamasked, transform=epsg3412, vmin=0.0, vmax=1.0)

    #ax1.set_extent([-3100000, -1200000, 300000, 2300000], thisproj)
    print(ymin, ymax, xmin, xmax)

    # set_extent is (x0, x1, y0, y1)
    #ax1.set_extent([ xmin-550000, xmax+550000, ymin-550000, ymax+550000], thisproj) # expand plot bounds
    ax1.set_extent([xmin, xmax, ymin, ymax], thisproj) # a little off only because i made the polygon by hand
    #ax1.gridlines(alpha='0.3')
    #ax1.outline_patch.set_linewidth(0.5)
    ax1.outline_patch.set_visible(False)
    ax1.background_patch.set_visible(False)
    #ax1.coastlines(color='red')
    #ax1.outline_patch.set_edgecolor('#dddddd')
    #cbar = fig.colorbar(dataplt)
    imagefn = mapImageDirRoot + 'testoutput_1500'+timestamp+'.png'
    print(imagefn)
    m1 = datetime.now()
    print(m1-m0)
    plt.savefig(imagefn, dpi=300, bbox_inches='tight', transparent=True)
    m1 = datetime.now()
    print(m1-m0)
    plt.show()
    plt.cla()
    plt.clf()
    plt.close()