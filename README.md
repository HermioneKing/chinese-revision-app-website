This is a [Next.js](https://nextjs.org) project with a Node.js backend.

## Project Structure

- **Frontend:** A [Next.js](https://nextjs.org) application located in the `src` directory.
- **Backend:** A [Node.js](https://nodejs.org) application with [Express](https://expressjs.com) and [Prisma](https://www.prisma.io) located in the `backend` directory.
- **Database:** A [PostgreSQL](https://www.postgresql.org) database.
- **Containerization:** The entire project can be run using [Docker](https://www.docker.com) and [Docker Compose](https://docs.docker.com/compose/).

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)
- [Node.js](https://nodejs.org/en/download/) (for running without Docker)

### Running the project with Docker

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-name>
    ```
2.  **Create a `.env` file:**
    Create a `.env` file in the root of the project and add the necessary environment variables. You can use `env.example` as a template.
    ```bash
    cp env.example .env
    ```
    Update the `.env` file with your own values, especially the `JWT_SECRET`.

3.  **Build and run the containers:**
    ```bash
    docker-compose up --build
    ```
    This will start the frontend, backend, and database services.

    - The frontend will be available at [http://localhost:3000](http://localhost:3000).
    - The backend will be available at [http://localhost:5000](http://localhost:5000).

### Running the project without Docker

**Backend:**
```bash
cd backend
npm install
npm run dev
```

**Frontend:**
```bash
# From the root directory
npm install
npm run dev
```

## Learn More

To learn more about the technologies used in this project, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Prisma Documentation](https://www.prisma.io/docs/) - learn about Prisma features and API.
- [Express Documentation](https://expressjs.com/) - learn about Express features and API.
- [Docker Documentation](https://docs.docker.com/) - learn about Docker features and API.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
