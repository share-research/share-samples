import _ from 'lodash'
const fs = require('fs')
const path = require('path')

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
  const simplifiedShareRecords = _.map(shareObjects, (shareObject) => {
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

async function main() {
  const dataFolderPath = process.env.DATADIR
  const files = fs.readdirSync(dataFolderPath)
  let totalRecords = 0
  _.map(files, (file) => {
    const fileName = path.join(dataFolderPath, file);
    console.log(`Reading data from filename: ${fileName}`)
    const data = fs.readFileSync(fileName, 'utf8');
    
    const shareObjects = JSON.parse(data);
    const simpleShareRecords = getSimpleShareRecords(shareObjects)
    console.log(`Sample Record: ${JSON.stringify(simpleShareRecords[0], null , 2)}`)
    console.log(`Loaded ${simpleShareRecords.length} Share Records from ${fileName}`)
    totalRecords += simpleShareRecords.length
  })

  console.log(`Loaded ${totalRecords} total records from ${dataFolderPath}`)
}

main();

