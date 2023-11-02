#!/bin/bash

curl -X 'POST' -d "username=oli.amb38@gmail.com&password=mypassword1" -c cookies.txt 'http://localhost:3000/auth/signin' 
echo -e "\n"
curl -X 'DELETE' --cookie-jar cookies.txt  'http://localhost:3000/auth/signout'
echo -e "\n"
