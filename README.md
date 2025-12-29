# fish_reid
# run the frontend: npm run dev
# run the backend api: uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Had issues with pushing venv file which I should not push to git. The solution is below:
1. Add a .gitignore file to the root of the project
2. add venv/ in .git ignore
3. from terminal, from project root, run: git rm -r --cached venv/
4. Commit .git ignore
5. Rewrite git history: git filter-branch --force --index-filter 'git rm --cached --ignore-unmatch venv/*' --prune-empty --tag-name-filter cat -- --all
6. Now push using --force: git push origin <your-branch-name> --force
7. clean locally: rm -Rf .git/refs/original/ # removes backup refs from filter-branch
git gc --prune=now

