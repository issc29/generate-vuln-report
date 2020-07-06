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
      
    const variables = {...context.repo}
    const result = await octokit.graphql(query, variables);
    console.log(result)
    console.log("ran queries")
  } catch (error) {
    core.debug(error);
    core.setFailed(error.message);
  }
}

run()
