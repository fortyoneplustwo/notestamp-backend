import requests
import json
import urllib

username = 'oli.amb38@gmail.com'
password = 'mypassword1'
api = 'http://localhost:8080'
payload = {
        'username': username,
        'password': password
        }


# Handles cookie management
session = requests.Session()


# Log in and save cookies
print('Logging into existing account with email: ',username )
result = session.post(api + '/auth/signin', data=payload)
print('Log in response = ', result.json(), '\n')
assert result.status_code == 200
assert result.json()['email'] == username


# Save a file
path = 'document.stmp'
headers = {'Content-Type': 'application/json'}
file = open(path, 'r') # Grab contents from file on disk
title = 'test file'
content = file.read()
payload = {
        "title": title,
        "stmp": content
        }
result = session.post(api + '/home/upload', data=payload)
print('Save file response = ', result.json(), '\n')
assert result.status_code == 200


# delete file
params = {
        'name': title
        }
result = session.delete(api + '/home/delete', params=params)
print('Delete file response = ', result.json(), '\n')
assert result.status_code == 200


# Log out
result = session.delete(api + '/auth/signout')
print('Log out response = ', result.text, '\n')
assert result.status_code == 200


# Create new account
username = 'new_account@gmail.com'
payload = {
        'username': username,
        'password': password
        }
print('Creating new account with email: ', username)
result = session.post(api + '/auth/register', data=payload)
print(result.text)
assert result.status_code == 200


# Log in and save cookies
result = session.post(api + '/auth/signin', data=payload)
print('Log in response = ', result.json(), '\n')
assert result.status_code == 200
assert result.json()['email'] == username


# Delete account
result = session.delete(api + '/auth/remove')
print(result.text)
assert result.status_code == 200


