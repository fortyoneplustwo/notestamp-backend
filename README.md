# Description
Backend server that handles account creation and cloud storage through a REST API. Built for my note taking application, [notestamp](https://github.com/fortyoneplustwo/notestamp).

# Stack
- NodeJS
- Express
- MongoDB
- Amazon S3

# Authentication
- User session is maintained through JWTs sent as cookies. The cookies cannot be accessed by client side scripting and are sent only over a secure connection.
- I have implemented a token refresh mechanism that follows conventions and keeps a log of revoked tokens in a database.

  *Note*: Need to implement a regular cleanup of the revoked tokens database.

# Schema
User schema includes a list of saved projects (metadata). MongoDB's document storage paradigm fits this schema well.

# File storage
Content files i.e. notes and media are stored in S3 buckets (one for notes files, the other for media files). A file's path is not stored in the user schema, but rather computed at run time on the server.

*Insight*: In case the user wants to have several projects with the same media, we want to avoid storing copies of large media files. Therefore separating the metadata (on the database)
from the content files (on the file system) allows multiple projects to point to the same media file.

# API
`POST /auth/register` Create an account with email and password.

`POST /auth/signin` Sign in to an existing account. Sets cookies and returns user data.

`DELETE /auth/signout` Sign out of account. Refresh token gets revoked.

`DELETE /auth/remove` Delete user account.

`POST /home/upload` Save a project. If project does not exist, create a new one. Returns updated directory.

`GET /home/open` Get project data. Returns project metadata from database and content from file system.

`GET /home/list` Return a list of the user's projects.

`DELETE /home/delete` Delete a project. Returns updated directory.

# Takeaways
- Asynchronous programming can be tricky. Keep it simple and avoid deeply nested logic.
- Make sure to handle all possible errors otherwise it could crash your program.
- Media retrieval might require a different implementation than notes retrieval e.g. streaming audio directly to the client from the S3 bucket.
- I'm tempted to rewrite this server in Elixir due to its fault tolerance and concurrency features.
