"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg"); // Corrected import
const pg_1 = require("pg");
const app = (0, express_1.default)(); // Defined app before use
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
});
const adapter = new adapter_pg_1.PrismaPg(pool); // Using PrismaPg as adapter
const prisma = new client_1.PrismaClient({
    adapter,
    log: ['query', 'info', 'warn', 'error'],
});
const PORT = process.env.PORT || 3001;
app.use(express_1.default.json());
app.get('/', (req, res) => {
    res.send('Hello from the backend!');
});
// User routes
app.get('/api/users', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const users = yield prisma.user.findMany();
    res.json(users);
}));
app.get('/api/users/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const user = yield prisma.user.findUnique({
        where: { id: Number(id) },
    });
    res.json(user);
}));
app.post('/api/users', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, name } = req.body;
    const user = yield prisma.user.create({
        data: {
            email,
            name,
        },
    });
    res.json(user);
}));
// Post routes
app.get('/api/posts', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const posts = yield prisma.post.findMany();
    res.json(posts);
}));
app.get('/api/posts/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const post = yield prisma.post.findUnique({
        where: { id: Number(id) },
    });
    res.json(post);
}));
app.post('/api/posts', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { title, content, authorId } = req.body;
    const post = yield prisma.post.create({
        data: {
            title,
            content,
            authorId,
        },
    });
    res.json(post);
}));
const startServer = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield prisma.$connect();
        app.listen(PORT, () => {
            console.log(`Backend server running on port ${PORT}`);
        });
    }
    catch (error) {
        console.error('Failed to connect to the database or start server:', error);
        yield prisma.$disconnect();
        process.exit(1);
    }
});
startServer();
process.on('beforeExit', () => __awaiter(void 0, void 0, void 0, function* () {
    yield prisma.$disconnect();
}));
