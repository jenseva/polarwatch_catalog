import os
import urllib
import math
import sys, getopt
import json
import csv
import urllib3
import certifi
from writeDatasetPage import makeDatasetPages
from makeImages import makeCatalogImages
from updateStatusPage import updateStatusPage
from updateRoss import updateRoss
from getDatasetTimes import getTimes
import glob
import logging
from datetime import datetime
import pwd
import grp

dir_path = os.path.dirname(os.path.realpath(__file__))
todayStr = datetime.today().strftime("%m_%d_%Y")
log_fn = dir_path + '/logs/catalog_log_' + todayStr + '.log'
version_number = 'v08_2'
version = 'catalog'+version_number
production = 0

if production == 1:
    version = 'catalog'

webdir = '/var/www/html/polarwatch/'+version
    
# Checks for missing data in ERDDAP
# See if there are any datasets in the existing catalog that 
# are not listed in the current ERDDAP catalog
# For example a dataset could have been removed from ERDDAP, this should catch that
def checkDatasetExists(datasetId, alldatasets, logger):

    datasetInErddap = 0    
    logger.info(datasetId)    

    # Check for missing ids in erddap today
    # For each dataset in erddap look for the id passed to this function
    for erddapDataset in alldatasets['table']['rows']: 
        logger.info(erddapDataset[0])
        if datasetId == erddapDataset[0]: 
            datasetInErddap = 1
        if datasetInErddap == 1: 
            break
    
    if datasetInErddap == 0: 
        logger.info(' * WARNING: Datasetid not found in the PW erddap at the moment! : '+ datasetId)
        
    return datasetInErddap


def addDimensionAttributes(datasetMeta, dimension):
   
    dimensionAttributes = []

    for row in datasetMeta['table']['rows']:
        # find start of dimension attributes
        if row[0]=="dimension" and row[1] == dimension["name"]:
            continue
        else:
            break
        
        if row[0] == "attribute":
            dimension[row[2]] = row[4]
    
    return dimension       


# Load variables from erddap metadata
# 1/22/18
# input is metadata json response from erddap
# output is array of dictionaries
def getVariables(metadata):

    #Create a Variable List from variable header line
    variables = []
    for x in metadata['table']['rows']:
        
        
        # pulls out info from first line in variable
        if x[0] == 'variable':
            variable = {}
            variable["name"] = x[1]
            variable["dimensions"] = []
            h = x[4].split(',')
            for hi in h:
                if '=' in hi:
                    hi_split = hi.split('=')
                    hi_key = hi_split[0].lstrip()
                    variable[hi_key] = hi_split[1]
                else:
                    variable['dimensions'].append(hi)
            variables.append(variable)
    
    # Load variable detials
    for x in metadata['table']['rows']:
        for variable in variables:
            
            if x[0] == 'attribute' and x[1] == variable["name"]:
                varFieldValue = x[4].split(',')
                # if field is an array return as array
                if len(varFieldValue) > 1:
                    variable[x[2]] = varFieldValue
                # if field is not an array return as single value
                elif len(varFieldValue) == 1:
                    variable[x[2]] = varFieldValue[0]
                else:
                    pass

    return variables

def makeVariableList(variables, key):
    varList = []
    for variable in variables:
        varList.append(variable[key])
    return varList

# Load dimensions from erddap metadata
# 1/22/18
# input is metadata json response from erddap
# output is array of dictionaries
def getDimensions(metadata):
    
    #Create a Dimension List from dimension header line
    dimensions = []
    for x in metadata['table']['rows']:
        dimension = {}
        # pulls out info from first line in dimension
        if x[0] == 'dimension':
            #print(x)
            dimension = {}
            dimension["name"] = x[1]
            dh = x[4].split(',')
            for dhi in dh:
                dhi_split = dhi.split('=')
                dhi_key = dhi_split[0].lstrip()
                dimension[dhi_key] = dhi_split[1]
            dimensions.append(dimension)
    
    # Load dimension detials
    for x in metadata['table']['rows']:
        for dimension in dimensions:
            
            if x[0] == 'attribute' and x[1] == dimension["name"]:
                dimensionFieldValue = x[4].split(',')
                # if field is an array return as array
                if len(dimensionFieldValue) > 1:
                    dimension[x[2]] = dimensionFieldValue
                # if field is not an array return as single value
                elif len(dimensionFieldValue) == 1:
                    dimension[x[2]] = dimensionFieldValue[0]
                else:
                    pass
    return dimensions

# Helper function to retrieve dimension info
# 1/22/18 
# inputs are:
# dimensions list
# string of dimension of interest
# string of field of interest
def getDimensionInfo(dimensions, dimensionName, field):
    for dimension in dimensions:
        if dimension["name"] == dimensionName:
            return dimension[field]
            break    


# Helper function to retrieve variable info
# 1/22/18 
# inputs are:
# variables list of dicts
# string name of variable of interest
# string name of field of interest
def getVariableInfo(variables, variableName, field):
    for variable in variables:
        if variable["name"] == variableName:
            return variable[field]
            break  


def setupCatalogConfig(logger,tempCatConfigFn):

    '''
     * Query ERDDAP AllDatasets for General Catalog Metdata
     * Query each dataset and get detailed metadata
     * Update the catalog config file
    '''

    # Setup Query - the order here is important, not smart about detecting what is pulled
    queryList = ['datasetID','institution','title', 'minLongitude','maxLongitude','longitudeSpacing',
                 'minLatitude','maxLatitude','latitudeSpacing','minTime','maxTime','timeSpacing',
                 'infoUrl','sourceUrl','summary','metadata','minAltitude','maxAltitude', 'files']

    baseUrl = 'https://polarwatch.noaa.gov/erddap/tabledap/allDatasets.json?'
    urlQuery = ','.join(queryList)
    url = baseUrl + urlQuery
    
    http = urllib3.PoolManager(cert_reqs='CERT_REQUIRED', ca_certs=certifi.where())

    try:
        response = http.request('GET', url, timeout=15)
    except urllib3.exceptions.HTTPError as e:
        logger.info('The server couldnt fullfill the request')
        logger.info('Error Code: ', e.code)
    except urllib3.exceptions.NewConnectionError as e:
        logger.info('Failed to reach erddap server for: '+ metadataUrl)
        logger.info('reason: ', e.reason)
    else:
        # check for valid json response  
        try:
            alldatasets = json.loads(response.data.decode('utf-8'))
        except json.JSONDecodeError as e:
            print('Did not retrieve all datasets info from ERDDAP')
            print(e)
        else:
            print(" ... valid alldatasets Response Recieved.")
            logger.info(str(len(alldatasets['table']['rows'])) + ' datasets in the ERDDAP right now')
    
            for i, columnName in enumerate(alldatasets['table']['columnNames']):
                if columnName =='metadata': metaCol = i
            
            configDir = webdir +'/config'
            catConfig = {}
            catalogConfigFn = webdir +"/config/catalog.json"
            
            # ** First run a check to see if all the 
            # ** datasets previously in the catalog
            # ** are available today through the PW ERDDAP
            # Open the last catalog file and get a list of all the entry ids
            # Then pass it to a function to check against what's in ERDDAP
            # dont really want to do this, want to look at all datasets that I want 
            # and just exclude the ones that aren't active, then worry about alerts
            
            # ** For each entry config json file in the config folder
            # read the entry config json file in and run loops to make images and append info to metadatafile
            
            entryConfigDir = configDir + '/entries'
            
            for configfn in glob.glob(os.path.join(entryConfigDir, '*.json')):

                logger.info('Loading entry config file: '+ configfn)
                
                with open(configfn) as configfile:    
                    
                    entryInfo = json.load(configfile)
                    entryId = entryInfo["entryId"]
                    # start a  catalog json file based on entries (not dataset ids)
                    # add info from indiv configs to big file

                    # Add all info from entry config file to the catalog config object
                    catConfig[entryId] = entryInfo
                    #print(catConfig[entryId])

                    # Add these fields too and we will populare with info from ERDDAP
                    catConfig[entryId]["datasetsXml"] = []
                    catConfig[entryId]["erddapIdMetadata"] = []
                    catConfig[entryId]["latRange"] = []
                    catConfig[entryId]["parameters"] = []
                    catConfig[entryId]["validDatasets"] = []

                    # ** append individual dataset metadata to the alldatasets response 
                    # ** write out as one big catalog json file
                        
                    # for each catalog entry (config file)
                    # look through alldatasets json
                    # if the erddapid in the json matches
                    #  - add info from alldatasets
                    #  - open the metadata page and add that info too

                    for dataset_i in range(len(catConfig[entryId]["datasets"])):
                        
                        datasetInEntry = catConfig[entryId]["datasets"][dataset_i]

                        datasetId = datasetInEntry["id"]
                        #print(' ' + datasetId)
                            
                        exists = checkDatasetExists(datasetId, alldatasets, logger)
                             
                        if exists == 1:
                            print('   - alldatasets shows this is in ERDDAP')
                            
                            # add a yes exists flag to config file
                            datasetInEntry["inERDDAP"] = 1
                            
                            # Add datasets metadata to catalog config file
                            # First add reference conumn names, then loop through and add fields
                            datasetInEntry["allDatasetsColRef"] = alldatasets['table']['columnNames']

                            colcount = 0
                            for colref in datasetInEntry['allDatasetsColRef']:
                                if colref == 'title':
                                    titlecol = colref
                                colcount = colcount + 1

                            for adRow in alldatasets['table']['rows']: 
                            
                                # Match config file id to this dataset id
                                erddapDatasetId = adRow[0]
                                       
                                if datasetId == erddapDatasetId :
                                    #see if this dataset is a special case where we only want some parameters, not all

                                    # Add Info From AllDatasets Response
                                    catConfig[entryId]["datasetsXml"].append(adRow)
                                    
                                    datasetInEntry["allDatasets"] = adRow # using this now 5/2018

                                    #pull out title (have to do this because response in unicode and need to convert for python template writing)
                                    #print(datasetInEntry["allDatasets"])#[colcount])
                            
                                    # Open additional metadata (ERDDAP metadataUrl) to add parameters and lat range  
                                    # 4/6/2017 using actual lat range for queries
                                    
                                    metadataUrl = adRow[metaCol] + '.json'
                                
                                    http = urllib3.PoolManager(cert_reqs='CERT_REQUIRED', ca_certs=certifi.where())
                                    
                                    try:
                                        response = http.request('GET', metadataUrl, timeout=15)
                                    except urllib3.exceptions.HTTPError as e:
                                        datasetInEntry["inERDDAP"] = 0
                                        logger.error('The server couldnt fullfill the request. Adding invalid flag to dataset.')
                                        logger.error('Error Code: ', e.code)
                                    except urllib3.exceptions.URLError as e:
                                        logger.error('Failed to reach erddap server for: '+ metadataUrl)
                                        logger.error('reason: ', e.reason)
                                    else:
                                        # load any dataset particulars that are not included in all datasets
                                        # currently pulling parameters and lat range
                                        # more info than catalog needs, just pull out what we need to keep catalog file size down
                                        # append info to catalog entry
                                        print("      ...adding more dataset metadata")
                                        datasetMeta = json.loads(response.data.decode('utf-8'))
                                        parameters = []
                                        datasetInEntry["dimensions"] = getDimensions(datasetMeta)
                                        count = 0
                                        #make special field to store order for latitude
                                        for dimension in datasetInEntry["dimensions"]:

                                            if dimension["name"] == "latitude":
                                                if float(dimension["averageSpacing"]) >= 0:
                                                    datasetInEntry["dimensions"][count]["latRange"] = [str(float(dimension["actual_range"][0])),str(float(dimension["actual_range"][1]))]
                                                else:
                                                    lat1 = str(float(dimension["actual_range"][1]))
                                                    lat2 = str(float(dimension["actual_range"][0]))
                                                    datasetInEntry["dimensions"][count]["latRange"] = [lat1,lat2]
                                                break
                                            count = count + 1
                                        datasetInEntry["variables"] = getVariables(datasetMeta)
                                        varNameList = makeVariableList(datasetInEntry["variables"], 'name')
                                        varLongNameList = makeVariableList(datasetInEntry["variables"], 'long_name')
                                        datasetInEntry["metadataColRef"] = datasetMeta['table']['columnNames']
                                        datasetInEntry["proj_crs_code"] = 'EPSG:4326' # set default, change below if assigned a proj
                                        # for each parameter in the indiv metadata file
                                        # create parameter list variable and get dimension ranges
                                        for x in datasetMeta['table']['rows']:   
                                            
                                            # create a parameter list
                                            if x[0] == 'variable':               
                                                varName = x[1]
                                                parameters.append(varName)
                                            
                                            if x[0] == 'attribute' and x[1]=='NC_GLOBAL' and x[2]=='proj_srid':
                                                datasetInEntry["proj_srid"] = x[4]
                                                print('### HAS CRS CODE ###')

                                            # Get projection from metadata. In PolarWatch 4326 datasets dont have a
                                            # proj_crs_code, so populating that here if needed.    
                                            if x[0] == 'attribute' and x[1]=='NC_GLOBAL' and x[2]=='proj_crs_code':
                                                datasetInEntry["proj_crs_code"] = x[4]
                                            
                                            if x[0] == 'attribute' and x[1] == 'xgrid' and x[2] == 'actual_range':
                                                datasetInEntry["xRange"] = x[4]
                                            
                                            if x[0] == 'attribute' and x[1] == 'ygrid' and x[2] == 'actual_range':
                                                datasetInEntry["yRange"] = x[4]

                                        catConfig[entryId]["datasets"][dataset_i]["proj_crs_code"] = datasetInEntry["proj_crs_code"]
                                
                        else:
                            datasetInEntry["inERDDAP"] = 0
                            datasetInEntry["inERDDAPReason"] = "dataset not listed in PW erddap alldatasets response"
                            logger.info('  * NOT IN ERDDAP. Adding not valid flag.')
                        
                        catConfig[entryId]["validDatasets"].append(datasetInEntry["inERDDAP"])
                    #print(catConfig[entryId])
            
            # not using "with open" so that it will create the file if it doesn't exist
            f = open(tempCatConfigFn, 'w') 
            json.dump(catConfig, f)
            f.close()
            logger.info(' - Temp config file written')
            print('======')

            
def cleanMapImageFolders(webdir, logger):

    logger.info('--- Removing tiff files ---')
    
    mapImagesDir = '/var/www/html/polarwatch/map_images/'+version+'/'
    
    if os.path.exists(mapImagesDir):
    
        for root, dirs, files in os.walk(mapImagesDir):
            for thisFile in files:
                if thisFile.endswith('.tif'):
                    filename = root+'/'+thisFile
                    #os.chmod(root+'/'+thisFile, 0o4775 ) 
                    try:
                        os.remove(filename)
                    except:
                        print('could not remove a tif file:')
                        print(thisFile)

                elif thisFile.endswith('.nc'):
                    #os.chmod(root+'/'+thisFile, 0o4775 ) 
                    filename = root+'/'+thisFile
                    try:
                        os.remove(filename)
                    except:
                        print('could not remove a netcdf file')
                        print(thisFile)
                    else:
                        pass
                        #print('nc file removed')    

                elif thisFile.endswith('.png'):
                    filename = root+'/'+thisFile
                    #os.chmod(thisFile, 0o4775 ) 
                    try:
                        os.remove(filename)
                    except:
                        print('could not remove a png file')
                        print(thisFile)

                elif thisFile.endswith('.json'):
                    filename = root+'/'+thisFile
                    #os.chmod(thisFile, 0o4775 ) 
                    try:
                        os.remove(filename)
                    except:
                        print('could not remove a json file')
                        print(thisFile)
                    
    print('  ... tif, netcdf, png and json CLEANED')
                        

def main():

    # ** Setup logging system **
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
    logger.info('Starting Catalog Main...')

    tempCatConfigFn = webdir +'/config/catalog_temp.json'
    
    setupCatalogConfig(logger, tempCatConfigFn)

    cleanMapImageFolders(webdir, logger)
    makeImagesFlag =0
    makeImagesFlag = makeCatalogImages(webdir, logger)
    
    # WRITE HTML FROM TEMPLATES
    makePagesFlag = makeDatasetPages(webdir, logger, version_number)

    updateStatusPage(webdir, version_number)
    updateRoss(webdir)
    getTimesFlag = getTimes(webdir, logger)
    
    # once everything is successful
    # replace the old catalog json with the new one
    
    if (makeImagesFlag  ==1 ) and (makePagesFlag == 1):

        f = open(tempCatConfigFn)  
        cataloginfo = json.load(f)
        logger.info('Temp catalog config file read in')
        f.close()

        nowDate = datetime.now()
        nowDateStr = nowDate.strftime("%m/%d/%Y %-H:%-M")
        cataloginfo["lastUpdate"] = nowDateStr
        newCatConfigFn = webdir +'/config/catalog.json'    
        f = open(newCatConfigFn, 'w')
        json.dump(cataloginfo, f)
        logger.info(' - Catalog Updated')
        f.close()
    
    else:
        logger.error('Error in image generation or template generation.')
        print('Error in image or template generation.')
        
if __name__ == "__main__":
    main()