#!/bin/bash

domain="http://localhost:3000" 
username="oli.amb38@gmail.com"
password="mypassword1"
filename="upload_file2.txt"
cookies="cookies.txt"
payload="username="$username"&password="$password

# Log in and save cookies
echo "#### Login and save cookies ####"
endpoint="/auth/signin"
curl -X 'POST' -d $payload -c $cookies $domain$endpoint
echo ''
cat $cookies
echo "#### done ####"
echo -e "\n"

# Sleep for 30 seconds to wait for token to expire
echo '#### 30s countdown for access token to expire... ####'
for i in {10..0}
do
  sleep 1
  echo -n "$i "
done
echo ''
echo '#### done ####'
echo -e "\n"

# Get list of documents (supposed to fail)
echo "#### Get list of documents (this should fail) ####"
endpoint="/home/list"
curl -X GET -b $cookies $domain$endpoint
echo ''
echo "#### done ####"
echo -e "\n"

# Refresh token
echo "#### Refresh token ####"
endpoint="/token/refresh"
curl -X GET -b $cookies -c $cookies $domain$endpoint
echo ''
cat $cookies
echo "#### done ####"
echo -e "\n"

# Get list of documents after token has been refreshed (this should pass)
echo "#### Get list of documents (this should pass) ####"
endpoint="/home/list"
curl -X GET -b $cookies $domain$endpoint
echo ''
echo "#### done ####"
echo -e "\n"

