# Motivation
To implement a REST API that handles account creation and cloud storage for my note taking application, [notestamp](github.com/fortyoneplustwo/notestamp).

# Tech Stack
- NodeJS
- Express
- MongoDB
- Amazon S3

# Schema
User schema holds account information including an array of objects containing metadata of their saved projects. MongoDB's document storage paradigm fits this schema well.

# File storage
Note files and media files are stored in two separate S3 buckets. A file's path is not stored in the user schema, but rather computed by the backend upon each request.

*Insight*: In case the user wants to have several projects with the same media, we want to avoid storing copies of large media files. Therefore separating the metadata (on the database)
from the project files (on the file system) allows multiple projects to point to the same media file.

# Authentication
- User session is maintained through JWTs sent as cookies. The cookies cannot be accessed by client side scripting and are sent only over a secure connection.
- I have implemented a token refresh mechanism that follows conventions and keeps a log of revoked tokens in a database.

  *Note*: Need to implement a regular cleanup of the revoked tokens database.

# Takeaways
- Asynchronous programming can be tricky. Keep it simple and avoid deeply nested logic.
- Make sure to handle all possible errors otherwise it could crash your program.
- Media retrieval might require a different implementation than notes retrieval e.g. streaming audio directly to the client from the S3 bucket.
- I'm tempted to rewrite this server in Elixir due to its fault tolerance and concurrency features.
