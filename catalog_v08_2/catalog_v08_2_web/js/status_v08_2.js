var jqxhr = $.getJSON( "../config/catalog.json", {
    })
    .done(function() {       
        data = jqxhr.responseJSON;
        console.log(data)

        validEntryCount = 0
        totalDatasetCount = 0
        validDatasetCount = 0

        for (var entryId in data) {
          entry = data[entryId]
          // check if entry is valid
          if (entry.firstValidDataset !== -1){
              validEntryCount = validEntryCount + 1
          } else {
            console.log('Not a valid entry')
          }
          entryDatasetCount = 0
          validEntryDatasetCount = 0
          // Check valid Dataset
          for (i in entry.datasets) {
            dataset = entry.datasets[i]
            entryDatasetCount = entryDatasetCount + 1
            console.log(dataset.inERDDAP)
            if (dataset.inERDDAP == 1) {
              validEntryDatasetCount = validEntryDatasetCount + 1
            } else {
              console.log('Dataset not in erddap')
            }

          }

          totalDatasetCount = totalDatasetCount + entryDatasetCount 
          validDatasetCount = validDatasetCount + validEntryDatasetCount
        }
        validEntryCount = validEntryCount -1
        console.log(totalDatasetCount) 
        console.log(validDatasetCount)
        $("#validEntryCount").html(validEntryCount)

        $("#totalDatasetCount").html(totalDatasetCount)

        $("#validDatasetCount").html(validDatasetCount)
        $("#lastCatalogUpdateTime").html(data.lastUpdate)
    })
    .fail(function() {
      console.log( "error fetching catalog config metadata, cant populate page" );
    })