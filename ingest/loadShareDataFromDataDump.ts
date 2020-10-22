const _ = require('lodash')
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

function getSimpleShareRecords (shareObjects) {
  const simplifiedShareRecords = _.map(shareObjects, (obj) => {
    const shareObject = obj['@graph']
    return {
      id: shareObject._id,
      title: shareObject._source.title,
      description: shareObject._source.description,
      sources: shareObject._source.sources, 
      identifiers: shareObject._source.identifiers,
      subjects: shareObject._source.subjects,
      tags: shareObject._source.tags,
      date_created: shareObject._source.date_created,
      contributors: getSimpleContributors(shareObject._source.lists.contributors)
    }
  })
  return simplifiedShareRecords
}

async function readJSONNewLineDelimitedFile (fileName) {
  let jsonObjects = []
  let iterator = 0
  let fileStream = fs.createReadStream(fileName)
    .pipe(ndjson.parse())
    .on('data', function(obj) {
      iterator += 1
      jsonObjects.push(JSON.stringify(obj).toString())
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
    console.log(shareObjects)
    //_.each (jsonObjects, (obj) => {
    //const shareObjects = JSON.parse(obj);
    // const simpleShareRecords = getSimpleShareRecords(shareObjects)
    // console.log(`Sample Record: ${JSON.stringify(simpleShareRecords[0], null , 2)}`)
    //fileRecordCount += simpleShareRecords.length
    fileRecordCount += shareObjects.length
    //})
    
    console.log(`Loaded ${fileRecordCount} Share Records from ${fileName}`)
    totalRecords += fileRecordCount
    
  })

  console.log(`Records length ${records.length}`)
  console.log(`Loaded ${totalRecords} total records from ${dataFolderPath}`)
}

main();

