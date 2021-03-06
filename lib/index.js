const core = require('@actions/core');
const github = require('@actions/github');
const artifact = require('@actions/artifact');
var pdf = require("pdf-creator-node");
var fs = require('fs');
const path = require("path");

var Handlebars = require('handlebars');
var pdf = require('html-pdf');


// most @actions toolkit packages have async methods
async function run() {
  const myToken = core.getInput('repo-token');
  const octokit = github.getOctokit(myToken)
  const context = github.context;
  const app_dir = process.env["app_dir"]

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
      
 //console.log(app_dir)
  //var a = fs.readdirSync(app_dir)
  //console.log(a)
  
  // Read HTML Template
  var html = fs.readFileSync(`${app_dir}html/template.html`, 'utf8')
  
  var document = {
    html: html,
    data: {
        sca: {
          alertsBySeverity: ossAlertCount,
          dependencyCount: dependencyCount
        },
        sast: codeqlAlertCount
    },
    path: `${app_dir}output.pdf`
  };

  var options = {
    format: "Letter",
    orientation: "portrait",
 };

  try{
    var out = Handlebars.compile(document.html)(document.data);
    var pdfPromise = pdf.create(out, options);
    pdfPromise.toFile(document.path, (err, res) => {
      if (!err) {
        const artifactClient = artifact.create()
        const artifactName = 'GHAS-report';
      
        const files = [
          "/output.pdf"
        ]
        const rootDirectory = `${app_dir}` // Also possible to use __dirname
        const options2 = {
          continueOnError: false
        }
        const uploadResponse = artifactClient.uploadArtifact(artifactName, files, rootDirectory, options2)
      }
      else {
        console.log(err);
        console.log("b")
      }
    });
  } catch(error) {
    console.log(error)
  }



}

run()
