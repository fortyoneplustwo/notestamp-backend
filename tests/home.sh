#!/bin/bash

domain="http://localhost:8080" 
username="oli.amb38@gmail.com"
password="mypassword1"
filename="upload_file2.txt"

# Log in and save cookies
echo "#### Login and save cookies ####"
cookies="cookies.txt"
payload="username="$username"&password="$password
endpoint="/auth/signin"
curl -X 'POST' -d $payload -c $cookies $domain$endpoint
echo ''
cat $cookies
echo "#### done ####"
echo -e "\n"

# Save document
params="file=@"
echo "#### Saving document ####"
endpoint="/home/upload"
curl -X POST -F "file=@"$filename -b $cookies $domain$endpoint
echo ''
echo "#### done ####"
echo -e "\n"

# Get list of documents
echo "#### Get list of documents ####"
endpoint="/home/list"
curl -X GET -b $cookies $domain$endpoint
echo ''
echo "#### done ####"
echo -e "\n"

# Get a document
echo "#### Get a specific doc ####"
params="?name="
endpoint="/home/open"$params$filename
curl -X GET -b $cookies $domain$endpoint
echo ''
echo "#### done ####"
echo -e "\n"

# Delete a document
# echo "#### Delete a document ####"
# params="?name="
# filename="upload_file.txt"
# endpoint="/home/delete"$params$filename
# curl -X DELETE -b $cookies $domain$endpoint
# echo ''
# echo "#### done ####"
# echo -e "\n"

# Log out
endpoint="/auth/signout"
echo "#### Log out ####"
curl -X 'DELETE' -b $cookies --cookie-jar $cookies $domain$endpoint
echo "$" 
cat $cookies
echo "#### done ####"
echo -e "\n"

