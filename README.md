# Description
Backend server that handles account creation and cloud storage through a REST API. Built for my note taking application, [notestamp](https://github.com/fortyoneplustwo/notestamp).

# Stack
- NodeJS
- Express
- MongoDB
- Amazon S3

# Authentication
- User session is maintained using JWTs sent as cookies. The cookies cannot be accessed by client side scripting and are sent only over a secure connection.
- Token refresh is implemented in most routes so the client doesn't have to request it directly. Revoked tokens (on sign out) are stored in a database.

# Schema
User schema includes user data as well the metadata of their saved projects.

# File storage
Content files i.e. notes and media files are stored in an S3 bucket. A file's path is not stored in the user schema, but rather computed at run time on the server.

# API
`POST /auth/register` Create an account with email and password.

`POST /auth/signin` Sign in to an existing account. Sets cookies and returns user data.

`DELETE /auth/signout` Sign out of account. Refresh token gets revoked.

`DELETE /auth/remove` Delete user account.

`POST /home/upload` Save a project. If project does not exist, create a new one. Returns updated directory.

`GET /home/open` Get project data. Returns project metadata from database and content from file system.

`GET /home/list` Return a list of the user's projects.

`DELETE /home/delete` Delete a project. Returns updated directory.

`GET /home/media-file/:filename` Download a media file from the S3 bucket.

`GET /home/stream-media` Return a stream of a media file from an S3 bucket.

