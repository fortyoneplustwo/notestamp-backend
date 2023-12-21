import requests
import json
import urllib

username = 'oli.amb38@gmail.com'
password = 'mypassword1'
api = 'http://localhost:8080'
login = {
        'username': username,
        'password': password
        }

# Handles cookie management
session = requests.Session()

# Log in and save cookies
payload = json.dumps(login)
encoded = urllib.parse.quote(payload)
result = session.post(api + '/auth/signin', data = login)
assert result.json()['email'] == username

# Save a file
filename = 'document.stmp'
file = open(filename, 'r')
content = file.read()
data = {
        "title": "file3",
        "stmp": content
        }
payload = json.dumps(data)
encoded = urllib.parse.quote(payload)

result = session.post(api + '/home/upload', data = data)
assert result.status == 200






