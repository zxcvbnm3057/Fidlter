from git import Repo
import os

class GitSync:
    def __init__(self, repo_path):
        self.repo_path = repo_path
        self.repo = Repo(repo_path)

    def commit_changes(self, message):
        self.repo.git.add(A=True)
        self.repo.index.commit(message)

    def push_changes(self, branch='main'):
        origin = self.repo.remote(name='origin')
        origin.push(branch)

    def pull_changes(self, branch='main'):
        origin = self.repo.remote(name='origin')
        origin.pull(branch)

    def clone_repo(self, repo_url, branch='main'):
        if not os.path.exists(self.repo_path):
            Repo.clone_from(repo_url, self.repo_path, branch=branch)

    def sync(self, repo_url, commit_message):
        self.clone_repo(repo_url)
        self.commit_changes(commit_message)
        self.push_changes()