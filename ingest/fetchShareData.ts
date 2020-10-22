const _ = require('lodash');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const pify = require('pify');
const pMap = require('p-map');
const moment = require('moment');
const writeCsv = require('./units/writeCsv').command;

import pTimes from 'p-times'

const dataFolderPath = '../data';
 
async function wait(ms){
  return new Promise((resolve, reject)=> {
    setTimeout(() => resolve(true), ms );
  });
}

async function randomWait(seedTime, index){
  const waitTime = 1000 //* (index % 5)
  //console.log(`Thread Waiting for ${waitTime} ms`)
  await wait(waitTime)
}

async function getShareSources () {
  let sources = []
  let nextUrl = `https://share.osf.io/api/v2/sources/`

  while (nextUrl!==null) {
    const response = await axios.get(nextUrl, {})
    // console.log(`Response keys: ${JSON.stringify(_.keys(response.data), null, 2)}`)
    sources = _.concat(sources, response.data.data)
    // console.log(`Sources length: ${sources.length}`)
    nextUrl = response.data.links.next
  }

  return sources
}

async function getShareSourceSearch (source, curOffset, size) {
  const query = createSearchQuery(source, null, null, [], [])
  return await getShareSearch(query, curOffset, size)
}

async function getShareSourceDateSearch (source, startDate, endDate, curOffset, size) {
  const query = createSearchQuery(source, startDate, endDate, [], [])
  return await getShareSearch(query, curOffset, size)
}

async function getShareSourceDateTagSearch (source, startDate, endDate, includeTags, excludeTags, curOffset, size) {
  const query = createSearchQuery(source, startDate, endDate, includeTags, excludeTags)
  return await getShareSearch(query, curOffset, size)
}

function getDecadeDateRanges (startYear, endYear) {
  return getYearDateRanges(startYear, endYear, 10)
}

function getHalfCenturyDateRanges (startYear, endYear) {
  return getYearDateRanges(startYear, endYear, 50)
}

function getCenturyDateRanges () {
  return getYearDateRanges(1800, 2099, 100)
}

function getYearDateRanges (startYear, endYear, increment) {
  let dates = []
  let curStartYear = startYear
  while (curStartYear <= endYear) {
    const curEndYear = curStartYear + increment - 1
    const date = {
      startYear: curStartYear,
      endYear: curEndYear,
      startDate: `${curStartYear}-01-01`,
      endDate: `${curStartYear + increment - 1}-12-31`
    }
    dates.push(date)
    curStartYear += increment
  }
  return dates
}

function getMonthDateRanges(year) {
  let curMonth = 1
  const endMonth = 12
  let dates = []
  while (curMonth <= 12) {
    let curEndDate = 31
    // because the last day in the month always varies,
    // if not 12 or 1 start with first day of next month,
    // and subtract 1 to get the last day of the month
    if (curMonth > 1 && curMonth < 12) {
      curEndDate = new Date(Date.parse(`${year}-${curMonth+1}-01`) - 1).getDate()
    }
    let curMonthString = `${curMonth}`
    if (curMonth < 10) {
      curMonthString = `0${curMonthString}`
    }
    const date = {
      startYear: year,
      endYear: year,
      startDate: `${year}-${curMonthString}-01`,
      endDate: `${year}-${curMonthString}-${curEndDate}`
    }
    dates.push(date)
    curMonth += 1
  }
  return dates
}

function getSingleDateRanges(year, month, startDate, endDate) {
  let curStartDate = Number.parseInt(startDate)
  let dates = []
  let curEndDate = Number.parseInt(endDate)
  while (curStartDate <= curEndDate) {
    let curDateString = `${curStartDate}`
    if (curStartDate<10) {
      curDateString = `0${curDateString}`
    }
    const date = {
      startYear: year,
      endYear: year,
      startDate: `${year}-${month}-${curDateString}`,
      endDate: `${year}-${month}-${curDateString}`
    }
    dates.push(date)
    curStartDate += 1
  }
  return dates
}

function createTagFilter(tag) {
  return {
    term: {
      'tags.exact': tag
    } 
  } 
}

function createSearchQuery(source, startDate, endDate, includeTags, excludeTags) {
  let filter = []
  const includeTagFilters = _.map(includeTags, (tag) => { return createTagFilter(tag) })
  const excludeTagFilters = _.map(excludeTags, (tag) => { return createTagFilter(tag) })
  let tagFilters = []
 
  filter.push({
    term: {
      sources: source
    } 
  })
  if (startDate && endDate) {
    filter.push({
      range: {
        date: {
          gte: `${startDate}||/d`,
          lte: `${endDate}||/d`
        }
      }
    })
  }

  if (includeTagFilters.length > 0){
    filter = _.concat(filter, includeTagFilters)
  }

  const query = {
    query: {
      bool: {
        must: {
          query_string: {
            query: '*'
          }
        },
        filter: filter,
        must_not: excludeTagFilters
      }
    }
  }

  // console.log(`Generated query: ${JSON.stringify(query, null, 2)}`)
  return query
}

async function getShareSearch (query, curOffset, size) {
  const url = `https://share.osf.io/api/v2/search/creativeworks/_search`

  
  const response = await axios.get(url, {
    params: {
      source: JSON.stringify(query),
      from: curOffset,
      size: size
    }
  })
  return response.data.hits
}

// replace diacritics with alphabetic character equivalents
function removeSpaces (value) {
  if (_.isString(value)) {
    const newValue = _.clone(value)
    let norm =  newValue.replace(/\s/g, '')
    // console.log(`before replace space: ${value} after replace space: ${norm}`)
    return norm
  } else {
    return value
  }
}

function normalizeString (value) {
  if (_.isString(value)) {
    const newValue = _.clone(value)
    const norm1 = newValue
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
    // the u0027 also normalizes the curly apostrophe to the straight one
    const norm2 = norm1.replace(/[\u2019]/g, '\u0027')
    // remove periods and other remaining special characters
    const norm3 = norm2.replace(/[&\/\\#,+()$~%.'":*?<>{}!-]/g,'');
    let norm4 = norm3.replace(' and ', '')
    // replace any leading 'the' with ''
    if (_.startsWith(_.toLower(norm4), 'the ')) {
      norm4 = norm4.substr(4)
    }
    return removeSpaces(norm4)
  } else {
    return value
  }
}

async function writeSearchResult (dataDir, source, startDate, endDate, includeTags, startIndex, results, prevFoundMap) {
  let dateString = 'all_dates'
  if (startDate && endDate) {
    dateString = `${startDate}_${endDate}`
  }
  let sourceString = normalizeString(source)
  const tagString = (includeTags && includeTags.length > 0) ? `_tag_${JSON.stringify(includeTags)}` : ''
  const filename = path.join(dataDir, `share_metadata_${sourceString}_${dateString}_from_index_${startIndex}${tagString}.json`);
  // filter our records found previously
  const filteredResults = _.filter(results, (result) => {
    return !prevFoundMap[result._id]
  })
  if(filteredResults && filteredResults.length > 0) {
    console.log(`Writing ${filename}`);
    await pify(fs.writeFile)(filename, JSON.stringify(results, null, 2));
  }
}

//returns array of ids for records written
async function writeTaggedSearchResults(dataDir, source, startDate, endDate, includeTags, excludeTags, prevFoundMap) {
  return baseWriteSearchResults(dataDir, source, startDate, endDate, includeTags, excludeTags, prevFoundMap)
}

//returns array of ids for records written
async function writeSearchResults(dataDir, source, startDate, endDate) {
  return baseWriteSearchResults(dataDir, source, startDate, endDate, [], [], {})
}

function getShareRecordIds(records) {
  return _.map(records, (record) => {
    return record._id
  })
}

//returns array of ids for records written
async function baseWriteSearchResults(dataDir, source, startDate, endDate, includeTags, excludeTags, prevFoundMap) {
  const pageSize = 1000
  const offset = 0
  let ids = []
  let startOffset = offset
  let results = null
  if (startDate&&endDate) {
    randomWait(1000,1)
    results = await getShareSourceDateTagSearch(source, startDate, endDate, includeTags, excludeTags, startOffset, pageSize)  
   
  } else {
    // console.log('here')
    randomWait(1000,1)
    results = await getShareSourceSearch(source, startOffset, pageSize)
  }
  if (results && results.total > 0) {
    await writeSearchResult(dataDir, source, startDate, endDate, includeTags, startOffset, results.hits, prevFoundMap)
    ids = _.concat(ids, getShareRecordIds(results.hits))
    const totalResults = results.total - offset
    // const totalResults = 2546
    if (totalResults > pageSize) {
      let numberOfRequests = parseInt(`${totalResults / pageSize}`) //convert to an integer to drop any decimal
      if ((totalResults % pageSize) <= 0) {
        numberOfRequests -= 1
      }
      console.log(`Making ${numberOfRequests} requests for ${totalResults} results`)
      await pTimes (numberOfRequests, async function (index) {
        randomWait(1000,index)
        let curOffset = (pageSize * index) + pageSize + startOffset
        if (curOffset > totalResults) {
          curOffset -= pageSize
          curOffset += totalResults - curOffset
        }
       
        if (curOffset < totalResults) {
        
          try {
            const nextResults = await getShareSourceDateTagSearch(source, startDate, endDate, includeTags, excludeTags, startOffset, pageSize)
            if (nextResults && nextResults.total > 0) {
              // console.log(`Offset is: ${curOffset}`)
              await writeSearchResult(dataDir, source, startDate, endDate, includeTags, curOffset, nextResults.hits, prevFoundMap)
              ids = _.concat(ids, getShareRecordIds(nextResults.hits))
            }
          } catch (error) {
            console.log(`Error on offset: ${curOffset}`)
          }
        }
      }, { concurrency: 1})
    }
  }
  return ids
}

function ensureDirSync (dirpath) {
  try {
    return fs.mkdirSync(dirpath)
  } catch (err) {
    if (err.code !== 'EEXIST') throw err
  }
}

function createResultTotalObject(sourceTitle, startDate, endDate, count) {
  return {
    source: sourceTitle,
    startDate: startDate,
    endDate: endDate,
    count: count
  }
}

//expects an array of shareRecords as input parameter
function getTags (shareRecords) {
  let tagMap = {}
  _.each(shareRecords, (shareRecord) => {
    if (shareRecord._source && shareRecord._source.tags) {
      _.each (shareRecord._source.tags, (tag) => {
        tagMap[tag] = 0
      })
    }
  })
  return _.keys(tagMap)
}

async function main() {

  // create results directory
  const dataDir = path.join(process.cwd(), dataFolderPath, `share_${moment().format('YYYYMMDDHHmmss')}`)
  ensureDirSync(dataDir)

  const shareSources = await getShareSources()
  const sourceTitles = _.map(shareSources, (source) => {
    return source.attributes['longTitle']
  })
  console.log(`Found ${JSON.stringify(sourceTitles, null, 2)} Share sources`)
  console.log(`Found ${sourceTitles.length} Share sources`)

  const centuryDates = getCenturyDateRanges()
  console.log(`Century dates are: ${JSON.stringify(centuryDates, null, 2)}`)

  let loopCounter = 0
  const maxLimit = 9999
  // const subset = _.chunk(shareSources, 5)
  const exclusionList = [
    // 'NIH Research Portal Online Reporting Tools',
    // 'CrossRef',
    // 'DataCite MDS',
    // 'RCAAP - Repositório Científico de Acesso Aberto de Portugal',
    // 'Arizona State University Digital Repository',
    // 'Dryad Data Repository'
  ]

  const doneList = [
    // 'University of Notre Dame, CurateND',
    // 'Speech and Language Data Repository (SLDR/ORTOLANG)',
    // 'Mason Archival Repository Service',
    // 'Apollo @ University of Cambridge',
    // 'Pontifical Catholic University of Rio de Janeiro',
    // 'Huskie Commons @ Northern Illinois University',
    // 'Zenodo',
    // 'CU Scholar University of Colorado Boulder',
    // 'Calhoun: Institutional Archive of the Naval Postgraduate School',
    // 'Érudit',
    // 'Tuskegee University',   // note this has zero results
    // 'UKnowledge @ University of Kentucky',
    // 'engrXiv',
    // 'University of Utah',
    // 'Addis Ababa University Institutional Repository',
    // 'MOspace Institutional Repository',
    // 'Hacettepe University DSpace on LibLiveCD',
    // 'ScholarsArchive@OSU',
    // 'Florida Institute of Technology',
    // 'DSpace@MIT',
    // 'Munich Personal RePEc Archive',
    // 'Digital Howard @ Howard University',
    // 'Harvard Dataverse',
    // 'Western University',
    // 'PeerJ',
    // 'DSpace at Texas State University',
    // 'eScholarship@UMMS',
    // 'OpenSIUC at the Southern Illinois University Carbondale',
    // 'DigitalCommons@PCOM',
    // 'Digital Collections of Colorado',
    // 'WHOAS at MBLWHOI Library',
    // 'University of Central Florida',
    // 'Texas Tech Univeristy Libraries',
    // 'VCU Scholars Compass',
    // 'eLife Sciences',
    // 'Triceratops: Tri-College Digital Repository',
    // 'Scholarly Commons @ JMU',
    // 'University of Richmond',
    // 'Digital Commons @ Trinity University',
    // 'PAPYRUS - Dépôt institutionnel de l\'Université de Montréal',
    // 'National Oceanographic Data Center',
    // 'SHAREOK Repository',
    // 'Purdue e-Pubs',
    // 'Cogprints',
    // 'University of South Florida - Scholar Commons',
    // 'University of Texas at Austin Digital Repository',
    // 'KU ScholarWorks'
  ]

  const incompleteList = [
    // 'RCAAP - Repositório Científico de Acesso Aberto de Portugal',
    // 'Arizona State University Digital Repository',
    // 'Dryad Data Repository',
    // 'NIH Research Portal Online Reporting Tools',
    // 'ScholarWorks@UMass Amherst',
    // 'Ghent University Academic Bibliography',
    // 'CERN Document Server',
    // 'DataONE: Data Observation Network for Earth',
    // 'London School of Hygiene and Tropical Medicine Research Online',
    // 'DoE\'s SciTech Connect Database',
    // 'EconStor',
    // 'Hyper Articles en Ligne (HAL)',
    // 'Research Papers in Economics',
    // 'bioRxiv',
    // 'DigitalCommons@USU',
    // 'Social Science Open Access Repository',
    // 'K-State Research Exchange',
  ]

  // "ScholarWorks@UMass Amherst": [
  //   "Error: 14 - Source 'ScholarWorks@UMass Amherst' too many results found 2017-02-12 to 2017-02-12 15445 results, getting by day"
  // ],
  // "Ghent University Academic Bibliography": [
  //   "Error: 18 - Source 'Ghent University Academic Bibliography' too many results found 2017-01-01 to 2017-01-01 11708 results, getting by day"
  // ]

  const toDoList = [
    // 'Department of Energy Pages',
    // 'Research Papers in Economics'
    // 'Arizona State University Digital Repository'
  ]

  const completedList = [
    // 'University of Notre Dame, CurateND',
    // 'Speech and Language Data Repository (SLDR/ORTOLANG)',
    // 'Mason Archival Repository Service',
    // 'RCAAP - Repositório Científico de Acesso Aberto de Portugal',
    // 'Department of Energy Pages',
    // 'Arizona State University Digital Repository',
    // 'K-State Research Exchange',
    // 'Zenodo'
  ]

  const subset = _.chunk(toDoList, 2)

  let totalResultsCounter = {}
  let errorMessages = {}

  let detailedResultsCounter = []
  
  await pMap (sourceTitles, async (source) => {
    // const sourceTitle = source.attributes['longTitle']
    const loopIndex = loopCounter + 1
    loopCounter += 1
    const sourceTitle = source
    try {
      const sourceDir = path.join(dataDir, normalizeString(sourceTitle))
      ensureDirSync(sourceDir)
      let sourceResults = []
      const pageSize = 10
      const startOffset = 0
      let offset = startOffset
      if (!_.find(exclusionList, (item) => { return item === sourceTitle })){
        totalResultsCounter[sourceTitle] = 0
        // const sourceTitle = 'NIH Research Portal Online Reporting Tools'
        randomWait(1000, loopIndex)
        const results = await getShareSourceSearch(sourceTitle, offset, pageSize)
        // try getting tags
        const tags = getTags(results.hits)
        console.log(`Found tags: ${JSON.stringify(tags, null, 2)}`)
        console.log(`${loopIndex} - Source '${sourceTitle}' found and getting ${results.total} results`)
        if (results.total > maxLimit) {
          console.log(`Too many results for source '${sourceTitle}', getting records by century...`)
          await pMap(centuryDates, async (century) => {
            // console.log(`${loopIndex} - Source '${sourceTitle}' getting ${century.startDate} to ${century.endDate}...`)
            randomWait(1000, loopIndex)
            const centuryResults = await getShareSourceDateSearch(sourceTitle, century.startDate, century.endDate, offset, pageSize)
            console.log(`${loopIndex} - Source '${sourceTitle}' found ${century.startDate} to ${century.endDate} ${centuryResults.total} results`)
            if (centuryResults.total > maxLimit) {
              console.log(`${loopIndex} - Source '${sourceTitle}' too many results found ${century.startDate} to ${century.endDate} ${centuryResults.total} results, getting by half century`)
              const halfCenturyDates = getHalfCenturyDateRanges(century.startYear, century.endYear)
              await pMap(halfCenturyDates, async (halfCentury) => {
                randomWait(1000, loopIndex)
                const halfCenturyResults = await getShareSourceDateSearch(sourceTitle, halfCentury.startDate, halfCentury.endDate, offset, pageSize)
                console.log(`${loopIndex} - Source '${sourceTitle}' found ${halfCentury.startDate} to ${halfCentury.endDate} ${halfCenturyResults.total} results`)
                if (halfCenturyResults.total > maxLimit) {
                  console.log(`${loopIndex} - Source '${sourceTitle}' too many results found ${halfCentury.startDate} to ${halfCentury.endDate} ${centuryResults.total} results, getting by decade`)
                  const decadeDates = getDecadeDateRanges(halfCentury.startYear, halfCentury.endYear)
                  await pMap(decadeDates, async (decade) => {
                    randomWait(1000, loopIndex)
                    const decadeResults = await getShareSourceDateSearch(sourceTitle, decade.startDate, decade.endDate, offset, pageSize)
                    console.log(`${loopIndex} - Source '${sourceTitle}' found ${decade.startDate} to ${decade.endDate} ${decadeResults.total} results`)
                    if (decadeResults.total > maxLimit) {
                      console.log(`${loopIndex} - Source '${sourceTitle}' too many results found ${decade.startDate} to ${decade.endDate} ${decadeResults.total} results, getting by year`)
                      const yearDates = getYearDateRanges(decade.startYear, decade.endYear, 1)
                      await pMap(yearDates, async (year) => {
                        randomWait(1000, loopIndex)
                        const yearResults = await getShareSourceDateSearch(sourceTitle, year.startDate, year.endDate, offset, pageSize)
                        console.log(`${loopIndex} - Source '${sourceTitle}' found ${year.startDate} to ${year.endDate} ${yearResults.total} results`)
                        if (yearResults.total > maxLimit) {
                          console.log(`${loopIndex} - Source '${sourceTitle}' too many results found ${year.startDate} to ${year.endDate} ${yearResults.total} results, getting by month`)
                          // do in day increments
                          const monthDates = getMonthDateRanges(year.startYear)
                          // console.log(`Month date ranges are: ${JSON.stringify(monthDates, null, 2)}`)
                          await pMap(monthDates, async (month) => {
                            randomWait(1000, loopIndex)
                            const monthResults = await getShareSourceDateSearch(sourceTitle, month.startDate, month.endDate, offset, pageSize)
                            console.log(`${loopIndex} - Source '${sourceTitle}' found ${month.startDate} to ${month.endDate} ${monthResults.total} results`)
                            if (monthResults.total > maxLimit) {
                              console.log(`${loopIndex} - Source '${sourceTitle}' too many results found ${month.startDate} to ${month.endDate} ${monthResults.total} results, getting by day`)
                              // do in day increments
                              const monthStartDate = month.startDate.split('-')
                              const monthEndDate = month.endDate.split('-')
                              // console.log(`Getting single dates for ${year} ${JSON.stringify(monthStartDate, null, 2)}, ${JSON.stringify(monthEndDate, null, 2)}`)
                              const singleDates = getSingleDateRanges(monthStartDate[0], monthStartDate[1], monthStartDate[2], monthEndDate[2])
                              // console.log(`Single date ranges are: ${JSON.stringify(singleDates, null, 2)}`)
                              await pMap(singleDates, async (singleDate) => {
                                randomWait(1000, loopIndex)
                                const singleDateResults = await getShareSourceDateSearch(sourceTitle, singleDate.startDate, singleDate.endDate, offset, pageSize)
                                console.log(`${loopIndex} - Source '${sourceTitle}' found ${singleDate.startDate} to ${singleDate.endDate} ${singleDateResults.total} results`)
                                if (singleDateResults.total > maxLimit) {
                                  // add filter by tag
                                  const errorMessage = `Error: ${loopIndex} - Source '${sourceTitle}' too many results found ${singleDate.startDate} to ${singleDate.endDate} ${singleDateResults.total} results, getting by tag`
                                  const singleDateResultsAgain = await getShareSourceDateSearch(sourceTitle, singleDate.startDate, singleDate.endDate, offset, 1000)
                                  // try to get results by tags from 1st 1000 results, and if still not all results, put out error
                                  const tags = getTags(singleDateResultsAgain.hits)
                                  console.log(`Tags are: ${JSON.stringify(tags, null, 2)}`)
                                  const targetRecordTotal = singleDateResults.total
                                  let foundRecords = {}
                                  let excludeTags = []
                                  await pMap(tags, async (tag) => {
                                    const includeTags = [tag]
                                    const singleDateTaggedResults = await getShareSourceDateTagSearch(sourceTitle, singleDate.startDate, singleDate.endDate, includeTags, excludeTags, offset, pageSize)
                                    console.log(`${loopIndex} - Source '${sourceTitle}' found ${singleDate.startDate} to ${singleDate.endDate} tag '${tag}' ${singleDateTaggedResults.total} results`)
                                    if (_.keys(foundRecords).length < targetRecordTotal && singleDateTaggedResults.total <= maxLimit) {
                                      const ids = await writeTaggedSearchResults(dataDir, source, singleDate.startDate, singleDate.endDate, includeTags, excludeTags, foundRecords)
                                      console.log(`Found ${ids.length} total ids for tag ${tag} and dates: ${singleDate.startDate} to ${singleDate.endDate}`)
                                      // add founds ids to map
                                      _.each(ids, (id) => {
                                        foundRecords[id] = 0
                                      })
                                      excludeTags.push(tag)
                                    }
                                  }, { concurrency: 1})
                                  const singleDateTaggedNextResults = await getShareSourceDateTagSearch(sourceTitle, singleDate.startDate, singleDate.endDate, [], tags, offset, pageSize)
                                  console.log(`${loopIndex} - Source '${sourceTitle}' found ${singleDate.startDate} to ${singleDate.endDate} excluding tags ${singleDateTaggedNextResults.total} results`)
                                  if (_.keys(foundRecords).length < targetRecordTotal){
                                    // do one more with all tags excluded
                                    // const singleDateTaggedNextResults = await getShareSourceDateTagSearch(sourceTitle, singleDate.startDate, singleDate.endDate, [], tags, offset, pageSize)
                                    if (singleDateTaggedNextResults.total <= maxLimit) {
                                      console.log('here')
                                      const ids = await writeTaggedSearchResults(dataDir, source, singleDate.startDate, singleDate.endDate, [], tags, foundRecords)
                                      console.log(`${loopIndex} - Source '${sourceTitle}' found ${singleDate.startDate} to ${singleDate.endDate} excluding tags ${singleDateTaggedNextResults.total} results`)
                                      // add founds ids to map
                                      _.each(ids, (id) => {
                                        foundRecords[id] = 0
                                      })
                                    } else {
                                      const errorMessage = `Error: ${loopIndex} - Source '${sourceTitle}' too many results found ${singleDate.startDate} to ${singleDate.endDate} ${singleDateTaggedNextResults.total} results excluding known tags`
                                    }
                                    if (_.keys(foundRecords).length < targetRecordTotal){
                                      const errorMessage = `Error: ${loopIndex} - Source '${sourceTitle}' only ${_.keys(foundRecords).length} of ${targetRecordTotal} results found for ${singleDate.startDate} to ${singleDate.endDate} when getting results by tag`
                                      console.log(errorMessage)
                                      if (!errorMessages[sourceTitle]) {
                                        errorMessages[sourceTitle] = []
                                      }  
                                      errorMessages[sourceTitle].push(errorMessage)
                                    }
                                  }
                                } else {
                                  // await writeSearchResults(sourceDir, sourceTitle, singleDate.startDate, singleDate.endDate)
                                  totalResultsCounter[sourceTitle] += singleDateResults.total    
                                }
                                detailedResultsCounter.push(createResultTotalObject(sourceTitle, singleDate.startDate, singleDate.endDate, singleDateResults.total))
                              }, { concurrency: 1})
                            } else {
                              // await writeSearchResults(sourceDir, sourceTitle, month.startDate, month.endDate)
                              totalResultsCounter[sourceTitle] += monthResults.total      
                            }
                            detailedResultsCounter.push(createResultTotalObject(sourceTitle, month.startDate, month.endDate, monthResults.total))
                          }, { concurrency: 1})
                        } else {
                          // await writeSearchResults(sourceDir, sourceTitle, year.startDate, year.endDate)
                          totalResultsCounter[sourceTitle] += yearResults.total        
                        }
                        detailedResultsCounter.push(createResultTotalObject(sourceTitle, year.startDate, year.endDate, yearResults.total))
                      }, { concurrency: 1})
                    } else {
                      // await writeSearchResults(sourceDir, sourceTitle, decade.startDate, decade.endDate)
                      totalResultsCounter[sourceTitle] += decadeResults.total    
                    }
                    detailedResultsCounter.push(createResultTotalObject(sourceTitle, decade.startDate, decade.endDate, decadeResults.total))
                  }, { concurrency: 1 })
                } else {
                  // await writeSearchResults(sourceDir, sourceTitle, halfCentury.startDate, halfCentury.endDate)
                  totalResultsCounter[sourceTitle] += halfCenturyResults.total      
                }
                detailedResultsCounter.push(createResultTotalObject(sourceTitle, halfCentury.startDate, halfCentury.endDate, halfCenturyResults.total))
              }, { concurrency: 1 })
            } else {
              // await writeSearchResults(sourceDir, sourceTitle, century.startDate, century.endDate)
              totalResultsCounter[sourceTitle] += centuryResults.total    
            }
            detailedResultsCounter.push(createResultTotalObject(sourceTitle, century.startDate, century.endDate, centuryResults.total))
          }, {concurrency: 1})
        } else {
          const results = await getShareSourceSearch(sourceTitle, offset, pageSize)
          // await writeSearchResults(sourceDir, sourceTitle, null, null)
          totalResultsCounter[sourceTitle] += results.total    
        }
        detailedResultsCounter.push(createResultTotalObject(sourceTitle, null, null, results.total))
      }
    } catch (error) {
      if (!errorMessages[sourceTitle]) {
        errorMessages[sourceTitle] = []
      }
      errorMessages[sourceTitle].push(JSON.stringify(error))
    }
  }, { concurrency: 30})
  
  let totalResultsAll = 0
  _.each(_.values(totalResultsCounter), (value) => {
    totalResultsAll += value
  })
  totalResultsCounter['All'] = totalResultsAll
  
  // write out any errors as csv
  const errorsCSVFileName = `${dataDir}/source_errors.${moment().format('YYYYMMDDHHmmss')}.csv`
  console.log(`Source Errors are: ${JSON.stringify(errorMessages, null, 2)}`)
  const errorData = _.map(_.keys(errorMessages), (key) => {
    return {
      source: key,
      error: JSON.stringify(errorMessages[key])
    }
  }) 
  await writeCsv({
    path: errorsCSVFileName,
    data: errorData
  }); 

  //write out total counts as csv
  const detailedCountsCSVFileName = `${dataDir}/source_results_detailed_counts.${moment().format('YYYYMMDDHHmmss')}.csv`
  console.log(`Detailed Source Results are: ${JSON.stringify(detailedResultsCounter, null, 2)}`)
  await writeCsv({
    path: detailedCountsCSVFileName,
    data: detailedResultsCounter
  });

  //write out total counts as csv
  const countsCSVFileName = `${dataDir}/source_results_counts.${moment().format('YYYYMMDDHHmmss')}.csv`
  console.log(`Total Source Results are: ${JSON.stringify(totalResultsCounter, null, 2)}`)
  const countsData = _.map(_.keys(totalResultsCounter), (key) => {
    return {
      source: key,
      count: totalResultsCounter[key]
    }
  }) 
  await writeCsv({
    path: countsCSVFileName,
    data: countsData
  });
}

main()

