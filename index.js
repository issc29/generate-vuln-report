const core = require('@actions/core');
const github = require('@actions/github');
const artifact = require('@actions/artifact');
var pdf = require("pdf-creator-node");
var fs = require('fs');
const path = require("path");


// most @actions toolkit packages have async methods
async function run() {
  const myToken = core.getInput('repo-token');
  const octokit = github.getOctokit(myToken)
  const context = github.context;

  try {
    console.log("Running Queries")
    const { data: alerts } = await octokit.codeScanning.listAlertsForRepo({
      ...context.repo
    });
    

    //console.log(alerts)

    var codeqlAlertCount = {'error': 0,'warning': 0,'note': 0}
    alerts.forEach(alert => {
      codeqlAlertCount[alert.rule_severity] = codeqlAlertCount[alert.rule_severity] + 1
    });

    console.log(codeqlAlertCount)
  } catch (error) {
    core.debug(error);
    core.setFailed(error.message);
  }

    const query =
      `query ($org: String! $repo: String! $cursor: String){
        repository(owner: $org name: $repo) {
          name
          vulnerabilityAlerts(first: 100 after: $cursor) {
            pageInfo {
              hasNextPage
              endCursor
            }
            totalCount
            nodes {
              id
              securityAdvisory {
                ghsaId,
                severity
              }
            }
          }
        }
      }`
      
    let pagination = null
    var ossAlerts = []
    try {
      let hasNextPage = false
      do {
        const getVulnResult = await octokit.graphql({query, org: context.repo.owner, repo: context.repo.repo, cursor: pagination })
        hasNextPage = getVulnResult.repository.vulnerabilityAlerts.pageInfo.hasNextPage
        const vulns = getVulnResult.repository.vulnerabilityAlerts.nodes
        Array.prototype.push.apply(ossAlerts, vulns)
        if (hasNextPage) {
          pagination = getVulnResult.repository.vulnerabilityAlerts.pageInfo.endCursor
        }
      } while (hasNextPage)
    } catch (error) {
        console.log('Request failed:', error.request)
        console.log(error.message)
      }

      var ossAlertCount = {'LOW': 0, 'MODERATE': 0, 'HIGH': 0, 'CRITICAL': 0}
  
      ossAlerts.forEach(alert => {
        ossAlertCount[alert.securityAdvisory.severity] = ossAlertCount[alert.securityAdvisory.severity] + 1
      });
    
      console.log(ossAlertCount)

      const query2 =
      `query ($org: String! $repo: String!){
        repository(owner: $org name: $repo) {
          name
          dependencyGraphManifests {
            nodes{
              dependenciesCount
            }
          }
        }
      }`

      var dependencyCount = 0
      try {
        const getDepedenciesCountInfo = await octokit.graphql({query: query2, org: context.repo.owner, repo: context.repo.repo, headers: {
          accept: `application/vnd.github.hawkgirl-preview+json`
        } })
        const dependencyCountNodes = getDepedenciesCountInfo.repository.dependencyGraphManifests.nodes

        dependencyCountNodes.forEach(dependencyCountNode => {
          dependencyCount += dependencyCountNode.dependenciesCount
        });
      }
      catch (error) {
        console.log('Request failed:', error.request)
        console.log(error.message)
      }

      console.log(`Number of Dependencies: ${dependencyCount}`)
      
 //console.log(__dirname)
  var a = fs.readdirSync(path.resolve(__dirname, "."))
  console.log(a)
  
  // Read HTML Template
  var html = fs.readFileSync(path.resolve(__dirname, "./template.html"))
  var document = {
    html: html,
    data: {
        sca: {
          alertsBySeverity: ossAlertCount,
          dependencyCount: dependencyCount
        },
        sast:{
          codeqlAlertCount
        }
    },
    path: path.resolve(__dirname,"./output.pdf")
  };

  var options = {
    format: "Letter",
    orientation: "portrait",
  };

  await pdf.create(document, options)
      .then(res => {
          console.log(res)
      })
      .catch(error => {
          console.error(error)
      });
}

run()
