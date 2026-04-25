import json
import requests
import sys
from datetime import datetime
import requests
# import datetime
import pandas as pd
import os
from packaging import version
from dotenv import load_dotenv

######################################
# DECLARAÇÃO DE CONSTANTES/VARIÁVEIS #
######################################
TODAY = datetime.now()

load_dotenv()
# Variáveis globais ao repositório
OWNER = "fga-eps-mds"
REPO = os.getenv('REPO')
REPO_ISSUES = os.getenv('REPO_DOC')

# Configurar as variáveis de ambiente
GITHUB_TOKEN = os.getenv('GITHUB_TOKEN')
RELEASE_MAJOR = os.getenv('RELEASE_MAJOR')
RELEASE_MINOR = os.getenv('RELEASE_MINOR')
RELEASE_FIX = os.getenv('RELEASE_FIX')
DEVELOP = os.getenv('DEVELOP')

METRICS_SONAR = [
    "files",
    "functions",
    "complexity",
    "comment_lines_density",
    "duplicated_lines_density",
    "coverage",
    "ncloc",
    "tests",
    "test_errors",
    "test_failures",
    "test_execution_time",
    "security_rating",
]

BASE_URL_SONAR = "https://sonarcloud.io/api/measures/component_tree?component=fga-eps-mds_"

# Utilize a api que for necessária
# api_url_workflows = f"https://api.github.com/repos/{owner}/{repo}/actions/workflows"
# api_url_jobs = f"https://api.github.com/repos/{owner}/{repo}/actions/runs/3624383254/jobs"
# api_url_deployments = f"https://api.github.com/repos/{owner}/{repo}/deployments"
api_url_runs = f"https://api.github.com/repos/{OWNER}/{REPO}/actions/runs"
api_url_issues = f"https://api.github.com/repos/{OWNER}/{REPO_ISSUES}/issues"

###################
# FUNÇÕES RELEASE #
###################
# Pega a última release
def get_latest_release():
    url = f'https://api.github.com/repos/{OWNER}/{REPO}/releases'
    headers = {
        'Authorization': f'token {GITHUB_TOKEN}'
    }
    response = requests.get(url, headers=headers)
    releases = response.json()
    
    if releases:
        return releases[0].get('tag_name', '0.0.0')
    return '0.0.0'

# Cria um novo nome de tag
def new_tag_name():
    old_tag = get_latest_release()
    try:
        old_version = version.parse(old_tag)
    except version.InvalidVersion:
        old_version = version.parse('0.0.0')

    if RELEASE_MAJOR == 'true':
        return f'{old_version.major + 1}.0.0'
    elif RELEASE_MINOR == 'true':
        return f'{old_version.major}.{old_version.minor + 1}.0'
    elif RELEASE_FIX == 'true':
        return f'{old_version.major}.{old_version.minor}.{old_version.micro + 1}'
    else:
        return f'{old_version.major}.{old_version.minor}.{old_version.micro + 1}'
    
# Cria a nova release
def create_release():
    tag = new_tag_name()
    url = f'https://api.github.com/repos/{OWNER}/{REPO}/releases'
    headers = {
        'Authorization': f'token {GITHUB_TOKEN}',
        'Accept': 'application/vnd.github.v3+json'
    }
    payload = {
        'tag_name': tag,
        'name': tag
    }
    response = requests.post(url, headers=headers, json=payload)
    res_data = response.json()
    return res_data.get('upload_url'), tag

#################
# FUNÇÕES SONAR #
#################

def save_sonar_metrics(tag):
    response = requests.get(f'{BASE_URL_SONAR}{REPO}&metricKeys={",".join(METRICS_SONAR)}&ps=500')

    j = json.loads(response.text)

    print("Extração do Sonar concluída.")

    file_path = f'./analytics-raw-data/fga-eps-mds-{REPO}-{TODAY.strftime("%m-%d-%Y-%H-%M-%S")}-{tag}.json'

    with open(file_path, 'w') as fp:
        fp.write(json.dumps(j))
        fp.close()

    return

##################
# FUNÇÕES GITHUB #
##################

def all_request_pages(data):
    total_runs = data["total_count"]
    pages = (total_runs // 100) + (1 if total_runs % 100 > 0 else 0)
    for i in range(pages+1):
        if i == 0 or i == 1:
            continue
        api_url_now = api_url_runs + "?page=" + str(i)
        response = requests.get(api_url_now)
        for j in ((response.json()['workflow_runs'])):
            data['workflow_runs'].append(j)
    return data

def filter_request_per_date(data, date):
    data_filtered = []
    for i in data["workflow_runs"]:
        if datetime.strptime(i["created_at"][:10],"%Y-%m-%d").strftime("%Y-%m-%d") == date:
            data_filtered.append(i)
    return {"workflow_runs": data_filtered}

def save_github_metrics_runs():
    response = requests.get(api_url_runs, params={'per_page': 100,})

    data = response.json()

    # date = datetime.strptime("2023-03-23","%Y-%m-%d").strftime("%Y-%m-%d")
    data = all_request_pages(data)

    print("Quantidade de workflow_runs: " + str(len(data["workflow_runs"])))

    file_path = f'./analytics-raw-data/GitHub_API-Runs-fga-eps-mds-{REPO}-{TODAY.strftime("%m-%d-%Y-%H-%M-%S")}.json'

    # Salva os dados em um json file
    with open(file_path, 'w') as fp:
        fp.write(json.dumps(data))
        fp.close()

    return

def save_github_metrics_issues():
    issues = []
    page = 1

    while True:
        response = requests.get(api_url_issues, params={'state': 'all', 'per_page': 100, 'page': page})

        page_issues = response.json()
        if not page_issues:
            break

        issues.extend(page_issues)
        print(f"Página {page}: {len(page_issues)} issues carregadas.")

        page += 1

    print("Quantidade total de issues: " + str(len(issues)))

    file_path = f'./analytics-raw-data/GitHub_API-Issues-fga-eps-mds-{REPO_ISSUES}.json'

    # Salvar todas as issues em um arquivo JSON
    with open(file_path, 'w') as fp:
        json.dump(issues, fp, indent=4)

if __name__ == "__main__":
    _, tag = create_release()

    save_sonar_metrics(tag)
    save_github_metrics_runs()
    save_github_metrics_issues()