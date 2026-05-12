import json
import os
from datetime import datetime

import requests
from dotenv import load_dotenv
from packaging import version

TODAY = datetime.now()
OWNER = "fga-eps-mds"

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

load_dotenv()

REPO = os.getenv("REPO")
REPO_ISSUES = os.getenv("REPO_DOC")
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
RELEASE_MAJOR = os.getenv("RELEASE_MAJOR", "false").lower()
RELEASE_MINOR = os.getenv("RELEASE_MINOR", "false").lower()
RELEASE_FIX = os.getenv("RELEASE_FIX", "false").lower()
TARGET_COMMITISH = os.getenv("TARGET_COMMITISH", "main")
SONAR_TOKEN = os.getenv("SONAR_TOKEN")

BASE_URL_SONAR = "https://sonarcloud.io/api/measures/component_tree?component=fga-eps-mds_"
API_URL_RUNS = f"https://api.github.com/repos/{OWNER}/{REPO}/actions/runs"
API_URL_ISSUES = f"https://api.github.com/repos/{OWNER}/{REPO_ISSUES}/issues"


def ensure_output_dir():
    os.makedirs("./analytics-raw-data", exist_ok=True)


def github_headers():
    return {
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }


def sonar_headers():
    headers = {"Accept": "application/json"}
    if SONAR_TOKEN:
        headers["Authorization"] = f"Bearer {SONAR_TOKEN}"
    return headers


def get_json(url, headers=None, params=None, timeout=30):
    response = requests.get(url, headers=headers, params=params, timeout=timeout)
    response.raise_for_status()
    return response.json()


def post_json(url, headers=None, payload=None, timeout=30):
    response = requests.post(url, headers=headers, json=payload, timeout=timeout)
    response.raise_for_status()
    return response.json()


def normalize_tag(tag: str) -> str:
    return tag.lstrip("v").strip()


def get_latest_release_tag():
    url = f"https://api.github.com/repos/{OWNER}/{REPO}/releases"
    releases = get_json(url, headers=github_headers(), params={"per_page": 1})
    if releases:
        return releases[0].get("tag_name", "0.0.0")
    return "0.0.0"


def new_tag_name():
    old_tag = normalize_tag(get_latest_release_tag())
    try:
        old_version = version.parse(old_tag)
    except version.InvalidVersion:
        old_version = version.parse("0.0.0")

    if RELEASE_MAJOR == "true":
        return f"{old_version.major + 1}.0.0"
    if RELEASE_MINOR == "true":
        return f"{old_version.major}.{old_version.minor + 1}.0"
    if RELEASE_FIX == "true":
        return f"{old_version.major}.{old_version.minor}.{old_version.micro + 1}"
    return f"{old_version.major}.{old_version.minor}.{old_version.micro + 1}"


def create_release(tag):
    url = f"https://api.github.com/repos/{OWNER}/{REPO}/releases"
    payload = {
        "tag_name": tag,
        "name": tag,
        "target_commitish": TARGET_COMMITISH,
        "generate_release_notes": True,
    }
    return post_json(url, headers=github_headers(), payload=payload)


def write_release_tag(tag):
    with open("./analytics-raw-data/release-tag.txt", "w") as fp:
        fp.write(tag)


def save_sonar_metrics(tag):
    url = f"{BASE_URL_SONAR}{REPO}"
    params = {
        "metricKeys": ",".join(METRICS_SONAR),
        "ps": 500,
    }
    data = get_json(url, headers=sonar_headers(), params=params)

    file_path = f"./analytics-raw-data/fga-eps-mds-{REPO}-{TODAY.strftime('%m-%d-%Y-%H-%M-%S')}-{tag}.json"
    with open(file_path, "w") as fp:
        json.dump(data, fp)


def all_request_pages(data):
    total_runs = data.get("total_count", 0)
    pages = (total_runs // 100) + (1 if total_runs % 100 > 0 else 0)

    for page in range(2, pages + 1):
        response = get_json(
            API_URL_RUNS,
            headers=github_headers(),
            params={"per_page": 100, "page": page},
        )
        data["workflow_runs"].extend(response.get("workflow_runs", []))

    return data


def save_github_metrics_runs(tag):
    data = get_json(API_URL_RUNS, headers=github_headers(), params={"per_page": 100})
    data = all_request_pages(data)

    file_path = f"./analytics-raw-data/GitHub_API-Runs-fga-eps-mds-{REPO}-{TODAY.strftime('%m-%d-%Y-%H-%M-%S')}-{tag}.json"
    with open(file_path, "w") as fp:
        json.dump(data, fp)


def save_github_metrics_issues(tag):
    issues = []
    page = 1

    while True:
        page_issues = get_json(
            API_URL_ISSUES,
            headers=github_headers(),
            params={"state": "all", "per_page": 100, "page": page},
        )

        if not isinstance(page_issues, list) or len(page_issues) == 0:
            break

        issues.extend(page_issues)
        page += 1

    file_path = f"./analytics-raw-data/GitHub_API-Issues-fga-eps-mds-{REPO_ISSUES}-{tag}.json"
    with open(file_path, "w") as fp:
        json.dump(issues, fp, indent=2)


if __name__ == "__main__":
    ensure_output_dir()

    tag = new_tag_name()
    create_release(tag)
    write_release_tag(tag)

    save_sonar_metrics(tag)
    save_github_metrics_runs(tag)
    save_github_metrics_issues(tag)