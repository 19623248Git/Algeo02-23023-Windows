# Algeo02-23023-Windows

## Getting Started

### First, install python 3.10.11 with the link below:

> 🪟 windows system
<p style="font-weight: bold; color: yellow;">
  Don't forget to add installation to PATH
</p>

<a href="https://www.python.org/ftp/python/3.10.11/python-3.10.11-amd64.exe" style="font-weight: bold">click me for the link!</a>

<hr>

### Second, create and activate a virtual environment:

<p style="font-weight: bold; color: cyan;">
  Ensure you're in the root directory of this project: "..\Algeo02-23023"
</p>

> 🪟 windows system
<p style="font-weight: bold; color: lime;">
  Recommended terminal: PowerShell
</p>

``` powershell
python --version #ensure the version is 3.10.11
python3 -m venv venv
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass #this is temporary
venv\Scripts\activate
```

### Third, install the dependencies:

```bash
npm install
# or
yarn
# or
pnpm install
```

### Fourth, run the development server(python dependencies will be installed automatically here):

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```