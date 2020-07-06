const core = require('@actions/core');
const github = require('@actions/github');


// most @actions toolkit packages have async methods
async function run() {
  try {
    const myToken = core.getInput('repo-token');
    const octokit = github.getOctokit(myToken)
    const context = github.context;

    console.log("Running Queries")
    const { data: alerts } = await octokit.codeScanning.listAlertsForRepo({
      ...context.repo
    });

    console.log(alerts)

    var alertCount = {'error': 0,'warning': 0,'note': 0}
    alerts.forEach(alert => {
      alertCount[alert.rule_severity] = alertCount[alert.rule_severity] + 1
    });

    console.log(alertCount)

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
    var ossVulns = []
    try {
      let hasNextPage = false
      do {
        const getVulnResult = await octokit.graphql({query, org: context.repo.owner, repo: context.repo.repo, cursor: pagination })
        hasNextPage = getVulnResult.repository.vulnerabilityAlerts.pageInfo.hasNextPage
        const vulns = getVulnResult.repository.vulnerabilityAlerts.nodes
        Array.prototype.push.apply(ossVulns, vulns)
        if (hasNextPage) {
          pagination = getVulnResult.repository.vulnerabilityAlerts.pageInfo.endCursor
        }
      } while (hasNextPage)
    } catch (error) {
        console.log('Request failed:', error.request)
        console.log(error.message)
      }
    
    console.log(ossVulns)
    console.log("ran queries")
  } catch (error) {
    core.debug(error);
    core.setFailed(error.message);
  }
}

run()
