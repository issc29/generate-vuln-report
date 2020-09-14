# Generate Vulnerability Report Action

A GitHub Action that generates a PDF of the GitHub Advanced Security alerts found in a repository.


## Features
- Generates a PDF with number of Code Scanning and Dependeabot alerts.

## Usage

```yml
 steps:
    # Checks-out your repository under $GITHUB_WORKSPACE, so your job can access it
    - uses: issc29/generate-vuln-report@master
      with:
        repo-token: ${{ secrets.token }}
```
