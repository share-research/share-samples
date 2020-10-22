# share-load-samples
This is an example project containing code to load data exported from the SHARE Registry into JSON format.  It assumes that data will be in the form within the most recent SHARE 2.0 schema.  There are two scripts included:

  ingest/fetchShareData.ts
  ingest/loadShareData.ts


# Starting from scratch

    make install

It's worth running ``make install_js`` every now and then to make sure your packages are up-to-date.

# Fetching SHARE Data
This will query the SHARE registry and download results to the data directory in your project.  It puts results in a new timestamped folder with records chunked into 1000 records per file, and will attempt to download by source, then break them up by date range, and tags as available.  This will take some time to run, and currently does not load more records if there are more than 10000 results for a given date range plus tags per source.

With sample json output from share run the following command to test:

    make fetch_share_data

# Loading and Using Existing SHARE Data

Included is a fairly simple script that just demonstrates loading in JSON files that were retrieved by the fetch share data script or previously downloaded.  It loads them from files within a given directory and converts them to JSON objects within code, and then outputing a sample record to the command line.  When loading the JSON objects it also demonstrates to create simplified versions of the SHARE objects that only has relevant fields included.  This is intended to be a starting point only for someone to add additional code to then do something with the JSON objects loaded (or to copy the approach in other languages such as python or ruby).

# Testing Loading Share Data

With sample json output from share run the following command to test:

    make load_share_data DATADIR=<your_directory>

For example a load of EarthArXiv data from the folder could be:

    make load_share_data DATADIR=../data/EarthArXiv

To load other data simply place them in a folder within the data path of the project and then change the data directory.  It should work for both absolute and relative paths.  For example if loading in files from the fetch you would insert the related timestamped directory such as:

    make load_share_data DATADIR=../data/share_20201022095738/EarthArXiv

# Sample Test Output
Sample data is included in the project to enable running the sample command:

    make load_share_data DATADIR=../data/EarthArXiv

You should then see some sample that looks like:

    cd ingest && ts-node loadShareData.ts && cd ..
    Reading data from filename: /Users/rjohns14/git/share-samples/data/EarthArXiv/share_metadata_EarthArXiv_all_dates_from_index_0.json
    Sample Record: {
    "id": "46150-D74-AC0",
    "title": "2-D numerical study of hydrated wedge dynamics from subduction to post-collisional phases",
    "description": "We developed a 2-D finite element model to investigate the effect of shear heating and mantle hydration on the dynamics of the mantle wedge area. The model considers an initial phase of active oceanic subduction, which is followed by a post-collisional phase characterized by pure gravitational evolution. To investigate the impact of the subduction velocity on the thermomechanics of the system, three models with different velocities prescribed during the initial subduction phase were implemented. Shear heating and mantle hydration were then systematically added into the models. We then analysed the evolution of the hydrated area during both the subduction and post-collisional phases, and examined the difference in Pmax–T (maximum pressure–temperature) and P–Tmax (pressure–maximum temperature) conditions for the models with mantle hydration. The dynamics that allow for the recycling and exhumation of subducted material in the wedge area are strictly correlated with the thermal state at the external boundaries of the mantle wedge, and the size of the hydrated area depends on the subduction velocity when mantle hydration and shear heating are considered simultaneously. During the post-collisional phase, the hydrated portion of the mantle wedge increases in models with high subduction velocities. The predicted P–T configuration indicates that contrasting P–T conditions, such as Barrovian- to Franciscan-type metamorphic gradients, can contemporaneously characterize different portions of the subduction system during both the active oceanic subduction and post-collisional phases and are not indicative of collisional or subduction phases.",
    "sources": [
        "CrossRef",
        "EarthArXiv"
    ],
    "identifiers": [
        "http://dx.doi.org/10.31223/OSF.IO/UZTNG",
        "http://eartharxiv.org/uztng/",
        "http://osf.io/uztng/",
        "http://dx.doi.org/10.17605/OSF.IO/UZTNG"
    ],
    "subjects": [
        "EarthArXiv|Physical Sciences and Mathematics",
        "EarthArXiv|Physical Sciences and Mathematics|Earth Sciences",
        "EarthArXiv|Physical Sciences and Mathematics|Earth Sciences|Geology",
        "EarthArXiv|Physical Sciences and Mathematics|Earth Sciences|Geophysics and Seismology",
        "EarthArXiv|Physical Sciences and Mathematics|Earth Sciences|Tectonics and Structure"
    ],
    "tags": [
        "numerical modelling",
        "continental margins: convergent",
        "subduction zone processes",
        "heat generation and transport"
    ],
    "date_created": "2017-10-26T10:29:31.85769+00:00",
    "contributors": [
        {
        "id": "6404F-1B6-AFB",
        "given_name": "Maria",
        "family_name": "Spalla",
        "identifiers": [
            "http://osf.io/pu7zx/",
            "http://secure.gravatar.com/avatar/1c7b2c2fdf2036f049aa9a15826494ca?d=identicon"
        ],
        "type": "creator"
        },
        {
        "id": "64007-1E1-22E",
        "given_name": "Anna",
        "family_name": "Marotta",
        "identifiers": [
            "http://osf.io/vus7w/"
        ],
        "type": "creator"
        },
        {
        "id": "640E5-CBD-11D",
        "given_name": "Manuel",
        "family_name": "Roda",
        "identifiers": [
            "http://osf.io/kvsqd/",
            "http://secure.gravatar.com/avatar/1173905de02e0e7cf4b595a36ab25223?d=identicon"
        ],
        "type": "creator"
        },
        {
        "id": "641C4-799-00C",
        "given_name": "Alessandro",
        "family_name": "Regorda",
        "identifiers": [
            "http://secure.gravatar.com/avatar/549fa2682eeaaaa79f7b705b1bcee4c5?d=identicon",
            "http://osf.io/7rke3/"
        ],
        "type": "creator"
        }
    ]
    }
    Loaded 1000 Share Records from /Users/rjohns14/git/share-samples/data/EarthArXiv/share_metadata_EarthArXiv_all_dates_from_index_0.json
    Reading data from filename: /Users/rjohns14/git/share-samples/data/EarthArXiv/share_metadata_EarthArXiv_all_dates_from_index_1000.json
    Sample Record: {
    "id": "4614B-B36-9FB",
    "title": "Growing Forced Bars Determine Nonideal Estuary Planform",
    "description": "",
    "sources": [
        "CrossRef",
        "EarthArXiv"
    ],
    "identifiers": [
        "http://dx.doi.org/10.1029/2018JF004718"
    ],
    "subjects": [],
    "tags": [],
    "date_created": "2018-10-14T03:20:52.789118+00:00",
    "contributors": [
        {
        "id": "640DD-E91-4BE",
        "given_name": "E.",
        "family_name": "Van Onselen",
        "identifiers": [],
        "type": "creator"
        },
        {
        "id": "640AC-A4B-29D",
        "given_name": "M.",
        "family_name": "Kleinhans",
        "identifiers": [
            "http://orcid.org/0000-0002-9484-1673"
        ],
        "type": "creator"
        },
        {
        "id": "64192-082-614",
        "given_name": "B.",
        "family_name": "Ruessink",
        "identifiers": [
            "http://orcid.org/0000-0001-9526-6087"
        ],
        "type": "creator"
        },
        {
        "id": "64109-89F-367",
        "given_name": "T.",
        "family_name": "De Haas",
        "identifiers": [
            "http://orcid.org/0000-0001-8949-3929"
        ],
        "type": "creator"
        },
        {
        "id": "64069-DB7-341",
        "given_name": "W.",
        "family_name": "Van Dijk",
        "identifiers": [
            "http://orcid.org/0000-0002-7276-1824"
        ],
        "type": "creator"
        },
        {
        "id": "64105-444-2AC",
        "given_name": "L.",
        "family_name": "Braat",
        "identifiers": [
            "http://secure.gravatar.com/avatar/a95e9701f224ade8741a07774f714869?d=identicon",
            "http://osf.io/3epcf/",
            "http://orcid.org/0000-0003-1130-9620"
        ],
        "type": "creator"
        },
        {
        "id": "64034-882-142",
        "given_name": "Jasper",
        "family_name": "Leuven",
        "identifiers": [
            "http://orcid.org/0000-0002-1886-4160",
            "http://secure.gravatar.com/avatar/b0ca4dbc6e353c558c94ec3513fb317f?d=identicon",
            "http://osf.io/sde46/"
        ],
        "type": "creator"
        }
    ]
    }
    Loaded 866 Share Records from /Users/rjohns14/git/share-samples/data/EarthArXiv/share_metadata_EarthArXiv_all_dates_from_index_1000.json
    Loaded 1866 total records from /Users/rjohns14/git/share-samples/data/EarthArXiv