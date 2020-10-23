import _ from 'lodash'
const fs = require('fs')
const path = require('path')
const ndjson = require('ndjson')
const util = require('util')
const stream = require('stream')

const dataFolderPath = "../data"

const finished = util.promisify(stream.finished);

function getSimpleContributors (contributors) {
  const simpleContributors = _.map(contributors, (contributor) => {
    return {
      id: contributor.id,
      given_name: contributor.given_name,
      family_name: contributor.family_name,
      identifiers: contributor.identifiers,
      type: contributor.relation
    }
  })
  return simpleContributors
}

// return basic fields like title, description, etc.
function getSimpleShareRecordMetadata (rawMetadata, creativeWorkId) {

}

function getSimpleShareAgentRelations (rawRelations) {
  return _.map(rawRelations, (relation) => {
    return relation['@type']
  })
}

// return affiliated institutions
function getSimpleShareInstitutions (rawInstitution) {
  return _.map(rawInstitution, (institution) => {
    return {
      id: institution['@id'],
      name: institution['name'],
      type: getSimpleShareAgentRelations(institution['incoming_agent_relations'])
    }
  })
}

// return resource identifiers such as DOIs
function getSimpleShareResourceIdentifiers (rawWorkIdentifiers) {
  return _.map(rawWorkIdentifiers, (workIdentifier) => {
    return workIdentifier['uri']
  })
}

// return subjects with just name and uri
function getSimpleShareSubjects (rawSubjects) {
  return _.map(rawSubjects, (rawSubject) => {
    return {
      name: rawSubject['name'],
      uri: rawSubject['uri']
    }
  })
}

// simply return the work relation type for a given person
function getSimplePersonTypes (rawPerson) {
  return _.map(rawPerson['work_relations'], (workRelation) => {
    return workRelation['@type']
  })
}

// return a simple version of an agentidentifier of just the uri associated with the id
function getSimpleAgentidentifiers (shareElements, rawPerson) {
  const personIdentifierIds = _.mapValues(rawPerson['identifiers'], (rawPersonIdentifier) => {
    return rawPersonIdentifier['@id']
  })
  const agentIdentifiersById = _.mapKeys(shareElements['agentidentifier'], (rawObj) => {
    return rawObj['@id']
  })
  return _.map(personIdentifierIds, (id) => {
    return agentIdentifiersById[id]['uri']
  })
}

// return an array of persons with a sample of elements dereferenced
function getSimpleSharePersons (shareElements) {
  const rawPersons = shareElements['person']
  let simplePersons = []
  return _.map(rawPersons, (rawPerson) => {
    return {
      id: rawPerson['@id'],
      given_name: rawPerson['given_name'],
      family_name: rawPerson['family_name'],
      identifiers: getSimpleAgentidentifiers(shareElements, rawPerson),
      type: getSimplePersonTypes(rawPerson)
    }
  })
}

function getCreativeWorkId (rawMetadata) {
  if (rawMetadata['workidentifier'] && 
  rawMetadata['workidentifier'][0] &&
  rawMetadata['workidentifier'][0]['creative_work']) {
    return rawMetadata['workidentifier'][0]['creative_work']['@id']
  } else {
    return undefined
  }
}

function getSimpleShareRecords (shareObjects) {
  const simplifiedShareRecords = _.map(shareObjects, (shareObj) => {

    // first organize elements into arrays by type (e.g., person, institution, subject, agentidentifiers)
    let shareElements = {}
    _.each(shareObj['@graph'], (element) => {
      const type = _.toLower(element['@type'])
      if (!shareElements[type]) {
        shareElements[type] = []
      }
      shareElements[type].push(element)
    })

    // get the elements by id
    const shareElementsById = _.mapKeys(shareObj['@graph'], (element) => {
      return element['@id']
    })

    //get core metadata
    const creativeWorkId = getCreativeWorkId(shareElements)
    const coreMetadata = (creativeWorkId) ? shareElementsById[creativeWorkId] : undefined

    return {
      id: (creativeWorkId) ? creativeWorkId : undefined,
      title: (coreMetadata) ? coreMetadata['title'] : undefined,
      description: (coreMetadata) ? coreMetadata['description'] : undefined,
      type: (coreMetadata) ? coreMetadata['@type'] : undefined,
      resourceIdentifiers: getSimpleShareResourceIdentifiers(shareElements['workidentifier']),
      persons: getSimpleSharePersons(shareElements),
      subjects: getSimpleShareSubjects(shareElements['subject']),
      institutions: getSimpleShareInstitutions(shareElements['institution']),
      rawMetadata: shareElements
    }
  })
  return simplifiedShareRecords
}

// have to read in line by line for each json blob
async function readJSONNewLineDelimitedFile (fileName) {
  let jsonObjects = []
  let iterator = 0
  let fileStream = fs.createReadStream(fileName)
    .pipe(ndjson.parse())
    .on('data', function(obj) {
      iterator += 1
      jsonObjects.push(obj)
  })

  await finished(fileStream)
  return jsonObjects
}

async function main() {
  const fs = require('fs')
  const dataFolderPath = process.env.DATADIR
  const files = fs.readdirSync(dataFolderPath)
  let totalRecords = 0
  let records = []
  await _.map(files, async (file) => {
    const fileName = path.join(dataFolderPath, file);
    console.log(`Reading share records from filename: ${fileName}`)
    let shareObjects = await readJSONNewLineDelimitedFile(fileName)
    
    console.log(`Processing ${shareObjects.length} share records`)
    let fileRecordCount = 0
    const simpleShareRecords = getSimpleShareRecords(shareObjects)
    console.log(`Sample Record: ${JSON.stringify(simpleShareRecords[0], null , 2)}`)
    fileRecordCount += simpleShareRecords.length
    
    console.log(`Loaded ${fileRecordCount} Share Records from ${fileName}`)
    totalRecords += fileRecordCount
    
  })
}

main();

